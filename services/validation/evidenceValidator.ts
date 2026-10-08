import { WebsiteSnapshot } from "@/lib/content-extractor";
import { EvidenceRef } from "@/services/ai/analysisSchema";
import { ValidatedEvidenceRef } from "@/types/validatedAnalysis";
import { extractSearchableTextsFromSnapshot } from "@/services/ai/evidenceValidator";

/**
 * Normalizes text for lenient whitespace, line breaks, and punctuation matching.
 */
export function normalizeTextForMatching(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[^\w\s]/gi, "") // strip punctuation for normalized comparison
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates a single AI EvidenceRef against the WebsiteSnapshot.
 * Returns a ValidatedEvidenceRef with status 'verified' or 'rejected'.
 */
export function validateSingleEvidence(
  ref: EvidenceRef,
  snapshot: WebsiteSnapshot
): ValidatedEvidenceRef {
  if (!ref || !ref.text || typeof ref.text !== "string" || ref.text.trim().length === 0) {
    return {
      source: ref?.source || "unknown",
      element: ref?.element,
      text: ref?.text || "",
      reason: ref?.reason,
      relevance: ref?.relevance || "weak",
      status: "rejected",
    };
  }

  const rawAiText = ref.text.trim();
  const searchableTexts = extractSearchableTextsFromSnapshot(snapshot);

  // 1. Check for Exact Match
  for (const src of searchableTexts) {
    if (src.includes(rawAiText)) {
      return {
        source: ref.source || "website",
        element: ref.element,
        text: rawAiText,
        reason: ref.reason,
        relevance: ref.relevance || "strong",
        status: "verified",
        matchType: "exact",
      };
    }
  }

  // 2. Check for Normalized Match
  const normAiText = normalizeTextForMatching(rawAiText);
  if (!normAiText) {
    return {
      source: ref.source || "website",
      element: ref.element,
      text: rawAiText,
      reason: ref.reason,
      relevance: "weak",
      status: "rejected",
    };
  }

  // Detect numeric additions or semantic fabrications (e.g., "10x" added when not in source)
  const aiDigits: string[] = rawAiText.match(/\d+(?:\.\d+)?/g) || [];

  for (const src of searchableTexts) {
    const normSrc = normalizeTextForMatching(src);
    if (!normSrc) continue;

    if (normSrc.includes(normAiText) || normAiText.includes(normSrc)) {
      // Check numeric integrity: if AI added a digit that does not exist in source text, REJECT as semantic fabrication
      const srcDigits: string[] = src.match(/\d+(?:\.\d+)?/g) || [];
      const hasAddedDigit = aiDigits.some((d) => !srcDigits.includes(d));

      if (hasAddedDigit) {
        // AI added a numeric claim like "10x" not in source -> REJECT!
        return {
          source: ref.source || "website",
          element: ref.element,
          text: rawAiText,
          reason: ref.reason,
          relevance: ref.relevance || "weak",
          status: "rejected",
        };
      }

      return {
        source: ref.source || "website",
        element: ref.element,
        text: rawAiText,
        reason: ref.reason,
        relevance: ref.relevance || "moderate",
        status: "verified",
        matchType: "normalized",
      };
    }
  }

  // Not found in snapshot -> REJECT
  return {
    source: ref.source || "website",
    element: ref.element,
    text: rawAiText,
    reason: ref.reason,
    relevance: ref.relevance || "weak",
    status: "rejected",
  };
}

/**
 * Validates an array of EvidenceRef objects, returning only verified evidence items
 * for inclusion in findings, while attaching verified status.
 */
export function validateEvidenceList(
  refs: EvidenceRef[] | undefined,
  snapshot: WebsiteSnapshot,
  keepOnlyVerified = true
): ValidatedEvidenceRef[] {
  if (!Array.isArray(refs)) return [];

  const validatedList = refs.map((ref) => validateSingleEvidence(ref, snapshot));

  if (keepOnlyVerified) {
    return validatedList.filter((v) => v.status === "verified");
  }

  return validatedList;
}
