import { NextRequest, NextResponse } from "next/server";
import { ReportStore } from "@/lib/storage/report-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports/unlock-with-credit
 * Unlocks a report using an available pre-purchased report credit (e.g. from a 3-pack).
 */
export async function POST(req: NextRequest) {
  try {
    let body: { email?: unknown; reportId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_JSON", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "EMAIL_REQUIRED", message: "Email address is required to locate credits" },
        { status: 400 }
      );
    }

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "REPORT_ID_REQUIRED", message: "Report ID is required" },
        { status: 400 }
      );
    }

    const result = await ReportStore.consumeCreditForReport(email, reportId);

    if (!result.success) {
      const statusCode = result.error === "INSUFFICIENT_CREDITS" ? 402 : 400;
      return NextResponse.json(
        {
          success: false,
          error: result.error || "UNLOCK_FAILED",
          message:
            result.error === "INSUFFICIENT_CREDITS"
              ? "You do not have any available report credits remaining. Please purchase a report pack."
              : "Unable to unlock report with credit.",
          remainingCredits: result.remainingCredits,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reportId,
        remainingCredits: result.remainingCredits,
        isUnlocked: true,
        analysis: result.report?.fullData,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Error unlocking report with credit:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
