/**
 * Centralized Server-Side Resource Limits, Timeouts & Safety Configuration.
 *
 * All external operations (HTTP fetch, HTML parsing, snapshot compression, AI calls,
 * and total request pipeline) are bound by hard limits to protect against unbounded execution,
 * SSRF, giant payloads, memory leaks, runaway retries, and cost overruns.
 */

function getEnvNumber(key: string, defaultValue: number): number {
  if (typeof process === "undefined" || !process.env) return defaultValue;
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

export const SERVER_LIMITS = {
  /** Maximum time allowed for initial website HTTP fetch (default 10s) */
  WEBSITE_FETCH_TIMEOUT_MS: getEnvNumber("WEBSITE_FETCH_TIMEOUT_MS", 10000),

  /** Maximum response body size streamed/downloaded from target website (default 5MB) */
  WEBSITE_MAX_RESPONSE_BYTES: getEnvNumber("WEBSITE_MAX_RESPONSE_BYTES", 5000000),

  /** Maximum number of HTTP redirects followed before failing (default 5) */
  WEBSITE_MAX_REDIRECTS: getEnvNumber("WEBSITE_MAX_REDIRECTS", 5),

  /** Maximum characters of HTML passed to Cheerio DOM content extraction (default 200,000) */
  WEBSITE_MAX_HTML_CHARS: getEnvNumber("WEBSITE_MAX_HTML_CHARS", 200000),

  /** Maximum execution lifetime if browser fallback is active (default 20s) */
  PLAYWRIGHT_TIMEOUT_MS: getEnvNumber("PLAYWRIGHT_TIMEOUT_MS", 20000),

  /** Maximum payload size in browser fallback (default 5MB) */
  PLAYWRIGHT_MAX_PAGE_SIZE_BYTES: getEnvNumber("PLAYWRIGHT_MAX_PAGE_SIZE_BYTES", 5000000),

  /** Timeout per individual AI model completion request (default 30s) */
  AI_TIMEOUT_MS: getEnvNumber("AI_TIMEOUT_MS", 30000),

  /** Maximum retry attempts for transient AI errors (429, 500, 502, 503, 504, timeout) (default 2 retries, 3 total attempts) */
  AI_MAX_RETRIES: getEnvNumber("AI_MAX_RETRIES", 2),

  /** Maximum token budget estimated for AI input payload (~4 chars per token, ~32,000 chars) */
  AI_MAX_INPUT_TOKENS: getEnvNumber("AI_MAX_INPUT_TOKENS", 8000),

  /** Maximum token limit requested for AI structured output response (default 3,000) */
  AI_MAX_OUTPUT_TOKENS: getEnvNumber("AI_MAX_OUTPUT_TOKENS", 3000),

  /** Global deadline for the entire website check lifecycle (default 90s) */
  ANALYSIS_TOTAL_TIMEOUT_MS: getEnvNumber("ANALYSIS_TOTAL_TIMEOUT_MS", 90000),

  /** Maximum number of check requests permitted per client IP per minute (default 15) */
  CHECK_RATE_LIMIT_PER_MINUTE: getEnvNumber("CHECK_RATE_LIMIT_PER_MINUTE", 15),

  /** Maximum concurrent analysis jobs permitted per client IP (default 2) */
  CHECK_MAX_CONCURRENT_PER_IP: getEnvNumber("CHECK_MAX_CONCURRENT_PER_IP", 2),
} as const;

export type ServerLimits = typeof SERVER_LIMITS;
