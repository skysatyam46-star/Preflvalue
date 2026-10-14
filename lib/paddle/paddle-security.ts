import crypto from "crypto";

export interface SignatureVerificationResult {
  isValid: boolean;
  timestamp?: number;
  error?: string;
}

/**
 * Verifies a Paddle Billing v2 webhook signature.
 * Header format: "ts=1671536254;h1=5a86f990..."
 * Signed payload: `${ts}:${rawBody}`
 * HMAC Algorithm: SHA-256
 */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secretKey: string | null | undefined,
  toleranceSeconds: number = 300
): SignatureVerificationResult {
  if (!signatureHeader || typeof signatureHeader !== "string") {
    return { isValid: false, error: "MISSING_SIGNATURE_HEADER" };
  }

  if (!secretKey || typeof secretKey !== "string" || secretKey.trim() === "") {
    return { isValid: false, error: "MISSING_SECRET_KEY" };
  }

  // Parse header components: ts=..., h1=...
  const parts = signatureHeader.split(";");
  let tsStr: string | null = null;
  let h1Hash: string | null = null;

  for (const part of parts) {
    const [key, val] = part.split("=");
    if (!key || !val) continue;
    const trimmedKey = key.trim();
    const trimmedVal = val.trim();
    if (trimmedKey === "ts") {
      tsStr = trimmedVal;
    } else if (trimmedKey === "h1") {
      h1Hash = trimmedVal;
    }
  }

  if (!tsStr || !h1Hash) {
    return { isValid: false, error: "MALFORMED_SIGNATURE_HEADER" };
  }

  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) {
    return { isValid: false, error: "INVALID_TIMESTAMP" };
  }

  // Check timestamp drift (replay attack mitigation)
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowInSeconds - timestamp) > toleranceSeconds) {
    return { isValid: false, timestamp, error: "TIMESTAMP_OUT_OF_TOLERANCE" };
  }

  // Compute HMAC-SHA256 of `${ts}:${rawBody}`
  const signedPayload = `${tsStr}:${rawBody}`;
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(signedPayload, "utf8")
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    const computedBuffer = Buffer.from(computedHash, "utf8");
    const providedBuffer = Buffer.from(h1Hash, "utf8");

    if (computedBuffer.length !== providedBuffer.length) {
      return { isValid: false, timestamp, error: "SIGNATURE_MISMATCH" };
    }

    const matches = crypto.timingSafeEqual(computedBuffer, providedBuffer);
    if (!matches) {
      return { isValid: false, timestamp, error: "SIGNATURE_MISMATCH" };
    }

    return { isValid: true, timestamp };
  } catch (err) {
    return { isValid: false, timestamp, error: "COMPARISON_ERROR" };
  }
}

/**
 * Helper to generate a valid signature for deterministic automated testing.
 */
export function generateTestPaddleSignature(
  rawBody: string,
  secretKey: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}:${rawBody}`;
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(signedPayload, "utf8")
    .digest("hex");
  return `ts=${ts};h1=${hash}`;
}
