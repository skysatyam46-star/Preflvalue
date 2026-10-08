export interface ValidatedEvidenceRef {
  source: string;
  element?: string;
  text: string;
  reason?: string;
  relevance?: "strong" | "moderate" | "weak";
  status: "verified" | "rejected";
  matchType?: "exact" | "normalized";
}

export type ValidatedDecisionStatus = "clear" | "understandable" | "partly_clear" | "unclear";
export type ValidatedOverallStatus = "clear" | "needs_improvement";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface FinalValidatedAnalysis {
  analysis_version: "1.0";
  scoring_version: "1.0";

  overall_score: number; // 0..100 integer
  overall_status: ValidatedOverallStatus;

  verdict: {
    text: string;
  };

  first_seconds: {
    what_is_this: {
      status: ValidatedDecisionStatus;
      explanation: string;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
    who_is_it_for: {
      status: ValidatedDecisionStatus;
      explanation: string;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
    what_will_i_get: {
      status: ValidatedDecisionStatus;
      explanation: string;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
    why_should_i_care: {
      status: ValidatedDecisionStatus;
      explanation: string;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
    what_should_i_do_next: {
      status: ValidatedDecisionStatus;
      explanation: string;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
  };

  visitor_thought: {
    text: string;
    confidence: ConfidenceLevel;
  };

  signals: {
    first_impression: {
      score: number; // 0..100
      status: string;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
    audience: {
      score: number;
      status: string;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
    value: {
      score: number;
      status: string;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
    trust: {
      score: number;
      status: string;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
    action: {
      score: number;
      status: string;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_available: boolean;
      evidence: ValidatedEvidenceRef[];
    };
  };

  priority_fix: {
    title: string;
    reason: string;
    current_direction: string;
    suggested_direction: string;
    evidence_available: boolean;
    evidence: ValidatedEvidenceRef[];
  };

  other_improvements: Array<{
    title: string;
    explanation: string;
    evidence_available: boolean;
    evidence: ValidatedEvidenceRef[];
  }>;
}
