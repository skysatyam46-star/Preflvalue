"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Link2,
  ArrowRight,
  Eye,
  Check,
  X,
  ChevronDown,
  Loader2,
  Shield,
  Users,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import ScanScreen from "@/components/ScanScreen";
import ResultsScreen from "@/components/ResultsScreen";
import { validateClientUrl } from "@/lib/url-client-validator";
import { createScanFlowController } from "@/lib/scan-flow-controller";
import {
  Reveal,
  StaggerContainer,
  StaggerItem,
  AnimatedHamburgerIcon,
  EASE_OUT_EXPO,
} from "@/components/motion/Reveal";
import { LEGAL_CONFIG } from "@/lib/legal-config";

const BRAND_NAME = "StrangerLens";

// Controlled by actual payment availability; remains false until verified Paddle checkout is live
const IS_CHECKOUT_ENABLED = false;

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  paymentLabel: string;
  badge: string | null;
  positioning: string;
  description: string;
  features: string[];
  creditNote?: string;
  cta: string;
  disabledCta: string;
  popular: boolean;
  isPaid: boolean;
}

// PRICING CONFIG (Preserves existing layout; paid checkout controlled by IS_CHECKOUT_ENABLED)
const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free Preview",
    price: 0,
    paymentLabel: "FREE PREVIEW",
    badge: null,
    positioning: "Discover what's unclear.",
    description: "See how your website comes across to a first-time visitor.",
    features: [
      "Overall first-impression score",
      "Short main verdict",
      "Five signal scores",
      "Biggest issue with evidence",
      "Your #1 priority fix",
    ],
    cta: "Analyze My Website Free",
    disabledCta: "Analyze My Website Free",
    popular: false,
    isPaid: false,
  },
  {
    id: "one_report",
    name: "Full Report",
    price: 5,
    paymentLabel: "ONE-TIME PAYMENT",
    badge: "MOST POPULAR",
    positioning: "Know exactly what to change.",
    description:
      "Turn your first-impression diagnosis into a clear, actionable improvement plan.",
    features: [
      "Everything in Free Preview",
      "Prioritized 1-2-3 fix plan",
      "Copy-ready website rewrites",
      "Detailed five-signal analysis",
      "Complete homepage evidence",
      "Supporting-page insights when available",
      "Communication risks and recommendations",
    ],
    cta: "Get Full Report — $5",
    disabledCta: "Start with a Free Preview",
    popular: true,
    isPaid: true,
  },
  {
    id: "three_reports",
    name: "3-Report Pack",
    price: 12,
    paymentLabel: "ONE-TIME PAYMENT",
    badge: "SAVE $3",
    positioning: "Improve more. Check again.",
    description:
      "Three complete reports for multiple websites or improvement iterations.",
    features: [
      "3 complete Full Reports",
      "All premium insights per report",
      "Copy-ready recommendations",
      "Useful for multiple websites",
      "Useful for before/after evaluations",
      "$4 per report",
      "No subscription",
    ],
    creditNote:
      "Unlocking from an existing free report uses 1 credit for the current report (2 report credits remain).",
    cta: "Get 3-Report Pack — $12",
    disabledCta: "Start with a Free Preview",
    popular: false,
    isPaid: true,
  },
];

// REQUIRED FAQ ITEMS
const FAQ_ITEMS = [
  {
    question: "What does StrangerLens analyse?",
    answer:
      "StrangerLens performs an AI-powered first-impression assessment of your accessible homepage content. It evaluates five signals — First Impression, Audience, Value, Trust, and Action — to help you see what may be clear or unclear to a first-time visitor.",
  },
  {
    question: "Does StrangerLens work with any website?",
    answer:
      "StrangerLens works with publicly reachable homepages whose text and structure are accessible in the initial HTML response, including SaaS products, developer tools, B2B services, and landing pages.",
  },
  {
    question: "Is the analysis based on real website content?",
    answer:
      "Yes. StrangerLens fetches your live public homepage HTML and extracts accessible text, headings, calls to action, and credibility signals to ground its findings in extracted page content.",
  },
  {
    question: "Is StrangerLens a security, SEO, or performance scanner?",
    answer:
      "No. StrangerLens is an AI homepage communication analyzer focused on messaging clarity, audience understanding, value communication, trust signals, and next-step clarity. It is not a security scanner, technical SEO audit, PageSpeed benchmark, accessibility compliance audit, or live human usability test.",
  },
  {
    question: "What is included in the free analysis?",
    answer:
      "The Free Preview ($0) includes your overall first-impression score, short main verdict, five signal scores, biggest issue with evidence, and your #1 priority fix — with no account required.",
  },
  {
    question: "What do paid reports cost?",
    answer:
      "One-time report unlocks ($5 for a single Full Report or $12 for a 3-Report Pack, with no subscription) include everything in Free Preview plus a prioritized 1-2-3 fix plan, copy-ready website rewrites, detailed five-signal analysis, complete homepage evidence, supporting-page insights when available, and communication risks and recommendations.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No account or signup is required. Enter any public website URL to run an analysis.",
  },
];

