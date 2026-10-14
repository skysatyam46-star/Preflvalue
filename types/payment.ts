import { AnalysisData } from "@/components/ResultsScreen";

export type PaymentPlanId = "ONE_FULL_REPORT" | "THREE_REPORT_PACK";

export interface PaymentPlanConfig {
  id: PaymentPlanId;
  name: string;
  priceUsd: number;
  credits: number;
  description: string;
  popular?: boolean;
}

export interface ReportRecord {
  id: string; // e.g. "rep_abc123"
  accessToken: string; // Secure random token
  domain: string;
  url: string;
  createdAt: string; // ISO
  expiresAt: string; // ISO (e.g. 30-day retention)
  isUnlocked: boolean;
  unlockedAt?: string;
  customerEmail?: string;
  purchaseId?: string;
  previewData: AnalysisData;
  fullData: AnalysisData;
  version: string;
}

export interface CreditRecord {
  customerEmail: string;
  creditsRemaining: number;
  totalPurchased: number;
  unlockedReportIds: string[];
  updatedAt: string;
}

export interface TransactionRecord {
  transactionId: string; // Paddle transaction ID
  eventId?: string; // Paddle event ID
  planId: PaymentPlanId;
  amount: number;
  currency: string;
  customerEmail: string;
  reportId: string;
  status: "completed" | "paid" | "refunded" | "reversed" | "disputed";
  processedAt: string;
}

export interface SanitizedPreviewResponse {
  reportId: string;
  isUnlocked: boolean;
  previewData: AnalysisData;
  lockedSections: string[];
}
