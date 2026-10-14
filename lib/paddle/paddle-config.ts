import { PaymentPlanConfig, PaymentPlanId } from "@/types/payment";

export const PADDLE_PLANS: Record<PaymentPlanId, PaymentPlanConfig> = {
  ONE_FULL_REPORT: {
    id: "ONE_FULL_REPORT",
    name: "One Full Report",
    priceUsd: 5,
    credits: 1,
    description: "Unlocks this full report. One-time payment.",
    popular: true,
  },
  THREE_REPORT_PACK: {
    id: "THREE_REPORT_PACK",
    name: "3 Full Reports",
    priceUsd: 12,
    credits: 3,
    description: "Unlocks this report and gives 2 credits for future website analyses.",
    popular: false,
  },
};

export interface PaddleEnvironmentConfig {
  isConfigured: boolean;
  environment: "sandbox" | "production";
  clientToken: string | null;
  apiKey: string | null;
  webhookSecret: string | null;
  priceIdOneReport: string | null;
  priceIdThreeReports: string | null;
  missingVars: string[];
}

export function getPaddleConfig(): PaddleEnvironmentConfig {
  const environment = (process.env.NEXT_PUBLIC_PADDLE_ENV || process.env.PADDLE_ENV || "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";

  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || process.env.PADDLE_CLIENT_TOKEN || null;
  const apiKey = process.env.PADDLE_API_KEY || null;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY || null;
  const priceIdOneReport = process.env.PADDLE_PRICE_ID_ONE || null;
  const priceIdThreeReports = process.env.PADDLE_PRICE_ID_THREE || null;

  const missingVars: string[] = [];
  if (!clientToken) missingVars.push("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
  if (!apiKey) missingVars.push("PADDLE_API_KEY");
  if (!webhookSecret) missingVars.push("PADDLE_WEBHOOK_SECRET_KEY");
  if (!priceIdOneReport) missingVars.push("PADDLE_PRICE_ID_ONE");
  if (!priceIdThreeReports) missingVars.push("PADDLE_PRICE_ID_THREE");

  const isConfigured = missingVars.length === 0;

  return {
    isConfigured,
    environment,
    clientToken,
    apiKey,
    webhookSecret,
    priceIdOneReport,
    priceIdThreeReports,
    missingVars,
  };
}

export function getPriceIdForPlan(planId: PaymentPlanId): string | null {
  const config = getPaddleConfig();
  if (planId === "ONE_FULL_REPORT") {
    return config.priceIdOneReport;
  }
  if (planId === "THREE_REPORT_PACK") {
    return config.priceIdThreeReports;
  }
  return null;
}