const NAV_ITEMS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [currentView, setCurrentView] = useState<"landing" | "scan" | "results">("landing");
  const [submittedUrl, setSubmittedUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<"faq" | "pricing" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  // API Integration States
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // FAQ accordion state — all answers closed by default
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const ACTIVE_REPORT_SESSION_KEY = "strangerlens_active_report_v1";

  const clearPersistedReportSession = () => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(ACTIVE_REPORT_SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const [scanController] = useState(() =>
    createScanFlowController({
      onStateChange: (nextState) => {
        setUrl(nextState.url);
        setSubmittedUrl(nextState.submittedUrl);
        setCurrentView(nextState.currentView);
        setIsVerifying(nextState.isVerifying);
        setIsPending(nextState.isPending);
        setErrorMessage(nextState.errorMessage);
        setBackendError(nextState.backendError);
        setAnalysisData(nextState.analysisData);
      },
    })
  );

  const scanControllerRef = useRef(scanController);
  useEffect(() => {
    scanControllerRef.current = scanController;
  }, [scanController]);

  const scrollToScrollOnly = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({
          behavior: shouldReduceMotion ? "auto" : "smooth",
          block: "center",
        });
        inputRef.current.focus();
      }
    }, 60);
  }, [shouldReduceMotion]);

  const scrollToInput = useCallback(() => {
    if (activeInfoModal) setActiveInfoModal(null);
    if (mobileMenuOpen) setMobileMenuOpen(false);
    const wasNotOnLanding = currentView !== "landing";
    if (wasNotOnLanding) {
      clearPersistedReportSession();
      scanController.cancelScan();
    }
    scrollToScrollOnly();
  }, [activeInfoModal, mobileMenuOpen, currentView, scanController, scrollToScrollOnly]);

  useEffect(() => {
    if (errorMessage) {
      scrollToScrollOnly();
    }
  }, [errorMessage, scrollToScrollOnly]);

  // Restore active report from sessionStorage if user navigated to a legal/support page and returned
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId: number | null = null;
    try {
      const rawSaved = window.sessionStorage.getItem(ACTIVE_REPORT_SESSION_KEY);
      if (!rawSaved) return;
      const parsed = JSON.parse(rawSaved);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.rawUrl === "string" &&
        parsed.analysisData &&
        typeof parsed.analysisData.score === "number"
      ) {
        rafId = requestAnimationFrame(() => {
          scanControllerRef.current?.restoreSession(
            parsed.rawUrl,
            parsed.analysisData
          );
        });
      }
    } catch {
      // Ignore malformed sessionStorage data
    }
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Persist active report in sessionStorage while viewing results
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (currentView === "results" && analysisData && submittedUrl) {
        window.sessionStorage.setItem(
          ACTIVE_REPORT_SESSION_KEY,
          JSON.stringify({
            rawUrl: submittedUrl,
            analysisData,
            savedAt: Date.now(),
          })
        );
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [currentView, analysisData, submittedUrl]);

  const urlValidation = React.useMemo(() => validateClientUrl(url), [url]);





  const handleSectionNavigate = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    const targetId = href.replace(/^#/, "");
    const element = document.getElementById(targetId);
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({
          behavior: shouldReduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }, mobileMenuOpen ? 120 : 0);
    }
  };

  // Escape key handling for mobile menu and info modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          hamburgerButtonRef.current?.focus();
        }
        if (activeInfoModal) {
          setActiveInfoModal(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, activeInfoModal]);

  // Close mobile overlay automatically on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  // Prevent background scrolling when mobile menu or modal is open
  useEffect(() => {
    if (mobileMenuOpen || activeInfoModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen, activeInfoModal]);

  const handleAnalyze = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    await scanControllerRef.current?.startScan(overrideUrl);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col overflow-x-hidden">
      <AnimatePresence mode="wait">
        {currentView === "landing" ? (
          <motion.div
            key="landing"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full min-h-screen flex flex-col"
          >
            {/* STICKY HEADER */}
            <motion.header
              initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
              className="w-full bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-colors"
            >
              <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 h-[64px] sm:h-[72px] flex items-center justify-between gap-2 sm:gap-4">
                <a
                  href="#"
                  aria-label="StrangerLens home"
                  onClick={(e) => {
                    e.preventDefault();
                    if (mobileMenuOpen) setMobileMenuOpen(false);
                    window.scrollTo({
                      top: 0,
                      behavior: shouldReduceMotion ? "auto" : "smooth",
                    });
                  }}
                  className="flex items-center gap-2 sm:gap-2.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] rounded-lg"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs transition-transform duration-200 group-hover:scale-[1.04]">
                    S
                  </div>
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 whitespace-nowrap">
                    StrangerLens
                  </span>
                </a>

                {/* Desktop Navigation */}
                <nav
                  aria-label="Primary Navigation"
                  className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600"
                >
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleSectionNavigate(e, item.href)}
                      className="relative py-1 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#246BFD] after:rounded-full after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] rounded"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>

                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                  <button
                    onClick={scrollToInput}
                    className="group rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.97] text-white text-xs sm:text-sm font-medium px-4 sm:px-5 py-2 sm:py-2.5 transition-all duration-200 inline-flex items-center gap-1.5 shadow-xs hover:shadow-md hover:shadow-blue-500/15 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2"
                  >
                    <span>Try for free</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>

                  <button
                    ref={hamburgerButtonRef}
                    type="button"
                    onClick={() => setMobileMenuOpen((prev) => !prev)}
                    className="md:hidden w-10 h-10 rounded-xl text-slate-800 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD]"
                    aria-label={
                      mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
                    }
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-navigation-overlay"
                  >
                    <AnimatedHamburgerIcon
                      isOpen={mobileMenuOpen}
                      reducedMotion={!!shouldReduceMotion}
                    />
                  </button>
                </div>
              </div>
            </motion.header>

            {/* MOBILE HAMBURGER MENU — FIXED BLURRED OVERLAY (DOES NOT PUSH CONTENT) */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <div
                  id="mobile-navigation-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Mobile Navigation"
                  className="fixed inset-0 top-[64px] sm:top-[72px] z-40 md:hidden flex flex-col"
                >
                  {/* Blurred & Dimmed Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.05 : 0.25,
                      ease: "easeOut",
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 top-[64px] sm:top-[72px] bg-slate-950/25 backdrop-blur-[16px] [-webkit-backdrop-filter:blur(16px)]"
                  />

                  {/* Translucent Floating Menu Surface */}
                  <motion.div
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -14, scale: 0.985 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -10, scale: 0.985 }
                    }
                    transition={{
                      duration: shouldReduceMotion ? 0.05 : 0.32,
                      ease: EASE_OUT_EXPO,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 w-full bg-white/92 backdrop-blur-2xl border-b border-slate-200/80 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] rounded-b-3xl px-5 pt-4 pb-6 overflow-y-auto max-h-[calc(100dvh-64px)]"
                  >
                    <motion.nav
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={{
                        hidden: {},
                        visible: {
                          transition: {
                            staggerChildren: shouldReduceMotion ? 0 : 0.05,
                            delayChildren: shouldReduceMotion ? 0 : 0.04,
                          },
                        },
                      }}
                      aria-label="Mobile Navigation"
                      className="flex flex-col space-y-1"
                    >
                      {NAV_ITEMS.map((item) => (
                        <motion.a
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleSectionNavigate(e, item.href)}
                          variants={{
                            hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
                            visible: {
                              opacity: 1,
                              y: 0,
                              transition: { duration: 0.28, ease: EASE_OUT_EXPO },
                            },
                          }}
                          className="group flex items-center justify-between min-h-[48px] px-4 py-3 rounded-2xl text-base font-semibold text-slate-900 hover:bg-slate-100/90 active:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD]"
                        >
                          <span>{item.label}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#246BFD] group-hover:translate-x-0.5 transition-all" />
                        </motion.a>
                      ))}

                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: 0.32,
                              delay: shouldReduceMotion ? 0 : 0.04,
                              ease: EASE_OUT_EXPO,
                            },
                          },
                        }}
                        className="pt-3 mt-2 border-t border-slate-200/70"
                      >
                        <button
                          type="button"
                          onClick={scrollToInput}
                          className="group w-full min-h-[48px] rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white text-sm font-semibold px-6 py-3 transition-all inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2"
                        >
                          <span>Try for free</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </button>

                        <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
                          {LEGAL_CONFIG.links.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="hover:text-slate-900 transition-colors"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    </motion.nav>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8">
              {/* HERO SECTION — Side-by-side two-column layout on desktop, stacked on mobile */}
              <section className="pt-7 pb-11 sm:pt-12 sm:pb-16 md:pt-14 md:pb-18 lg:pt-20 lg:pb-22 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 sm:gap-10 lg:gap-12 items-center">
                <div className="w-full flex flex-col items-start text-left min-w-0">
                  {/* 1. Eyebrow with subtle blur-to-sharp entrance */}
                  <motion.div
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, y: 8, filter: "blur(4px)" }
                    }
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.5,
                      delay: 0.05,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-[#246BFD] uppercase bg-[#EAF2FF] mb-4 sm:mb-5 border border-blue-100"
                  >
                    AI WEBSITE FIRST-IMPRESSION ANALYZER
                  </motion.div>

                  {/* 2. Staggered Hero Headline Lines */}
                  <h1 className="text-[32px] min-[375px]:text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-[#101828] tracking-tight leading-[1.09] mb-4 sm:mb-5 [text-wrap:balance]">
                    <motion.span
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.52,
                        delay: 0.11,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="block"
                    >
                      Does Your Website
                    </motion.span>
                    <motion.span
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.54,
                        delay: 0.2,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="block"
                    >
                      Make Sense to a{" "}
                      <span className="text-[#246BFD]">Stranger?</span>
                    </motion.span>
                  </h1>

                  {/* 3. Supporting Text */}
                  <motion.p
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.52,
                      delay: 0.3,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="text-[15px] sm:text-lg text-[#526078] leading-relaxed mb-6 sm:mb-7 max-w-lg font-normal"
                  >
                    Get an AI-powered first-impression review of your homepage. Discover what{"'"}s unclear, what may make visitors hesitate, and exactly what to improve.
                  </motion.p>

                  {/* 4. URL Input Pill & Primary Hero CTA */}
                  <motion.form
                    onSubmit={handleAnalyze}
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, y: 14, scale: 0.975 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.38,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="w-full max-w-lg"
                  >
                    <div
                      className={`relative flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch lg:items-center bg-white rounded-3xl sm:rounded-full md:rounded-3xl lg:rounded-full border transition-all duration-200 p-2 sm:p-1.5 sm:pl-5 md:p-2 lg:p-1.5 lg:pl-5 ${
                        errorMessage || urlValidation.status === "invalid"
                          ? "border-rose-400 ring-4 ring-rose-100/80 shadow-sm"
                          : urlValidation.status === "valid"
                          ? "border-emerald-500 ring-4 ring-emerald-100/80 shadow-md"
                          : isInputFocused
                          ? "border-[#246BFD] ring-4 ring-blue-100/90 shadow-[0_10px_30px_-6px_rgba(36,107,253,0.18)]"
                          : "border-[#DCE6F7] hover:border-blue-300/90 shadow-[0_8px_26px_-6px_rgba(36,107,253,0.10)]"
                      }`}
                    >
                      <div className="flex items-center flex-1 min-w-0 px-2.5 sm:px-0 md:px-2.5 lg:px-0 min-h-[44px] sm:min-h-[46px]">
                        <Link2
                          className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mr-2.5 sm:mr-3 transition-colors duration-200 ${
                            isInputFocused ? "text-[#246BFD]" : "text-slate-400"
                          }`}
                        />
                        <input
                          ref={inputRef}
                          type="text"
                          disabled={isVerifying || isPending}
                          value={url}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setIsInputFocused(false)}
                          onChange={(e) => {
                            scanControllerRef.current?.setUrl(e.target.value);
                          }}
                          placeholder="https://yourwebsite.com"
                          className="w-full min-w-0 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base outline-none font-normal pr-2 disabled:opacity-75"
                          aria-label="Website URL"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={
                          isVerifying || isPending || urlValidation.status === "invalid"
                        }
                        className={`group mt-1.5 sm:mt-0 md:mt-1.5 lg:mt-0 w-full sm:w-auto md:w-full lg:w-auto min-h-[44px] sm:min-h-[46px] px-4 sm:px-5 py-2.5 rounded-full font-semibold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2 ${
                          urlValidation.status === "invalid"
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            : isVerifying
                            ? "bg-[#246BFD] text-white opacity-90 cursor-wait"
                            : "bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white shadow-sm hover:shadow-md hover:shadow-blue-500/20"
                        }`}
                        aria-label="Analyze My Website Free"
                      >
                        {isVerifying && (
                          <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                        )}
                        <span>Analyze My Website Free →</span>
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {(errorMessage || urlValidation.status === "invalid") && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="text-rose-600 text-xs sm:text-sm mt-2 font-medium pl-2"
                        >
                          {errorMessage || urlValidation.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.form>

                  {/* 5. Concise Truthful Reassurance Line */}
                  <motion.p
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.46,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="mt-3.5 text-xs sm:text-[13px] text-[#526078] font-medium leading-relaxed"
                  >
                    No signup required · AI-powered review · Actionable feedback
                  </motion.p>
                </div>

                {/* 6. Right Column — First-Impression Report Preview */}
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 22, scale: 0.98 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.65,
                    delay: 0.24,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="w-full min-w-0 flex justify-center md:justify-end"
                >
                  <div className="w-full bg-white border border-[#E3EAF5] rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_-15px_rgba(16,24,40,0.08)]">
                    {/* A. Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] text-[#246BFD] flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-extrabold text-[#101828] text-sm sm:text-base tracking-tight block">
                            First-Impression Report
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium block">
                            Illustrative preview
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#246BFD] bg-[#EAF2FF] px-2.5 py-1 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#246BFD]" />
                        5 Visitor Signals
                      </span>
                    </div>

                    {/* B. Five Signal Cards with Meaningful Status Colors */}
                    <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                      {[
                        {
                          label: "First Impression",
                          status: "Clear",
                          pillClass:
                            "bg-[#ECFDF5] border-emerald-200/90 text-[#059669]",
                          dotClass: "bg-[#059669]",
                        },
                        {
                          label: "Audience",
                          status: "Clear",
                          pillClass:
                            "bg-[#ECFDF5] border-emerald-200/90 text-[#059669]",
                          dotClass: "bg-[#059669]",
                        },
                        {
                          label: "Value",
                          status: "Partly clear",
                          pillClass:
                            "bg-[#FFFBEB] border-amber-200/90 text-[#D97706]",
                          dotClass: "bg-[#D97706]",
                        },
                        {
                          label: "Trust",
                          status: "Needs work",
                          pillClass:
                            "bg-[#FFF1F2] border-rose-200/90 text-[#E11D48]",
                          dotClass: "bg-[#E11D48]",
                        },
                        {
                          label: "Action",
                          status: "Clear",
                          pillClass:
                            "bg-[#ECFDF5] border-emerald-200/90 text-[#059669]",
                          dotClass: "bg-[#059669]",
                        },
                      ].map((sig) => (
                        <div
                          key={sig.label}
                          className={`border rounded-2xl px-2.5 py-2.5 text-center flex flex-col items-center justify-between min-w-0 ${sig.pillClass}`}
                        >
                          <span className="text-[11px] font-bold text-[#101828] leading-tight">
                            {sig.label}
                          </span>
                          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold leading-none">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${sig.dotClass}`}
                            />
                            {sig.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* C. Biggest Issue Component */}
                    <div className="rounded-2xl bg-[#FFF1F2]/75 border border-rose-200/80 p-3.5 sm:p-4 mb-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#E11D48]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                          BIGGEST ISSUE
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] font-semibold text-[#101828] leading-snug mb-2">
                        The headline doesn{"'"}t explain what the product actually helps visitors do.
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs bg-white/90 border border-rose-200/70 rounded-xl px-3 py-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E11D48] shrink-0">
                          EVIDENCE:
                        </span>
                        <span className="text-slate-700 font-medium break-words">
                          &ldquo;Modern solutions for teams&rdquo;
                        </span>
                      </div>
                    </div>

                    {/* D. #1 Priority Fix Component */}
                    <div className="rounded-2xl bg-[#ECFDF5]/75 border border-emerald-200/80 p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#059669]">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          #1 PRIORITY FIX
                        </span>
                        <span className="text-[11px] font-medium text-[#059669]">
                          Explain the main benefit directly in the headline.
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="bg-white/90 border border-slate-200/80 rounded-xl p-2.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                            BEFORE
                          </span>
                          <p className="text-slate-600 leading-snug break-words">
                            &ldquo;Modern solutions for teams&rdquo;
                          </p>
                        </div>
                        <div className="bg-white border border-emerald-300/90 rounded-xl p-2.5 shadow-2xs">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#059669] block mb-1">
                            AFTER
                          </span>
                          <p className="font-bold text-[#059669] leading-snug break-words">
                            &ldquo;Plan projects, assign tasks, and track deadlines in one place.&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </section>

              {/* SECTION: THE PROBLEM */}
              <section
                id="product"
                className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-14 md:py-20 border-t border-slate-100"
              >
                <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      THE PROBLEM
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3 [text-wrap:balance]">
                      You know your product. <br />
                      Your visitors don{"'"}t.
                    </h2>
                  </Reveal>
                  <Reveal y={14} delay={0.12}>
                    <p className="text-[15px] sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                      You{"'"}ve spent hours building your product. But a new visitor sees only what{"'"}s on the page — and may miss what makes it valuable.
                    </p>
                  </Reveal>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto items-stretch">
                  <Reveal y={18} delay={0.08} className="h-full">
                    <div className="h-full bg-[#F5F8FF] border border-[#E3EAF5] rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:border-blue-200">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          WHAT YOU WANT TO SAY
                        </span>
                        <h3 className="text-lg font-bold text-slate-950 mb-2.5">
                          Your complete product vision
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          All your features, benefits, use cases, and nuanced positioning perfectly understood in context.
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs text-slate-500 font-medium flex items-center justify-between">
                        <span>Intended message</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline-block" />
                      </div>
                    </div>
                  </Reveal>

                  <Reveal y={18} delay={0.18} className="h-full">
                    <div className="h-full bg-white border border-[#E3EAF5] rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs transition-all duration-200 hover:border-blue-200 hover:shadow-sm">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#246BFD] block mb-2">
                          WHAT VISITORS MIGHT UNDERSTAND
                        </span>
                        <h3 className="text-lg font-bold text-slate-950 mb-2.5">
                          First-time stranger impression
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">?</span> What is this product?
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">?</span> Is this actually for me?
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">?</span> Why should I trust this?
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">?</span> What should I do next?
                          </li>
                        </ul>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                        First-time visitor perspective
                      </div>
                    </div>
                  </Reveal>
                </div>
              </section>

              {/* SECTION: FIVE CORE SIGNALS */}
              <section className="py-12 sm:py-14 md:py-20 border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      FIVE EVALUATION DIMENSIONS
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3 [text-wrap:balance]">
                      See your website from every important angle.
                    </h2>
                  </Reveal>
                  <Reveal y={14} delay={0.12}>
                    <p className="text-[15px] sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                      StrangerLens evaluates accessible homepage content across five key signals to show what your website communicates to a first-time visitor.
                    </p>
                  </Reveal>
                </div>

                <StaggerContainer
                  staggerDelay={0.07}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4"
                >
                  {[
                    {
                      title: "First Impression",
                      question:
                        "How clearly the homepage communicates its overall purpose.",
                      icon: Eye,
                    },
                    {
                      title: "Audience",
                      question:
                        "Whether the intended visitor can recognize who the product is for.",
                      icon: Users,
                    },
                    {
                      title: "Value",
                      question:
                        "How specifically the homepage explains what visitors may gain.",
                      icon: Sparkles,
                    },
                    {
                      title: "Trust",
                      question:
                        "What credibility evidence is available in the accessible homepage content.",
                      icon: Shield,
                    },
                    {
                      title: "Action",
                      question:
                        "How clearly the homepage communicates the next step.",
                      icon: ArrowRight,
                    },
                  ].map((card, idx) => {
                    const IconComponent = card.icon;
                    return (
                      <StaggerItem key={idx} y={16}>
                        <div className="group h-full bg-white border border-[#E3EAF5] rounded-2xl p-5 flex flex-col justify-between shadow-2xs hover:border-blue-300 md:hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                          <div>
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-[#246BFD] flex items-center justify-center mb-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:bg-[#EAF2FF]">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-slate-950 text-sm mb-1">
                              {card.title}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {card.question}
                            </p>
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              </section>

              {/* SECTION: INSIDE YOUR REPORT (3 Compact Cards Side-by-Side on Desktop) */}
              <section
                id="how-it-works"
                className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-14 md:py-20 border-t border-slate-100"
              >
                <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      INSIDE YOUR REPORT
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3 [text-wrap:balance]">
                      See what StrangerLens reveals.
                    </h2>
                  </Reveal>
                  <Reveal y={14} delay={0.12}>
                    <p className="text-[15px] sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                      Understand what{"'"}s unclear, discover the evidence, and know where to start.
                    </p>
                  </Reveal>
                </div>

                <StaggerContainer
                  staggerDelay={0.08}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch"
                >
                  {/* CARD 1 — UNDERSTAND */}
                  <StaggerItem y={16} className="h-full min-w-0">
                    <div className="h-full bg-white border border-[#E3EAF5] rounded-2xl p-5 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-colors">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#246BFD] bg-[#EAF2FF] px-2.5 py-1 rounded-full">
                            UNDERSTAND
                          </span>
                          <div className="w-8 h-8 rounded-full bg-[#EAF2FF] text-[#246BFD] flex items-center justify-center shrink-0">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-extrabold text-[#101828] tracking-tight mb-1.5">
                          First-Impression Diagnosis
                        </h3>
                        <p className="text-xs sm:text-sm text-[#526078] leading-relaxed mb-4">
                          See how clearly your homepage communicates across five core visitor signals.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                          Clear
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FFFBEB] text-[#D97706] border border-amber-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                          Partly clear
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FFF1F2] text-[#E11D48] border border-rose-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                          Needs work
                        </span>
                      </div>
                    </div>
                  </StaggerItem>

                  {/* CARD 2 — DISCOVER */}
                  <StaggerItem y={16} className="h-full min-w-0">
                    <div className="h-full bg-white border border-[#E3EAF5] rounded-2xl p-5 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-colors">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#D97706] bg-[#FFFBEB] px-2.5 py-1 rounded-full">
                            DISCOVER
                          </span>
                          <div className="w-8 h-8 rounded-full bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-extrabold text-[#101828] tracking-tight mb-1.5">
                          Biggest Issue + Evidence
                        </h3>
                        <p className="text-xs sm:text-sm text-[#526078] leading-relaxed mb-4">
                          See the #1 reason a new visitor may feel confused or leave — backed by your actual homepage wording.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <div className="rounded-xl bg-[#FFF1F2]/70 border border-rose-200/80 px-3 py-2 text-xs">
                          <span className="font-bold text-[#E11D48] block">
                            Verified page evidence
                          </span>
                          <span className="text-slate-700 leading-snug block mt-0.5">
                            Connects findings directly to your headline, copy, and CTAs.
                          </span>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>

                  {/* CARD 3 — IMPROVE */}
                  <StaggerItem y={16} className="h-full min-w-0">
                    <div className="h-full bg-white border border-[#E3EAF5] rounded-2xl p-5 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-colors">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full">
                            IMPROVE
                          </span>
                          <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-extrabold text-[#101828] tracking-tight mb-1.5">
                          Priority Fix + Copy Rewrites
                        </h3>
                        <p className="text-xs sm:text-sm text-[#526078] leading-relaxed mb-4">
                          Start with your #1 fix for free, then unlock the 1-2-3 action plan and copy-ready rewrites.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <div className="rounded-xl bg-[#ECFDF5]/80 border border-emerald-200/80 px-3 py-2 text-xs">
                          <span className="font-bold text-[#059669] block">
                            Before → After guidance
                          </span>
                          <span className="text-slate-700 leading-snug block mt-0.5">
                            Clear replacement copy you can apply immediately.
                          </span>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                </StaggerContainer>
              </section>

              {/* SECTION: PRICING */}
              <section
                id="pricing"
                className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-14 md:py-20 border-t border-slate-100"
              >
                <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      PRICING
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3 [text-wrap:balance]">
                      Simple, transparent pricing.
                    </h2>
                  </Reveal>
                  <Reveal y={14} delay={0.12}>
                    <p className="text-[15px] sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                      Start with a free first-impression preview today. Unlock complete diagnostic reports with a one-time payment — no subscriptions.
                    </p>
                  </Reveal>
                </div>

                <StaggerContainer
                  staggerDelay={0.09}
                  className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto pt-3 items-stretch"
                >
                  {PRICING_PLANS.map((plan) => {
                    const isPaidPreLaunch = plan.isPaid && !IS_CHECKOUT_ENABLED;
                    return (
                      <StaggerItem key={plan.id} y={20} className="h-full">
                        <div
                          className={`h-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 relative ${
                            plan.popular
                              ? "bg-[#F5F8FF] border-2 border-[#246BFD] shadow-[0_18px_42px_-12px_rgba(36,107,253,0.18)] md:-translate-y-1.5 md:hover:-translate-y-2"
                              : "bg-white border border-[#E3EAF5] shadow-xs hover:border-blue-300 md:hover:-translate-y-1 hover:shadow-md"
                          }`}
                        >
                          {plan.badge && (
                            <motion.div
                              initial={
                                shouldReduceMotion
                                  ? false
                                  : { opacity: 0, scale: 0.92, y: 4 }
                              }
                              whileInView={{ opacity: 1, scale: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{
                                duration: 0.35,
                                delay: 0.18,
                                ease: EASE_OUT_EXPO,
                              }}
                              className="absolute -top-3.5 left-6 right-6 flex items-center justify-between gap-2 pointer-events-none"
                            >
                              <span
                                className={`text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full shadow-xs whitespace-nowrap ${
                                  plan.popular
                                    ? "bg-[#246BFD] text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {plan.badge}
                              </span>
                            </motion.div>
                          )}

                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h3 className="font-extrabold text-slate-950 text-xl tracking-tight">
                                {plan.name}
                              </h3>
                            </div>

                            <p className="text-sm font-bold text-[#246BFD] mb-1">
                              {plan.positioning}
                            </p>
                            <p className="text-xs sm:text-[13px] text-[#526078] leading-relaxed mb-5">
                              {plan.description}
                            </p>

                            <div className="flex items-baseline gap-2 mb-5 pb-4 border-b border-slate-200/80 tabular-nums">
                              <span className="text-4xl sm:text-[42px] font-extrabold text-slate-950 tracking-tight leading-none">
                                ${plan.price}
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {plan.paymentLabel}
                              </span>
                            </div>

                            <div className="mb-6">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-3">
                                Includes:
                              </span>
                              <ul className="space-y-2.5 text-sm text-slate-700">
                                {plan.features.map((feat, i) => (
                                  <li key={i} className="flex items-start gap-2.5">
                                    <Check
                                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                                        plan.popular
                                          ? "text-[#246BFD]"
                                          : "text-emerald-600"
                                      }`}
                                    />
                                    <span className="leading-snug">{feat}</span>
                                  </li>
                                ))}
                              </ul>
                              {plan.creditNote && (
                                <p className="mt-3.5 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                                  {plan.creditNote}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={scrollToInput}
                            className={`group w-full min-h-[46px] py-3 px-4 rounded-full text-sm font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2 ${
                              plan.popular || !plan.isPaid
                                ? "bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white shadow-xs hover:shadow-md hover:shadow-blue-500/20"
                                : "bg-white hover:bg-[#EAF2FF] active:scale-[0.98] text-slate-900 border border-[#DCE6F7] hover:border-blue-300"
                            }`}
                          >
                            <span>
                              {isPaidPreLaunch ? plan.disabledCta : plan.cta} →
                            </span>
                          </button>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>

                <Reveal y={12} delay={0.16}>
                  <div className="max-w-3xl mx-auto mt-8 text-center text-xs text-[#526078] space-y-1.5">
                    <p className="font-semibold text-slate-700">
                      One-time payment · No subscription
                    </p>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                      <Link
                        href="/terms"
                        className="text-slate-600 hover:text-[#246BFD] underline underline-offset-2 transition-colors"
                      >
                        Terms
                      </Link>
                      <span aria-hidden="true">·</span>
                      <Link
                        href="/privacy"
                        className="text-slate-600 hover:text-[#246BFD] underline underline-offset-2 transition-colors"
                      >
                        Privacy
                      </Link>
                      <span aria-hidden="true">·</span>
                      <Link
                        href="/refund-policy"
                        className="text-slate-600 hover:text-[#246BFD] underline underline-offset-2 transition-colors"
                      >
                        Refund Policy
                      </Link>
                      <span aria-hidden="true">·</span>
                      <Link
                        href="/contact"
                        className="text-slate-600 hover:text-[#246BFD] underline underline-offset-2 transition-colors"
                      >
                        Contact Support
                      </Link>
                    </p>
                  </div>
                </Reveal>
              </section>

              {/* SECTION: FAQ */}
              <section
                id="faq"
                className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-14 md:py-20 border-t border-slate-100 max-w-3xl mx-auto px-1 sm:px-4"
              >
                <div className="text-center mb-8 sm:mb-10">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      FAQ
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl font-extrabold text-[#101828] tracking-tight mt-3.5 [text-wrap:balance]">
                      Frequently asked questions
                    </h2>
                  </Reveal>
                </div>

                <Reveal y={16} delay={0.1}>
                  <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                    {FAQ_ITEMS.map((item, idx) => {
                      const isOpen = openFaqIndex === idx;
                      const answerId = `faq-answer-${idx}`;
                      return (
                        <div key={idx} className="py-3.5 sm:py-4">
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between gap-4 text-left py-1.5 group cursor-pointer bg-transparent border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] rounded-lg"
                            aria-expanded={isOpen}
                            aria-controls={answerId}
                          >
                            <span className="font-bold text-slate-900 group-hover:text-[#246BFD] transition-colors text-[15px] sm:text-base">
                              {item.question}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                                isOpen
                                  ? "rotate-180 text-[#246BFD]"
                                  : "group-hover:text-slate-600"
                              }`}
                            />
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                id={answerId}
                                initial={
                                  shouldReduceMotion
                                    ? false
                                    : { height: 0, opacity: 0 }
                                }
                                animate={{ height: "auto", opacity: 1 }}
                                exit={
                                  shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { height: 0, opacity: 0 }
                                }
                                transition={{
                                  duration: shouldReduceMotion ? 0.05 : 0.26,
                                  ease: EASE_OUT_EXPO,
                                }}
                                className="overflow-hidden"
                              >
                                <p className="pt-2 pb-1 text-sm text-[#526078] leading-relaxed">
                                  {item.answer}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </Reveal>
              </section>

              {/* FINAL CTA & FOOTER */}
              <section className="pt-11 pb-8 sm:pt-14 sm:pb-10 md:pt-20 md:pb-12 border-t border-slate-100 text-center">
                <Reveal y={18}>
                  <div className="max-w-4xl mx-auto rounded-3xl bg-[#F5F8FF] border border-[#E3EAF5] p-7 sm:p-10 md:p-14 mb-8 sm:mb-10 shadow-xs">
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mb-3.5 [text-wrap:balance]">
                      Your website deserves a second look.
                    </h2>
                    <p className="text-[15px] sm:text-base text-[#526078] max-w-xl mx-auto mb-6 sm:mb-7 font-normal">
                      See what your homepage communicates to a first-time visitor before your next visitor lands on it.
                    </p>
                    <button
                      onClick={scrollToInput}
                      className="group rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white font-medium px-7 sm:px-8 py-3.5 sm:py-4 inline-flex items-center gap-2 shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2"
                    >
                      <span>Analyze My Website Free →</span>
                    </button>
                  </div>
                </Reveal>

                <Reveal y={10} delay={0.08}>
                  <footer className="pt-6 pb-4 border-t border-slate-100 flex flex-col gap-5 text-xs text-[#526078]">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          S
                        </div>
                        <span className="font-bold text-slate-900 whitespace-nowrap">
                          {BRAND_NAME}
                        </span>
                        <span>
                          © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-6">
                        {NAV_ITEMS.map((item) => (
                          <a
                            key={item.href}
                            href={item.href}
                            onClick={(e) => handleSectionNavigate(e, item.href)}
                            className="hover:text-slate-900 transition-colors underline-offset-4 hover:underline"
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-500">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2">
                        {LEGAL_CONFIG.links.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="hover:text-slate-900 transition-colors underline-offset-4 hover:underline font-medium"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="text-center sm:text-right text-[11px] text-slate-400">
                        <span>Support: </span>
                        <a
                          href={`mailto:${LEGAL_CONFIG.supportEmail}`}
                          className="text-slate-600 hover:text-[#246BFD] transition-colors font-medium"
                        >
                          {LEGAL_CONFIG.supportEmail}
                        </a>
                      </div>
                    </div>
                  </footer>
                </Reveal>
              </section>
            </main>
          </motion.div>
        ) : currentView === "scan" ? (
          <motion.div
            key="scan"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full min-h-screen"
          >
            <ScanScreen
              rawUrl={submittedUrl}
              isBackendReady={!isPending && !isVerifying && analysisData !== null}
              isScanning={isPending || isVerifying}
              backendError={backendError}
              onRetry={() => {
                scanControllerRef.current?.retryScan();
              }}
              onCancel={() => {
                clearPersistedReportSession();
                scanControllerRef.current?.cancelScan();
              }}
              onBackToLanding={() => {
                clearPersistedReportSession();
                scanControllerRef.current?.cancelScan();
                setTimeout(() => scrollToInput(), 100);
              }}
              onOpenFaq={() => {
                setOpenFaqIndex(null);
                setActiveInfoModal("faq");
              }}
              onOpenPricing={() => setActiveInfoModal("pricing")}
              onGoToResults={() => {
                scanControllerRef.current?.completeScanToResults();
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full min-h-screen"
          >
            <ResultsScreen
              rawUrl={submittedUrl}
              analysisData={analysisData || undefined}
              onBackToLanding={() => {
                clearPersistedReportSession();
                scanControllerRef.current?.cancelScan();
                setTimeout(() => scrollToInput(), 100);
              }}
              onRunNewCheck={() => {
                scanControllerRef.current?.retryScan();
              }}
              onOpenFaq={() => {
                setOpenFaqIndex(null);
                setActiveInfoModal("faq");
              }}
              onOpenPricing={() => setActiveInfoModal("pricing")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "faq" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Frequently Asked Questions"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[85vh] flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-950 text-xl tracking-tight">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Everything you need to know about StrangerLens first-impression reviews.
                  </p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  aria-label="Close FAQ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 overflow-y-auto pr-1 divide-y divide-slate-100 flex-1">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  const modalAnswerId = `faq-modal-answer-${idx}`;
                  return (
                    <div key={idx} className="py-3.5 first:pt-2 last:pb-2">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-3 text-left py-1 group cursor-pointer bg-transparent border-0"
                        aria-expanded={isOpen}
                        aria-controls={modalAnswerId}
                      >
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                            isOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={modalAnswerId}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="pt-2 pb-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                              {item.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRICING MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "pricing" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pricing Plans"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[85vh] flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-950 text-xl tracking-tight">
                    Simple, Transparent Pricing
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Start with a free first-impression preview today. One-time report unlocks with no subscriptions.
                  </p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  aria-label="Close Pricing"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-y-auto flex-1 pr-1 pb-1 pt-2">
                {PRICING_PLANS.map((plan) => {
                  const isPaidPreLaunch = plan.isPaid && !IS_CHECKOUT_ENABLED;
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-5 flex flex-col justify-between relative ${
                        plan.popular
                          ? "bg-[#F5F8FF] border-2 border-[#246BFD] shadow-sm"
                          : "bg-white border border-[#E3EAF5]"
                      }`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-3 left-4 right-4 flex items-center justify-between gap-1.5 pointer-events-none">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                              plan.popular
                                ? "bg-[#246BFD] text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {plan.badge}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-lg mb-0.5">
                          {plan.name}
                        </h4>
                        <p className="text-xs font-bold text-[#246BFD] mb-1">
                          {plan.positioning}
                        </p>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                          {plan.description}
                        </p>
                        <div className="flex items-baseline gap-1.5 mb-4 pb-3 border-b border-slate-100 tabular-nums">
                          <span className="text-3xl font-extrabold text-slate-950">
                            ${plan.price}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {plan.paymentLabel}
                          </span>
                        </div>
                        <div className="space-y-2 mb-6 text-xs text-slate-700">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={scrollToInput}
                        className={`group w-full py-2.5 px-4 rounded-full text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                          plan.popular || !plan.isPaid
                            ? "bg-[#246BFD] hover:bg-blue-600 text-white"
                            : "bg-white hover:bg-[#EAF2FF] text-slate-900 border border-[#DCE6F7]"
                        }`}
                      >
                        <span>
                          {isPaidPreLaunch ? plan.disabledCta : plan.cta} →
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
                <span className="font-semibold text-slate-700">
                  One-time payment · No subscription
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link href="/terms" className="hover:text-slate-900 underline underline-offset-2">
                    Terms
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/privacy" className="hover:text-slate-900 underline underline-offset-2">
                    Privacy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/refund-policy" className="hover:text-slate-900 underline underline-offset-2">
                    Refund Policy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/contact" className="hover:text-slate-900 underline underline-offset-2">
                    Support
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
