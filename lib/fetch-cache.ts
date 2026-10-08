import { FetchResult } from "./website-fetcher";

interface CacheEntry {
  result: FetchResult;
  timestamp: number;
}

const fetchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Retrieves a recently fetched website result by normalized URL if fresh
 */
export function getCachedFetch(normalizedUrl: string): FetchResult | null {
  const entry = fetchCache.get(normalizedUrl);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    fetchCache.delete(normalizedUrl);
    return null;
  }

  return entry.result;
}

/**
 * Stores a fetch result in the memory cache
 */
export function setCachedFetch(normalizedUrl: string, result: FetchResult): void {
  // Prune expired entries periodically to prevent memory growth
  if (fetchCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of fetchCache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        fetchCache.delete(key);
      }
    }
  }

  fetchCache.set(normalizedUrl, {
    result,
    timestamp: Date.now(),
  });
}
