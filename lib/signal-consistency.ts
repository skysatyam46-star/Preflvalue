import { AnalysisData } from "@/components/ResultsScreen";

export type CanonicalSignalId =
  | "first-impression"
  | "audience"
  | "value"
  | "trust"
  | "action";

export const CANONICAL_SIGNALS: Array<{
  id: CanonicalSignalId;
  title: string;
  categoryName: string;
  dimensionDescription: string;
}> = [
  {
    id: "first-impression",
    title: "First impression",
    categoryName: "Product & Category Understanding",
    dimensionDescription: "Product and category understanding, initial messaging clarity.",
  },
  {
    id: "audience",
    title: "Audience",
    categoryName: "Target Audience",
    dimensionDescription: "Who the website is built for and intended user role clarity.",
  },
  {
    id: "value",
    title: "Value",
    categoryName: "Core Benefit & Value",
    dimensionDescription: "Tangible benefits, value proposition, and expected visitor outcomes.",
  },
  {
    id: "trust",
    title: "Trust",
    categoryName: "Credibility & Proof",
    dimensionDescription: "Credibility, verifiable evidence, proof points, and clarity of claims.",
  },
  {
    id: "action",
    title: "Action",
    categoryName: "Next Step & Action",
    dimensionDescription: "Next-step transparency, call-to-action wording, and commitment level.",
  },
];

/**
 * Normalizes any category string or signal ID into a CanonicalSignalId.
 * Returns null if not recognizable.
 */
export function normalizeSignalId(raw?: string | null): CanonicalSignalId | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.toLowerCase().trim().replace(/_/g, "-");

  if (
    s === "first-impression" ||
    s === "first_impression" ||
    s === "clarity" ||
    s === "category" ||
    s === "product" ||
    s === "headline" ||
    s.includes("first-impression")
  ) {
    return "first-impression";
  }

  if (
    s === "audience" ||
    s === "who" ||
    s === "persona" ||
    s === "role" ||
    s === "target" ||
    s.includes("audience")
  ) {
    return "audience";
  }

  if (
    s === "value" ||
    s === "benefit" ||
    s === "outcome" ||
    s === "proposition" ||
    s.includes("value")
  ) {
    return "value";
  }

  if (
    s === "trust" ||
    s === "credibility" ||
    s === "proof" ||
    s === "claims" ||
    s === "social-proof" ||
    s.includes("trust")
  ) {
    return "trust";
  }

  if (
    s === "action" ||
    s === "cta" ||
    s === "next-step" ||
    s === "button" ||
    s.includes("action")
  ) {
    return "action";
  }

  return null;
}

/**
 * Strips outer quotes and collapses whitespace.
 */
export function cleanText(val?: string | null): string {
  if (!val || typeof val !== "string") return "";
  return val
    .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether a text snippet represents genuine extracted website source copy,
 * rather than an extraction status message, error, or generic scanner placeholder.
 */
export function isGenuineSourceQuote(raw?: string | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  const text = cleanText(raw);
  if (text.length < 3) return false;

  const lower = text.toLowerCase();

  // Filter invalid quotes: extraction status messages, scanner defaults, or debug info
  const invalidPatterns = [
    /we scanned your (accessible|homepage) (above the fold )?structure/i,
    /homepage above-the-fold content scanned/i,
    /no homepage excerpt extracted/i,
    /current headline excerpt unavailable/i,
    /no distinct headline text verified/i,
    /found initial page structure/i,
    /we couldn'?t fully access this/i,
    /failed to (fetch|extract|load)/i,
    /error:/i,
    /^https?:\/\//i,
    /^(none|n\/a|unavailable|null|undefined|not found)$/i,
    /first-impression analysis completed based on/i,
    /initial html response/i,
    /homepage · extracted content/i,
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(lower)) return false;
  }

  return true;
}

/**
 * Distinguishes an actionable direction/instruction from copy-ready website text.
 * Instructions tell the user WHAT to do (e.g. "Add 2-3 customer logos", "Integrate a clear statement...").
 * Replacement copy is the ACTUAL text to paste on the page.
 */
