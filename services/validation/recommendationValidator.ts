import { WebsiteSnapshot } from "@/lib/content-extractor";
import { EvidenceRef } from "@/services/ai/analysisSchema";
import { ValidatedEvidenceRef } from "@/types/validatedAnalysis";
import { validateEvidenceList } from "./evidenceValidator";

export interface PriorityFixInput {
  title: string;
  reason: string;
  current_direction: string;
  suggested_direction: string;
  evidence_refs?: EvidenceRef[];
}

export interface OtherImprovementInput {
  title: string;
  explanation: string;
  evidence_refs?: EvidenceRef[];
}

const GENERIC_RECOMMENDATION_TITLES = [
  "improve your website",
  "make it better",
  "fix website",
  "update copy",
  "redesign page",
  "improve UX",
];

/**
 * Validates Priority Fix object against WebsiteSnapshot.
 */
export function validatePriorityFix(
  priorityFix: PriorityFixInput | undefined,
  snapshot: WebsiteSnapshot,
  weakestSignalKey?: string
): {
  title: string;
  reason: string;
  current_direction: string;
  suggested_direction: string;
  evidence_available: boolean;
  evidence: ValidatedEvidenceRef[];
} {
  const brand = snapshot.navigation.brandName || "the website";
  const heroText = snapshot.hero.headline || snapshot.meta.title || brand;

  if (!priorityFix || !priorityFix.title) {
    let fallbackTitle = "Clarify primary value proposition in hero headline";
    let fallbackReason = "First-time visitors decide whether to stay within the first 5 seconds of scanning the hero headline.";
    let fallbackDirection = `State clearly what ${brand} accomplishes for the visitor in plain language.`;

    if (weakestSignalKey === "trust") {
      fallbackTitle = "Add verifiable proof and methodology above the fold";
      fallbackReason = "Visitors understand the premise, but absence of visible proof or methodology limits credibility.";
      fallbackDirection = "Provide verifiable credentials, methodology explanations, or verifiable proof points.";
    } else if (weakestSignalKey === "audience") {
      fallbackTitle = "Explicitly define who this product is built for";
      fallbackReason = "Visitors cannot immediately tell if this product is designed for them or another audience.";
      fallbackDirection = "Add clear audience framing directly under the hero headline.";
    } else if (weakestSignalKey === "action") {
      fallbackTitle = "Clarify the primary next action and call to action";
      fallbackReason = "First-time visitors hesitate when the primary entry path is ambiguous.";
      fallbackDirection = "Make the primary button action obvious and directly tied to the core value.";
    }

    return {
      title: fallbackTitle,
      reason: fallbackReason,
      current_direction: heroText,
      suggested_direction: fallbackDirection,
      evidence_available: false,
      evidence: [],
    };
  }

  const verifiedEvidence = validateEvidenceList(priorityFix.evidence_refs, snapshot, true);

  return {
    title: priorityFix.title,
    reason: priorityFix.reason || "Helps cold visitors immediately classify the product value.",
    current_direction: priorityFix.current_direction || heroText,
    suggested_direction: priorityFix.suggested_direction || `Clarify main benefit for ${brand}`,
    evidence_available: verifiedEvidence.length > 0,
    evidence: verifiedEvidence,
  };
}

/**
 * Validates array of Other Improvements. Filters out generic titles, avoids duplicating priority fix, limits max count to 3.
 */
export function validateOtherImprovements(
  improvements: OtherImprovementInput[] | undefined,
  snapshot: WebsiteSnapshot,
  priorityFixTitle?: string
): Array<{
  title: string;
  explanation: string;
  evidence_available: boolean;
  evidence: ValidatedEvidenceRef[];
}> {
  if (!Array.isArray(improvements)) return [];

  const validList: Array<{
    title: string;
    explanation: string;
    evidence_available: boolean;
    evidence: ValidatedEvidenceRef[];
  }> = [];

  const seenTitles = new Set<string>();
  if (priorityFixTitle) {
    seenTitles.add(priorityFixTitle.toLowerCase().trim());
  }

  for (const item of improvements) {
    if (validList.length >= 3) break; // Maximum 3 recommendations
    if (!item || !item.title) continue;

    const lowerTitle = item.title.toLowerCase().trim();

    // Skip generic recommendations
    if (GENERIC_RECOMMENDATION_TITLES.some((g) => lowerTitle === g || lowerTitle.includes(g))) {
      continue;
    }

    // Skip duplicate or repetitive titles
    if (seenTitles.has(lowerTitle)) continue;

    // Check similarity with already added titles
    const isTooSimilar = Array.from(seenTitles).some(
      (existing) =>
        (lowerTitle.length > 10 && existing.includes(lowerTitle)) ||
        (existing.length > 10 && lowerTitle.includes(existing))
    );
    if (isTooSimilar) continue;

    seenTitles.add(lowerTitle);

    const verifiedEv = validateEvidenceList(item.evidence_refs, snapshot, true);

    validList.push({
      title: item.title,
      explanation: item.explanation || "Improves visitor comprehension and reduces decision friction.",
      evidence_available: verifiedEv.length > 0,
      evidence: verifiedEv,
    });
  }

  return validList;
}

/**
 * Validates Visitor Thought to ensure it represents a neutral interpretation rather than a fake user quote.
 */
export function sanitizeVisitorThought(
  thoughtText: string | undefined,
  brandName: string
): string {
  if (!thoughtText || thoughtText.trim().length === 0) {
    return `A first-time visitor would scan ${brandName}'s homepage to understand its core product offering before taking action.`;
  }

  let sanitized = thoughtText.trim();

  // Strip fake testimonial quotes or attribution (e.g., '- Sarah, CEO at TechCorp' or '— John Doe')
  const attributionRegex = /[-–—]\s*[A-Z][a-zA-Z\s,.'"]+(?:CEO|Founder|Manager|Director|VP|Head|Customer|Client|Engineer|User)?.*$/i;
  sanitized = sanitized.replace(attributionRegex, "").trim();

  // Strip wrapping quotation marks if present
  sanitized = sanitized.replace(/^["'“](.*)["'”]$/, "$1").trim();

  // Ensure phrase starts with first-time visitor perspective if not already
  if (!sanitized.toLowerCase().includes("visitor") && !sanitized.toLowerCase().includes("first-time")) {
    sanitized = `A first-time visitor would think: ${sanitized}`;
  }

  return sanitized;
}
