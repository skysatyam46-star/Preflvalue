import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ReportRecord, CreditRecord, TransactionRecord } from "@/types/payment";
import { AnalysisData } from "@/components/ResultsScreen";
import { sanitizeReportForPreview } from "./sanitizer";

// Persistent directory on disk
const DATA_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "data");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const CREDITS_DIR = path.join(DATA_DIR, "credits");
const TRANSACTIONS_DIR = path.join(DATA_DIR, "transactions");

// Ensure directories exist
function ensureDirs() {
  for (const dir of [DATA_DIR, REPORTS_DIR, CREDITS_DIR, TRANSACTIONS_DIR]) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        // Ignore if created concurrently
      }
    }
  }
}

// In-process lock mechanism for concurrency protection
const mutexLocks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  while (mutexLocks.has(key)) {
    try {
      await mutexLocks.get(key);
    } catch {
      // Ignore
    }
  }

  let resolveLock!: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  mutexLocks.set(key, lockPromise);

  try {
    return await fn();
  } finally {
    mutexLocks.delete(key);
    resolveLock();
  }
}

function atomicWriteJson(filePath: string, data: unknown): void {
  ensureDirs();
  const tempPath = `${filePath}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function safeReadJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Failed to read JSON at ${filePath}:`, err);
    return null;
  }
}

/**
 * Report Storage Implementation
 */
export class ReportStore {
  /**
   * Generates a new unique report ID and secure access token.
   */
  static generateIds(): { reportId: string; accessToken: string } {
    const reportId = `rep_${crypto.randomBytes(12).toString("hex")}`;
    const accessToken = `tok_${crypto.randomBytes(24).toString("hex")}`;
    return { reportId, accessToken };
  }

  /**
   * Saves a newly generated report.
   */
  static async saveNewReport(
    domain: string,
    url: string,
    fullData: AnalysisData,
    customReportId?: string,
    customAccessToken?: string
  ): Promise<ReportRecord> {
    ensureDirs();
    const { reportId, accessToken } = customReportId && customAccessToken
      ? { reportId: customReportId, accessToken: customAccessToken }
      : this.generateIds();

    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day retention

    const previewData = sanitizeReportForPreview(fullData, reportId);
    previewData.domain = domain;

    const fullDataWithMeta: AnalysisData = {
      ...fullData,
      domain,
      reportId,
      isUnlocked: false,
    };

    const record: ReportRecord = {
      id: reportId,
      accessToken,
      domain,
      url,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      isUnlocked: false,
      previewData,
      fullData: fullDataWithMeta,
      version: "1.0",
    };

    const filePath = path.join(REPORTS_DIR, `${reportId}.json`);
    await withLock(`report:${reportId}`, async () => {
      atomicWriteJson(filePath, record);
    });

    return record;
  }

  /**
   * Retrieves a report by ID.
   */
  static async getReport(reportId: string): Promise<ReportRecord | null> {
    ensureDirs();
    if (!reportId || typeof reportId !== "string" || reportId.includes("..") || reportId.includes("/")) {
      return null;
    }
    const filePath = path.join(REPORTS_DIR, `${reportId}.json`);
    return safeReadJson<ReportRecord>(filePath);
  }

  /**
   * Unlocks an existing report.
   */
  static async unlockReport(
    reportId: string,
    customerEmail?: string,
    purchaseId?: string
  ): Promise<ReportRecord | null> {
    ensureDirs();
    const filePath = path.join(REPORTS_DIR, `${reportId}.json`);

    return withLock(`report:${reportId}`, async () => {
      const existing = safeReadJson<ReportRecord>(filePath);
      if (!existing) return null;

      if (existing.isUnlocked) {
        return existing; // Already unlocked
      }

      const now = new Date().toISOString();
      const unlockedFullData: AnalysisData = {
        ...existing.fullData,
        reportId,
        isUnlocked: true,
        unlockedAt: now,
      };

      const updatedRecord: ReportRecord = {
        ...existing,
        isUnlocked: true,
        unlockedAt: now,
        customerEmail: customerEmail || existing.customerEmail,
        purchaseId: purchaseId || existing.purchaseId,
        fullData: unlockedFullData,
      };

      atomicWriteJson(filePath, updatedRecord);
      return updatedRecord;
    });
  }

