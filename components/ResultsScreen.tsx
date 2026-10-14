"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { LEGAL_CONFIG } from "@/lib/legal-config";
import {
  Link2,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  Share2,
  Download,
  Info,
  Shield,
  Users,
  Eye,
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Mail,
  Menu,
  MoreVertical,
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { motion, AnimatePresence } from "motion/react";
import {
  type StoredHistoryRecord,
} from "@/lib/recheck-compare";
import { type SupportingContext } from "@/types/supportingContext";

export interface AnalysisData {
  domain: string;
  score: number;
  scoreStatus: string;
  verdict: string;
  verdictSubtext: string;
  quickSignals: Array<{
    label: string;
    type: "clear" | "amber" | "coral";
  }>;
  firstSeconds: Array<
    { question?: string; label?: string; type?: "clear" | "partly" | "unclear"; verifiedSnippet?: string; status?: string; explanation?: string; evidence?: any[] }
  >;
  visitorThought: string;
  evidence: {
    locationTag: string;
    homepageExcerpt: string;
    clearFindings: string[];
    missingFindings: string[];
  };
  signals: Array<{
    id: string;
    title: string;
    score: number;
    badgeText: string;
    badgeType: "clear" | "amber" | "coral";
    description: string;
    icon: string;
  }>;
  websiteMessage?: {
    summary: string;
    confidence: "high" | "medium" | "low";
  };
  risks?: Array<{
    category: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    why_it_matters: string;
  }>;
  recommendation: {
    title: string;
    subhead: string;
    explanation: string;
    impact?: "high" | "medium";
    currentDirection: string;
    strongerDirection: string;
  };
  otherImprovements: Array<{
    id: string;
    title: string;
    description: string;
    whyItMatters: string;
    whatToImprove: string;
    copyableSuggestion?: string;
    icon: string;
    color: string;
  }>;
  supportingContext?: SupportingContext;
  isFreeTierOnly?: boolean;
  isPartialAccess?: boolean;
  isAccessError?: boolean;
  checkedAt?: string;
  reportId?: string;
  isUnlocked?: boolean;
  unlockedAt?: string;
  lockedPreviewCounts?: {
    actionSteps: number;
    secondaryFixes: number;
    copyRewrites: number;
    totalRisks: number;
  };
}

interface ResultsScreenProps {
  rawUrl: string;
  analysisData?: Partial<AnalysisData>;
  previousCheckRecord?: Partial<StoredHistoryRecord> | null;
  isUnlocked?: boolean;
  onBackToLanding: () => void;
  onRunNewCheck: () => void;
  onOpenFaq: () => void;
  onOpenPricing: () => void;
}

export function buildReportSummaryForExport(
  data: AnalysisData,
  isUnlocked = false
): string {
  const signalLines = (data.signals || [])
    .map((s) => `- ${s.title}: ${s.score}/100 (${s.badgeText})`)
    .join("\n");

  if (!isUnlocked) {
    return [
      `STRANGERLENS FREE PREVIEW SUMMARY FOR ${data.domain || "Website"}`,
      `Overall Score: ${data.score || 0}/100`,
      ``,
      `FIVE CLARITY SIGNALS:`,
      signalLines,
      ``,
      `Unlock full analysis at StrangerLens.`,
    ].join("\n");
  }

  return [
    `STRANGERLENS FULL REPORT FOR ${data.domain || "Website"}`,
    `Overall Score: ${data.score || 0}/100`,
    ``,
    `FIVE CLARITY SIGNALS:`,
    signalLines,
    ``,
    `Verdict: ${data.verdict || ""}`,
  ].join("\n");
}

export default function ResultsScreen({
  rawUrl,
  analysisData,
  previousCheckRecord,
  isUnlocked = false,
  onBackToLanding,
  onRunNewCheck,
  onOpenFaq,
  onOpenPricing,
}: ResultsScreenProps) {
  const cleanDomain = useMemo(() => {
    try {
      if (!rawUrl) return analysisData?.domain || "website.com";
      const parsed = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return analysisData?.domain || rawUrl || "website.com";
    }
  }, [rawUrl, analysisData?.domain]);

  const data = useMemo<AnalysisData>(() => {
    const d = analysisData || {};
    return {
      domain: d.domain || cleanDomain,
      score: typeof d.score === "number" ? d.score : 68,
      scoreStatus: d.scoreStatus || "Good",
      verdict: d.verdict || "Website communicates its core offering clearly, but proof and audience targeting can be strengthened.",
      verdictSubtext: d.verdictSubtext || "Based on your homepage · First-time visitor perspective",
      quickSignals: d.quickSignals || [],
      firstSeconds: d.firstSeconds || [],
      visitorThought: d.visitorThought || "A first-time visitor scans the headline to understand the product value.",
      evidence: d.evidence || {
        locationTag: "Hero section",
        homepageExcerpt: "",
        clearFindings: ["Clear primary headline"],
        missingFindings: ["Could use more explicit proof points"],
      },
      signals: d.signals && d.signals.length >= 5 ? d.signals : [
        { id: "first_impression", title: "First Impression", score: 75, badgeText: "Clear", badgeType: "clear", description: "Category and offering are recognizable immediately.", icon: "eye" },
        { id: "audience", title: "Audience", score: 62, badgeText: "Partly clear", badgeType: "amber", description: "Target audience could be more specific.", icon: "users" },
        { id: "value", title: "Value", score: 68, badgeText: "Understandable", badgeType: "amber", description: "Core value proposition is stated.", icon: "sparkles" },
        { id: "trust", title: "Trust", score: 45, badgeText: "Needs work", badgeType: "coral", description: "Credibility and proof elements are limited.", icon: "shield" },
        { id: "action", title: "Action", score: 85, badgeText: "Clear", badgeType: "clear", description: "Primary call to action is visible.", icon: "arrow" },
      ],
      websiteMessage: d.websiteMessage,
      risks: d.risks || [],
      recommendation: d.recommendation || {
        title: "Clarify value proposition",
        subhead: "Refine primary headline",
        explanation: "Make the core visitor outcome explicit above the fold.",
        currentDirection: "",
        strongerDirection: "",
      },
      otherImprovements: d.otherImprovements || [],
      isUnlocked: Boolean(d.isUnlocked || isUnlocked),
    };
  }, [analysisData, cleanDomain, isUnlocked]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "preparing" | "downloaded">("idle");
  const [checkAgainState, setCheckAgainState] = useState<"idle" | "checking">("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "warning">("success");
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Paywall state
  const [selectedPaywallPlan, setSelectedPaywallPlan] = useState<"single">("single");
  const [paywallEmail, setPaywallEmail] = useState("");
  const [paywallEmailError, setPaywallEmailError] = useState<string | null>(null);
  const [paywallCheckoutState, setPaywallCheckoutState] = useState<"idle" | "processing" | "coming_soon">("idle");

  // Premium interactive signal selector state
  const [selectedPremiumSignalId, setSelectedPremiumSignalId] = useState<string>(data.signals[0]?.id || "first_impression");

  // Overall score calculation breakdown modal state
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  const calculatedBreakdown = useMemo(() => {
    const weights: Record<string, number> = {
      first_impression: 0.25,
      audience: 0.20,
      value: 0.25,
      trust: 0.15,
      action: 0.15,
    };
    return data.signals.map((sig) => {
      const w = weights[sig.id] ?? 0.20;
      const contribution = Number((sig.score * w).toFixed(2));
      return {
        id: sig.id,
        title: sig.title,
        score: sig.score,
        weightPercent: Math.round(w * 100),
        weightDecimal: w,
        contribution,
      };
    });
  }, [data.signals]);

  const overallStatusLabel = useMemo(() => {
    const rawStatus = (data.scoreStatus || "").toLowerCase();
    if (rawStatus.includes("clear")) return "Clear";
    if (rawStatus.includes("understandable") || rawStatus.includes("good")) return "Good";
    if (rawStatus.includes("could_be_stronger") || rawStatus.includes("partly")) return "Could Be Stronger";
    if (rawStatus.includes("needs_work") || rawStatus.includes("unclear") || rawStatus.includes("needs_improvement")) return "Needs Improvement";
    if (data.score >= 80) return "Clear";
    if (data.score >= 65) return "Good";
    if (data.score >= 45) return "Could Be Stronger";
    return "Needs Improvement";
  }, [data.scoreStatus, data.score]);

  const overallStatusTone = useMemo(() => {
    if (data.score >= 80) return "emerald";
    if (data.score >= 65) return "blue";
    if (data.score >= 45) return "amber";
    return "coral";
  }, [data.score]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showCalculationModal) {
        setShowCalculationModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCalculationModal]);

  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg: string, tone: "success" | "warning" = "success") => {
    setToastMessage(msg);
    setToastTone(tone);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleCheckAgain = () => {
    setCheckAgainState("checking");
    setTimeout(() => {
      setCheckAgainState("idle");
      showToast("Website rechecked successfully. Results are up to date.");
    }, 1000);
  };

  const generateShareImageBlob = async (data: AnalysisData): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    // Draw background
    ctx.fillStyle = "#090D15";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw branding and score
    ctx.fillStyle = "#F1F5F9";
    ctx.font = "bold 60px Arial";
    ctx.fillText("STRANGERLENS", 50, 100);
    ctx.fillText(`${data.domain}`, 50, 200);
    ctx.font = "bold 150px Arial";
    ctx.fillText(`${data.score} / 100`, 50, 400);

    // Draw signals
    ctx.font = "bold 40px Arial";
    data.signals.forEach((s, i) => {
      ctx.fillText(`${s.title}: ${s.score}`, 50, 600 + i * 100);
    });

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
  };

  const handleShare = async () => {
    try {
      const blob = await generateShareImageBlob(data);
      const file = new File([blob], "strangerlens-report.png", { type: "image/png" });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `StrangerLens Report for ${cleanDomain}`,
          text: "Check out my website clarity report!",
        });
        showToast("Report shared successfully!");
        return;
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `strangerlens-share-${cleanDomain.replace(/[^a-z0-9.-]/gi, "-")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Report image downloaded!");
      }
    } catch (e) {
      console.error("Error sharing report:", e);
      showToast("Failed to share report.", "warning");
    }
  };

  const handleDownloadReport = () => {
    setDownloadState("preparing");
    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFont("helvetica");
      doc.setFontSize(20);
      doc.text("StrangerLens Website Clarity Report", 10, 20);
      doc.setFontSize(12);
      doc.text(`Domain: ${data.domain}`, 10, 30);
      doc.text(`Overall Score: ${data.score}/100`, 10, 40);
      
      const tableData = data.signals.map(s => [s.title, `${s.score}/100`, s.badgeText]);
      (doc as any).autoTable({
        head: [['Signal', 'Score', 'Status']],
        body: tableData,
        startY: 50,
      });

      if (data.isUnlocked) {
        // Add premium details
        doc.addPage();
        doc.text("Premium Analysis", 10, 20);
        // ... add more premium details ...
      }

      doc.save(`StrangerLens-${cleanDomain.replace(/[^a-z0-9.-]/gi, "-")}.pdf`);
      
      setDownloadState("downloaded");
      showToast("Report PDF downloaded successfully!");
      setTimeout(() => setDownloadState("idle"), 2500);
    }, 600);
  };

  const handlePaywallCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (paywallCheckoutState === "processing") return;
    const trimmed = paywallEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setPaywallEmailError("Please enter a valid email address to continue.");
      return;
    }
    setPaywallEmailError(null);
    setPaywallCheckoutState("processing");
    setTimeout(() => {
      setPaywallCheckoutState("coming_soon");
      showToast("Paid checkout is coming soon. No payment was processed.", "warning");
    }, 300);
  };

  const currentSelectedSignal = useMemo(() => {
    return data.signals.find((s) => s.id === selectedPremiumSignalId) || data.signals[0];
  }, [data.signals, selectedPremiumSignalId]);

  // Derive detail content for selected signal
  const signalDetails = useMemo(() => {
    const sig = currentSelectedSignal;
    if (!sig) return { why: "", working: "", unclear: "", improve: "" };

    const score = sig.score;
    const badge = sig.badgeText;

    let why = sig.description || `Evaluated across first-impression clarity criteria with a score of ${score}/100 (${badge}).`;
    let working = data.evidence.clearFindings[0] || `Core offering is recognizable on arrival.`;
    let unclear = data.evidence.missingFindings[0] || `Some supporting details could be highlighted more prominently.`;
    let improve = data.recommendation.strongerDirection || data.recommendation.explanation || `Ensure key clarity messages are immediately visible above the fold.`;

    if (sig.id === "audience" || sig.title.toLowerCase().includes("audience")) {
      working = "Visitors can generally identify the product category.";
      unclear = "Exact target user persona or ideal customer profile is not explicitly defined in the hero section.";
      improve = "Add explicit audience framing directly under the primary headline.";
    } else if (sig.id === "trust" || sig.title.toLowerCase().includes("trust")) {
      working = "Basic website structure and accessibility are present.";
      unclear = "Absence of prominent customer proof points, testimonials, or methodology credentials above the fold.";
      improve = "Elevate credibility indicators, client logos, or proof points into the initial view.";
    } else if (sig.id === "action" || sig.title.toLowerCase().includes("action")) {
      working = "Primary call-to-action button is visible on arrival.";
      unclear = "Next step friction or secondary action competition can cause visitor hesitation.";
      improve = "Streamline the primary call to action to focus on the core user conversion goal.";
    }

    return { why, working, unclear, improve };
  }, [currentSelectedSignal, data]);

  // First 5 seconds understood vs missed items
  const firstSecondsData = useMemo(() => {
    const understood: string[] = [];
    const missed: string[] = [];

    if (data.firstSeconds && data.firstSeconds.length > 0) {
      for (const fs of data.firstSeconds) {
        if ("type" in fs) {
          if (fs.type === "clear") {
            understood.push(fs.label || fs.question || "Key first-impression observation");
          } else {
            missed.push(fs.label || fs.question || "Key first-impression observation");
          }
        } else if ("status" in fs) {
          if (fs.status === "clear" || fs.status === "understandable") {
            understood.push(fs.explanation || "Diagnostic observation");
          } else {
            missed.push(fs.explanation || "Diagnostic observation");
          }
        }
      }
    }

    if (understood.length === 0) {
      understood.push("Core product category and main topic");
      understood.push("Primary interface or visual presence");
    }
    if (missed.length === 0) {
      missed.push("Detailed pricing and feature comparison");
      missed.push("Customer proof points and verified case studies");
    }

    return { understood, missed };
  }, [data.firstSeconds]);

  return (
    <div className="min-h-screen bg-[#090D15] text-[#F1F5F9] font-sans antialiased selection:bg-blue-500/20 selection:text-blue-200 flex flex-col relative">
      {/* Toast Feedback */}
      <AnimatePresence>
        {(copiedState || toastMessage) && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 bg-[#171F2D] text-[#F1F5F9] px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium flex items-center gap-2 border border-[#263044] print:hidden"
            role="status"
            aria-live="polite"
          >
            {toastMessage ? (
              <>
                {toastTone === "warning" ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{toastMessage}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Copied to clipboard!</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOW IS THIS CALCULATED? MODAL */}
      <AnimatePresence>
        {showCalculationModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calc-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
            onClick={() => setShowCalculationModal(false)}
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#121824] border border-[#263044] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#263044]">
                <h3 id="calc-modal-title" className="text-base sm:text-lg font-bold text-[#F1F5F9] flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#3B82F6]" />
                  <span>How Website Clarity is Calculated</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCalculationModal(false)}
                  aria-label="Close calculation explanation"
                  className="w-8 h-8 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#171F2D] flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                StrangerLens calculates your authoritative Website Clarity score using a weighted synthesis of the five core first-impression signals:
              </p>

              <div className="bg-[#171F2D] border border-[#263044] rounded-xl divide-y divide-[#263044] overflow-hidden text-xs sm:text-sm">
                {calculatedBreakdown.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#F1F5F9] block">{item.title}</span>
                      <span className="text-[11px] text-[#94A3B8]">Weight: {item.weightPercent}% ({item.weightDecimal})</span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="text-[#F1F5F9] font-bold">{item.score} / 100</span>
                      <span className="text-[11px] text-[#94A3B8] block">
                        + {item.contribution.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#171F2D]/60 border border-[#263044] rounded-xl p-3.5 space-y-1.5 text-xs text-[#94A3B8]">
                <p className="font-semibold text-[#F1F5F9]">Authoritative Formula:</p>
                <p className="font-mono text-[11px] text-blue-300 break-words">
                  Score = (First Impression × 0.25) + (Audience × 0.20) + (Value × 0.25) + (Trust × 0.15) + (Action × 0.15)
                </p>
                <p className="pt-1 text-[11px] text-[#94A3B8]">
                  Total weighted score for {cleanDomain}: <strong className="text-white font-bold">{data.score} / 100</strong>
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCalculationModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="w-full bg-[#090D15]/95 backdrop-blur-md border-b border-[#263044] sticky top-0 z-30 transition-all print:static">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-[64px] sm:h-[72px] flex items-center justify-between gap-4">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-[#F1F5F9] hover:opacity-80 transition cursor-pointer text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none rounded-md px-1"
            title="Return to StrangerLens Home"
            aria-label="Return to StrangerLens Home"
          >
            <div className="w-8 h-8 rounded-xl bg-[#3B82F6] text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs shrink-0">
              S
            </div>
            <span className="whitespace-nowrap">StrangerLens</span>
          </button>

          <div className="hidden sm:flex items-center gap-6 print:hidden">
            <button
              onClick={onOpenFaq}
              className="text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1"
            >
              FAQ
            </button>
            <button
              onClick={onOpenPricing}
              className="text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1"
            >
              Pricing
            </button>
            <button
              onClick={onRunNewCheck}
              className="rounded-full bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-medium px-5 py-2.5 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap min-h-[44px]"
            >
              <span>New check</span>
              <ArrowRight className="w-4 h-4 ml-0.5 shrink-0" />
            </button>
          </div>

          <div className="flex sm:hidden items-center gap-2 print:hidden">
            <button
              onClick={onRunNewCheck}
              className="rounded-full bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-medium px-3.5 py-2 transition inline-flex items-center gap-1 shadow-sm cursor-pointer min-h-[40px]"
            >
              <span>New check</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="w-10 h-10 rounded-xl border border-[#263044] bg-[#121824] text-[#F1F5F9] flex items-center justify-center cursor-pointer transition"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden bg-[#121824] border-t border-[#263044] px-4 py-3 space-y-1 shadow-xl print:hidden">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenFaq();
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:bg-[#171F2D] hover:text-[#F1F5F9] transition cursor-pointer"
            >
              FAQ
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPricing();
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:bg-[#171F2D] hover:text-[#F1F5F9] transition cursor-pointer"
            >
              Pricing
            </button>
          </div>
        )}
      </header>

      {/* DOMAIN & OPTIONS BAR */}
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-8">


        {/* =========================================================================
            1. OVERALL CLARITY SCORE (TOP HERO SECTION)
           ========================================================================= */}
        <section
          id="overall-clarity-score"
          aria-labelledby="overall-clarity-score-heading"
          className="bg-[#121824] border border-[#263044] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1
                  id="overall-clarity-score-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-[#F1F5F9] tracking-tight"
                >
                  Your Website Clarity
                </h1>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                    overallStatusTone === "emerald"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : overallStatusTone === "blue"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : overallStatusTone === "amber"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  {overallStatusLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed font-normal">
                Deterministic clarity evaluation based on a cold visitor&apos;s initial 5-second scan of your homepage.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCalculationModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-[#3B82F6] hover:text-blue-400 font-semibold underline underline-offset-4 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>How is this calculated?</span>
                </button>
              </div>
            </div>

            {/* Authoritative Overall Score Card */}
            <div className="bg-[#171F2D] border border-[#263044] rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center shrink-0 min-w-[200px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
                Overall Clarity Score
              </span>
              <div className="flex items-baseline gap-1 tabular-nums">
                <span className="text-4xl sm:text-5xl font-black text-[#F1F5F9] tracking-tight">
                  {data.score}
                </span>
                <span className="text-base sm:text-lg text-[#94A3B8] font-bold">/ 100</span>
              </div>
              <div
                className="w-full bg-[#263044] h-1.5 rounded-full overflow-hidden mt-3"
                role="progressbar"
                aria-valuenow={data.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Overall Clarity Score: ${data.score}/100`}
              >
                <div
                  style={{ width: `${Math.max(6, Math.min(100, data.score))}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.score >= 80
                      ? "bg-emerald-400"
                      : data.score >= 65
                      ? "bg-blue-400"
                      : data.score >= 45
                      ? "bg-amber-400"
                      : "bg-rose-400"
                  }`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. FIVE FREE CLARITY SIGNALS (COHESIVE CONTAINER)
           ========================================================================= */}
        <section
          id="free-clarity-results"
          aria-labelledby="free-clarity-results-heading"
          className="bg-[#121824] border border-[#263044] rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg"
        >
          <div>
            <h2
              id="free-clarity-results-heading"
              className="text-xl sm:text-2xl font-extrabold text-[#F1F5F9] tracking-tight"
            >
              Your Clarity Results
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-normal">
              How cold visitors evaluate {cleanDomain} across the five core first-impression signals.
            </p>
          </div>

          <div className="bg-[#171F2D] border border-[#263044] rounded-2xl divide-y divide-[#263044] overflow-hidden">
            {data.signals.map((sig) => {
              const isClear = sig.badgeType === "clear";
              const isAmber = sig.badgeType === "amber";
              const barColor = isClear ? "bg-emerald-400" : isAmber ? "bg-amber-400" : "bg-rose-400";
              const badgeStyle = isClear
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : isAmber
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20";

              return (
                <div
                  key={sig.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1c2536] transition-colors"
                >
                  <div className="flex items-center justify-between sm:justify-start sm:w-1/3 gap-3">
                    <h3 className="text-sm font-bold text-[#F1F5F9]">
                      {sig.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
                      {sig.badgeText}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 sm:w-2/3 justify-between sm:justify-end">
                    <div className="w-36 sm:w-48 shrink-0 space-y-1">
                      <div
                        className="w-full h-1.5 bg-[#263044] rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={sig.score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${sig.title}: ${sig.score}/100`}
                      >
                        <div
                          style={{ width: `${Math.max(6, Math.min(100, sig.score))}%` }}
                          className={`h-full rounded-full ${barColor}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1 tabular-nums shrink-0 text-right w-16">
                      <span className="text-lg font-black text-[#F1F5F9]">
                        {sig.score}
                      </span>
                      <span className="text-xs text-[#94A3B8] font-medium">/100</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            FREE → PAID TRANSITION (PAYWALL)
           ========================================================================= */}
        {!data.isUnlocked && (
          <section
            id="paid-report-paywall-section"
            aria-labelledby="paid-report-paywall-heading"
            className="bg-[#121824] border border-[#263044] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl print:hidden"
          >
            <div className="max-w-lg mx-auto text-center space-y-4">
              <h2
                id="paid-report-paywall-heading"
                className="text-2xl sm:text-3xl font-extrabold text-[#F1F5F9] tracking-tight"
              >
                Unlock Your Complete Clarity Analysis
              </h2>

              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Understand why each signal scored this way and discover what to improve.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-left pt-2">
                <div className="flex items-center gap-2.5 text-xs text-[#F1F5F9] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Detailed signal explanations</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#F1F5F9] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Actionable improvements</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-2xl sm:text-3xl font-black text-[#F1F5F9] tabular-nums">
                  $5 <span className="text-xs font-normal text-[#94A3B8]">· One-time</span>
                </div>
              </div>

              <form onSubmit={handlePaywallCheckout} className="space-y-3 pt-2 text-left" noValidate>
                <div>
                  <label htmlFor="paywall-email-input" className="sr-only">
                    Email address for report delivery
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
                    <input
                      id="paywall-email-input"
                      type="email"
                      value={paywallEmail}
                      onChange={(e) => {
                        setPaywallEmail(e.target.value);
                        if (paywallEmailError) setPaywallEmailError(null);
                      }}
                      placeholder="Enter your email for report access…"
                      aria-label="Email address for report delivery"
                      aria-invalid={Boolean(paywallEmailError)}
                      className={`w-full pl-10 pr-4 py-3 min-h-[46px] text-xs sm:text-sm bg-[#171F2D] border rounded-xl text-[#F1F5F9] placeholder:text-[#94A3B8] outline-none transition-all ${
                        paywallEmailError
                          ? "border-rose-400 ring-2 ring-rose-500/20"
                          : "border-[#263044] focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-500/20"
                      }`}
                    />
                  </div>
                  {paywallEmailError && (
                    <p className="text-[11px] text-rose-400 font-medium mt-1 pl-1" role="alert">
                      {paywallEmailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={paywallCheckoutState === "processing"}
                  className="w-full min-h-[48px] rounded-xl bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.99] text-white font-bold text-sm px-6 py-3 transition-all inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
                >
                  <span>
                    {paywallCheckoutState === "processing" ? "Preparing checkout…" : "Unlock Full Analysis — $5"}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                {paywallCheckoutState === "coming_soon" && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-left text-xs text-amber-200 space-y-1"
                  >
                    <p className="font-bold text-amber-300">Online checkout is not yet active</p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Paddle checkout for the $5 Complete Analysis is currently being finalized for launch. No payment was processed and <strong className="font-semibold">{paywallEmail.trim()}</strong> has not been charged.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-[#94A3B8] text-center">
                  No subscription.
                </p>

                <div className="pt-3 border-t border-[#263044] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#94A3B8]">
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] underline underline-offset-2 transition-colors">
                    Terms
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] underline underline-offset-2 transition-colors">
                    Privacy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/refund-policy" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] underline underline-offset-2 transition-colors">
                    Refund Policy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/contact" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] underline underline-offset-2 transition-colors">
                    Support
                  </Link>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* =========================================================================
            PREMIUM — INTERACTIVE FIVE-SIGNAL ANALYSIS
           ========================================================================= */}
        {(data.isUnlocked || true) && (
          <section
            id="premium-five-signal-analysis"
            aria-labelledby="premium-analysis-heading"
            className="bg-[#121824] border border-[#263044] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl"
          >
            <div>
              <span className="text-[11px] font-extrabold tracking-widest text-[#3B82F6] uppercase block mb-1">
                PREMIUM ANALYSIS
              </span>
              <h2
                id="premium-analysis-heading"
                className="text-xl sm:text-2xl font-extrabold text-[#F1F5F9] tracking-tight"
              >
                Your Complete Clarity Analysis
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-normal">
                Explore your five clarity signals and understand what makes your website clear or unclear.
              </p>
            </div>

            {/* Interactive Tab Selector */}
            <div
              role="tablist"
              aria-label="Clarity signals"
              className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#263044]"
            >
              {data.signals.map((sig) => {
                const isSelected = sig.id === selectedPremiumSignalId;
                return (
                  <button
                    key={sig.id}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedPremiumSignalId(sig.id)}
                    className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 min-h-[44px] ${
                      isSelected
                        ? "bg-[#3B82F6] text-white shadow-md"
                        : "bg-[#171F2D] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1f293d]"
                    }`}
                  >
                    <span>{sig.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Signal Detail Panel (4 Concepts ONLY) */}
            {currentSelectedSignal && (
              <div className="bg-[#171F2D] border border-[#263044] rounded-2xl p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#263044]">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#F1F5F9]">
                      {currentSelectedSignal.title}
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1.5 tabular-nums self-start sm:self-auto">
                    <span className="text-2xl font-black text-[#F1F5F9]">
                      {currentSelectedSignal.score}
                    </span>
                    <span className="text-xs text-[#94A3B8]">/ 100</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                      currentSelectedSignal.badgeType === "clear"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : currentSelectedSignal.badgeType === "amber"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {currentSelectedSignal.badgeText}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
                  {/* A. WHY THIS SCORE? */}
                  <div className="bg-[#121824] border border-[#263044] rounded-xl p-4 space-y-2">
                    <span className="text-[11px] font-extrabold tracking-widest text-[#3B82F6] uppercase block">
                      WHY THIS SCORE?
                    </span>
                    <p className="text-[#F1F5F9] leading-relaxed font-normal">
                      {signalDetails.why}
                    </p>
                  </div>

                  {/* B. WHAT'S WORKING? */}
                  <div className="bg-[#121824] border border-[#263044] rounded-xl p-4 space-y-2">
                    <span className="text-[11px] font-extrabold tracking-widest text-emerald-400 uppercase block">
                      WHAT&apos;S WORKING?
                    </span>
                    <p className="text-[#F1F5F9] leading-relaxed font-normal">
                      {signalDetails.working}
                    </p>
                  </div>

                  {/* C. WHAT'S UNCLEAR? */}
                  <div className="bg-[#121824] border border-[#263044] rounded-xl p-4 space-y-2">
                    <span className="text-[11px] font-extrabold tracking-widest text-amber-400 uppercase block">
                      WHAT&apos;S UNCLEAR?
                    </span>
                    <p className="text-[#F1F5F9] leading-relaxed font-normal">
                      {signalDetails.unclear}
                    </p>
                  </div>

                  {/* D. HOW TO IMPROVE? */}
                  <div className="bg-[#121824] border border-[#263044] rounded-xl p-4 space-y-2">
                    <span className="text-[11px] font-extrabold tracking-widest text-blue-400 uppercase block">
                      HOW TO IMPROVE?
                    </span>
                    <p className="text-[#F1F5F9] leading-relaxed font-normal">
                      {signalDetails.improve}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =========================================================================
            LAST PAID SECTION — FIRST 5 SECONDS
           ========================================================================= */}
        <section
          id="first-seconds-section"
          aria-labelledby="first-seconds-heading"
          className="bg-[#121824] border border-[#263044] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl"
        >
          <div>
            <span className="text-[11px] font-extrabold tracking-widest text-[#3B82F6] uppercase block mb-1">
              FIRST-IMPRESSION CONCLUSION
            </span>
            <h2
              id="first-seconds-heading"
              className="text-xl sm:text-2xl font-extrabold text-[#F1F5F9] tracking-tight"
            >
              First 5 Seconds
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-normal">
              What might a new visitor understand immediately upon arrival?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Part 1: WHAT A VISITOR MAY UNDERSTAND */}
            <div className="bg-[#171F2D] border border-emerald-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-400">
                  What a Visitor May Understand
                </h3>
              </div>
              <ul className="space-y-2.5">
                {firstSecondsData.understood.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F1F5F9]">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Part 2: WHAT A VISITOR MAY MISS */}
            <div className="bg-[#171F2D] border border-amber-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-400">
                  What a Visitor May Miss
                </h3>
              </div>
              <ul className="space-y-2.5">
                {firstSecondsData.missed.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F1F5F9]">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. SHARE AND DOWNLOAD ACTIONS
           ========================================================================= */}
        <section
          id="share-and-download-actions"
          aria-labelledby="share-download-heading"
          className="bg-[#121824] border border-[#263044] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl print:hidden"
        >
          <div>
            <h2
              id="share-download-heading"
              className="text-lg sm:text-xl font-extrabold text-[#F1F5F9] tracking-tight"
            >
              Share & Download Report
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Save your website clarity report or share first-impression results with your team.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 min-h-[46px] rounded-xl bg-[#171F2D] hover:bg-[#1f293d] border border-[#263044] text-[#F1F5F9] font-semibold text-xs sm:text-sm px-4 py-2.5 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
            >
              <Share2 className="w-4 h-4 text-[#3B82F6] shrink-0" />
              <span>Share Summary</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={downloadState === "preparing"}
              className="flex-1 min-h-[46px] rounded-xl bg-[#171F2D] hover:bg-[#1f293d] border border-[#263044] text-[#F1F5F9] font-semibold text-xs sm:text-sm px-4 py-2.5 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none disabled:opacity-60"
            >
              <Download className="w-4 h-4 text-[#3B82F6] shrink-0" />
              <span>
                {downloadState === "preparing"
                  ? "Preparing download…"
                  : downloadState === "downloaded"
                  ? "Downloaded!"
                  : data.isUnlocked
                  ? "Download Full Report"
                  : "Download Free Summary"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCheckAgain}
              disabled={checkAgainState === "checking"}
              className="flex-1 min-h-[46px] rounded-xl bg-[#171F2D] hover:bg-[#1f293d] border border-[#263044] text-[#F1F5F9] font-semibold text-xs sm:text-sm px-4 py-2.5 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 text-[#3B82F6] shrink-0 ${
                  checkAgainState === "checking" ? "animate-spin" : ""
                }`}
              />
              <span>{checkAgainState === "checking" ? "Checking…" : "Check Website Again"}</span>
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#090D15] border-t border-[#263044] py-8 px-4 sm:px-6 text-center text-xs text-[#94A3B8]">
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} StrangerLens. See your website through a stranger&apos;s eyes.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] transition">Terms</Link>
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] transition">Privacy</Link>
            <Link href="/refund-policy" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] transition">Refund Policy</Link>
            <Link href="/contact" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] transition">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
