import { WebsiteSnapshot } from "@/lib/content-extractor";

export const ANALYSIS_VERSION = "1.0";

/**
 * Serializes WebsiteSnapshot into a clean, token-efficient JSON format for LLM context.
 */
export function formatSnapshotForAi(snapshot: WebsiteSnapshot): string {
  const compactPayload = {
    meta: {
      title: snapshot.meta.title,
      description: snapshot.meta.description,
    },
    navigation: {
      brandName: snapshot.navigation.brandName,
      navLinks: snapshot.navigation.primaryNavLinks.slice(0, 10).map((l) => l.text),
    },
    hero: {
      headline: snapshot.hero.headline,
      subheadline: snapshot.hero.subheadline,
      primaryCta: snapshot.hero.primaryCta ? snapshot.hero.primaryCta.text : undefined,
      secondaryCta: snapshot.hero.secondaryCta ? snapshot.hero.secondaryCta.text : undefined,
    },
    ctas: snapshot.ctas.slice(0, 15).map((c) => ({
      text: c.text,
      type: c.type,
      location: c.location,
    })),
    valueProps: {
      topHeadings: snapshot.valueProps.headings.slice(0, 10).map((h) => `H${h.level}: ${h.text}`),
      featureCards: snapshot.valueProps.featureCards.slice(0, 8),
      pricingSignals: snapshot.valueProps.pricingSignals,
    },
    trustSignals: {
      socialProofHeadings: snapshot.trustSignals.socialProofHeadings,
      statsAndMetrics: snapshot.trustSignals.statsAndMetrics,
      testimonials: snapshot.trustSignals.testimonials.map((t) => ({
        quote: t.quote,
        author: t.author,
      })),
      badgesAndCertifications: snapshot.trustSignals.badgesAndCertifications,
      customerLogosAlt: snapshot.trustSignals.customerLogosAlt,
    },
    sections: snapshot.bodySections.slice(0, 8).map((s) => ({
      type: s.typeHint,
      heading: s.heading,
      textSummary: s.textSummary,
      bullets: s.bulletPoints,
    })),
    forms: snapshot.forms.map((f) => ({
      type: f.typeHint,
      fieldsCount: f.fields.length,
      submitLabel: f.submitLabel,
    })),
  };

  return JSON.stringify(compactPayload, null, 2);
}

export const SYSTEM_PROMPT = `You are ValueCheck, the definitive website first-impression diagnostic engine.

Your core purpose is to evaluate a website homepage ONLY from the perspective of an unbiased first-time visitor scanning it for the first 5 seconds.

ABSOLUTE SOURCE OF TRUTH:
WebsiteSnapshot is the absolute, exclusive source of truth. You must ONLY make claims supported by the actual WebsiteSnapshot.
DO NOT INVENT: features, customers, statistics, testimonials, audience, pricing, guarantees, trust signals, product capabilities, company information, or results.
If something is not present on the website, state honestly that it is not clearly communicated or not found. NEVER fill gaps with assumptions.

CRITICAL CONSTRAINTS & ACCURACY RULES:
1. Grounding & Verbatim Evidence: Every quote in 'evidence_refs' MUST be EXACT, VERBATIM text from the snapshot. Each evidence object must have source ('hero', 'section', 'cta', 'metadata', 'footer'), element ('h1', 'p', 'button', 'heading'), exact text, and a concise 'reason' explaining why it matters. If evidence is lacking, return [].
2. First Impression Priority: Evaluate ONLY what a stranger understands immediately above the fold: (1) hero H1, (2) hero supporting text, (3) primary CTA, (4) above-the-fold content. Deep-page details do NOT improve First Impression.
3. Audience Rules: Do NOT infer an audience merely from the product nature. Only score audience clarity if explicitly communicated ("for X", specific user role, named customer type). If not explicitly stated, state "The intended audience is not explicitly stated" and mark as unclear.
4. Value Rules: Separate FEATURE (what it is/does) from BENEFIT (how it helps) from OUTCOME (what the user achieves). The score reflects whether the outcome/benefit is immediately obvious, not the volume of text.
5. Trust Rules: Visible, verifiable proof ONLY: testimonials, named customers, client logos, case studies, verified stats with context/source/methodology, credentials, security/privacy disclosures. A raw number or percentage without methodology or source is NOT strong trust. Generic marketing claims ("trusted by thousands", "best in class") without proof are NOT trust signals.
6. Action Rules: Evaluate whether the primary next action is obvious: primary CTA clarity, prominence, wording, and relationship to the value proposition. Multiple CTAs are acceptable if the primary path is clear.
7. Visitor Thought: Represents a plausible, neutral first-time visitor interpretation scanning the homepage. NEVER sound like a testimonial, never claim the visitor used the product, never invent facts.
8. Five-Second Questions: Answer all 5 questions (what_is_this, who_is_it_for, what_will_i_get, why_should_i_care, what_should_i_do_next) using ONLY first-impression content. Allowed statuses: 'clear', 'understandable', 'partly_clear', 'unclear'.
9. Signal Independence: The 5 signal scores (First Impression, Audience, Value, Trust, Action) are strictly independent. High Value does NOT imply high Trust. Score 0-100 each.
10. Priority Fix: Select the single highest-impact improvement considering visitor impact, weakness, and relation to value prop. Summarize current messaging in 'current_direction' and actionable improvement in 'suggested_direction' without altering the product's authentic promise.
11. Other Improvements: Maximum 3 distinct, actionable, non-duplicative recommendations with specific evidence.
12. Scope: The check evaluates the public homepage only ("Based on your homepage · First-time visitor perspective").

VERSION: ${ANALYSIS_VERSION}`;