  /**
   * Gets or initializes a customer credit record.
   */
  static async getCustomerCredits(email: string): Promise<CreditRecord> {
    ensureDirs();
    const normalizedEmail = (email || "").trim().toLowerCase();
    const safeHash = crypto.createHash("sha256").update(normalizedEmail).digest("hex");
    const filePath = path.join(CREDITS_DIR, `${safeHash}.json`);

    const existing = safeReadJson<CreditRecord>(filePath);
    if (existing) return existing;

    return {
      customerEmail: normalizedEmail,
      creditsRemaining: 0,
      totalPurchased: 0,
      unlockedReportIds: [],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Grants credits and unlocks the current report atomically.
   */
  static async grantCreditsAndUnlock(
    email: string,
    reportId: string,
    planCredits: number, // 1 for single ($5), 3 for pack ($12)
    purchaseId: string
  ): Promise<{ success: boolean; remainingCredits: number; report: ReportRecord | null }> {
    ensureDirs();
    const normalizedEmail = (email || "").trim().toLowerCase();
    const safeHash = crypto.createHash("sha256").update(normalizedEmail).digest("hex");
    const creditFilePath = path.join(CREDITS_DIR, `${safeHash}.json`);

    return withLock(`credits:${normalizedEmail}`, async () => {
      // 1. Unlock the current report
      const unlockedReport = await this.unlockReport(reportId, normalizedEmail, purchaseId);

      // 2. Calculate remaining credits:
      // Single report ($5): credits = 1, current unlocked = 1 => 0 remaining
      // 3-pack ($12): credits = 3, current unlocked = 1 => 2 remaining
      const currentRecord = safeReadJson<CreditRecord>(creditFilePath) || {
        customerEmail: normalizedEmail,
        creditsRemaining: 0,
        totalPurchased: 0,
        unlockedReportIds: [],
        updatedAt: new Date().toISOString(),
      };

      const addedRemainingCredits = Math.max(0, planCredits - 1);
      const updatedCreditsRemaining = currentRecord.creditsRemaining + addedRemainingCredits;
      const updatedTotalPurchased = currentRecord.totalPurchased + planCredits;
      const updatedUnlockedIds = Array.from(new Set([...currentRecord.unlockedReportIds, reportId]));

      const updatedRecord: CreditRecord = {
        customerEmail: normalizedEmail,
        creditsRemaining: updatedCreditsRemaining,
        totalPurchased: updatedTotalPurchased,
        unlockedReportIds: updatedUnlockedIds,
        updatedAt: new Date().toISOString(),
      };

      atomicWriteJson(creditFilePath, updatedRecord);

      return {
        success: true,
        remainingCredits: updatedCreditsRemaining,
        report: unlockedReport,
      };
    });
  }

  /**
   * Consumes 1 credit from customer balance to unlock a new report.
   */
  static async consumeCreditForReport(
    email: string,
    reportId: string
  ): Promise<{ success: boolean; remainingCredits: number; error?: string; report?: ReportRecord | null }> {
    ensureDirs();
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, remainingCredits: 0, error: "EMAIL_REQUIRED" };
    }

    const safeHash = crypto.createHash("sha256").update(normalizedEmail).digest("hex");
    const creditFilePath = path.join(CREDITS_DIR, `${safeHash}.json`);

    return withLock(`credits:${normalizedEmail}`, async () => {
      // 1. Check if report already exists and if it is already unlocked
      const report = await this.getReport(reportId);
      if (!report) {
        const currentRec = safeReadJson<CreditRecord>(creditFilePath);
        return { success: false, remainingCredits: currentRec ? currentRec.creditsRemaining : 0, error: "REPORT_NOT_FOUND" };
      }

      const record = safeReadJson<CreditRecord>(creditFilePath);

      if (report.isUnlocked) {
        // Report is already unlocked; do not consume another credit!
        return {
          success: true,
          remainingCredits: record ? record.creditsRemaining : 0,
          report,
        };
      }

      if (!record || record.creditsRemaining < 1) {
        return {
          success: false,
          remainingCredits: record ? record.creditsRemaining : 0,
          error: "INSUFFICIENT_CREDITS",
        };
      }

      // Deduct 1 credit
      const newRemaining = record.creditsRemaining - 1;
      const updatedRecord: CreditRecord = {
        ...record,
        creditsRemaining: newRemaining,
        unlockedReportIds: Array.from(new Set([...record.unlockedReportIds, reportId])),
        updatedAt: new Date().toISOString(),
      };

      atomicWriteJson(creditFilePath, updatedRecord);

      // Unlock report
      const unlocked = await this.unlockReport(reportId, normalizedEmail, `credit_redemption_${Date.now()}`);

      return {
        success: true,
        remainingCredits: newRemaining,
        report: unlocked,
      };
    });
  }

  /**
   * Checks if a transaction has already been processed (Idempotency).
   */
  static async isTransactionProcessed(transactionId: string): Promise<boolean> {
    ensureDirs();
    if (!transactionId) return false;
    const safeTxId = transactionId.replace(/[^a-zA-Z0-9_-]/g, "");
    const txFilePath = path.join(TRANSACTIONS_DIR, `${safeTxId}.json`);
    return fs.existsSync(txFilePath);
  }

  /**
   * Records a processed transaction.
   */
  static async recordTransaction(tx: TransactionRecord): Promise<void> {
    ensureDirs();
    const safeTxId = tx.transactionId.replace(/[^a-zA-Z0-9_-]/g, "");
    const txFilePath = path.join(TRANSACTIONS_DIR, `${safeTxId}.json`);

    await withLock(`tx:${safeTxId}`, async () => {
      atomicWriteJson(txFilePath, tx);
    });
  }

  /**
   * Handles refund or chargeback reversal.
   */
  static async handleRefund(transactionId: string): Promise<boolean> {
    ensureDirs();
    const safeTxId = transactionId.replace(/[^a-zA-Z0-9_-]/g, "");
    const txFilePath = path.join(TRANSACTIONS_DIR, `${safeTxId}.json`);

    return withLock(`tx:${safeTxId}`, async () => {
      const existing = safeReadJson<TransactionRecord>(txFilePath);
      if (!existing) return false;

      const updated: TransactionRecord = {
        ...existing,
        status: "refunded",
        processedAt: new Date().toISOString(),
      };
      atomicWriteJson(txFilePath, updated);
      return true;
    });
  }
}
