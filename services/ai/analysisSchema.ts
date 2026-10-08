import { Type, Schema } from "@google/genai";
import { WebsiteSnapshot } from "@/lib/content-extractor";

export interface EvidenceRef {
  source: string; // e.g. "hero", "ctas", "trust_signals", "value_props", "headings"
  element?: string; // e.g. "h1", "p", "button", "a"
  text: string; // exact text from snapshot
  reason?: string; // why this evidence matters
  relevance?: "strong" | "moderate" | "weak";
}

export type DecisionStatus = "clear" | "understandable" | "partly_clear" | "unclear";
export type SignalStatus = "clear" | "understandable" | "partly_clear" | "unclear" | "needs_work" | "could_be_stronger";
export type ConfidenceLevel = "high" | "medium" | "low";
export type OverallStatus = "clear" | "needs_improvement";

export interface WebsiteAnalysis {
  analysis_version: "1.0";

  verdict: {
    status: OverallStatus;
    text: string;
  };

  first_seconds: {
    what_is_this: {
      status: DecisionStatus;
      explanation: string;
      evidence_refs: EvidenceRef[];
    };
    who_is_it_for: {
      status: DecisionStatus;
      explanation: string;
      evidence_refs: EvidenceRef[];
    };
    what_will_i_get: {
      status: DecisionStatus;
      explanation: string;
      evidence_refs: EvidenceRef[];
    };
    why_should_i_care: {
      status: DecisionStatus;
      explanation: string;
      evidence_refs: EvidenceRef[];
    };
    what_should_i_do_next: {
      status: DecisionStatus;
      explanation: string;
      evidence_refs: EvidenceRef[];
    };
  };

  visitor_thought: {
    text: string;
    confidence: ConfidenceLevel;
  };

  signals: {
    first_impression: {
      score: number; // 0..100
      status: SignalStatus;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_refs: EvidenceRef[];
    };
    audience: {
      score: number;
      status: SignalStatus;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_refs: EvidenceRef[];
    };
    value: {
      score: number;
      status: SignalStatus;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_refs: EvidenceRef[];
    };
    trust: {
      score: number;
      status: SignalStatus;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_refs: EvidenceRef[];
    };
    action: {
      score: number;
      status: SignalStatus;
      explanation: string;
      confidence: ConfidenceLevel;
      evidence_refs: EvidenceRef[];
    };
  };

  priority_fix: {
    title: string;
    reason: string;
    current_direction: string;
    suggested_direction: string;
    evidence_refs: EvidenceRef[];
  };

  other_improvements: Array<{
    title: string;
    explanation: string;
    evidence_refs: EvidenceRef[];
  }>;
}

// Gemini Type Schema definition for Structured Output
const evidenceRefSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    source: { type: Type.STRING, description: "Source section e.g. hero, ctas, trust_signals, value_props, headings" },
    element: { type: Type.STRING, description: "DOM element e.g. h1, p, button" },
    text: { type: Type.STRING, description: "Exact quote or text snippet directly from snapshot" },
    reason: { type: Type.STRING, description: "Why this evidence matters to a first-time visitor" },
    relevance: { type: Type.STRING, enum: ["strong", "moderate", "weak"] },
  },
  required: ["source", "text"],
};

const firstSecondsItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: { type: Type.STRING, enum: ["clear", "understandable", "partly_clear", "unclear"] },
    explanation: { type: Type.STRING, description: "Neutral diagnostic explanation for a first-time visitor" },
    evidence_refs: {
      type: Type.ARRAY,
      items: evidenceRefSchema,
    },
  },
  required: ["status", "explanation", "evidence_refs"],
};

const signalItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: "Initial evaluation score from 0 to 100" },
    status: { type: Type.STRING, enum: ["clear", "understandable", "partly_clear", "unclear", "needs_work", "could_be_stronger"] },
    explanation: { type: Type.STRING },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    evidence_refs: {
      type: Type.ARRAY,
      items: evidenceRefSchema,
    },
  },
  required: ["score", "status", "explanation", "confidence", "evidence_refs"],
};

export const WEBSITE_ANALYSIS_GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis_version: { type: Type.STRING, enum: ["1.0"] },

    verdict: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, enum: ["clear", "needs_improvement"] },
        text: { type: Type.STRING, description: "Concise summary explaining the primary first-impression issue" },
      },
      required: ["status", "text"],
    },

    first_seconds: {
      type: Type.OBJECT,
      properties: {
        what_is_this: firstSecondsItemSchema,
        who_is_it_for: firstSecondsItemSchema,
        what_will_i_get: firstSecondsItemSchema,
        why_should_i_care: firstSecondsItemSchema,
        what_should_i_do_next: firstSecondsItemSchema,
      },
      required: [
        "what_is_this",
        "who_is_it_for",
        "what_will_i_get",
        "why_should_i_care",
        "what_should_i_do_next",
      ],
    },

    visitor_thought: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Concise first-time visitor perspective (e.g. 'A first-time visitor would probably think...'). NOT a testimonial quote." },
        confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
      },
      required: ["text", "confidence"],
    },

    signals: {
      type: Type.OBJECT,
      properties: {
        first_impression: signalItemSchema,
        audience: signalItemSchema,
        value: signalItemSchema,
        trust: signalItemSchema,
        action: signalItemSchema,
      },
      required: ["first_impression", "audience", "value", "trust", "action"],
    },

    priority_fix: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        reason: { type: Type.STRING },
        current_direction: { type: Type.STRING },
        suggested_direction: { type: Type.STRING },
        evidence_refs: {
          type: Type.ARRAY,
          items: evidenceRefSchema,
        },
      },
      required: ["title", "reason", "current_direction", "suggested_direction", "evidence_refs"],
    },

    other_improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          explanation: { type: Type.STRING },
          evidence_refs: {
            type: Type.ARRAY,
            items: evidenceRefSchema,
          },
        },
        required: ["title", "explanation", "evidence_refs"],
      },
    },
  },
  required: [
    "analysis_version",
    "verdict",
    "first_seconds",
    "visitor_thought",
    "signals",
    "priority_fix",
    "other_improvements",
  ],
};
