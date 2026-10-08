"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Link2,
  ArrowRight,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Share2,
  Download,
  Info,
  Zap,
  Shield,
  Users,
  Eye,
  ChevronRight,
  MinusCircle,
  Copy,
  CheckCircle2,
  BarChart2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface AnalysisData {
  domain: string;
  score: number;
  scoreStatus: "Needs improvement" | "Good" | "Needs work" | "Excellent";
  verdict: string;
  verdictSubtext: string;
  quickSignals: Array<{
    label: string;
    type: "clear" | "amber" | "coral";
  }>;
  firstSeconds: Array<{
    question: string;
    label: string;
    type: "clear" | "partly" | "unclear";
  }>;
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
  recommendation: {
    title: string;
    subhead: string;
    explanation: string;
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
  isPartialAccess?: boolean;
  isAccessError?: boolean;
  checkedAt?: string;
}

interface ResultsScreenProps {
  rawUrl: string;
  analysisData?: Partial<AnalysisData>;
  onBackToLanding: () => void;
  onRunNewCheck: () => void;
  onOpenFaq: () => void;
  onOpenPricing: () => void;
}

export default function ResultsScreen({
  rawUrl,
  analysisData: customData,
  onBackToLanding,
  onRunNewCheck,
  onOpenFaq,
  onOpenPricing,
}: ResultsScreenProps) {
  // Phase 2 Interaction States
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState<boolean>(false);
  const [activeCompareModal, setActiveCompareModal] = useState<boolean>(false);
  const [expandedImprovementId, setExpandedImprovementId] = useState<string | null>(null);

  // Async Button States
  const [shareState, setShareState] = useState<"idle" | "sharing" | "copied">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "preparing" | "downloaded" | "failed">("idle");
  const [checkAgainState, setCheckAgainState] = useState<"idle" | "checking">("idle");

  // Score Reveal Animation
  const [displayScore, setDisplayScore] = useState<number>(0);
  const [hasAnimatedScore, setHasAnimatedScore] = useState<boolean>(false);

  // Reduced Motion Detection
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Normalize Domain for Clean Display
  const cleanDomain = useMemo(() => {
    let cleaned = rawUrl.trim();
    if (!cleaned) return "website.com";
    try {
      if (!/^https?:\/\//i.test(cleaned)) {
        cleaned = `https://${cleaned}`;
      }
      const parsed = new URL(cleaned);
      return parsed.hostname.replace(/^www\./, "") || "website.com";
    } catch {
      return (
        cleaned.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ||
        "website.com"
      );
    }
  }, [rawUrl]);

  const brandName = cleanDomain.split(".")[0];
  const capitalizedBrand = brandName.charAt(0).toUpperCase() + brandName.slice(1);

  // Dynamic Analysis Data Model
  const data: AnalysisData = useMemo(() => {
    return {
      domain: cleanDomain,
      score: customData?.score ?? 72,
      scoreStatus: customData?.scoreStatus ?? "Needs improvement",
      verdict:
        customData?.verdict ??
        `Visitors understand what your product does, but the main benefit isn’t immediately clear.`,
      verdictSubtext: customData?.verdictSubtext ?? `Based on your homepage · First-time visitor perspective`,
      quickSignals: customData?.quickSignals ?? [
        { label: "Product category is clear", type: "clear" },
        { label: "Target audience is visible", type: "clear" },
        { label: "Main benefit is unclear", type: "amber" },
        { label: "Trust could be stronger", type: "coral" },
        { label: "Next step is understandable", type: "clear" },
      ],
      firstSeconds: customData?.firstSeconds ?? [
        { question: "What is this?", label: "Clear", type: "clear" },
        { question: "Who is it for?", label: "Understandable", type: "clear" },
        { question: "What will I get?", label: "Partly clear", type: "partly" },
        { question: "Why should I care?", label: "Unclear", type: "unclear" },
        { question: "What should I do next?", label: "Clear", type: "clear" },
      ],
      visitorThought:
        customData?.visitorThought ??
        `“This looks like a tool for founders to build, launch and grow ${capitalizedBrand} products, but I’m not completely sure what I’ll get from it and why it’s different.”`,
      evidence: customData?.evidence ?? {
        locationTag: "Homepage · Above the fold",
        homepageExcerpt: `“ The fastest way for founders to build, launch and grow ${capitalizedBrand} products...”`,
        clearFindings: [
          "Product category is understandable",
          "Founder audience is visible",
        ],
        missingFindings: [
          "Visitor outcome isn't explicit",
          "Benefit is not concrete enough",
        ],
      },
      signals: customData?.signals ?? [
        {
          id: "first-impression",
          title: "First impression",
          score: 82,
          badgeText: "Clear",
          badgeType: "clear",
          description: "The initial message is understandable.",
          icon: "eye",
        },
        {
          id: "audience",
          title: "Audience",
          score: 74,
          badgeText: "Understandable",
          badgeType: "clear",
          description: "It's clear who this is for.",
          icon: "users",
        },
        {
          id: "value",
          title: "Value",
          score: 51,
          badgeText: "Needs work",
          badgeType: "amber",
          description: "The core benefit is not immediately clear.",
          icon: "sparkles",
        },
        {
          id: "trust",
          title: "Trust",
          score: 69,
          badgeText: "Could be stronger",
          badgeType: "amber",
          description: "More proof or evidence would build trust.",
          icon: "shield",
        },
        {
          id: "action",
          title: "Action",
          score: 76,
          badgeText: "Clear",
          badgeType: "clear",
          description: "The next step is reasonably clear.",
          icon: "arrow",
        },
      ],
      recommendation: customData?.recommendation ?? {
        title: "Start here",
        subhead: "Make the visitor outcome clear in the first sentence.",
        explanation: `Your homepage introduces what you do, but the main benefit for the visitor isn't immediately clear. A more direct and outcome-focused message can help.`,
        currentDirection: `“ Build, launch and grow ${capitalizedBrand} products...”`,
        strongerDirection: `“ Launch your ${capitalizedBrand} product with everything you need to get your first users.”`,
      },
      otherImprovements: customData?.otherImprovements ?? [
        {
          id: "trust",
          title: "Strengthen trust",
          description: "Add specific proof, testimonials or logos near the main value proposition.",
          whyItMatters: "First-time visitors look for immediate signals that others trust your product before spending time reading copy.",
          whatToImprove: "Place 2–3 customer logos or a short testimonial immediately below the main hero CTA button.",
          copyableSuggestion: `“ Trusted by founders launching ${capitalizedBrand} products.”`,
          icon: "shield",
          color: "bg-blue-50 text-blue-600",
        },
        {
          id: "audience",
          title: "Clarify the audience",
          description: "Make it immediately obvious who this product is built for.",
          whyItMatters: "If a visitor isn't 100% sure the product is for them within 3 seconds, they bounce.",
          whatToImprove: "Explicitly state the target persona in the hero subheadline or a top audience eyebrow tag.",
          copyableSuggestion: `“ Built specifically for founders building and scaling ${capitalizedBrand} products.”`,
          icon: "users",
          color: "bg-purple-50 text-purple-600",
        },
        {
          id: "action",
          title: "Make the next step more explicit",
          description: "Reduce uncertainty around what happens after clicking.",
          whyItMatters: "Vague button text like 'Get Started' creates hesitation about commitment or price.",
          whatToImprove: "Use specific, high-intent action text and add a zero-friction micro-copy note under the CTA.",
          copyableSuggestion: "Check my website free → (No signup required · 60 seconds)",
          icon: "zap",
          color: "bg-amber-50 text-amber-600",
        },
      ],
      isPartialAccess: customData?.isPartialAccess ?? false,
      isAccessError: customData?.isAccessError ?? false,
      checkedAt: customData?.checkedAt ?? "Checked just now",
    };
  }, [cleanDomain, capitalizedBrand, customData]);

  // Phase 2: Animate score counter (0 -> 72 over 800ms)
  useEffect(() => {
    if (prefersReducedMotion || hasAnimatedScore) {
      setDisplayScore(data.score);
      return;
    }

    let startTimestamp: number | null = null;
    const duration = 800; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easedProgress = progress * (2 - progress);
      setDisplayScore(Math.floor(easedProgress * data.score));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayScore(data.score);
        setHasAnimatedScore(true);
      }
    };

    requestAnimationFrame(step);
  }, [data.score, prefersReducedMotion, hasAnimatedScore]);

  // Persistence: Store baseline result in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const existingHistory = JSON.parse(localStorage.getItem("valuecheck_history") || "[]");
      const isDuplicate = existingHistory.some((item: { domain: string; score: number }) => item.domain === cleanDomain && item.score === data.score);
      if (!isDuplicate) {
        const updated = [{ domain: cleanDomain, score: data.score, date: new Date().toISOString() }, ...existingHistory].slice(0, 5);
        localStorage.setItem("valuecheck_history", JSON.stringify(updated));
      }
    } catch {
      // Storage sandbox protection
    }
  }, [cleanDomain, data.score]);

  // Previous check history check
  const historyRecords = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const history = JSON.parse(localStorage.getItem("valuecheck_history") || "[]");
      return history.filter((item: { domain: string }) => item.domain === cleanDomain);
    } catch {
      return [];
    }
  }, [cleanDomain]);

  const previousRecord = historyRecords.length > 1 ? historyRecords[1] : null;

  // Clipboard Helper with Error Handling
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(id);
      setTimeout(() => setCopiedState(null), 2000);
    } catch {
      setToastMessage("Couldn't copy text automatically. Please select and copy manually.");
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Phase 2: Native Share with Fallback
  const handleShare = async () => {
    if (shareState !== "idle") return;
    setShareState("sharing");

    const shareUrl = window.location.href;
    const shareData = {
      title: `ValueCheck for ${cleanDomain}`,
      text: `Value Clarity score for ${cleanDomain}: ${data.score}/100 - First-impression diagnostic report.`,
      url: shareUrl,
    };

    if (navigator.share && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
        return;
      } catch {
        // Fallback to clipboard if user cancels native share
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setToastMessage("Couldn't copy share link.");
      setShareState("idle");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Phase 2: Download Report Handler with State Feedback
  const handleDownloadReport = () => {
    if (downloadState !== "idle") return;
    setDownloadState("preparing");

    setTimeout(() => {
      try {
        window.print();
        setDownloadState("downloaded");
        setTimeout(() => setDownloadState("idle"), 2500);
      } catch {
        setDownloadState("failed");
        setToastMessage("Couldn't trigger print window.");
        setTimeout(() => {
          setDownloadState("idle");
          setToastMessage(null);
        }, 3000);
      }
    }, 400);
  };

  // Phase 2: Check Again Async Handler
  const handleCheckAgain = () => {
    if (checkAgainState !== "idle") return;
    setCheckAgainState("checking");

    setTimeout(() => {
      onRunNewCheck();
    }, 350);
  };

  // Toggle Accordion Improvement Row
  const toggleImprovementRow = (id: string) => {
    setExpandedImprovementId((prev) => (prev === id ? null : id));
  };

  // Enforce Real Analysis Only: Never show mock results or hardcoded scores
  if (!customData || customData.score === undefined) {
    return (
      <div className="min-h-screen bg-[#fafafc] text-slate-900 font-sans antialiased flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 mb-2">No Analysis Data Available</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            A real website scan must be performed to view visitor comprehension results for {cleanDomain}.
          </p>
          <button
            onClick={onBackToLanding}
            className="w-full rounded-full bg-[#1d68f5] hover:bg-blue-600 text-white font-medium text-sm py-3 transition shadow-sm cursor-pointer"
          >
            Check a website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col relative">
      {/* Non-blocking Toast Feedback */}
      <AnimatePresence>
        {(copiedState || toastMessage) && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-medium flex items-center gap-2 border border-slate-800"
            role="status"
            aria-live="polite"
          >
            {toastMessage ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{toastMessage}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {copiedState === "share"
                    ? "Link copied to clipboard!"
                    : "Suggested copy copied to clipboard!"}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER (Sticky Navigation Header) */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#e7e9ee] sticky top-0 z-30 transition-all">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 h-[64px] sm:h-[72px] flex items-center justify-between">
          <div className="flex items-center shrink-0">
            <button
              onClick={onBackToLanding}
              className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 hover:opacity-80 transition cursor-pointer text-left min-h-[44px] inline-flex items-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-md px-1"
              title="Return to ValueCheck Home"
            >
              ValueCheck
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 md:gap-8">
            <button
              onClick={onOpenFaq}
              className="text-xs sm:text-[15px] font-medium text-slate-700 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-md"
            >
              FAQ
            </button>
            <button
              onClick={onOpenPricing}
              className="text-xs sm:text-[15px] font-medium text-slate-700 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-md"
            >
              Pricing
            </button>
            <button
              onClick={onBackToLanding}
              className="rounded-full bg-[#1d68f5] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-medium px-4 sm:px-5 py-2.5 transition-all duration-150 inline-flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              <span>Check website</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 pt-5 sm:pt-7 pb-16 sm:pb-24 space-y-6 sm:space-y-7">
        
        {/* ACCESS ERROR / PARTIAL WARNING STATE (If Homepage cannot be fully fetched) */}
        {data.isAccessError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 text-amber-900 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-950 text-sm">We {"couldn't"} fully access this homepage.</strong>
                <p className="text-amber-800 mt-0.5">We {"couldn't"} complete the full first-impression check because part of the page was unavailable.</p>
              </div>
            </div>
            <button
              onClick={handleCheckAgain}
              className="rounded-full bg-amber-900 text-white hover:bg-amber-950 px-4 py-2 text-xs font-semibold shrink-0 cursor-pointer transition min-h-[44px]"
            >
              Try again →
            </button>
          </motion.div>
        )}

        {/* 2. RESULT TOP BAR */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-0.5 scroll-mt-24"
        >
          {/* Left: Dynamic Domain Identity Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#e7e9ee] shadow-2xs text-xs sm:text-[13px] text-slate-600 self-start max-w-full min-h-[44px]">
            <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-[280px] md:max-w-xs font-normal">
              <strong className="font-semibold text-slate-900">{data.domain}</strong> · First-impression check
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 pl-1 border-l border-slate-200">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{data.checkedAt}</span>
            </span>
          </div>

          {/* Right: Utility Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={handleCheckAgain}
              disabled={checkAgainState === "checking"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#e7e9ee] text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition cursor-pointer shadow-2xs min-h-[44px] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${checkAgainState === "checking" ? "animate-spin text-blue-600" : ""}`} />
              <span>{checkAgainState === "checking" ? "Checking…" : "Check again"}</span>
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#e7e9ee] text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition cursor-pointer shadow-2xs min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              {shareState === "copied" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">Link copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadReport}
              disabled={downloadState === "preparing"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#e7e9ee] text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition cursor-pointer shadow-2xs min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              {downloadState === "preparing" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                  <span>Preparing…</span>
                </>
              ) : downloadState === "downloaded" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">Downloaded ✓</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* 3. MAIN VERDICT CONTAINER (VALUE CLARITY HERO CARD) */}
        <motion.section
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-[#e7e9ee] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs relative overflow-hidden scroll-mt-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Zone 1: Score Visualization Ring (Left - 3 cols) */}
            <div className="lg:col-span-3 flex flex-col items-center lg:items-start text-center lg:text-left border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6 shrink-0">
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <span>VALUE CLARITY</span>
                <div className="relative inline-block">
                  <button
                    onClick={() => setActiveInfoTooltip(!activeInfoTooltip)}
                    className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-0.5 inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
                    aria-label="Value clarity score information"
                    aria-expanded={activeInfoTooltip}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  <AnimatePresence>
                    {activeInfoTooltip && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 bottom-7 w-60 bg-slate-900 text-white text-[11px] font-normal leading-normal p-3 rounded-xl shadow-xl z-20"
                      >
                        Score reflects how clearly first-time visitors comprehend what your product is, who it is for, and why they should care.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Clean Circular Gauge */}
              <div className="relative w-[140px] h-[140px] sm:w-[150px] sm:h-[150px] flex items-center justify-center my-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f1f5f9"
                    strokeWidth="7.5"
                    fill="transparent"
                  />
                  {/* Animated Score Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f59e0b"
                    strokeWidth="7.5"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - displayScore / 100)}`}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-300 ease-out"
                  />
                </svg>

                {/* Animated Score Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl sm:text-[44px] font-extrabold text-slate-950 tracking-tight leading-none">
                    {displayScore}
                  </span>
                  <span className="text-xs text-slate-400 font-medium mt-1">
                    / 100
                  </span>
                </div>
              </div>
            </div>

            {/* Zone 2: Main Verdict Text (Center - 5 cols) */}
            <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
              {/* Status Pill Reveal */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.2 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef3c7] text-[#b45309] text-xs font-semibold mb-3"
              >
                <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>{data.scoreStatus}</span>
              </motion.div>

              {/* Main Verdict Headline */}
              <h1 className="text-xl sm:text-2xl lg:text-[24px] font-bold text-slate-950 tracking-tight leading-[1.3] mb-2.5 max-w-xl [text-wrap:balance]">
                {data.verdict}
              </h1>

              <p className="text-xs text-slate-500 font-normal">
                {data.verdictSubtext}
              </p>
            </div>

            {/* Zone 3: Quick Signals Summary (Right - 4 cols) */}
            <div className="lg:col-span-4 space-y-2.5 pt-1 lg:pt-0">
              {data.quickSignals.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-[13px] text-slate-700 font-medium">
                  {item.type === "clear" ? (
                    <div className="w-5 h-5 rounded-full bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : item.type === "amber" ? (
                    <div className="w-5 h-5 rounded-full bg-[#fef3c7] text-[#b45309] flex items-center justify-center shrink-0">
                      <MinusCircle className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#fee2e2] text-[#b91c1c] flex items-center justify-center shrink-0">
                      <X className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* 4. SECONDARY GRID (2 Columns on Desktop) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 scroll-mt-24">
          {/* Left Box: What a visitor understands in seconds */}
          <div className="lg:col-span-5 bg-white border border-[#e7e9ee] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight mb-0.5">
                What a visitor understands in seconds.
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Here’s what a typical first-time visitor would understand.
              </p>

              {/* 5 Questions & Status Rows */}
              <div className="space-y-3">
                {data.firstSeconds.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 text-xs sm:text-sm pb-2.5 border-b border-slate-100 last:border-0 last:pb-0 min-h-[40px]"
                  >
                    <span className="font-medium text-slate-800">{item.question}</span>
                    {item.type === "clear" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#15803d] shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        {item.label}
                      </span>
                    ) : item.type === "partly" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#b45309] shrink-0">
                        <MinusCircle className="w-3 h-3 stroke-[2.5]" />
                        {item.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#b91c1c] shrink-0">
                        <X className="w-3 h-3 stroke-[2.5]" />
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Area: Stacked Visitor Thought & Website Evidence */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            {/* Card 1: First-time visitor thought */}
            <div className="bg-white border border-[#e7e9ee] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-slate-950 text-base">
                    A first-time visitor would probably think
                  </h3>
                </div>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-100 uppercase tracking-wider">
                  SIMULATED FIRST IMPRESSION
                </span>
              </div>

              {/* Analytical Quote Box */}
              <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 sm:p-5 relative">
                <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed italic">
                  {data.visitorThought}
                </p>
              </div>
            </div>

            {/* Card 2: What on your website led to this result */}
            <div className="bg-white border border-[#e7e9ee] rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h3 className="font-bold text-slate-950 text-base">
                  What on your website led to this result
                </h3>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md shrink-0">
                  {data.evidence.locationTag}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                We looked at your homepage from a first-time visitor’s perspective.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Your homepage says */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    YOUR HOMEPAGE SAYS
                  </span>
                  <p className="text-xs text-slate-800 italic leading-snug">
                    {data.evidence.homepageExcerpt}
                  </p>
                </div>

                {/* Right: Clear & Missing findings */}
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-800 block mb-1">
                      WHAT IS CLEAR
                    </span>
                    <div className="space-y-1">
                      {data.evidence.clearFindings.map((item, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-slate-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-rose-800 block mb-1">
                      WHAT IS MISSING
                    </span>
                    <div className="space-y-1">
                      {data.evidence.missingFindings.map((item, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-slate-700">
                          <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. FIVE FIRST-IMPRESSION SIGNALS (With Subtle Stagger Entrance) */}
        <section className="bg-white border border-[#e7e9ee] rounded-2xl p-5 sm:p-7 shadow-xs scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                Your first-impression signals
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                A detailed look at the five key signals that shape a visitor’s first impression.
              </p>
            </div>
            <button
              onClick={onOpenFaq}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded"
            >
              <span>Learn about these signals</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5 Equal Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {data.signals.map((sig, index) => (
              <motion.div
                key={sig.id}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25, ease: "easeOut" }}
                className="border border-[#e7e9ee] rounded-xl p-4 flex flex-col justify-between bg-white shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      {sig.icon === "eye" && <Eye className="w-3.5 h-3.5" />}
                      {sig.icon === "users" && <Users className="w-3.5 h-3.5" />}
                      {sig.icon === "sparkles" && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                      {sig.icon === "shield" && <Shield className="w-3.5 h-3.5" />}
                      {sig.icon === "arrow" && <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-950 text-sm mb-1">
                    {sig.title}
                  </h3>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-extrabold text-slate-950">
                      {sig.score}
                    </span>
                    <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </div>

                  <div className="mb-2.5">
                    {sig.badgeType === "clear" ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d]">
                        {sig.badgeText}
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef3c7] text-[#b45309]">
                        {sig.badgeText}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-snug font-normal">
                  {sig.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 6. BOTTOM GRID (START HERE + INLINE EXPANDABLE OTHER IMPROVEMENTS) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 scroll-mt-24">
          {/* Left Card: Start Here Priority Recommendation */}
          <div className="lg:col-span-7 bg-white border border-[#e7e9ee] rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-amber-700 stroke-amber-700" />
                  START HERE
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-950 mb-1">
                {data.recommendation.subhead}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed font-normal">
                {data.recommendation.explanation}
              </p>

              {/* Comparison Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2">
                    <X className="w-3 h-3 stroke-[2.5]" /> WHAT YOU SAY NOW
                  </span>
                  <p className="text-xs text-slate-700 italic">
                    {data.recommendation.currentDirection}
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2">
                    <Check className="w-3 h-3 stroke-[2.5]" /> A CLEARER DIRECTION
                  </span>
                  <p className="text-xs text-slate-900 font-medium">
                    {data.recommendation.strongerDirection}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                copyToClipboard(
                  data.recommendation.strongerDirection.replace(/^“|”$/g, ""),
                  "recommendation"
                )
              }
              className="w-full sm:w-auto rounded-full bg-[#1d68f5] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold px-6 py-2.5 transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px] min-w-[170px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              {copiedState === "recommendation" ? (
                <>
                  <Check className="w-4 h-4 text-white shrink-0" />
                  <span>Copied ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>Copy suggestion →</span>
                </>
              )}
            </button>
          </div>

          {/* Right Card: Phase 2 Inline Expandable Improvement Rows */}
          <div className="lg:col-span-5 bg-white border border-[#e7e9ee] rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight mb-1">
                Other things worth improving
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Click any row to view diagnostic suggestions.
              </p>

              <div className="space-y-3">
                {data.otherImprovements.map((item) => {
                  const isExpanded = expandedImprovementId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 transition-all bg-slate-50/40"
                    >
                      <button
                        onClick={() => toggleImprovementRow(item.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`improvement-body-${item.id}`}
                        className="w-full text-left flex items-center justify-between gap-3 p-3.5 cursor-pointer group min-h-[52px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}
                          >
                            {item.icon === "shield" && <Shield className="w-3.5 h-3.5" />}
                            {item.icon === "users" && <Users className="w-3.5 h-3.5" />}
                            {item.icon === "zap" && <Zap className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-950 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-500 leading-snug mt-0.5 font-normal">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                            isExpanded ? "rotate-90 text-slate-700" : ""
                          }`}
                        />
                      </button>

                      {/* Smooth Inline Expandable Body */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            id={`improvement-body-${item.id}`}
                            initial={prefersReducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
                            animate={prefersReducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            className="overflow-hidden bg-white border-t border-slate-100 p-4 space-y-3 text-xs"
                          >
                            <div>
                              <strong className="text-slate-950 font-semibold block mb-0.5">Why this matters:</strong>
                              <p className="text-slate-600 leading-relaxed font-normal">{item.whyItMatters}</p>
                            </div>

                            <div>
                              <strong className="text-slate-950 font-semibold block mb-0.5">What to improve:</strong>
                              <p className="text-slate-600 leading-relaxed font-normal">{item.whatToImprove}</p>
                            </div>

                            {item.copyableSuggestion && (
                              <div className="pt-1">
                                <button
                                  onClick={() => copyToClipboard(item.copyableSuggestion!, `row-${item.id}`)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 text-[11px] font-semibold transition cursor-pointer"
                                >
                                  <Copy className="w-3 h-3 shrink-0" />
                                  <span>
                                    {copiedState === `row-${item.id}`
                                      ? "Copied suggestion ✓"
                                      : "Copy suggestion"}
                                  </span>
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 7. FINAL RE-CHECK SECTION */}
        <section className="bg-[#f0f6ff]/90 border border-blue-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-2xs scroll-mt-24">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-950">
                Made changes to your website?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 font-normal">
                Update your website and run the check again to see whether the first impression improved.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={handleCheckAgain}
              disabled={checkAgainState === "checking"}
              className="w-full sm:w-auto rounded-full bg-[#1d68f5] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold px-6 py-2.5 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[44px] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              <span>{checkAgainState === "checking" ? "Checking…" : "Check again →"}</span>
            </button>

            <button
              onClick={() => setActiveCompareModal(true)}
              className="w-full sm:w-auto rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-[#e7e9ee] text-xs sm:text-sm font-semibold px-5 py-2.5 transition cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              Compare with previous
            </button>
          </div>
        </section>
      </main>

      {/* FOCUSED COMPARE HISTORY MODAL */}
      <AnimatePresence>
        {activeCompareModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCompareModal(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98, y: 12 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative z-10 text-slate-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                  <h3 id="compare-modal-title" className="font-bold text-base">Compare Check History</h3>
                </div>
                <button
                  onClick={() => setActiveCompareModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer min-h-[32px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  aria-label="Close comparison view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-5 space-y-3 text-xs sm:text-sm text-slate-600">
                <p>
                  Baseline first-impression score for{" "}
                  <strong className="text-slate-950">{cleanDomain}</strong>:
                </p>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-600">Current Check</span>
                    <span className="text-amber-800 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded font-bold">
                      {data.score} / 100
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>Previous Check</span>
                    {previousRecord ? (
                      <span className="text-slate-900 font-bold">
                        {previousRecord.score} / 100
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No previous check recorded</span>
                    )}
                  </div>

                  {previousRecord && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
                      <span className="text-slate-600 font-medium">Comprehension Delta</span>
                      <span className={`font-bold ${data.score >= previousRecord.score ? "text-emerald-700" : "text-rose-700"}`}>
                        {data.score >= previousRecord.score ? `+${data.score - previousRecord.score}` : `${data.score - previousRecord.score}`} pts
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-normal">
                  {previousRecord
                    ? "Your score reflects comprehension improvements made since your previous check."
                    : "Run a second check after updating your website copy to measure your score improvement."}
                </p>
              </div>

              <button
                onClick={() => setActiveCompareModal(false)}
                className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm py-2.5 transition cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                Close comparison
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


