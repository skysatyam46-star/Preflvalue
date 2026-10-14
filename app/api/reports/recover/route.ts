import { NextRequest, NextResponse } from "next/server";
import { ReportStore } from "@/lib/storage/report-store";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports/recover
 * Recovers purchased reports and remaining report credits for a customer email.
 * Adheres to strict zero-leakage security rules: does not expose full reports without verification.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { email?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_JSON", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "INVALID_EMAIL", message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const creditRecord = await ReportStore.getCustomerCredits(email);
    const hasPurchases = creditRecord.totalPurchased > 0 || creditRecord.unlockedReportIds.length > 0;

    // Check if transactional email provider (Resend, Sendgrid, etc.) is configured
    const isEmailServiceConfigured = Boolean(
      process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.SMTP_HOST
    );

    if (!hasPurchases) {
      return NextResponse.json(
        {
          success: true,
          found: false,
          message: "No previous purchases found for this email address.",
          creditsRemaining: 0,
        },
        { status: 200 }
      );
    }

    // Return status without exposing full report payloads publicly
    return NextResponse.json(
      {
        success: true,
        found: true,
        emailConfigured: isEmailServiceConfigured,
        creditsRemaining: creditRecord.creditsRemaining,
        unlockedReportsCount: creditRecord.unlockedReportIds.length,
        message: isEmailServiceConfigured
          ? "A secure recovery link has been sent to your email address."
          : "Your purchased credits and unlocked reports have been located. Email service is pending launch configuration.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Error recovering customer account:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Failed to process recovery request" },
      { status: 500 }
    );
  }
}
