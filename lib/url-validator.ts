import dns from "node:dns";
import {
  validateClientUrl,
  normalizeClientUrl,
  isPrivateIpAddress,
} from "./url-client-validator";

export interface UrlValidationResult {
  isValid: boolean;
  error?: "INVALID_URL" | "SSRF_BLOCKED";
  message?: string;
  originalUrl: string;
  normalizedUrl?: string;
  domain?: string;
}

/**
 * Normalizes an input URL string (e.g. "example.com" -> "https://example.com")
 */
export function normalizeUrl(inputUrl: string): { normalizedUrl: string; domain: string } {
  return normalizeClientUrl(inputUrl);
}

/**
 * Validates syntax, structure, protocol, and domain format of a given URL string.
 * Strictly aligned with client-side live validation.
 */
export function validateUrl(rawUrl: string | null | undefined): UrlValidationResult {
  const trimmed = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!trimmed) {
    return {
      isValid: false,
      error: "INVALID_URL",
      message: "URL string cannot be empty",
      originalUrl: trimmed,
    };
  }

  const result = validateClientUrl(trimmed);
  if (!result.isValid) {
    return {
      isValid: false,
      error: "INVALID_URL",
      message: result.message || "Invalid domain structure or top-level domain (TLD)",
      originalUrl: trimmed,
    };
  }

  return {
    isValid: true,
    originalUrl: trimmed,
    normalizedUrl: result.normalizedUrl,
    domain: result.domain,
  };
}

/**
 * Checks if an IP address string belongs to a private, loopback, or reserved network range.
 */
export function isPrivateIp(ip: string): boolean {
  return isPrivateIpAddress(ip);
}

/**
 * Validates a URL against Server-Side Request Forgery (SSRF) vulnerabilities.
 * Checks reserved hostnames, private IP literals, and performs DNS resolution to verify target IPs.
 */
export async function checkSsrf(
  urlStr: string
): Promise<{ isSafe: boolean; isDnsFailure?: boolean; reason?: string }> {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    // Check blocked domain suffixes / internal hostnames
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname.endsWith(".home") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".example")
    ) {
      return {
        isSafe: false,
        reason: `Access to internal or restricted domain '${hostname}' is prohibited`,
      };
    }

    // If hostname is a direct IP address
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":")) {
      if (isPrivateIp(hostname)) {
        return {
          isSafe: false,
          reason: `Access to private IP address '${hostname}' is prohibited`,
        };
      }
    }

    // DNS Resolution check to prevent DNS rebinding / internal resolution & verify domain existence
    try {
      const addresses = await dns.promises.lookup(hostname, { all: true });
      for (const record of addresses) {
        if (isPrivateIp(record.address)) {
          return {
            isSafe: false,
            reason: `Hostname '${hostname}' resolves to private IP address (${record.address})`,
          };
        }
      }
    } catch (dnsErr: any) {
      if (
        dnsErr &&
        (dnsErr.code === "ENOTFOUND" ||
          dnsErr.code === "EAI_AGAIN" ||
          dnsErr.code === "ENAME" ||
          dnsErr.code === "ENODATA")
      ) {
        return {
          isSafe: false,
          isDnsFailure: true,
          reason: `Domain '${hostname}' does not exist or DNS lookup failed. Please verify the website URL.`,
        };
      }
      console.warn(`DNS lookup warning for ${hostname}:`, dnsErr);
    }

    return { isSafe: true };
  } catch (err) {
    return {
      isSafe: false,
      reason: err instanceof Error ? err.message : "Failed to parse URL for SSRF check",
    };
  }
}

