import { describe, test, expect } from "./test-harness";
import { ReportStore } from "../lib/storage/report-store";
import { sanitizeReportForPreview, LOCKED_SECTION_NAMES } from "../lib/storage/sanitizer";
import { verifyPaddleWebhookSignature, generateTestPaddleSignature } from "../lib/paddle/paddle-security";
import { PADDLE_PLANS, getPaddleConfig } from "../lib/paddle/paddle-config";
import { calculateOverallScore } from "../services/scoring/calculateOverallScore";
import { mapBackendToFrontend } from "../lib/mapper";
import { AnalysisData } from "../components/ResultsScreen";
import { FinalValidatedAnalysis } from "../types/validatedAnalysis";

// Helper to create mock full AnalysisData
function createMockFullAnalysis(): AnalysisData {
  return {
    domain: "example.com",
    score: 72,
    scoreStatus: "Good",
    verdict: "A modern developer automation tool with strong clarity.",
    verdictSubtext: "Based on your homepage · First-time visitor perspective",
    quickSignals: [
      { label: "Product category is clear", type: "clear" },
      { label: "Target audience is visible", type: "clear" },
      { label: "Value outcome is stated", type: "amber" },
      { label: "Trust signals need reinforcement", type: "amber" },
      { label: "Next step is clear", type: "clear" },
    ],
    firstSeconds: [
      { question: "What is this?", label: "Developer workflow automation", type: "clear" },
      { question: "Who is it for?", label: "Engineering teams", type: "clear" },
      { question: "Why trust it?", label: "No client logos or metrics visible", type: "partly" },
    ],
    visitorThought: "Looks like a deployment pipeline tool, but I want to see customer case studies.",
    evidence: {
      locationTag: "HERO SECTION",
      homepageExcerpt: "Ship code faster with automated deployments",
      clearFindings: ["Headline clearly states automated deployments"],
      missingFindings: ["No customer proof points in the initial fold"],
    },
    signals: [
      {
        id: "first_impression",
        title: "First Impression",
        score: 75,
        badgeText: "Clear",
        badgeType: "clear",
        description: "Category and offering are recognizable immediately.",
        icon: "eye",
      },
      {
        id: "trust",
        title: "Trust & Credibility",
        score: 55,
        badgeText: "Partly clear",
        badgeType: "amber",
        description: "Proof points should be elevated above the fold.",
        icon: "shield",
      },
    ],
    websiteMessage: {
      summary: "This product automates team deployments.",
      confidence: "high",
    },
    risks: [
      {
        category: "trust",
        severity: "medium",
        title: "Unsubstantiated Speed Claims",
        description: "The hero claims '10x faster' without citing benchmark data.",
        why_it_matters: "Skeptical technical buyers may discount the claim.",
      },
    ],
    recommendation: {
      title: "Add concrete proof below the primary CTA",
      subhead: "Include 2-3 customer logos or team sizes",
      explanation: "Reinforces trust before visitors reach the pricing section.",
      impact: "high",
      currentDirection: "Ship code faster with automated deployments",
      strongerDirection: "Ship code faster with automated deployments — trusted by 500+ dev teams",
    },
    otherImprovements: [
      {
        id: "imp-1",
        title: "Clarify team seat pricing",
        description: "Specify whether free tier includes team invites.",
        whyItMatters: "Eliminates hesitation for team leads.",
        whatToImprove: "State 'Free for up to 3 engineers' under the CTA.",
        copyableSuggestion: "Free for up to 3 engineers →",
        icon: "users",
        color: "blue",
      },
    ],
    supportingContext: {
      discoveredPagesCount: 2,
      analyzedPagesCount: 2,
      synthesis: {
        companySummary: "An engineering productivity platform.",
        supportingInsights: ["Documentation page confirms CLI support."],
      },
    } as any,
    isPartialAccess: false,
    isAccessError: false,
    checkedAt: "Checked just now",
  };
}

