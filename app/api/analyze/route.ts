import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsite } from "@/services/ai/analyzeWebsite";
import { extractWebsiteSnapshot } from "@/lib/content-extractor";
import { validateAndScoreAnalysis } from "@/services/validation/analysisValidator";
import { fetchWebsiteHomepage } from "@/lib/website-fetcher";
import { validateUrl } from "@/lib/url-validator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Please enter a valid website URL" },
        { status: 400 }
      );
    }

    const validation = validateUrl(url);
    if (!validation.isValid || !validation.normalizedUrl) {
      return NextResponse.json(
        { error: validation.message || "Invalid URL provided" },
        { status: 400 }
      );
    }

    // Fetch and analyze
    const fetchResult = await fetchWebsiteHomepage(url, validation.normalizedUrl);
    if (!fetchResult.success) {
      return NextResponse.json(
        { error: fetchResult.message || "Failed to fetch website" },
        { status: 502 }
      );
    }

    const snapshot = extractWebsiteSnapshot(fetchResult.html, {
      baseUrl: fetchResult.finalUrl,
    });

    const aiAnalysis = await analyzeWebsite(snapshot);
    const validated = validateAndScoreAnalysis(aiAnalysis, snapshot);

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error("Analysis error in /api/analyze:", error);
    if (
      error?.code === "AI_PROVIDER_NOT_CONFIGURED" ||
      error?.code === "AI_PROVIDER_AUTH_ERROR" ||
      (typeof error?.message === "string" &&
        error.message.includes("Analysis is temporarily unavailable"))
    ) {
      return NextResponse.json(
        {
          error: "AI_PROVIDER_NOT_CONFIGURED",
          message: "Analysis is temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze website. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
