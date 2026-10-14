import { NextRequest, NextResponse } from "next/server";
import { ReportStore } from "@/lib/storage/report-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/[reportId]
 * Retrieves report data. If unlocked, returns full analysis.
 * If unpaid, returns only the sanitized free-preview data.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    if (!reportId || typeof reportId !== "string") {
      return NextResponse.json(
        { success: false, error: "INVALID_REPORT_ID", message: "Report ID is required" },
        { status: 400 }
      );
    }

    const report = await ReportStore.getReport(reportId);
    if (!report) {
      return NextResponse.json(
        { success: false, error: "REPORT_NOT_FOUND", message: "Report not found or expired" },
        { status: 404 }
      );
    }

    // Check optional token provided in query or header
    const tokenFromQuery = req.nextUrl.searchParams.get("token");
    const tokenFromHeader = req.headers.get("x-report-token");
    const providedToken = tokenFromQuery || tokenFromHeader;

    // Check expiration (30 days)
    if (new Date(report.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, error: "REPORT_EXPIRED", message: "This report has expired after 30 days" },
        { status: 410 }
      );
    }

    if (report.isUnlocked) {
      return NextResponse.json(
        {
          success: true,
          reportId: report.id,
          isUnlocked: true,
          unlockedAt: report.unlockedAt,
          domain: report.domain,
          analysis: report.fullData,
        },
        { status: 200 }
      );
    }

    // Unpaid / free preview only
    return NextResponse.json(
      {
        success: true,
        reportId: report.id,
        isUnlocked: false,
        domain: report.domain,
        analysis: report.previewData,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Error retrieving report:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Failed to retrieve report" },
      { status: 500 }
    );
  }
}
