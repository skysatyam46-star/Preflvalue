"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Link2,
  ArrowRight,
  Eye,
  Zap,
  Check,
  FileText,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import ScanScreen from "@/components/ScanScreen";
import ResultsScreen from "@/components/ResultsScreen";
import { mapBackendToFrontend } from "@/lib/mapper";
import { validateClientUrl } from "@/lib/url-client-validator";

// 1. CONFIGURABLE PRICING DATA
const PRICING_CONFIG = {
  billingCycles: [
    { id: "monthly" as const, label: "Monthly" },
    { id: "annual" as const, label: "Annual", discount: "Save 20%" },
  ],
  plans: [
    {
      id: "free",
      name: "Free",
      tagline: "For trying ValueCheck",
      price: { monthly: 0, annual: 0 },
      period: "forever",
      checks: "1 free audit",
      features: [
        "Full 5-second stranger scan",
        "Visitor takeaway & clarity breakdown",
        "Live copy evidence detection",
        "1 high-impact priority fix",
        "Instant analysis (no signup required)",
      ],
      cta: "Check my website",
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "For builders who check websites regularly",
      price: { monthly: 19, annual: 15 },
      period: "/ month",
      checks: "Unlimited audits",
      features: [
        "Unlimited first-impression audits",
        "High-converting headline suggestions",
        "Deep competitor comprehension tests",
        "PDF download & shareable client links",
        "Weekly homepage clarity monitoring",
      ],
      cta: "Get Started with Pro",
      popular: true,
    },
  ],
};