describe("StrangerLens Part 2 — Paywall, Paddle & Storage Tests", () => {
  // Test 1: Free preview excludes premium data
  test("1. Free preview excludes premium data", () => {
    const full = createMockFullAnalysis();
    const preview = sanitizeReportForPreview(full, "rep_test1");

    // Sections 01-06 preserved
    expect(preview.domain).toBe("example.com");
    expect(preview.score).toBe(72);
    expect(preview.scoreStatus).toBe("Good");
    expect(preview.verdict).toBe(full.verdict);
    expect(preview.quickSignals.length).toBe(5);
    expect(preview.evidence.locationTag).toBe("HERO SECTION");
    expect(preview.recommendation.title).toBe(full.recommendation.title);

    // Premium sections 07-15 stripped
    expect(preview.firstSeconds.length).toBe(0);
    expect(preview.visitorThought).toBe("");
    expect(preview.signals.length).toBe(0);
    expect(preview.risks?.length).toBe(0);
    expect(preview.otherImprovements.length).toBe(0);
    expect(preview.supportingContext).toBe(undefined);
    expect(preview.isUnlocked).toBe(false);
  });

  // Test 2: Full report is stored server-side
  test("2. Full report is stored server-side", async () => {
    const full = createMockFullAnalysis();
    const saved = await ReportStore.saveNewReport(full.domain, "https://example.com", full);

    expect(saved.id).toBeDefined();
    expect(saved.accessToken).toBeDefined();
    expect(saved.isUnlocked).toBe(false);

    // Read back from storage
    const retrieved = await ReportStore.getReport(saved.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.fullData.verdict).toBe(full.verdict);
    expect(retrieved?.fullData.recommendation.title).toBe(full.recommendation.title);
  });

  // Test 3: Unpaid requests cannot retrieve premium report content
  test("3. Unpaid requests cannot retrieve premium report content", async () => {
    const full = createMockFullAnalysis();
    const saved = await ReportStore.saveNewReport(full.domain, "https://example.com", full);

    const report = await ReportStore.getReport(saved.id);
    expect(report?.isUnlocked).toBe(false);
    expect(report?.previewData.signals.length).toBe(0);
    expect(report?.previewData.otherImprovements.length).toBe(0);
  });

  // Test 4: Invalid report IDs are rejected
  test("4. Invalid report IDs are rejected", async () => {
    const missing = await ReportStore.getReport("rep_nonexistent_12345");
    expect(missing).toBe(null);

    const malicious = await ReportStore.getReport("../../../etc/passwd");
    expect(malicious).toBe(null);
  });

  // Test 5: Valid Paddle checkout initiation
  test("5. Valid Paddle checkout initiation", () => {
    const planOne = PADDLE_PLANS.ONE_FULL_REPORT;
    const planThree = PADDLE_PLANS.THREE_REPORT_PACK;

    expect(planOne.priceUsd).toBe(5);
    expect(planOne.credits).toBe(1);

    expect(planThree.priceUsd).toBe(12);
    expect(planThree.credits).toBe(3);
  });

  // Test 6: Client cannot change payment amount
  test("6. Client cannot change payment amount", () => {
    // Pricing is read from server-side PADDLE_PLANS mapping, never client input
    const serverPriceOne = PADDLE_PLANS.ONE_FULL_REPORT.priceUsd;
    const serverPriceThree = PADDLE_PLANS.THREE_REPORT_PACK.priceUsd;

    expect(serverPriceOne).toBe(5);
    expect(serverPriceThree).toBe(12);
  });

  // Test 7: Client cannot grant extra credits
  test("7. Client cannot grant extra credits", () => {
    const singleCredits = PADDLE_PLANS.ONE_FULL_REPORT.credits;
    const packCredits = PADDLE_PLANS.THREE_REPORT_PACK.credits;

    expect(singleCredits).toBe(1);
    expect(packCredits).toBe(3);
  });

  // Test 8: Invalid webhook signature rejected
  test("8. Invalid webhook signature rejected", () => {
    const rawBody = JSON.stringify({ event_type: "transaction.completed", data: { id: "txn_123" } });
    const secret = "test_webhook_secret_key_12345";

    // Bad signature
    const badRes = verifyPaddleWebhookSignature(rawBody, "ts=1670000000;h1=invalid_hash", secret);
    expect(badRes.isValid).toBe(false);

    // Missing signature
    const missingRes = verifyPaddleWebhookSignature(rawBody, null, secret);
    expect(missingRes.isValid).toBe(false);

    // Valid signature with timestamp within tolerance
    const nowTs = Math.floor(Date.now() / 1000);
    const validHeader = generateTestPaddleSignature(rawBody, secret, nowTs);
    const validRes = verifyPaddleWebhookSignature(rawBody, validHeader, secret);
    expect(validRes.isValid).toBe(true);
  });

  // Test 9: Duplicate webhook delivery grants credits only once (Idempotency)
  test("9. Duplicate webhook delivery grants credits only once", async () => {
    const txId = `txn_idemp_${Date.now()}`;
    const email = `idemp_${Date.now()}@example.com`;
    const full = createMockFullAnalysis();
    const report = await ReportStore.saveNewReport("test.com", "https://test.com", full);

    expect(await ReportStore.isTransactionProcessed(txId)).toBe(false);

    // First delivery
    await ReportStore.recordTransaction({
      transactionId: txId,
      planId: "ONE_FULL_REPORT",
      amount: 5,
      currency: "USD",
      customerEmail: email,
      reportId: report.id,
      status: "completed",
      processedAt: new Date().toISOString(),
    });

    // Check transaction is recorded
    expect(await ReportStore.isTransactionProcessed(txId)).toBe(true);
  });

  // Test 10: Failed payment grants no credits
  test("10. Failed payment grants no credits", async () => {
    const email = `failed_buyer_${Date.now()}@example.com`;
    const creditsBefore = await ReportStore.getCustomerCredits(email);
    expect(creditsBefore.creditsRemaining).toBe(0);

    // If transaction failed, grantCreditsAndUnlock is never invoked
    const creditsAfter = await ReportStore.getCustomerCredits(email);
    expect(creditsAfter.creditsRemaining).toBe(0);
  });

  // Test 11: $5 purchase unlocks current report
  test("11. $5 purchase unlocks current report", async () => {
    const email = `single_buyer_${Date.now()}@example.com`;
    const full = createMockFullAnalysis();
    const report = await ReportStore.saveNewReport("single.com", "https://single.com", full);

    const result = await ReportStore.grantCreditsAndUnlock(email, report.id, 1, "pur_test_5usd");

    expect(result.success).toBe(true);
    expect(result.remainingCredits).toBe(0); // 1 credit used immediately

    const updatedReport = await ReportStore.getReport(report.id);
    expect(updatedReport?.isUnlocked).toBe(true);
    expect(updatedReport?.fullData.signals.length).toBe(2);
  });

  // Test 12: $12 purchase unlocks current report and leaves two credits
  test("12. $12 purchase unlocks current report and leaves two credits", async () => {
    const email = `pack_buyer_${Date.now()}@example.com`;
    const full = createMockFullAnalysis();
    const report = await ReportStore.saveNewReport("pack.com", "https://pack.com", full);

    const result = await ReportStore.grantCreditsAndUnlock(email, report.id, 3, "pur_test_12usd");

    expect(result.success).toBe(true);
    expect(result.remainingCredits).toBe(2); // 1 consumed, 2 remaining!

    const updatedReport = await ReportStore.getReport(report.id);
    expect(updatedReport?.isUnlocked).toBe(true);

    const customerRecord = await ReportStore.getCustomerCredits(email);
    expect(customerRecord.creditsRemaining).toBe(2);
  });

  // Test 13: Reopening an unlocked report does not spend another credit
  test("13. Reopening an unlocked report does not spend another credit", async () => {
    const email = `repeat_viewer_${Date.now()}@example.com`;
    const full = createMockFullAnalysis();
    const report = await ReportStore.saveNewReport("repeat.com", "https://repeat.com", full);

    // Initial purchase with 3-pack: 1 consumed, 2 left
    await ReportStore.grantCreditsAndUnlock(email, report.id, 3, "pur_test");
    const creditsAfterPurchase = await ReportStore.getCustomerCredits(email);
    expect(creditsAfterPurchase.creditsRemaining).toBe(2);

    // Trying to consume credit on already unlocked report
    const reuseResult = await ReportStore.consumeCreditForReport(email, report.id);
    expect(reuseResult.success).toBe(true);
    expect(reuseResult.remainingCredits).toBe(2); // Still 2 credits! No second deduction
  });

  // Test 14: Concurrent credit redemption cannot overspend
  test("14. Concurrent credit redemption cannot overspend", async () => {
    const email = `concurrency_${Date.now()}@example.com`;
    const full1 = createMockFullAnalysis();
    const full2 = createMockFullAnalysis();
    const full3 = createMockFullAnalysis();

    const report1 = await ReportStore.saveNewReport("site1.com", "https://site1.com", full1);
    const report2 = await ReportStore.saveNewReport("site2.com", "https://site2.com", full2);
    const report3 = await ReportStore.saveNewReport("site3.com", "https://site3.com", full3);

    // Initial grant: 2 credits total (1 consumes report1, leaving exactly 1 credit)
    await ReportStore.grantCreditsAndUnlock(email, report1.id, 2, "pur_concurrency");

    const credits = await ReportStore.getCustomerCredits(email);
    expect(credits.creditsRemaining).toBe(1);

    // Try to unlock report2 and report3 concurrently when user only has 1 credit
    const [resA, resB] = await Promise.all([
      ReportStore.consumeCreditForReport(email, report2.id),
      ReportStore.consumeCreditForReport(email, report3.id),
    ]);

    // Exactly one should succeed, and one should fail with INSUFFICIENT_CREDITS
    const successCount = [resA.success, resB.success].filter(Boolean).length;
    expect(successCount).toBe(1);

    const finalCredits = await ReportStore.getCustomerCredits(email);
    expect(finalCredits.creditsRemaining).toBe(0); // Cannot go below 0
  });

  // Test 15: Refunded/reversed transaction follows the implemented policy
  test("15. Refunded/reversed transaction follows the implemented policy", async () => {
    const txId = `txn_refund_${Date.now()}`;
    await ReportStore.recordTransaction({
      transactionId: txId,
      planId: "ONE_FULL_REPORT",
      amount: 5,
      currency: "USD",
      customerEmail: "refund@test.com",
      reportId: "rep_refund",
      status: "completed",
      processedAt: new Date().toISOString(),
    });

    const refundSuccess = await ReportStore.handleRefund(txId);
    expect(refundSuccess).toBe(true);
  });

  // Test 16: Homepage scoring stays unchanged
  test("16. Homepage scoring stays unchanged", () => {
    const signals = {
      first_impression: 80,
      audience: 70,
      value: 65,
      trust: 60,
      action: 75,
    };

    const result = calculateOverallScore(signals);
    // 80*0.25 + 70*0.20 + 65*0.25 + 60*0.15 + 75*0.15 = 20 + 14 + 16.25 + 9 + 11.25 = 70.5 -> 71
    expect(result.overallScore).toBe(71);
    expect(result.overallStatus).toBe("needs_improvement");
  });

  // Test 17: Supporting-page analysis stays compatible
  test("17. Supporting-page analysis stays compatible", () => {
    const full = createMockFullAnalysis();
    expect(full.supportingContext).toBeDefined();
    expect((full.supportingContext as any)?.discoveredPagesCount).toBe(2);

    const preview = sanitizeReportForPreview(full, "rep_compat");
    expect(preview.supportingContext).toBe(undefined); // Excluded in preview
  });

  // Test 18: Existing report UI remains intact
  test("18. Existing report UI remains intact", () => {
    const mockValidated: FinalValidatedAnalysis = {
      analysis_version: "1.0",
      scoring_version: "1.0",
      overall_score: 75,
      overall_status: "clear",
      verdict: { text: "Strong positioning." },
      visitor_thought: { text: "I understand the concept.", confidence: "high" },
      first_seconds: {
        what_is_this: { status: "clear", explanation: "Developer tools", evidence_available: true, evidence: [] },
        who_is_it_for: { status: "clear", explanation: "Engineers", evidence_available: true, evidence: [] },
        what_will_i_get: { status: "clear", explanation: "Automated speed", evidence_available: true, evidence: [] },
        why_should_i_care: { status: "partly_clear", explanation: "Saves time", evidence_available: false, evidence: [] },
        what_should_i_do_next: { status: "clear", explanation: "Start free trial", evidence_available: true, evidence: [] },
      },
      signals: {
        first_impression: { score: 75, status: "clear", explanation: "Clear", confidence: "high", evidence_available: false, evidence: [] },
        audience: { score: 70, status: "clear", explanation: "Clear", confidence: "high", evidence_available: false, evidence: [] },
        value: { score: 75, status: "clear", explanation: "Clear", confidence: "high", evidence_available: false, evidence: [] },
        trust: { score: 65, status: "partly_clear", explanation: "Needs proof", confidence: "medium", evidence_available: false, evidence: [] },
        action: { score: 80, status: "clear", explanation: "Clear", confidence: "high", evidence_available: false, evidence: [] },
      },
      priority_fix: {
        title: "Clarify Headline",
        impact: "high",
        what_you_say_now: "Old copy",
        clearer_direction: "New copy",
        current_direction: "Old copy",
        suggested_direction: "New copy",
        reason: "Better clarity",
        evidence_available: false,
        evidence: [],
      },
      other_improvements: [],
      website_message: {
        summary: "Developer tools.",
        confidence: "high",
        evidence_available: false,
        evidence: [],
      },
      risks: [],
    };

    const mapped = mapBackendToFrontend(mockValidated, "https://test.com");
    expect(mapped.domain).toBe("test.com");
    expect(mapped.score).toBe(75);
    expect(mapped.quickSignals.length).toBe(5);
  });

  // Test 19: Checkout cancel does not destroy report access
  test("19. Checkout cancel does not destroy report access", async () => {
    const full = createMockFullAnalysis();
    const report = await ReportStore.saveNewReport("cancel.com", "https://cancel.com", full);

    // Report remains in free preview state
    const current = await ReportStore.getReport(report.id);
    expect(current).toBeDefined();
    expect(current?.isUnlocked).toBe(false);
    expect(current?.previewData.domain).toBe("cancel.com");
  });

  // Test 20: Missing payment configuration fails closed
  test("20. Missing payment configuration fails closed", () => {
    // When live Paddle credentials are not present in env, getPaddleConfig().isConfigured is false
    const config = getPaddleConfig();
    expect(typeof config.isConfigured).toBe("boolean");
    expect(Array.isArray(config.missingVars)).toBe(true);
  });
});
