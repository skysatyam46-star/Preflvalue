import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ReportStore } from "@/lib/storage/report-store";
import { PADDLE_PLANS, getPaddleConfig, getPriceIdForPlan } from "@/lib/paddle/paddle-config";
import { PaymentPlanId } from "@/types/payment";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/create
 * Creates a verified checkout intent for Paddle Billing.
 * Validates report ID, enforces server-side prices, and links to unique purchase identifier.
 */
export async function POST(req: NextRequest) {
  try {
    let body: {
      reportId?: unknown;
      accessToken?: unknown;
      planId?: unknown;
      customerEmail?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_JSON", message: "Invalid request payload" },
        { status: 400 }
      );
    }

    const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    const rawPlanId = typeof body.planId === "string" ? body.planId.trim() : "";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: "MISSING_REPORT_ID", message: "Valid reportId is required" },
        { status: 400 }
      );
    }

    // 1. Verify Report Existence
    const report = await ReportStore.getReport(reportId);
    if (!report) {
      return NextResponse.json(
        { success: false, error: "REPORT_NOT_FOUND", message: "Report not found or has expired" },
        { status: 404 }
      );
    }

    // 2. Check if already unlocked (Never double charge!)
    if (report.isUnlocked) {
      return NextResponse.json(
        {
          success: true,
          alreadyUnlocked: true,
          message: "This report has already been unlocked.",
          reportId: report.id,
        },
        { status: 200 }
      );
    }

    // 3. Validate Plan ID
    if (rawPlanId !== "ONE_FULL_REPORT" && rawPlanId !== "THREE_REPORT_PACK") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_PLAN",
          message: "Invalid plan specified. Supported plans: ONE_FULL_REPORT ($5), THREE_REPORT_PACK ($12).",
        },
        { status: 400 }
      );
    }
    const planId: PaymentPlanId = rawPlanId;
    const planConfig = PADDLE_PLANS[planId];

    // 4. Check if customer already has credits available (e.g. from previous 3-pack)
    if (customerEmail) {
      const creditRecord = await ReportStore.getCustomerCredits(customerEmail);
      if (creditRecord.creditsRemaining > 0) {
        return NextResponse.json(
          {
            success: true,
            hasCreditsAvailable: true,
            creditsRemaining: creditRecord.creditsRemaining,
            message: `You have ${creditRecord.creditsRemaining} unused report credit(s). You can unlock this report directly with your existing credit without paying again.`,
            reportId,
          },
          { status: 200 }
        );
      }
    }

    // 5. Check Paddle Gateway Configuration
    const paddleConfig = getPaddleConfig();
    const purchaseId = `pur_${crypto.randomBytes(12).toString("hex")}`;

    // If Paddle is not configured, fail closed as required
    if (!paddleConfig.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: "PAYMENT_UNCONFIGURED",
          message: "Paddle payment gateway is not yet configured with required live credentials.",
          missingVars: paddleConfig.missingVars,
          plan: {
            id: planId,
            name: planConfig.name,
            priceUsd: planConfig.priceUsd,
          },
        },
        { status: 503 }
      );
    }

    const priceId = getPriceIdForPlan(planId);
    if (!priceId) {
      return NextResponse.json(
        {
          success: false,
          error: "PRICE_ID_MISSING",
          message: `Paddle price ID for plan ${planId} is missing in configuration.`,
        },
        { status: 500 }
      );
    }

    // 6. Return verified checkout intent parameters for client Paddle Overlay
    return NextResponse.json(
      {
        success: true,
        purchaseId,
        reportId: report.id,
        planId: planConfig.id,
        priceUsd: planConfig.priceUsd, // Server-side validated price ($5 or $12)
        credits: planConfig.credits,
        paddle: {
          environment: paddleConfig.environment,
          clientToken: paddleConfig.clientToken,
          priceId,
          customData: {
            reportId: report.id,
            accessToken: report.accessToken,
            planId: planConfig.id,
            purchaseId,
            customerEmail: customerEmail || "",
          },
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Error creating checkout intent:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Failed to create checkout intent" },
      { status: 500 }
    );
  }
}
