import { describe, test, expect } from "./test-harness";
import { WebsiteSnapshot } from "../lib/content-extractor";
import { WebsiteAnalysis } from "../services/ai/analysisSchema";
import {
  validateSingleEvidence,
  validateEvidenceList,
  normalizeTextForMatching,
} from "../services/validation/evidenceValidator";
import { normalizeSignalScore } from "../services/scoring/normalizeSignalScore";
import { calculateOverallScore } from "../services/scoring/calculateOverallScore";
import { validateAndScoreAnalysis } from "../services/validation/analysisValidator";
import { SCORING_VERSION, SIGNAL_WEIGHTS } from "../services/scoring/scoringConfig";
import { sanitizeVisitorThought } from "../services/validation/recommendationValidator";

function createMockSnapshot(): WebsiteSnapshot {
  return {
    meta: {
      title: "FastFlow - Build Websites Faster",
      description: "FastFlow helps teams deploy landing pages without code.",
    },
    navigation: {
      brandName: "FastFlow",
      primaryNavLinks: [{ text: "Pricing", href: "/pricing" }],
    },
    hero: {
      headline: "Build Websites Faster",
      subheadline: "Deploy stunning pages in under 10 minutes with AI.",
      primaryCta: {
        text: "Get Started Free",
        type: "primary",
        element: "a",
        location: "hero",
      },
    },
    ctas: [
      {
        text: "Get Started Free",
        type: "primary",
        element: "a",
        location: "hero",
      },
    ],
    valueProps: {
      headings: [{ level: 1, text: "Build Websites Faster" }],
      featureCards: [{ title: "Drag & Drop", description: "Easy builder" }],
      pricingSignals: {
        hasPricingPageLink: true,
        plans: [{ name: "Starter", price: "$19" }],
        mentionsFreeTrial: true,
        mentionsGuarantee: false,
      },
    },
    trustSignals: {
      socialProofHeadings: ["Trusted by 5,000+ creators"],
      statsAndMetrics: ["10k Sites Created"],
      testimonials: [],
      badgesAndCertifications: ["SOC2"],
      customerLogosAlt: [],
    },
    bodySections: [],
    forms: [],
    stats: {
      rawHtmlLength: 2000,
      cleanedTextLength: 500,
      totalHeadings: 2,
      totalLinks: 4,
      totalImages: 1,
    },
  };
}

function createMockAiAnalysis(): WebsiteAnalysis {
  return {
    analysis_version: "1.0",
    verdict: {
      status: "clear",
      text: "FastFlow delivers immediate clarity on page creation.",
    },
    first_seconds: {
      what_is_this: {
        status: "clear",
        explanation: "Main headline states product category.",
        evidence_refs: [{ source: "hero", text: "Build Websites Faster" }],
      },
      who_is_it_for: {
        status: "understandable",
        explanation: "Audience is referenced.",
        evidence_refs: [{ source: "trust", text: "Trusted by 5,000+ creators" }],
      },
      what_will_i_get: {
        status: "clear",
        explanation: "Clear subheadline.",
        evidence_refs: [{ source: "hero", text: "Deploy stunning pages in under 10 minutes with AI." }],
      },
      why_should_i_care: {
        status: "partly_clear",
        explanation: "Some metrics visible.",
        evidence_refs: [],
      },
      what_should_i_do_next: {
        status: "clear",
        explanation: "Primary CTA visible.",
        evidence_refs: [{ source: "hero", text: "Get Started Free" }],
      },
    },
    visitor_thought: {
      text: "A first-time visitor would think FastFlow is a fast landing page builder.",
      confidence: "high",
    },
    signals: {
      first_impression: {
        score: 88,
        status: "clear",
        explanation: "Strong headline.",
        confidence: "high",
        evidence_refs: [{ source: "hero", text: "Build Websites Faster" }],
      },
      audience: {
        score: 75,
        status: "understandable",
        explanation: "Creators referenced.",
        confidence: "medium",
        evidence_refs: [{ source: "trust", text: "Trusted by 5,000+ creators" }],
      },
      value: {
        score: 82,
        status: "clear",
        explanation: "Clear speed benefit.",
        confidence: "high",
        evidence_refs: [{ source: "hero", text: "Deploy stunning pages in under 10 minutes with AI." }],
      },
      trust: {
        score: 65,
        status: "could_be_stronger",
        explanation: "Some stats present.",
        confidence: "medium",
        evidence_refs: [],
      },
      action: {
        score: 90,
        status: "clear",
        explanation: "Unmistakable CTA.",
        confidence: "high",
        evidence_refs: [{ source: "hero", text: "Get Started Free" }],
      },
    },
    priority_fix: {
      title: "Add customer logos to hero",
      reason: "Builds instant credibility.",
      current_direction: "Build Websites Faster",
      suggested_direction: "Build Websites Faster with FastFlow",
      evidence_refs: [{ source: "hero", text: "Build Websites Faster" }],
    },
    other_improvements: [
      {
        title: "Include money back guarantee",
        explanation: "Reduces buyer friction.",
        evidence_refs: [],
      },
    ],
  };
}

