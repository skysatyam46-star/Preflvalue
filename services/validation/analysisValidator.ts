import { WebsiteSnapshot } from "@/lib/content-extractor";
import { WebsiteAnalysis } from "@/services/ai/analysisSchema";
import { FinalValidatedAnalysis, ValidatedDecisionStatus, ValidatedEvidenceRef } from "@/types/validatedAnalysis";
import { SCORING_VERSION } from "@/services/scoring/scoringConfig";
import { normalizeSignalScore } from "@/services/scoring/normalizeSignalScore";
import { calculateOverallScore } from "@/services/scoring/calculateOverallScore";
import { validateEvidenceList } from "./evidenceValidator";
import {
  validatePriorityFix,
  validateOtherImprovements,
  sanitizeVisitorThought,
} from "./recommendationValidator";

/**
 * Main Phase 4 Validator & Deterministic Scoring Engine.
 * Converts raw/untrusted AI WebsiteAnalysis into a verified, normalized, frontend-safe FinalValidatedAnalysis.
 */
export function validateAndScoreAnalysis(
  aiAnalysis: WebsiteAnalysis,
  snapshot: WebsiteSnapshot
): FinalValidatedAnalysis {
  const brandName = snapshot.navigation.brandName || snapshot.meta.title || "this website";

  // 1. Validate First Seconds Evidence
  const validateFSItem = (item: {
    status: string;
    explanation: string;
    evidence_refs?: any[];
  }) => {
    const verifiedEv = validateEvidenceList(item?.evidence_refs, snapshot, true);
    const validStatus: ValidatedDecisionStatus = ["clear", "understandable", "partly_clear", "unclear"].includes(
      item?.status
    )
      ? (item.status as ValidatedDecisionStatus)
      : "partly_clear";

    return {
      status: validStatus,
      explanation: item?.explanation || "Diagnostic evaluation based on hero scanning.",
      evidence_available: verifiedEv.length > 0,
      evidence: verifiedEv,
    };
  };

  const fs = aiAnalysis?.first_seconds || {};
  const firstSeconds = {
    what_is_this: validateFSItem(fs.what_is_this),
    who_is_it_for: validateFSItem(fs.who_is_it_for),
    what_will_i_get: validateFSItem(fs.what_will_i_get),
    why_should_i_care: validateFSItem(fs.why_should_i_care),
    what_should_i_do_next: validateFSItem(fs.what_should_i_do_next),
  };

  // 2. Validate Evidence & Normalize Scores for All 5 Signals
  const rawSignals = aiAnalysis?.signals || {};

  const processSignal = (sigKey: keyof typeof rawSignals, defaultStatus: string) => {
    const rawSig = rawSignals[sigKey] || {};
    const verifiedEv = validateEvidenceList(rawSig.evidence_refs, snapshot, true);

    const status = rawSig.status || defaultStatus;
    const initialConfidence = ["high", "medium", "low"].includes(rawSig.confidence)
      ? rawSig.confidence
      : "medium";

    const { finalScore, finalStatus, finalConfidence } = normalizeSignalScore(
      rawSig.score,
      status,
      verifiedEv,
      initialConfidence
    );

    let explanation = rawSig.explanation || "Diagnostic signal evaluation.";
    if (sigKey === "trust" && verifiedEv.length > 0) {
      const lowerExp = explanation.toLowerCase();
      if (
        lowerExp.includes("no trust") ||
        lowerExp.includes("no proof") ||
        lowerExp.includes("no social proof") ||
        lowerExp.includes("not found")
      ) {
        explanation = `While the page mentions '${verifiedEv[0].text}', trust and proof elements could be positioned more prominently.`;
      }
    }

    return {
      score: finalScore,
      status: finalStatus,
      explanation,
      confidence: finalConfidence,
      evidence_available: verifiedEv.length > 0,
      evidence: verifiedEv,
    };
  };

  const processedSignals = {
    first_impression: processSignal("first_impression", "clear"),
    audience: processSignal("audience", "understandable"),
    value: processSignal("value", "understandable"),
    trust: processSignal("trust", "could_be_stronger"),
    action: processSignal("action", "clear"),
  };

  // Align first_seconds statuses with normalized signal scores for cross-section consistency
  const alignFSWithSignal = (
    fsItem: ReturnType<typeof validateFSItem>,
    signalScore: number
  ) => {
    let status: ValidatedDecisionStatus = fsItem.status;
    if (signalScore <= 44) status = "unclear";
    else if (signalScore <= 64) status = "partly_clear";
    else if (signalScore <= 79) status = "understandable";
    else status = "clear";
    return { ...fsItem, status };
  };

  firstSeconds.what_is_this = alignFSWithSignal(firstSeconds.what_is_this, processedSignals.first_impression.score);
  firstSeconds.who_is_it_for = alignFSWithSignal(firstSeconds.who_is_it_for, processedSignals.audience.score);
  firstSeconds.what_will_i_get = alignFSWithSignal(firstSeconds.what_will_i_get, processedSignals.value.score);
  firstSeconds.why_should_i_care = alignFSWithSignal(firstSeconds.why_should_i_care, processedSignals.trust.score);
  firstSeconds.what_should_i_do_next = alignFSWithSignal(firstSeconds.what_should_i_do_next, processedSignals.action.score);

  // 3. Deterministic Overall Score Calculation
  const { overallScore, overallStatus } = calculateOverallScore({
    first_impression: processedSignals.first_impression.score,
    audience: processedSignals.audience.score,
    value: processedSignals.value.score,
    trust: processedSignals.trust.score,
    action: processedSignals.action.score,
  });

  // 4. Validate Priority Fix, Risks & Other Improvements
  const priorityFix = validatePriorityFix(aiAnalysis?.priority_fix, snapshot);
  const otherImprovements = validateOtherImprovements(aiAnalysis?.other_improvements, snapshot);

  const rawWm: any = aiAnalysis?.website_message || {};
  const wmEv = validateEvidenceList(rawWm.evidence_refs, snapshot, true);
  const wmSummary = rawWm.summary || `This website communicates its core product offering for ${brandName}.`;
  let wmConfidence = ["high", "medium", "low"].includes(rawWm.confidence) ? rawWm.confidence : "medium";

  const rawRisks = aiAnalysis?.risks;
  let risks: Array<{
    category: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    why_it_matters: string;
    evidence_available: boolean;
    evidence: ValidatedEvidenceRef[];
  }> = [];

  if (Array.isArray(rawRisks) && rawRisks.length > 0) {
    risks = rawRisks.slice(0, 3).map((r) => {
      const verifiedEv = validateEvidenceList(r.evidence_refs, snapshot, true);
      const severity = ["high", "medium", "low"].includes(r.severity) ? r.severity : "medium";
      return {
        category: r.category || "clarity",
        severity,
        title: r.title || "Communication risk identified",
        description: r.description || "First-time visitors may experience friction understanding this element.",
        why_it_matters: r.why_it_matters || "Clear communication reduces visitor bounce rate and increases conversion confidence.",
        evidence_available: verifiedEv.length > 0,
        evidence: verifiedEv,
      };
    });
  }

  // Ensure risks are never empty if overall score needs improvement
  if (overallStatus === "needs_improvement") {
    priorityFix.impact = "high";
    if (risks.length === 0) {
      const signalEntries = Object.entries(processedSignals) as [string, { score: number }][];
      signalEntries.sort((a, b) => a[1].score - b[1].score);
      const lowest = signalEntries[0];
      const lowestCategory = lowest ? lowest[0] : "clarity";

      risks.push({
        category: lowestCategory,
        severity: "high",
        title: `Primary ${lowestCategory.replace("_", " ")} issue identified`,
        description: `First-time visitors experience friction understanding ${lowestCategory.replace("_", " ")} signals on the homepage.`,
        why_it_matters: "Unclear messaging increases visitor bounce rates and reduces conversion confidence.",
        evidence_available: false,
        evidence: [],
      });
    }
  }

  // 5. Sanitize Verdict & Visitor Thought
  let verdictText =
    aiAnalysis?.verdict?.text ||
    `Visitors grasp ${brandName}'s main topic, but the core benefit messaging can be strengthened.`;

  const isIncomplete =
    (snapshot.stats?.cleanedTextLength ?? 0) < 100 ||
    !snapshot.hero?.headline ||
    snapshot.hero.headline.trim().length === 0;

  if (isIncomplete) {
    wmConfidence = "low";
    if (!verdictText.toLowerCase().includes("accessible homepage content")) {
      verdictText = `Based on accessible homepage content: ${verdictText}`;
    }
  }

  const websiteMessage = {
    summary: wmSummary,
    confidence: wmConfidence,
    evidence_available: wmEv.length > 0,
    evidence: wmEv,
  };

  const visitorThoughtText = sanitizeVisitorThought(aiAnalysis?.visitor_thought?.text, brandName);
  const visitorThoughtConfidence = ["high", "medium", "low"].includes(aiAnalysis?.visitor_thought?.confidence)
    ? aiAnalysis.visitor_thought.confidence
    : "medium";

  // 6. Assemble Final Validated Analysis Object
  return {
    analysis_version: "1.0",
    scoring_version: SCORING_VERSION,

    overall_score: overallScore,
    overall_status: overallStatus,

    verdict: {
      text: verdictText,
    },

    first_seconds: firstSeconds,

    visitor_thought: {
      text: visitorThoughtText,
      confidence: visitorThoughtConfidence,
    },

    website_message: websiteMessage,

    signals: processedSignals,

    risks,

    priority_fix: priorityFix,

    other_improvements: otherImprovements,
  };
}