// 2. PRODUCT-SPECIFIC FAQ QUESTIONS & ANSWERS
const FAQ_ITEMS = [
  {
    question: "What is ValueCheck?",
    answer:
      "ValueCheck is a first-impression website audit that analyzes your homepage from the perspective of an unbiased stranger visiting for the very first time. It identifies what is understood in 5 seconds, what is confusing, and what single change to make first.",
  },
  {
    question: "How does ValueCheck evaluate my website?",
    answer:
      "ValueCheck simulates a cold visitor discovery flow. It reads your headline, subhead, primary action, and above-the-fold evidence to measure message clarity, value comprehension, and cognitive friction.",
  },
  {
    question: "What does “first-time visitor” mean?",
    answer:
      "A first-time visitor is someone who has zero prior knowledge about your company or internal terminology. They don't know your product roadmap or feature list—they only have 5 seconds to decide if your product is relevant to them.",
  },
  {
    question: "What does the analysis look at?",
    answer:
      "The diagnostic report focuses on four core pillars: (1) First impression (instant gut reaction), (2) Visitor takeaway (what they think you sell vs. what's vague), (3) Real evidence (direct copy quotes from your homepage), and (4) Priority fix (the single highest-leverage edit).",
  },
  {
    question: "Does ValueCheck read my actual website content?",
    answer:
      "Yes. ValueCheck evaluates the live public text and structure of your homepage URL to ground every diagnosis in real evidence, rather than vague hypothetical advice.",
  },
  {
    question: "How long does a check take?",
    answer:
      "An audit takes approximately 60 seconds. You receive a structured diagnosis with actionable recommendations right on your screen.",
  },
  {
    question: "Do I need to sign up?",
    answer:
      "No signup or credit card is required. You can check your primary landing page immediately without creating an account.",
  },
  {
    question: "Can I run another check after making changes?",
    answer:
      "Yes. Whenever you rewrite a headline, tweak your subhead, or adjust your value proposition, you can run fresh checks to immediately measure whether clarity improved.",
  },
  {
    question: "What kind of websites can I check?",
    answer:
      "Any public web page: SaaS landing pages, consumer apps, B2B software, creator tools, agency portfolios, and mobile app landing pages with a publicly reachable URL.",
  },
];

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [currentView, setCurrentView] = useState<"landing" | "scan" | "results">("landing");
  const [submittedUrl, setSubmittedUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<"faq" | "pricing" | null>(null);

  // API Integration States
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // FAQ accordion state: only one open at a time
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Pricing billing cycle toggle
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const inputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Client-side live URL validation state
  const urlValidation = React.useMemo(() => validateClientUrl(url), [url]);

  // Scroll to input without disrupting position
  const scrollToInput = () => {
    if (activeInfoModal) {
      setActiveInfoModal(null);
    }
    if (inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current.focus();
    }
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveInfoModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll gently when modal is open without jumping scroll position
  useEffect(() => {
    if (activeInfoModal) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "scroll"; // Keep scrollbar space to avoid layout shift
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflowY = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    }
  }, [activeInfoModal]);

  const handleAnalyze = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (overrideUrl || url || submittedUrl).trim();

    if (!targetUrl) {
      setErrorMessage("Please enter a website URL");
      scrollToInput();
      return;
    }

    // 1. STAGE 1: Live Client Format Validation
    const validation = validateClientUrl(targetUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      setErrorMessage(validation.message || "Please enter a valid website URL (e.g. yourproduct.com)");
      scrollToInput();
      return;
    }

    // Automatic URL Normalization
    const normalizedTargetUrl = validation.normalizedUrl;

    // 2. STAGE 2: Pre-Scan Website Existence & Reachability Check
    // Keep user on the landing page while verifying host reachability.
    // Do NOT transition to ScanScreen unless the website is confirmed reachable.
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const verifyRes = await fetch("/api/check/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalizedTargetUrl }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        // Website is unreachable or invalid: STAY on landing page with honest error
        setIsVerifying(false);
        const failMessage =
          verifyData.message ||
          "Website is unreachable. Please verify the domain and ensure the site is online.";
        setErrorMessage(failMessage);
        return;
      }
    } catch (err: unknown) {
      console.error("Reachability check network error:", err);
      setIsVerifying(false);
      setErrorMessage("Unable to verify website reachability. Please check your network and try again.");
      return;
    }

    // Website existence confirmed! Proceed to Scan Screen and Full Analysis
    setIsVerifying(false);
    setSubmittedUrl(normalizedTargetUrl);
    setBackendError(null);
    setAnalysisData(null);
    setErrorMessage(null);
    setIsPending(true);
    setCurrentView("scan");

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalizedTargetUrl }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const mapped = mapBackendToFrontend(data.analysis, normalizedTargetUrl, data.snapshot);
        setAnalysisData(mapped);
      } else {
        const errorMsg = data.message || data.error || "Failed to analyze website. Verify if the domain is reachable.";
        setBackendError(errorMsg);
      }
    } catch (err: unknown) {
      console.error("API error:", err);
      setBackendError("An unexpected server or connection error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
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
            {/* 1. HEADER (LOCKED DESKTOP, COMPACT & NON-WRAPPING OPAQUE MOBILE) */}
            <motion.header
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
        className="w-full bg-white md:bg-white/95 border-b border-slate-100 md:border-b-0 sticky top-0 z-30 transition-all"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-[60px] sm:h-16 md:h-auto md:py-6 flex items-center justify-between">
          <div className="flex items-center shrink-0">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-950">
              ValueCheck
            </span>
          </div>

          <div className="flex items-center gap-3.5 sm:gap-6 md:gap-9">
            <button
              onClick={() => {
                setActiveInfoModal("faq");
                setOpenFaqIndex(0); // Open first item by default for immediate context
              }}
              className="text-xs sm:text-[15px] font-medium text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <button
              onClick={() => setActiveInfoModal("pricing")}
              className="text-xs sm:text-[15px] font-medium text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={scrollToInput}
              className="rounded-full bg-[#1d68f5] hover:bg-blue-600 hover:-translate-y-px active:scale-[0.98] text-white text-xs sm:text-sm font-medium px-3.5 sm:px-5 py-2 sm:py-2.5 transition-all duration-150 inline-flex items-center gap-1 sm:gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">Check my website</span>
              <span className="inline sm:hidden">Check website</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 shrink-0" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* MAIN CONTENT CANVAS */}
      <main className="w-full">
        {/* 2. HERO SECTION */}
        <section className="pt-11 pb-9 sm:pt-12 sm:pb-12 md:pt-14 md:pb-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Eyebrow badge - Hidden on mobile, preserved on locked desktop */}
            <div className="hidden md:inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wider text-slate-600 uppercase bg-[#f1f3f6] border border-slate-200/60 shadow-2xs mb-7">
              FIRST-IMPRESSION WEBSITE CHECK
            </div>

            {/* Main Headline - Exactly 2 lines on mobile & desktop */}
            <motion.h1
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full text-center font-[650] sm:font-bold md:font-extrabold text-slate-950 tracking-tight leading-[1.02] sm:leading-[1.04] md:leading-[1.07] text-[clamp(26px,7.5vw,42px)] sm:text-5xl md:text-6xl lg:text-[70px]"
            >
              <span className="block whitespace-nowrap">
                What does your website
              </span>
              <span className="block whitespace-nowrap mt-1 sm:mt-2">
                say <span className="text-[#1d68f5]">to a stranger?</span>
              </span>
            </motion.h1>

            {/* Supporting Copy - Desktop (Unchanged) */}
            <motion.p
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="hidden md:block text-slate-600 text-base sm:text-lg leading-relaxed max-w-lg mx-auto mt-6 text-center font-normal"
            >
              Your website gets one first impression.
              <br />
              See what a new visitor understands, what’s unclear,
              <br />
              and what to fix first.
            </motion.p>

            {/* Supporting Copy - Mobile (Concise single sentence) */}
            <motion.p
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="block md:hidden text-slate-600 text-[15px] sm:text-base leading-snug max-w-sm mx-auto mt-3.5 text-center font-normal"
            >
              See what visitors understand — and what they miss.
            </motion.p>

            {/* 3. URL INPUT */}
            <motion.form
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleAnalyze}
              className="w-[calc(100%-16px)] sm:w-full max-w-[580px] mx-auto mt-6 sm:mt-8 md:mt-10"
            >
              <div
                className={`relative flex items-center bg-white rounded-full border shadow-md transition-all p-1.5 pl-4 sm:p-2 sm:pl-6 min-h-[48px] sm:min-h-[56px] ${
                  errorMessage || urlValidation.status === "invalid"
                    ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-100/70 shadow-rose-100/30"
                    : urlValidation.status === "valid"
                    ? "border-emerald-500 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100/70 shadow-emerald-100/40"
                    : "border-slate-200/90 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/60 shadow-slate-200/40"
                }`}
              >
                <Link2
                  className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mr-2.5 sm:mr-3 transition-colors ${
                    errorMessage || urlValidation.status === "invalid"
                      ? "text-rose-500"
                      : urlValidation.status === "valid"
                      ? "text-emerald-500"
                      : "text-slate-400"
                  }`}
                />
                <input
                  ref={inputRef}
                  type="text"
                  disabled={isVerifying}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="https://yourproduct.com"
                  className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base outline-none font-normal pr-2 disabled:opacity-75"
                  aria-label="Website URL"
                />
                <button
                  type="submit"
                  disabled={isVerifying || urlValidation.status === "invalid" || !url.trim()}
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 shadow-sm ${
                    urlValidation.status === "invalid" || !url.trim()
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-75 shadow-none"
                      : isVerifying
                      ? "bg-[#1d68f5] text-white cursor-wait opacity-90 shadow-none"
                      : "bg-[#1d68f5] hover:bg-blue-600 hover:-translate-y-px active:scale-[0.98] text-white cursor-pointer"
                  }`}
                  aria-label="See what visitors see"
                  title={
                    urlValidation.status === "invalid"
                      ? "Please enter a valid website URL"
                      : isVerifying
                      ? "Checking website reachability..."
                      : "See what visitors see"
                  }
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                  ) : (
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>

              {(errorMessage || urlValidation.status === "invalid") && (
                <p className="text-rose-600 text-xs sm:text-sm mt-2.5 text-center font-medium transition-opacity">
                  {errorMessage || urlValidation.message}
                </p>
              )}
            </motion.form>

            {/* 4. THREE VALUE SIGNALS (DESKTOP LOCKED, MOBILE COMPACT LABELS) */}
            <div className="flex items-center justify-center gap-3.5 min-[390px]:gap-5 sm:gap-8 md:gap-11 mt-6 sm:mt-7 md:mt-8 text-slate-700">
              {/* Understanding - Green */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-1.5 sm:gap-2.5 shrink-0"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#16a34a] shrink-0">
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-xs sm:text-[13px] md:text-sm font-medium text-slate-700">
                  <span className="hidden sm:inline">What they understand</span>
                  <span className="inline sm:hidden">Understand</span>
                </span>
              </motion.div>

              {/* Missing - Coral / Red */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.29, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-1.5 sm:gap-2.5 shrink-0"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#ffe4e6] flex items-center justify-center text-[#f43f5e] shrink-0 font-bold text-[11px] sm:text-xs">
                  ?
                </div>
                <span className="text-xs sm:text-[13px] md:text-sm font-medium text-slate-700">
                  <span className="hidden sm:inline">What they miss</span>
                  <span className="inline sm:hidden">Miss</span>
                </span>
              </motion.div>

              {/* Priority - Blue */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-1.5 sm:gap-2.5 shrink-0"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#2563eb] shrink-0">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#2563eb]" />
                </div>
                <span className="text-xs sm:text-[13px] md:text-sm font-medium text-slate-700">
                  <span className="hidden sm:inline">What to fix first</span>
                  <span className="inline sm:hidden">Fix first</span>
                </span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 5. "GOOD PRODUCTS CAN STILL LOOK UNCLEAR" SECTION */}
        <section className="px-4 sm:px-6 py-4 sm:py-6 md:py-8">
          <div className="max-w-5xl mx-auto rounded-2xl sm:rounded-3xl bg-[#f8f9fa] border border-slate-200/60 p-5 sm:p-8 md:p-12 lg:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center">
              {/* Left Column */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6 flex flex-col justify-center"
              >
                {/* Uppercase label hidden on mobile as specified */}
                <span className="hidden md:block text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-3">
                  GOOD PRODUCTS CAN STILL LOOK UNCLEAR.
                </span>
                <h2 className="text-[26px] min-[390px]:text-[30px] sm:text-[34px] md:text-4xl font-semibold md:font-extrabold text-slate-950 tracking-tight leading-[1.08] md:leading-tight">
                  A visitor doesn’t know
                  <br className="hidden sm:inline" />{" "}
                  your product like you do.
                </h2>

                {/* Desktop copy */}
                <p className="hidden md:block text-slate-600 text-[15px] sm:text-base leading-relaxed mt-4 max-w-md">
                  ValueCheck shows the gap between what you mean
                  and what a new visitor actually understands.
                </p>
                {/* Mobile copy */}
                <p className="block md:hidden text-slate-600 text-[14px] sm:text-[15px] leading-relaxed mt-2.5 max-w-md">
                  ValueCheck shows the gap between what you mean
                  and what visitors understand.
                </p>
              </motion.div>

              {/* Right Column - Scaled Wireframe + Floating Badges */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6 flex justify-center w-full"
              >
                <div className="relative w-full max-w-[420px]">
                  {/* Wireframe Mockup Container */}
                  <div className="bg-[#f0f3f6]/80 rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs pr-4 min-[480px]:pr-16 sm:pr-24">
                    <div className="text-[11px] font-semibold text-slate-700 mb-3.5 sm:mb-4">
                      Your website
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {/* Top wireframe row */}
                      <div className="flex gap-2.5 sm:gap-4 items-start">
                        <div className="w-20 sm:w-28 h-16 sm:h-20 bg-slate-300/80 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-2.5 sm:h-3 w-4/5 bg-slate-300/70 rounded-full" />
                          <div className="h-2 sm:h-2.5 w-3/5 bg-slate-200 rounded-full" />
                        </div>
                      </div>

                      {/* Bottom wireframe skeleton lines */}
                      <div className="space-y-2 pt-1">
                        <div className="h-2 sm:h-2.5 w-full bg-slate-200/80 rounded-full" />
                        <div className="h-2 sm:h-2.5 w-4/5 bg-slate-200/60 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* 3 Floating Badges - on desktop absolute right as approved; on mobile responsive */}
                  <div className="mt-3.5 min-[480px]:mt-0 min-[480px]:absolute min-[480px]:right-[-10px] sm:right-[-20px] min-[480px]:inset-y-0 flex flex-col justify-between gap-2 min-[480px]:gap-0 py-1 pointer-events-none">
                    {/* Badge 1: Green */}
                    <motion.div
                      initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="inline-flex items-center gap-2 bg-[#f0fdf4] border border-emerald-200/90 rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-xs max-w-max"
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-semibold text-emerald-950 leading-tight">
                        I understand
                        <br className="hidden min-[480px]:inline" />{" "}
                        what this does.
                      </span>
                    </motion.div>

                    {/* Badge 2: Coral / Red */}
                    <motion.div
                      initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="inline-flex items-center gap-2 bg-[#fff1f2] border border-rose-200/90 rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-xs min-[480px]:translate-x-2 max-w-max"
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#f43f5e] text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0">
                        ?
                      </div>
                      <span className="text-[11px] sm:text-xs font-semibold text-rose-950 leading-tight">
                        I’m not sure
                        <br className="hidden min-[480px]:inline" />{" "}
                        what I would get.
                      </span>
                    </motion.div>

                    {/* Badge 3: Amber */}
                    <motion.div
                      initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.96 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
                      className="inline-flex items-center gap-2 bg-[#fffbeb] border border-amber-200/90 rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-xs max-w-max"
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#f59e0b] text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0">
                        ?
                      </div>
                      <span className="text-[11px] sm:text-xs font-semibold text-amber-950 leading-tight">
                        What should
                        <br className="hidden min-[480px]:inline" />{" "}
                        I do next?
                      </span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 6. WHAT YOU'LL GET SECTION */}
        <section className="px-4 sm:px-6 py-10 md:py-20">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-8 md:mb-14"
            >
              <span className="text-[11px] font-semibold md:font-bold tracking-widest text-slate-500 uppercase">
                WHAT YOU’LL GET
              </span>
              <h2 className="text-[26px] min-[390px]:text-[30px] sm:text-3xl md:text-4xl font-semibold md:font-extrabold text-slate-950 tracking-tight mt-1.5 md:mt-2">
                A clear diagnosis of your first impression.
              </h2>
            </motion.div>

            {/* Four Balanced Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 md:gap-6">
              {/* Item 1: First Impression */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#ecfdf5] text-[#16a34a] flex items-center justify-center mb-2.5 sm:mb-4">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className="font-semibold md:font-bold text-slate-950 text-base sm:text-lg mb-1 sm:mb-1.5">
                  First impression
                </h3>
                <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal">
                  <span className="hidden md:inline">What a new visitor understands immediately from your homepage.</span>
                  <span className="inline md:hidden">What a visitor understands from your homepage.</span>
                </p>
              </motion.div>

              {/* Item 2: Visitor Takeaway */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#fff1f2] text-[#f43f5e] flex items-center justify-center mb-2.5 sm:mb-4 font-bold text-sm sm:text-base">
                  ?
                </div>
                <h3 className="font-semibold md:font-bold text-slate-950 text-base sm:text-lg mb-1 sm:mb-1.5">
                  Visitor takeaway
                </h3>
                <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal">
                  <span className="hidden md:inline">What they probably think your product is for — and what’s unclear.</span>
                  <span className="inline md:hidden">What they think your product is for—and what’s unclear.</span>
                </p>
              </motion.div>

              {/* Item 3: Real Evidence */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: 0.19, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center mb-2.5 sm:mb-4">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className="font-semibold md:font-bold text-slate-950 text-base sm:text-lg mb-1 sm:mb-1.5">
                  Real evidence
                </h3>
                <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal">
                  <span className="hidden md:inline">The actual text and elements on your website that led to the findings.</span>
                  <span className="inline md:hidden">The page content behind each finding.</span>
                </p>
              </motion.div>

              {/* Item 4: Priority Fix */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#fffbeb] text-[#f59e0b] flex items-center justify-center mb-2.5 sm:mb-4">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-[#f59e0b]" />
                </div>
                <h3 className="font-semibold md:font-bold text-slate-950 text-base sm:text-lg mb-1 sm:mb-1.5">
                  Priority fix
                </h3>
                <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed font-normal">
                  <span className="hidden md:inline">One high-impact change to make your value clearer right away.</span>
                  <span className="inline md:hidden">The one change worth making first.</span>
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 7. HOW IT WORKS SECTION */}
        <section className="px-4 sm:px-6 py-8 md:py-16">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-7 sm:mb-10 md:mb-12"
            >
              <span className="text-[11px] font-semibold md:font-bold tracking-widest text-slate-500 uppercase">
                HOW IT WORKS
              </span>
            </motion.div>

            {/* Three steps flow */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 md:gap-4 max-w-4xl mx-auto">
              {/* Step 01 */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-3 sm:gap-3.5"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#eff6ff] text-[#2563eb] font-semibold md:font-bold flex items-center justify-center text-sm shrink-0">
                  01
                </div>
                <div>
                  <h3 className="font-semibold md:font-bold text-slate-950 text-base">
                    Paste your URL
                  </h3>
                  <p className="text-[13px] sm:text-sm text-slate-500 mt-0.5 sm:mt-1 max-w-[210px] leading-relaxed font-normal">
                    Enter your website’s homepage URL above.
                  </p>
                </div>
              </motion.div>

              {/* Arrow 1 */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.12 }}
                className="hidden md:flex items-center justify-center px-2 text-slate-400"
              >
                <ArrowRight className="w-5 h-5" />
              </motion.div>

              {/* Step 02 */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-3 sm:gap-3.5"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#eff6ff] text-[#2563eb] font-semibold md:font-bold flex items-center justify-center text-sm shrink-0">
                  02
                </div>
                <div>
                  <h3 className="font-semibold md:font-bold text-slate-950 text-base">
                    ValueCheck reads it
                  </h3>
                  <p className="text-[13px] sm:text-sm text-slate-500 mt-0.5 sm:mt-1 max-w-[210px] leading-relaxed font-normal">
                    We analyze your homepage from a first-time visitor’s perspective.
                  </p>
                </div>
              </motion.div>

              {/* Arrow 2 */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.24 }}
                className="hidden md:flex items-center justify-center px-2 text-slate-400"
              >
                <ArrowRight className="w-5 h-5" />
              </motion.div>

              {/* Step 03 */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-3 sm:gap-3.5"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#eff6ff] text-[#2563eb] font-semibold md:font-bold flex items-center justify-center text-sm shrink-0">
                  03
                </div>
                <div>
                  <h3 className="font-semibold md:font-bold text-slate-950 text-base">
                    See what a stranger understands
                  </h3>
                  <p className="text-[13px] sm:text-sm text-slate-500 mt-0.5 sm:mt-1 max-w-[210px] leading-relaxed font-normal">
                    Get a clear, actionable analysis in seconds.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA SECTION */}
        <section className="px-4 sm:px-6 py-6 md:py-12 mb-10 md:mb-16">
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#eaf2ff] via-[#e2edff] to-[#d8e7ff] border border-blue-100/80 p-7 sm:p-10 md:p-14 text-center shadow-2xs"
          >
            <span className="text-[10px] sm:text-[11px] font-semibold md:font-bold tracking-wider text-slate-500 uppercase">
              READY TO SEE YOUR FIRST IMPRESSION?
            </span>
            <h2 className="text-[26px] min-[390px]:text-[30px] sm:text-3xl md:text-4xl font-semibold md:font-extrabold text-slate-950 tracking-tight mt-2 sm:mt-3 mb-5 sm:mb-7">
              See what your website communicates.
            </h2>
            <motion.button
              initial={shouldReduceMotion ? {} : { scale: 0.98 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={scrollToInput}
              className="rounded-full bg-[#1d68f5] hover:bg-blue-600 hover:-translate-y-px active:scale-[0.98] text-white font-medium px-6 py-3 sm:px-7 sm:py-3.5 inline-flex items-center gap-2 shadow-xs transition-all duration-150 cursor-pointer text-sm sm:text-base"
            >
              <span className="hidden md:inline">Check my website</span>
              <span className="inline md:hidden">See what visitors see</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </motion.button>
            <p className="text-xs sm:text-sm text-slate-500 mt-4 sm:mt-5 font-normal">
              No signup required · Takes about 60 seconds
            </p>
          </motion.div>
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
            isBackendReady={!isPending && analysisData !== null}
            backendError={backendError}
            onBackToLanding={() => {
              setCurrentView("landing");
              setTimeout(() => scrollToInput(), 100);
            }}
            onOpenFaq={() => {
              setActiveInfoModal("faq");
              setOpenFaqIndex(0);
            }}
            onOpenPricing={() => setActiveInfoModal("pricing")}
            onGoToResults={() => setCurrentView("results")}
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
              setCurrentView("landing");
              setTimeout(() => scrollToInput(), 100);
            }}
            onRunNewCheck={() => {
              // Trigger a fresh analysis using the existing URL
              handleAnalyze();
            }}
            onOpenFaq={() => {
              setActiveInfoModal("faq");
              setOpenFaqIndex(0);
            }}
            onOpenPricing={() => setActiveInfoModal("pricing")}
          />
        </motion.div>
      )}
    </AnimatePresence>

      {/* ANIMATED FAQ OVERLAY / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "faq" && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            {/* Backdrop: Subtle Dim + Subtle Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Panel: Desktop Centered (Fade + Scale 0.98->1 + Y 24->0) / Mobile Sheet (Y 100%->0) */}
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 24, scale: typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 0.98 }
              }
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 16, scale: typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 0.98 }
              }
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full p-5 sm:p-8 md:p-9 shadow-2xl shadow-slate-900/10 border border-slate-200/90 relative max-h-[88vh] sm:max-h-[85vh] flex flex-col z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-950 text-lg sm:text-xl tracking-tight">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Everything you need to know about first-impression checks.
                  </p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
                  aria-label="Close FAQ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Interactive Accordion List */}
              <div className="mt-3 overflow-y-auto pr-1 divide-y divide-slate-100 flex-1">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="py-3.5 first:pt-2 last:pb-2">
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-3 text-left py-1 group cursor-pointer"
                        aria-expanded={isOpen}
                      >
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-[15px] leading-snug">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-250 ease-out ${
                            isOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
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

              {/* Footer CTA */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Still have questions? Check your site now.
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setActiveInfoModal(null)}
                    className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-4 py-2 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={scrollToInput}
                    className="rounded-full bg-[#1d68f5] hover:bg-blue-600 text-white text-xs font-medium px-4 py-2 transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Check my website</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ANIMATED PRICING OVERLAY / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "pricing" && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            {/* Backdrop: Subtle Dim + Subtle Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Panel: Desktop Centered (Fade + Scale 0.98->1 + Y 24->0) / Mobile Sheet (Y 100%->0) */}
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 24, scale: typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 0.98 }
              }
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 16, scale: typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 0.98 }
              }
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full p-5 sm:p-8 md:p-9 shadow-2xl shadow-slate-900/10 border border-slate-200/90 relative max-h-[90vh] sm:max-h-[88vh] flex flex-col z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-950 text-lg sm:text-xl tracking-tight">
                    Simple, Transparent Pricing
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Start completely free or upgrade for continuous stranger clarity tests.
                  </p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
                  aria-label="Close Pricing"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="flex justify-center mt-4 sm:mt-5 shrink-0">
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-full border border-slate-200/70">
                  {PRICING_CONFIG.billingCycles.map((cycle) => {
                    const isActive = billingCycle === cycle.id;
                    return (
                      <button
                        key={cycle.id}
                        onClick={() => setBillingCycle(cycle.id)}
                        className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? "bg-white text-slate-950 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>{cycle.label}</span>
                        {cycle.discount && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-bold">
                            {cycle.discount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pricing Cards Grid */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 overflow-y-auto flex-1 pr-1 pb-1">
                {PRICING_CONFIG.plans.map((plan) => {
                  const currentPrice = plan.price[billingCycle];
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all ${
                        plan.popular
                          ? "bg-[#f8faff] border-2 border-blue-500/80 shadow-sm relative"
                          : "bg-white border border-slate-200/90"
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-2xs">
                          Recommended
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-slate-950 text-lg">
                            {plan.name}
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {plan.checks}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                          {plan.tagline}
                        </p>

                        {/* Animated Price display */}
                        <div className="flex items-baseline gap-1.5 mb-5 pb-4 border-b border-slate-100">
                          <span className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight transition-all">
                            ${currentPrice}
                          </span>
                          <span className="text-xs text-slate-500">
                            {plan.id === "free" ? "forever" : billingCycle === "annual" ? "/ month, billed annually" : "/ month"}
                          </span>
                        </div>

                        {/* Plan Features */}
                        <div className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-700">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Plan CTA */}
                      <button
                        onClick={scrollToInput}
                        className={`w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                          plan.popular
                            ? "bg-[#1d68f5] hover:bg-blue-600 text-white shadow-xs hover:-translate-y-px active:scale-[0.98]"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                        }`}
                      >
                        <span>{plan.cta}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer Reassurance */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
                <span>Cancel anytime · No setup fees · Instant activation</span>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="rounded-full text-slate-600 hover:text-slate-900 font-medium px-3 py-1 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