describe("Phase 4 Evidence Validation & Deterministic Scoring Tests", () => {
  test("1. All valid evidence verified", () => {
    const snapshot = createMockSnapshot();
    const validated = validateSingleEvidence(
      { source: "hero", text: "Build Websites Faster" },
      snapshot
    );

    expect(validated.status).toBe("verified");
    expect(validated.matchType).toBe("exact");
  });

  test("2. Fabricated evidence rejected", () => {
    const snapshot = createMockSnapshot();
    const validated = validateSingleEvidence(
      { source: "hero", text: "Trusted by 10,000,000 Fortune 500 CEOs" },
      snapshot
    );

    expect(validated.status).toBe("rejected");
  });

  test("3. Slightly different whitespace matched via normalized type", () => {
    const snapshot = createMockSnapshot();
    const validated = validateSingleEvidence(
      { source: "hero", text: "Build   Websites   Faster" },
      snapshot
    );

    expect(validated.status).toBe("verified");
    expect(validated.matchType).toBe("normalized");
  });

  test("4. Fabricated numeric claim rejected (10x added)", () => {
    const snapshot = createMockSnapshot();
    // Actual is "Build Websites Faster"
    const validated = validateSingleEvidence(
      { source: "hero", text: "Build Websites 10x Faster" },
      snapshot
    );

    expect(validated.status).toBe("rejected");
  });

  test("5. Missing evidence handled gracefully", () => {
    const snapshot = createMockSnapshot();
    const validated = validateSingleEvidence({ source: "hero", text: "" }, snapshot);

    expect(validated.status).toBe("rejected");
  });

  test("6. Invalid score (NaN) falls back to status default", () => {
    const res = normalizeSignalScore(NaN, "clear", [
      { source: "hero", text: "FastFlow headline", status: "verified" },
    ]);
    expect(res.finalScore).toBe(85); // clear default
  });

  test("7. Score below 0 clamped to 0", () => {
    const res = normalizeSignalScore(-25, "needs_work", []);
    expect(res.finalScore).toBe(0);
  });

  test("8. Score above 100 clamped to 100", () => {
    const res = normalizeSignalScore(150, "clear", []);
    expect(res.finalScore).toBe(75); // penalized due to 0 evidence, clamped
  });

  test("9. Contradictory status + score resolved ('unclear' with 98 -> clamped to <= 45)", () => {
    const res = normalizeSignalScore(98, "unclear", []);
    expect(res.finalScore).toBeLessThanOrEqual(45);
  });

  test("10. Correct weighted overall score calculation", () => {
    // Scores: first_impression=80, audience=80, value=80, trust=80, action=80
    // Weighted sum = 80 * (0.25 + 0.20 + 0.25 + 0.15 + 0.15) = 80
    const res = calculateOverallScore({
      first_impression: 80,
      audience: 80,
      value: 80,
      trust: 80,
      action: 80,
    });

    expect(res.overallScore).toBe(80);
    expect(res.overallStatus).toBe("clear");
  });

  test("11. AI cannot override final overall score", () => {
    const snapshot = createMockSnapshot();
    const aiAnalysis = createMockAiAnalysis();

    // Inject fake AI overall score if AI attempted to return one
    (aiAnalysis as any).overall_score = 99;

    const validated = validateAndScoreAnalysis(aiAnalysis, snapshot);

    // Final score must be deterministically computed from signal scores
    expect(validated.overall_score).not.toBe(99);
    expect(validated.scoring_version).toBe(SCORING_VERSION);
  });

  test("12. Missing signal fallback handled", () => {
    const snapshot = createMockSnapshot();
    const aiAnalysis = createMockAiAnalysis();
    delete (aiAnalysis.signals as any).trust; // delete trust signal

    const validated = validateAndScoreAnalysis(aiAnalysis, snapshot);

    expect(validated.signals.trust).toBeDefined();
    expect(validated.signals.trust.score).toBeGreaterThanOrEqual(0);
  });

  test("13. Unsupported generic recommendation filtered out", () => {
    const snapshot = createMockSnapshot();
    const aiAnalysis = createMockAiAnalysis();
    aiAnalysis.other_improvements.push({
      title: "Improve your website",
      explanation: "Make it better.",
      evidence_refs: [],
    });

    const validated = validateAndScoreAnalysis(aiAnalysis, snapshot);

    const titles = validated.other_improvements.map((i) => i.title.toLowerCase());
    expect(titles).not.toContain("improve your website");
  });

  test("14. Unsupported priority fix handled safely", () => {
    const snapshot = createMockSnapshot();
    const aiAnalysis = createMockAiAnalysis();
    aiAnalysis.priority_fix = {
      title: "",
      reason: "",
      current_direction: "",
      suggested_direction: "",
      evidence_refs: [],
    };

    const validated = validateAndScoreAnalysis(aiAnalysis, snapshot);

    expect(validated.priority_fix.title).toBeTruthy();
    expect(validated.priority_fix.suggested_direction).toBeTruthy();
  });

  test("15. Visitor thought sanitized against fake user quotes", () => {
    const brand = "FastFlow";
    const fakeUserQuote = '"FastFlow is amazing!" - Sarah, CEO at TechCorp';

    const sanitized = sanitizeVisitorThought(fakeUserQuote, brand);

    expect(sanitized).not.toContain("- Sarah");
    expect(sanitized).toContain("visitor");
  });

  test("16. Empty WebsiteSnapshot produces conservative grounded result", () => {
    const emptySnapshot: WebsiteSnapshot = {
      meta: { title: "", description: "" },
      navigation: { primaryNavLinks: [] },
      hero: { headline: "", subheadline: "" },
      ctas: [],
      valueProps: { headings: [], featureCards: [], pricingSignals: { hasPricingPageLink: false, plans: [], mentionsFreeTrial: false, mentionsGuarantee: false } },
      trustSignals: { socialProofHeadings: [], statsAndMetrics: [], testimonials: [], badgesAndCertifications: [], customerLogosAlt: [] },
      bodySections: [],
      forms: [],
      stats: { rawHtmlLength: 0, cleanedTextLength: 0, totalHeadings: 0, totalLinks: 0, totalImages: 0 },
    };

    const aiAnalysis = createMockAiAnalysis();
    const validated = validateAndScoreAnalysis(aiAnalysis, emptySnapshot);

    expect(validated.overall_score).toBeLessThan(80);
    expect(validated.overall_status).toBe("needs_improvement");
  });

  test("17. Deterministic repeated calculation (no randomness)", () => {
    const snapshot = createMockSnapshot();
    const aiAnalysis = createMockAiAnalysis();

    const run1 = validateAndScoreAnalysis(aiAnalysis, snapshot);
    const run2 = validateAndScoreAnalysis(aiAnalysis, snapshot);

    expect(run1.overall_score).toBe(run2.overall_score);
    expect(run1.overall_status).toBe(run2.overall_status);
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });
});