export function isInstructionOnly(raw?: string | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  const text = cleanText(raw);
  if (!text) return false;

  // Imperative action verbs that indicate an instruction or editorial guidance
  const instructionStartPattern =
    /^(add|include|place|insert|display|show|replace|clarify|restate|rewrite|ensure|make sure|highlight|feature|use concrete|state clearly|consider adding|provide a clear|integrate a clear|incorporate|specify|put|focus on)\b/i;

  if (instructionStartPattern.test(text)) return true;

  // Meta-instructions or templates
  if (/\[insert\b|\[add\b|\{.+?\}|<.+?>/i.test(text)) return true;
  if (/^what you say now:|^clearer direction:/i.test(text)) return true;
  if (text.toLowerCase() === "state the specific outcome your target audience achieves.") return true;

  return false;
}

/**
 * Cleans location tags into honest page & section locations.
 * Never guesses "Homepage · Extracted content".
 */
export function cleanLocationTag(rawLocation?: string | null): string {
  if (!rawLocation || typeof rawLocation !== "string") {
    return "Exact section not identified";
  }

  const cleaned = cleanText(rawLocation);
  const lower = cleaned.toLowerCase();

  // Reject generic extraction tags
  if (
    !cleaned ||
    lower === "homepage · extracted content" ||
    lower === "homepage · partial text snapshot" ||
    lower === "extracted content" ||
    lower === "partial text snapshot" ||
    lower === "none" ||
    lower === "n/a"
  ) {
    return "Exact section not identified";
  }

  // Preserve existing explicit page mappings if formatted with arrow
  if (cleaned.includes("→")) {
    return cleaned;
  }

  // Standardize genuine page areas
  if (lower.includes("pricing")) {
    return "Pricing page → Plan details";
  }
  if (lower.includes("feature") || lower.includes("product")) {
    return "Features page → Product description";
  }
  if (lower.includes("about") || lower.includes("team")) {
    return "About page → Company details";
  }
  if (lower.includes("hero") || lower.includes("above the fold") || lower.includes("headline")) {
    return "Home page → Hero section";
  }
  if (lower.includes("footer")) {
    return "Home page → Footer";
  }

  return cleaned;
}

export interface MatchedFirstStep {
  title: string;
  explanation: string;
  location: string;
  sourceWording: string | null;
  improvedWording: string | null;
  isCopyReady: boolean;
  targetSignalId: CanonicalSignalId;
}

export interface MatchedClarityGap {
  title: string;
  description: string;
  whyItMatters: string;
  targetSignalId: CanonicalSignalId;
  targetSignalTitle: string;
  targetSignalScore: number;
}

/**
 * Deterministically aligns the Main Clarity Gap and First Step so they
 * always address the EXACT SAME communication issue without cross-signal contradiction.
 */
export function matchMainGapAndFirstStep(
  data: AnalysisData
): {
  gap: MatchedClarityGap;
  firstStep: MatchedFirstStep | null;
} {
  const signalMap = new Map<CanonicalSignalId, { title: string; score: number }>();
  for (const s of data.signals || []) {
    const norm = normalizeSignalId(s.id);
    if (norm) {
      signalMap.set(norm, { title: s.title, score: s.score });
    }
  }

  // 1. Identify primary risk / clarity gap
  const primaryRisk = data.risks && data.risks.length > 0 ? data.risks[0] : null;
  let gapSignalId: CanonicalSignalId = "first-impression";

  if (primaryRisk?.category) {
    const norm = normalizeSignalId(primaryRisk.category);
    if (norm) gapSignalId = norm;
  } else {
    // Weakest signal if no risk
    const sorted = [...(data.signals || [])].sort((a, b) => a.score - b.score);
    const weakest = sorted[0];
    if (weakest) {
      const norm = normalizeSignalId(weakest.id);
      if (norm) gapSignalId = norm;
    }
  }

  const sigInfo = signalMap.get(gapSignalId) || {
    title: CANONICAL_SIGNALS.find((c) => c.id === gapSignalId)?.title || "First impression",
    score: 70,
  };

  const gapTitle =
    primaryRisk?.title &&
    !primaryRisk.title.toLowerCase().includes("no major") &&
    !primaryRisk.title.toLowerCase().includes("no communication risk")
      ? primaryRisk.title
      : `${sigInfo.title} clarity gap`;

  const gapDescription =
    primaryRisk?.description &&
    !primaryRisk.description.toLowerCase().includes("no major") &&
    !primaryRisk.description.toLowerCase().includes("no communication risk")
      ? primaryRisk.description
      : data.evidence?.missingFindings?.[0] ||
        "First-time visitors may experience hesitation identifying this aspect from inspected content.";

  const gapWhyItMatters =
    primaryRisk?.why_it_matters ||
    (gapSignalId === "trust"
      ? "First-time visitors look for immediate proof, verifiable credentials, or customer evidence before trusting a new service."
      : gapSignalId === "audience"
      ? "First-time visitors may disengage quickly if they cannot confirm whether your product was built for their needs."
      : gapSignalId === "action"
      ? "Ambiguous action copy or unclear next steps create hesitation at the conversion point."
      : gapSignalId === "value"
      ? "Visitors evaluate offerings based on concrete outcomes achieved rather than abstract descriptions."
      : "Clear communication above the fold helps first-time visitors understand what you offer immediately.");

  const gap: MatchedClarityGap = {
    title: gapTitle,
    description: gapDescription,
    whyItMatters: gapWhyItMatters,
    targetSignalId: gapSignalId,
    targetSignalTitle: sigInfo.title,
    targetSignalScore: sigInfo.score,
  };

  // 2. Find a matching First Step for this exact signal
  // Check primary recommendation first
  const primaryRecSignal = normalizeSignalId(
    `${data.recommendation?.title || ""} ${data.recommendation?.subhead || ""} ${data.recommendation?.explanation || ""}`
  );

  let matchedStep: MatchedFirstStep | null = null;

  if (data.recommendation && primaryRecSignal === gapSignalId) {
    const rawCurrent = cleanText(data.recommendation.currentDirection);
    const rawStronger = cleanText(data.recommendation.strongerDirection);

    const sourceWording = isGenuineSourceQuote(rawCurrent) ? rawCurrent : null;
    const isDirectionAnInstruction = isInstructionOnly(rawStronger);

    matchedStep = {
      title: data.recommendation.subhead || data.recommendation.title || "Clarify headline messaging",
      explanation: data.recommendation.explanation || "Improve first-time visitor understanding.",
      location: cleanLocationTag(data.evidence?.locationTag),
      sourceWording,
      improvedWording: rawStronger || null,
      isCopyReady: Boolean(rawStronger && !isDirectionAnInstruction),
      targetSignalId: gapSignalId,
    };
  } else if (data.otherImprovements && data.otherImprovements.length > 0) {
    // Check if otherImprovements contains an item for this signal
    const matchingImp = data.otherImprovements.find((imp) => {
      const impSig = normalizeSignalId(imp.id) || normalizeSignalId(`${imp.title} ${imp.description}`);
      return impSig === gapSignalId;
    });

    if (matchingImp) {
      const impDirection = cleanText(matchingImp.copyableSuggestion || matchingImp.whatToImprove);
      const isInstruction = isInstructionOnly(impDirection);

      matchedStep = {
        title: matchingImp.title,
        explanation: matchingImp.description,
        location: cleanLocationTag(data.evidence?.locationTag),
        sourceWording: null,
        improvedWording: impDirection || null,
        isCopyReady: Boolean(impDirection && !isInstruction),
        targetSignalId: gapSignalId,
      };
    }
  }

  // If no matching recommendation exists for this gap signal, return null
  // (per rule 5: "Show: 'No directly matched first step is available in this analysis.' Do not substitute an unrelated fix.")
  return {
    gap,
    firstStep: matchedStep,
  };
}

export interface SignalExplorerData {
  signalId: CanonicalSignalId;
  title: string;
  categoryName: string;
  dimensionDescription: string;
  score: number;
  badgeText: string;
  badgeType: "clear" | "amber" | "coral";
  findingText: string;
  sourceQuote: string | null;
  quoteLocation: string;
  riskItem: {
    title: string;
    description: string;
    why_it_matters: string;
  } | null;
  recommendationItem: {
    title: string;
    explanation: string;
    location: string;
    sourceWording: string | null;
    improvedWording: string | null;
    isCopyReady: boolean;
  } | null;
}

/**
 * Deterministic signal-to-finding selector for the Interactive Signal Explorer.
 * Guarantees zero cross-signal contamination.
 */
export function getSignalExplorerData(
  selectedSignalId: CanonicalSignalId,
  data: AnalysisData
): SignalExplorerData {
  const signalMeta = CANONICAL_SIGNALS.find((c) => c.id === selectedSignalId)!;
  const signalObj = (data.signals || []).find(
    (s) => normalizeSignalId(s.id) === selectedSignalId
  );

  const score = signalObj?.score ?? 70;
  const badgeText = signalObj?.badgeText ?? "Clear";
  const badgeType = signalObj?.badgeType ?? "clear";

  // 1. Finding specific to this signal
  let findingText = "No additional signal-specific finding is available in this report.";
  if (signalObj?.description && signalObj.description.length > 8) {
    findingText = signalObj.description;
  } else {
    // Check firstSeconds comprehension questions
    const questionIndexMap: Record<CanonicalSignalId, number> = {
      "first-impression": 0,
      audience: 1,
      value: 2,
      trust: 3,
      action: 4,
    };
    const qIdx = questionIndexMap[selectedSignalId];
    const qObj = data.firstSeconds?.[qIdx];
    if (qObj?.label) {
      findingText = `${qObj.question} — ${qObj.label}`;
    }
  }

  // 2. Supporting evidence quote strictly relevant to this signal
  let sourceQuote: string | null = null;
  let quoteLocation = "Exact section not identified";

  if (selectedSignalId === "first-impression") {
    // Primary headline / hero text
    const excerpt = cleanText(data.evidence?.homepageExcerpt);
    if (isGenuineSourceQuote(excerpt)) {
      sourceQuote = excerpt;
      quoteLocation = "Home page → Hero section";
    }
  } else if (selectedSignalId === "audience") {
    // Look for audience clear/missing finding or excerpt
    for (const f of data.evidence?.clearFindings || []) {
      const match = f.match(/Target audience:\s*[“"]([^”"]+)[”"]/i);
      if (match && isGenuineSourceQuote(match[1])) {
        sourceQuote = cleanText(match[1]);
        quoteLocation = "Home page → Hero section";
        break;
      }
    }
  } else if (selectedSignalId === "value") {
    for (const f of data.evidence?.clearFindings || []) {
      const match = f.match(/Primary outcome:\s*[“"]([^”"]+)[”"]/i);
      if (match && isGenuineSourceQuote(match[1])) {
        sourceQuote = cleanText(match[1]);
        quoteLocation = "Home page → Value section";
        break;
      }
    }
  } else if (selectedSignalId === "trust") {
    for (const f of data.evidence?.clearFindings || []) {
      const match = f.match(/Proof element:\s*[“"]([^”"]+)[”"]/i);
      if (match && isGenuineSourceQuote(match[1])) {
        sourceQuote = cleanText(match[1]);
        quoteLocation = "Home page → Social proof";
        break;
      }
    }
  } else if (selectedSignalId === "action") {
    for (const f of data.evidence?.clearFindings || []) {
      const match = f.match(/Primary action:\s*[“"]([^”"]+)[”"]/i);
      if (match && isGenuineSourceQuote(match[1])) {
        sourceQuote = cleanText(match[1]);
        quoteLocation = "Home page → Primary CTA";
        break;
      }
    }
  }

  // 3. Risk strictly belonging to this signal
  let riskItem: { title: string; description: string; why_it_matters: string } | null = null;
  const matchingRisk = (data.risks || []).find(
    (r) => normalizeSignalId(r.category) === selectedSignalId
  );
  if (
    matchingRisk &&
    !matchingRisk.title.toLowerCase().includes("no major") &&
    !matchingRisk.title.toLowerCase().includes("no communication risk")
  ) {
    riskItem = {
      title: matchingRisk.title,
      description: matchingRisk.description,
      why_it_matters: matchingRisk.why_it_matters,
    };
  }

  // 4. Recommendation strictly belonging to this signal
  let recommendationItem: {
    title: string;
    explanation: string;
    location: string;
    sourceWording: string | null;
    improvedWording: string | null;
    isCopyReady: boolean;
  } | null = null;

  const primaryRecSig = normalizeSignalId(
    `${data.recommendation?.title || ""} ${data.recommendation?.subhead || ""} ${data.recommendation?.explanation || ""}`
  );

  if (data.recommendation && primaryRecSig === selectedSignalId) {
    const rawCurrent = cleanText(data.recommendation.currentDirection);
    const rawStronger = cleanText(data.recommendation.strongerDirection);

    const validSource = isGenuineSourceQuote(rawCurrent) ? rawCurrent : null;
    const isInstruction = isInstructionOnly(rawStronger);

    recommendationItem = {
      title: data.recommendation.subhead || data.recommendation.title || "Improve messaging clarity",
      explanation: data.recommendation.explanation || "Focus on first-time visitor comprehension.",
      location: cleanLocationTag(data.evidence?.locationTag),
      sourceWording: validSource,
      improvedWording: rawStronger || null,
      isCopyReady: Boolean(rawStronger && !isInstruction),
    };
  } else if (data.otherImprovements && data.otherImprovements.length > 0) {
    const matchingImp = data.otherImprovements.find((imp) => {
      const impSig = normalizeSignalId(imp.id) || normalizeSignalId(`${imp.title} ${imp.description}`);
      return impSig === selectedSignalId;
    });

    if (matchingImp) {
      const impDirection = cleanText(matchingImp.copyableSuggestion || matchingImp.whatToImprove);
      const isInstruction = isInstructionOnly(impDirection);

      recommendationItem = {
        title: matchingImp.title,
        explanation: matchingImp.description,
        location: cleanLocationTag(data.evidence?.locationTag),
        sourceWording: null,
        improvedWording: impDirection || null,
        isCopyReady: Boolean(impDirection && !isInstruction),
      };
    }
  }

  return {
    signalId: selectedSignalId,
    title: signalMeta.title,
    categoryName: signalMeta.categoryName,
    dimensionDescription: signalMeta.dimensionDescription,
    score,
    badgeText,
    badgeType,
    findingText,
    sourceQuote,
    quoteLocation,
    riskItem,
    recommendationItem,
  };
}
