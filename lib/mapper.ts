import { FinalValidatedAnalysis } from "@/types/validatedAnalysis";
import { WebsiteSnapshot } from "@/lib/content-extractor";
import { AnalysisData } from "@/components/ResultsScreen";

/**
 * Maps the backend's structured FinalValidatedAnalysis and WebsiteSnapshot
 * into the camelCase AnalysisData structure expected by the frozen ResultsScreen component.
 */
export function mapBackendToFrontend(
  backendAnalysis: FinalValidatedAnalysis,
  rawUrl: string,
  snapshot?: WebsiteSnapshot
): AnalysisData {
  // Normalize Domain for Display
  let cleanDomain = rawUrl.trim();
  try {
    if (!/^https?:\/\//i.test(cleanDomain)) {
      cleanDomain = `https://${cleanDomain}`;
    }
    const parsed = new URL(cleanDomain);
    cleanDomain = parsed.hostname.replace(/^www\./, "") || "website.com";
  } catch {
    cleanDomain = cleanDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "website.com";
  }

  const statusToType = (status: string): "clear" | "amber" | "coral" => {
    const s = status.toLowerCase();
    if (s === "clear" || s === "understandable") return "clear";
    if (s === "partly_clear" || s === "partly" || s === "could_be_stronger") return "amber";
    return "coral";
  };

  const statusToLabel = (status: string): "Clear" | "Understandable" | "Partly clear" | "Unclear" => {
    const s = status.toLowerCase();
    if (s === "clear") return "Clear";
    if (s === "understandable") return "Understandable";
    if (s === "partly_clear" || s === "partly") return "Partly clear";
    return "Unclear";
  };

  const scoreToStatus = (score: number): "Needs improvement" | "Good" | "Needs work" | "Excellent" => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 50) return "Needs work";
    return "Needs improvement";
  };

  // Build quick signals
  const quickSignals = [
    {
      label: `Product category is ${backendAnalysis.first_seconds.what_is_this.status === "clear" ? "clear" : "unclear"}`,
      type: statusToType(backendAnalysis.first_seconds.what_is_this.status),
    },
    {
      label: `Target audience is ${backendAnalysis.first_seconds.who_is_it_for.status === "unclear" ? "unclear" : "visible"}`,
      type: statusToType(backendAnalysis.first_seconds.who_is_it_for.status),
    },
    {
      label: `Main benefit is ${backendAnalysis.first_seconds.what_will_i_get.status === "clear" ? "obvious" : "unclear"}`,
      type: statusToType(backendAnalysis.first_seconds.what_will_i_get.status),
    },
    {
      label: `Trust signals ${backendAnalysis.first_seconds.why_should_i_care.status === "unclear" ? "are weak" : "are visible"}`,
      type: statusToType(backendAnalysis.first_seconds.why_should_i_care.status),
    },
    {
      label: `Next step is ${backendAnalysis.first_seconds.what_should_i_do_next.status === "unclear" ? "unclear" : "clear"}`,
      type: statusToType(backendAnalysis.first_seconds.what_should_i_do_next.status),
    },
  ];

  // Build firstSeconds
  const firstSeconds = [
    {
      question: "What is this?",
      label: statusToLabel(backendAnalysis.first_seconds.what_is_this.status),
      type: backendAnalysis.first_seconds.what_is_this.status === "clear" || backendAnalysis.first_seconds.what_is_this.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.what_is_this.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
    {
      question: "Who is it for?",
      label: statusToLabel(backendAnalysis.first_seconds.who_is_it_for.status),
      type: backendAnalysis.first_seconds.who_is_it_for.status === "clear" || backendAnalysis.first_seconds.who_is_it_for.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.who_is_it_for.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
    {
      question: "What will I get?",
      label: statusToLabel(backendAnalysis.first_seconds.what_will_i_get.status),
      type: backendAnalysis.first_seconds.what_will_i_get.status === "clear" || backendAnalysis.first_seconds.what_will_i_get.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.what_will_i_get.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
    {
      question: "Why should I care?",
      label: statusToLabel(backendAnalysis.first_seconds.why_should_i_care.status),
      type: backendAnalysis.first_seconds.why_should_i_care.status === "clear" || backendAnalysis.first_seconds.why_should_i_care.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.why_should_i_care.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
    {
      question: "What should I do next?",
      label: statusToLabel(backendAnalysis.first_seconds.what_should_i_do_next.status),
      type: backendAnalysis.first_seconds.what_should_i_do_next.status === "clear" || backendAnalysis.first_seconds.what_should_i_do_next.status === "understandable"
        ? ("clear" as const)
        : backendAnalysis.first_seconds.what_should_i_do_next.status === "unclear"
        ? ("unclear" as const)
        : ("partly" as const),
    },
  ];

  // Extract clear & missing findings from backend analysis
  const clearFindings: string[] = [];
  const missingFindings: string[] = [];

  const addFinding = (status: string, clearText: string, missingText: string) => {
    if (status === "clear" || status === "understandable") {
      clearFindings.push(clearText);
    } else {
      missingFindings.push(missingText);
    }
  };

  addFinding(
    backendAnalysis.first_seconds.what_is_this.status,
    "Product category is understandable",
    "Product category is unclear"
  );
  addFinding(
    backendAnalysis.first_seconds.who_is_it_for.status,
    "Founder or target audience is visible",
    "Target audience lacks specificity"
  );
  addFinding(
    backendAnalysis.first_seconds.what_will_i_get.status,
    "Value proposition is clear",
    "Visitor outcome isn't explicit"
  );
  addFinding(
    backendAnalysis.first_seconds.why_should_i_care.status,
    "Credible proof points found",
    "Benefit is not concrete enough"
  );

  const homepageExcerpt = snapshot?.hero?.headline
    ? `“ ${snapshot.hero.headline}${snapshot.hero.subheadline ? ' — ' + snapshot.hero.subheadline : ''} ”`
    : `“ We scanned your homepage above the fold structure.”`;

  const evidence = {
    locationTag: "Homepage · Above the fold",
    homepageExcerpt,
    clearFindings: clearFindings.length > 0 ? clearFindings : ["Found initial structure"],
    missingFindings: missingFindings.length > 0 ? missingFindings : ["None identified"],
  };

  // Build signals
  const signals = [
    {
      id: "first-impression",
      title: "First impression",
      score: backendAnalysis.signals.first_impression.score,
      badgeText: backendAnalysis.signals.first_impression.status,
      badgeType: statusToType(backendAnalysis.signals.first_impression.status),
      description: backendAnalysis.signals.first_impression.explanation,
      icon: "eye",
    },
    {
      id: "audience",
      title: "Audience",
      score: backendAnalysis.signals.audience.score,
      badgeText: backendAnalysis.signals.audience.status,
      badgeType: statusToType(backendAnalysis.signals.audience.status),
      description: backendAnalysis.signals.audience.explanation,
      icon: "users",
    },
    {
      id: "value",
      title: "Value",
      score: backendAnalysis.signals.value.score,
      badgeText: backendAnalysis.signals.value.status,
      badgeType: statusToType(backendAnalysis.signals.value.status),
      description: backendAnalysis.signals.value.explanation,
      icon: "sparkles",
    },
    {
      id: "trust",
      title: "Trust",
      score: backendAnalysis.signals.trust.score,
      badgeText: backendAnalysis.signals.trust.status,
      badgeType: statusToType(backendAnalysis.signals.trust.status),
      description: backendAnalysis.signals.trust.explanation,
      icon: "shield",
    },
    {
      id: "action",
      title: "Action",
      score: backendAnalysis.signals.action.score,
      badgeText: backendAnalysis.signals.action.status,
      badgeType: statusToType(backendAnalysis.signals.action.status),
      description: backendAnalysis.signals.action.explanation,
      icon: "arrow",
    },
  ];

  // Build recommendation
  const recommendation = {
    title: "Start here",
    subhead: backendAnalysis.priority_fix.title,
    explanation: backendAnalysis.priority_fix.reason,
    currentDirection: `“ ${backendAnalysis.priority_fix.current_direction} ”`,
    strongerDirection: `“ ${backendAnalysis.priority_fix.suggested_direction} ”`,
  };

  // Build otherImprovements
  const otherImprovements = backendAnalysis.other_improvements.map((imp, idx) => {
    const icons = ["shield", "users", "zap"];
    const colors = ["bg-blue-50 text-blue-600", "bg-purple-50 text-purple-600", "bg-amber-50 text-amber-600"];
    const ids = ["trust", "audience", "action"];

    return {
      id: ids[idx % 3],
      title: imp.title,
      description: imp.explanation,
      whyItMatters: "First-time visitors expect clear answers to basic doubts before proceeding.",
      whatToImprove: "Apply the suggested copy enhancement directly to your landing page.",
      copyableSuggestion: imp.title,
      icon: icons[idx % 3],
      color: colors[idx % 3],
    };
  });

  return {
    domain: cleanDomain,
    score: backendAnalysis.overall_score,
    scoreStatus: scoreToStatus(backendAnalysis.overall_score),
    verdict: backendAnalysis.verdict.text,
    verdictSubtext: "Based on your homepage · First-time visitor perspective",
    quickSignals,
    firstSeconds,
    visitorThought: backendAnalysis.visitor_thought.text,
    evidence,
    signals,
    recommendation,
    otherImprovements,
    isPartialAccess: snapshot?.stats ? snapshot.stats.cleanedTextLength < 200 : false,
    isAccessError: false,
    checkedAt: "Checked just now",
  };
}
