import { WebsiteSnapshot } from "@/lib/content-extractor";
import { WebsiteAnalysis } from "@/services/ai/analysisSchema";
import { FinalValidatedAnalysis, ValidatedDecisionStatus } from "@/types/validatedAnalysis";
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

    const { finalScore, finalConfidence } = normalizeSignalScore(
      rawSig.score,
      status,
      verifiedEv,
      initialConfidence
    );

    return {
      score: finalScore,
      status,
      explanation: rawSig.explanation || "Diagnostic signal evaluation.",
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

  // 3. Deterministic Overall Score Calculation
  const { overallScore, overallStatus } = calculateOverallScore({
    first_impression: processedSignals.first_impression.score,
    audience: processedSignals.audience.score,
    value: processedSignals.value.score,
    trust: processedSignals.trust.score,
    action: processedSignals.action.score,
  });

  // 4. Validate Priority Fix & Other Improvements
  const priorityFix = validatePriorityFix(aiAnalysis?.priority_fix, snapshot);
  const otherImprovements = validateOtherImprovements(aiAnalysis?.other_improvements, snapshot);

  // 5. Sanitize Verdict & Visitor Thought
  const verdictText =
    aiAnalysis?.verdict?.text ||
    `Visitors grasp ${brandName}'s main topic, but the core benefit messaging can be strengthened.`;

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

    signals: processedSignals,

    priority_fix: priorityFix,

    other_improvements: otherImprovements,
  };
}
