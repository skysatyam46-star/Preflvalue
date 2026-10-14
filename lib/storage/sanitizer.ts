import { AnalysisData } from "@/components/ResultsScreen";

export const LOCKED_SECTION_NAMES = [
  "Priority Fix Plan",
  "Copy-Ready Improvements",
  "Other Recommended Improvements",
  "In the First Few Seconds",
  "First-Time Visitor Impression",
  "Complete Homepage Evidence",
  "Supporting Pages Insights",
  "Five Detailed Signals",
  "Communication Risks",
];

/**
 * Sanitizes a full AnalysisData object for free public preview.
 *
 * PRESERVED IN FREE PREVIEW (Sections 01 - 06):
 * 01. Website + Analysis Date (domain, checkedAt)
 * 02. Overall Score + Status (score, scoreStatus)
 * 03. Short Main Verdict (verdict, verdictSubtext)
 * 04. Five Signal Overview (quickSignals)
 * 05. Biggest Issue + Actual Evidence (evidence)
 * 06. Your #1 Priority Fix (recommendation)
 *
 * STRIPPED / EXCLUDED (Sections 07 - 15):
 * - priorityFixPlan & otherImprovements (Sections 07, 08, 09)
 * - firstSeconds (Section 10)
 * - visitorThought (Section 11)
 * - signals details (Section 13)
 * - risks (Section 14)
 * - supportingContext (Section 15 / Supporting Pages)
 * - websiteMessage (Deep positioning)
 */
export function sanitizeReportForPreview(
  full: AnalysisData,
  reportId: string
): AnalysisData {
  return {
    domain: full.domain,
    score: full.score,
    scoreStatus: full.scoreStatus,
    verdict: full.verdict,
    verdictSubtext: full.verdictSubtext || "Based on your homepage · First-time visitor perspective",
    quickSignals: full.quickSignals ? [...full.quickSignals] : [],
    evidence: {
      locationTag: full.evidence?.locationTag || "HERO SECTION",
      homepageExcerpt: full.evidence?.homepageExcerpt || "",
      clearFindings: full.evidence?.clearFindings ? [...full.evidence.clearFindings] : [],
      missingFindings: full.evidence?.missingFindings ? [...full.evidence.missingFindings] : [],
    },
    recommendation: {
      title: full.recommendation?.title || "Clarify your core proposition",
      subhead: full.recommendation?.subhead || "State clearly what the visitor gets within 5 seconds",
      explanation: full.recommendation?.explanation || "",
      impact: full.recommendation?.impact || "high",
      currentDirection: full.recommendation?.currentDirection || "",
      strongerDirection: full.recommendation?.strongerDirection || "",
    },
    // EXCLUDED FROM PREVIEW:
    firstSeconds: [],
    visitorThought: "",
    signals: [],
    risks: [],
    otherImprovements: [],
    websiteMessage: undefined,
    supportingContext: undefined,
    // Status flags:
    isPartialAccess: full.isPartialAccess,
    isAccessError: full.isAccessError,
    checkedAt: full.checkedAt || "Checked just now",
    reportId,
    isUnlocked: false,
  };
}
