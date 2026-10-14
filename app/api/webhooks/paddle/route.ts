import { NextRequest, NextResponse } from "next/server";
import { verifyPaddleWebhookSignature } from "@/lib/paddle/paddle-security";
import { ReportStore } from "@/lib/storage/report-store";
import { PADDLE_PLANS } from "@/lib/paddle/paddle-config";
import { PaymentPlanId, TransactionRecord } from "@/types/payment";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/paddle
 * Secure, verified Paddle Billing webhook endpoint.
 * Enforces raw body HMAC-SHA256 signature verification, replay protection, and idempotent fulfillment.
 */
export async function POST(req: NextRequest) {
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", message: "Could not read raw body" },
      { status: 400 }
    );
  }

  const signatureHeader = req.headers.get("paddle-signature");
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY;

  // 1. Signature Verification
  const verification = verifyPaddleWebhookSignature(rawBody, signatureHeader, webhookSecret);
  if (!verification.isValid) {
    console.warn("Paddle webhook signature verification failed:", verification.error);
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid or missing webhook signature", reason: verification.error },
      { status: 401 }
    );
  }

  // 2. Parse Event JSON
  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Webhook body is not valid JSON" },
      { status: 400 }
    );
  }

  const eventType = eventPayload?.event_type || eventPayload?.eventType || "";
  const eventId = eventPayload?.event_id || eventPayload?.notification_id || `evt_${Date.now()}`;
  const data = eventPayload?.data || {};
  const transactionId = data?.id || data?.transaction_id || "";

  if (!transactionId) {
    // Acknowledge non-transaction events (e.g. ping/heartbeat) safely
    return NextResponse.json({ received: true, ignored: true, eventType }, { status: 200 });
  }

  try {
    // 3. Idempotency Check
    const alreadyProcessed = await ReportStore.isTransactionProcessed(transactionId);
    if (alreadyProcessed) {
      return NextResponse.json(
        { received: true, status: "already_processed", transactionId },
        { status: 200 }
      );
    }

    // 4. Handle Successful Payment Events
    if (
      eventType === "transaction.completed" ||
      eventType === "transaction.paid" ||
      data?.status === "completed" ||
      data?.status === "paid"
    ) {
      const customData = data?.custom_data || {};
      const reportId = customData?.reportId || "";
      const rawPlanId = customData?.planId || "ONE_FULL_REPORT";
      const customerEmail =
        customData?.customerEmail ||
        data?.customer?.email ||
        data?.customer_email ||
        "customer@anonymous.com";
      const purchaseId = customData?.purchaseId || transactionId;

      const planId: PaymentPlanId =
        rawPlanId === "THREE_REPORT_PACK" ? "THREE_REPORT_PACK" : "ONE_FULL_REPORT";
      const planConfig = PADDLE_PLANS[planId];
      const planCredits = planConfig.credits; // 1 for single, 3 for pack

      const currency = data?.currency_code || data?.currency || "USD";
      const totalAmount = data?.details?.totals?.total
        ? parseFloat(data.details.totals.total) / 100
        : planConfig.priceUsd;

      // Atomic fulfillment: unlock report and update credits
      if (reportId) {
        await ReportStore.grantCreditsAndUnlock(
          customerEmail,
          reportId,
          planCredits,
          purchaseId
        );
      }

      // Record transaction for durable idempotency
      const record: TransactionRecord = {
        transactionId,
        eventId,
        planId,
        amount: totalAmount,
        currency,
        customerEmail,
        reportId,
        status: "completed",
        processedAt: new Date().toISOString(),
      };
      await ReportStore.recordTransaction(record);

      return NextResponse.json(
        {
          received: true,
          status: "fulfilled",
          transactionId,
          reportId,
          creditsGranted: planCredits,
        },
        { status: 200 }
      );
    }

    // 5. Handle Refund / Chargeback Reversals
    if (
      eventType === "transaction.refunded" ||
      eventType === "transaction.reversed" ||
      eventType === "adjustment.created" ||
      data?.status === "refunded"
    ) {
      await ReportStore.handleRefund(transactionId);
      return NextResponse.json(
        { received: true, status: "refund_recorded", transactionId },
        { status: 200 }
      );
    }

    // Other events acknowledged without state modification
    return NextResponse.json(
      { received: true, status: "unhandled_event", eventType },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Error processing Paddle webhook:", err);
    return NextResponse.json(
      { error: "PROCESSING_ERROR", message: "Failed to process webhook event" },
      { status: 500 }
    );
  }
}
