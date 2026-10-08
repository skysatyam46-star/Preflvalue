import { SERVER_LIMITS } from "@/server/config/limits";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();
const activeConcurrencyMap = new Map<string, number>();

/**
 * Extracts a normalized client IP identifier from request headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "default-client";
}

export interface RateLimitCheckResult {
  allowed: boolean;
  status?: number;
  error?: "RATE_LIMITED" | "CONCURRENCY_LIMITED";
  message?: string;
  retryAfterSeconds?: number;
}

/**
 * Verifies rate limit and active concurrency limit for a client IP.
 */
export function checkRateAndConcurrencyLimit(clientIp: string): RateLimitCheckResult {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxPerMinute = SERVER_LIMITS.CHECK_RATE_LIMIT_PER_MINUTE;
  const maxConcurrent = SERVER_LIMITS.CHECK_MAX_CONCURRENT_PER_IP;

  // 1. Check Concurrency Limit
  const activeCount = activeConcurrencyMap.get(clientIp) || 0;
  if (activeCount >= maxConcurrent) {
    return {
      allowed: false,
      status: 429,
      error: "CONCURRENCY_LIMITED",
      message: "Too many checks are running. Please try again shortly.",
      retryAfterSeconds: 5,
    };
  }

  // 2. Check Rate Limit (Sliding minute window)
  let bucket = rateLimitMap.get(clientIp);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + windowMs };
    rateLimitMap.set(clientIp, bucket);
  } else {
    bucket.count += 1;
    if (bucket.count > maxPerMinute) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      return {
        allowed: false,
        status: 429,
        error: "RATE_LIMITED",
        message: "Check rate limit reached. Please wait a moment before trying again.",
        retryAfterSeconds,
      };
    }
  }

  // Clean stale rate limit buckets periodically
  if (rateLimitMap.size > 200) {
    for (const [key, b] of rateLimitMap.entries()) {
      if (now > b.resetAt) rateLimitMap.delete(key);
    }
  }

  return { allowed: true };
}

/**
 * Increments active concurrency counter for a client IP.
 */
export function acquireConcurrencySlot(clientIp: string): void {
  const current = activeConcurrencyMap.get(clientIp) || 0;
  activeConcurrencyMap.set(clientIp, current + 1);
}

/**
 * Decrements active concurrency counter for a client IP.
 */
export function releaseConcurrencySlot(clientIp: string): void {
  const current = activeConcurrencyMap.get(clientIp) || 0;
  if (current <= 1) {
    activeConcurrencyMap.delete(clientIp);
  } else {
    activeConcurrencyMap.set(clientIp, current - 1);
  }
}
