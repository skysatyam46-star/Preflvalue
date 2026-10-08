import { NextRequest, NextResponse } from "next/server";
import { validateUrl, checkSsrf } from "@/lib/url-validator";
import { fetchWebsiteHomepage } from "@/lib/website-fetcher";
import { extractWebsiteSnapshot } from "@/lib/content-extractor";
import { analyzeWebsite } from "@/services/ai/analyzeWebsite";
import { validateAndScoreAnalysis } from "@/services/validation/analysisValidator";
import { getCachedFetch, setCachedFetch } from "@/lib/fetch-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/check
 * Health check & diagnostic endpoint for URL checker API
 */
export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "ValueCheck Full Backend Pipeline (Validation, Fetching, Extraction, AI & Scoring)",
    phase: "Phase 1, Phase 2, Phase 3 & Phase 4 - Backend",
    endpoints: {
      "POST /api/check": "Validates URL, checks SSRF safety, normalizes URL, fetches homepage, extracts WebsiteSnapshot, runs Phase 3 AI Analysis, and executes Phase 4 Evidence Validation & Deterministic Scoring.",
    },
  });
}

/**
 * POST /api/check
 * Primary Backend Route (Phase 1 + Phase 2 + Phase 3 + Phase 4):
 * Accepts JSON payload `{ "url": "example.com" }`
 * Validates, normalizes, checks SSRF security rules, fetches website homepage, performs content extraction, runs AI analysis, and executes deterministic scoring & evidence validation.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { url?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_URL",
          message: "Invalid or missing JSON payload in request body",
          originalUrl: "",
        },
        { status: 400 }
      );
    }

    const rawUrl = typeof body.url === "string" ? body.url : "";

    // 1. URL Validation & Structure Check
    const validation = validateUrl(rawUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "INVALID_URL",
          message: validation.message || "Please enter a valid website URL",
          originalUrl: rawUrl,
        },
        { status: 400 }
      );
    }

    // 2. SSRF Security Policy Check & Host Reachability
    const ssrfCheck = await checkSsrf(validation.normalizedUrl);
    if (!ssrfCheck.isSafe) {
      const isDnsError = ssrfCheck.isDnsFailure;
      return NextResponse.json(
        {
          success: false,
          error: isDnsError ? "FETCH_FAILED" : "SSRF_BLOCKED",
          message: ssrfCheck.reason || "Access to internal or private addresses is prohibited",
          originalUrl: rawUrl,
          normalizedUrl: validation.normalizedUrl,
        },
        { status: isDnsError ? 502 : 422 }
      );
    }

    // 3. Fetch Website Homepage (Use pre-scan cache if available)
    let fetchResult = getCachedFetch(validation.normalizedUrl);

    if (!fetchResult) {
      fetchResult = await fetchWebsiteHomepage(
        rawUrl,
        validation.normalizedUrl,
        {
          timeoutMs: 10000,
          maxRedirects: 5,
          maxSizeBytes: 5 * 1024 * 1024,
        }
      );

      if (fetchResult.success) {
        setCachedFetch(validation.normalizedUrl, fetchResult);
      }
    }

    if (!fetchResult.success) {
      let httpStatus = 502;
      if (fetchResult.error === "INVALID_URL") httpStatus = 400;
      if (fetchResult.error === "SSRF_BLOCKED") httpStatus = 422;
      if (fetchResult.error === "FETCH_TIMEOUT") httpStatus = 504;

      return NextResponse.json(fetchResult, { status: httpStatus });
    }

    // 4. Phase 2: Deterministic Content Extraction
    const snapshot = extractWebsiteSnapshot(fetchResult.html, {
      baseUrl: fetchResult.finalUrl,
    });

    // 5. Phase 3: AI Analysis Engine
    const rawAiAnalysis = await analyzeWebsite(snapshot);

    // 6. Phase 4: Evidence Validation & Deterministic Scoring
    const finalValidatedAnalysis = validateAndScoreAnalysis(rawAiAnalysis, snapshot);

    return NextResponse.json(
      {
        ...fetchResult,
        snapshot,
        aiAnalysis: rawAiAnalysis,
        analysis: finalValidatedAnalysis,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error in /api/check endpoint:", error);

    const err = error as any;
    const isAiConfigError =
      err?.code === "AI_PROVIDER_NOT_CONFIGURED" ||
      err?.code === "AI_PROVIDER_AUTH_ERROR" ||
      (typeof err?.message === "string" &&
        err.message.includes("Analysis is temporarily unavailable"));

    if (isAiConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: "AI_PROVIDER_NOT_CONFIGURED",
          message: "Analysis is temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "FETCH_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected server error occurred while processing the URL check",
      },
      { status: 500 }
    );
  }
}
