/**
 * Client-safe URL Validator & Normalizer
 * Pure TypeScript with no Node.js built-in dependencies (no node:dns, etc.)
 * Can be safely imported in both client components and server code.
 */

export interface ClientUrlValidationResult {
  isValid: boolean;
  status: "empty" | "valid" | "invalid";
  error?: "INVALID_URL";
  message?: string;
  normalizedUrl?: string;
  domain?: string;
}

/**
 * Checks if an IP address string belongs to a private, loopback, or reserved network range.
 */
export function isPrivateIpAddress(ip: string): boolean {
  let cleanIp = ip.trim().toLowerCase();
  if (cleanIp.startsWith("::ffff:")) {
    cleanIp = cleanIp.substring(7);
  }

  // IPv4 checks
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanIp)) {
    const parts = cleanIp.split(".").map((num) => parseInt(num, 10));
    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 192.0.0.0/24, 192.0.2.0/24 (Documentation/Test)
    if (a === 192 && b === 0) return true;
    // 198.51.100.0/24, 203.0.113.0/24 (Test-Net)
    if (a === 198 && b === 51) return true;
    if (a === 203 && b === 0) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  // IPv6 checks
  if (cleanIp === "::" || cleanIp === "::1" || cleanIp === "0:0:0:0:0:0:0:1") {
    return true; // Loopback
  }
  if (cleanIp.startsWith("fe80:") || cleanIp.startsWith("fe80::")) {
    return true; // Link-local
  }
  if (cleanIp.startsWith("fc00:") || cleanIp.startsWith("fd00:")) {
    return true; // Unique local
  }

  return false;
}

/**
 * Normalizes user input into a canonical HTTP/HTTPS URL
 */
export function normalizeClientUrl(inputUrl: string): { normalizedUrl: string; domain: string } {
  let cleaned = inputUrl.trim();

  // Strip leading @ or mailto: if any
  if (cleaned.startsWith("@")) {
    cleaned = cleaned.substring(1);
  }

  // Automatically prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  const parsed = new URL(cleaned);
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  const domain = parsed.hostname.replace(/^www\./, "");
  return {
    normalizedUrl: parsed.href,
    domain,
  };
}

/**
 * Validates URL string on the client or server.
 * Returns status: "empty" | "valid" | "invalid"
 */
export function validateClientUrl(rawUrl: string | null | undefined): ClientUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return {
      isValid: false,
      status: "empty",
      originalUrl: "",
    } as any;
  }

  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return {
      isValid: false,
      status: "empty",
    };
  }

  // Reject spaces or invalid control characters
  if (/\s/.test(trimmed)) {
    return {
      isValid: false,
      status: "invalid",
      error: "INVALID_URL",
      message: "URL cannot contain spaces",
    };
  }

  // Reject unsupported protocols
  if (/^(javascript|data|file|ftp|about|mailto|tel|blob):/i.test(trimmed)) {
    return {
      isValid: false,
      status: "invalid",
      error: "INVALID_URL",
      message: "Only HTTP and HTTPS protocols are supported",
    };
  }

  // Reject trailing dots or incomplete domain syntax (e.g. "stripe.", "example..com")
  if (trimmed.endsWith(".") || trimmed.endsWith(":") || trimmed.includes("..")) {
    return {
      isValid: false,
      status: "invalid",
      error: "INVALID_URL",
      message: "Incomplete domain name or invalid punctuation",
    };
  }

  // Must contain alphanumeric characters
  if (!/[a-z0-9]/i.test(trimmed)) {
    return {
      isValid: false,
      status: "invalid",
      error: "INVALID_URL",
      message: "Please enter a valid website domain",
    };
  }

  try {
    const { normalizedUrl, domain } = normalizeClientUrl(trimmed);
    const parsed = new URL(normalizedUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        isValid: false,
        status: "invalid",
        error: "INVALID_URL",
        message: "Only HTTP and HTTPS protocols are supported",
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (!hostname || hostname.length > 253) {
      return {
        isValid: false,
        status: "invalid",
        error: "INVALID_URL",
        message: "Invalid domain length",
      };
    }

    // Reject plain text without dots (e.g. "hello", "google")
    if (!hostname.includes(".")) {
      return {
        isValid: false,
        status: "invalid",
        error: "INVALID_URL",
        message: "Please include a top-level domain (e.g. yourproduct.com)",
      };
    }

    // Reject localhost and internal/reserved suffixes
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
        isValid: false,
        status: "invalid",
        error: "INVALID_URL",
        message: "Local and reserved domains are not permitted",
      };
    }

    // IP address validation
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":");
    if (isIpAddress) {
      if (isPrivateIpAddress(hostname)) {
        return {
          isValid: false,
          status: "invalid",
          error: "INVALID_URL",
          message: "Private or internal IP addresses are not permitted",
        };
      }
    } else {
      // Standard domain syntax: labels separated by dot, valid TLD (at least 2 letters)
      const hostnameRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
      if (!hostnameRegex.test(hostname)) {
        return {
          isValid: false,
          status: "invalid",
          error: "INVALID_URL",
          message: "Invalid domain structure or top-level domain (e.g. .com, .io)",
        };
      }
    }

    return {
      isValid: true,
      status: "valid",
      normalizedUrl: parsed.href,
      domain,
    };
  } catch {
    return {
      isValid: false,
      status: "invalid",
      error: "INVALID_URL",
      message: "Invalid URL structure",
    };
  }
}
