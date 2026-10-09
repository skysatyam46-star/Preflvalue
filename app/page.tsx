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
  Shield,
  Users,
  Sparkles,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import ScanScreen from "@/components/ScanScreen";
import ResultsScreen from "@/components/ResultsScreen";
import { mapBackendToFrontend } from "@/lib/mapper";
import { validateClientUrl } from "@/lib/url-client-validator";

// PRICING CONFIG (One-time purchase model per V1 spec)
const PRICING_PLANS = [
  {
    id: "free",
    name: "Free Preview",
    price: 0,
    period: "forever",
    tagline: "For a quick stranger impression check",
    features: [
      "Overall score",
      "Five signal scores",
      "Three key observations",
      "Biggest problem",
      "One recommended fix",
    ],
    cta: "Try for free →",
    popular: false,
  },
  {
    id: "one_report",
    name: "One Full Report",
    price: 5,
    period: "one-time",
    tagline: "For a single deep website diagnosis",
    features: [
      "Everything in Free",
      "Detailed reasoning",
      "Full relevant evidence",
      "Risk analysis",
      "Complete recommendations",
      "Full report/export",
    ],
    cta: "Get full report →",
    popular: true,
  },
  {
    id: "three_reports",
    name: "3 Full Reports",
    price: 10,
    period: "one-time",
    tagline: "For checking multiple websites or versions",
    features: [
      "Three complete reports",
      "Full report capabilities for each",
      "Useful for checking multiple sites",
      "No expiry",
    ],
    cta: "Get 3 reports →",
    popular: false,
  },
];

// REQUIRED FAQ ITEMS
const FAQ_ITEMS = [
  {
    question: "What does Percept analyse?",
    answer:
      "Percept analyses your homepage from the perspective of an unbiased first-time visitor. It evaluates message clarity, target audience alignment, value proposition, trust signals, and primary call-to-action friction.",
  },
  {
    question: "Does Percept work with any website?",
    answer:
      "Yes. Percept works with any publicly reachable web page, including SaaS landing pages, consumer apps, B2B software, marketplaces, and agency portfolios.",
  },
  {
    question: "Is the analysis based on real website content?",
    answer:
      "Yes. Percept extracts live text, headings, CTAs, and trust signals directly from your homepage URL to ground every finding in real evidence.",
  },
  {
    question: "Is Percept a security scanner?",
    answer:
      "No. Percept is a communication and conversion intelligence tool focused entirely on messaging, positioning, trust, and visitor comprehension. It does not perform vulnerability scanning or penetration testing.",
  },
  {
    question: "What is included in the free preview?",
    answer:
      "The free preview includes your overall value clarity score, the five signal scores, key observations, and your single highest-priority recommendation.",
  },
  {
    question: "What does the full report cost?",
    answer:
      "Full reports are available as a simple one-time purchase: $5 for a single comprehensive report or $10 for a pack of 3 reports, with no subscriptions or recurring fees.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No account is required to run a free preview check. You can test any public URL instantly.",
  },
];

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [currentView, setCurrentView] = useState<"landing" | "scan" | "results">("landing");
  const [submittedUrl, setSubmittedUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<"faq" | "pricing" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // API Integration States
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const urlValidation = React.useMemo(() => validateClientUrl(url), [url]);

  const scrollToInput = () => {
    if (activeInfoModal) setActiveInfoModal(null);
    if (mobileMenuOpen) setMobileMenuOpen(false);
    if (inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveInfoModal(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAnalyze = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (overrideUrl || url || submittedUrl).trim();

    if (!targetUrl) {
      setErrorMessage("Please enter a website URL");
      scrollToInput();
      return;
    }

    const validation = validateClientUrl(targetUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      setErrorMessage(validation.message || "Please enter a valid website URL (e.g. yourproduct.com)");
      scrollToInput();
      return;
    }

    const normalizedTargetUrl = validation.normalizedUrl;

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const verifyRes = await fetch("/api/check/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedTargetUrl }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        setIsVerifying(false);
        setErrorMessage(verifyData.message || "Website is unreachable. Please verify the domain and ensure the site is online.");
        return;
      }
    } catch (err: unknown) {
      console.error("Reachability check network error:", err);
      setIsVerifying(false);
      setErrorMessage("Unable to verify website reachability. Please check your network and try again.");
      return;
    }

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
        headers: { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col">
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
            {/* HEADER */}
            <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 transition-all">
              <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 h-[72px] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs">
                    P
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-950">
                    Percept
                  </span>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                  <a href="#product" className="hover:text-slate-950 transition-colors">
                    Product
                  </a>
                  <a href="#how-it-works" className="hover:text-slate-950 transition-colors">
                    How it works
                  </a>
                  <a href="#pricing" className="hover:text-slate-950 transition-colors">
                    Pricing
                  </a>
                  <button
                    onClick={() => {
                      setActiveInfoModal("faq");
                      setOpenFaqIndex(0);
                    }}
                    className="hover:text-slate-950 transition-colors cursor-pointer bg-transparent border-0 p-0 text-sm font-medium text-slate-600"
                  >
                    FAQ
                  </button>
                </nav>

                <div className="flex items-center gap-3">
                  <button
                    onClick={scrollToInput}
                    className="rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-medium px-5 py-2.5 transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <span>Try for free</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </button>

                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
                    aria-label="Toggle menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Navigation Drawer */}
              <AnimatePresence>
                {mobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="md:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-3 shadow-lg"
                  >
                    <a
                      href="#product"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-sm font-medium text-slate-700 py-1.5"
                    >
                      Product
                    </a>
                    <a
                      href="#how-it-works"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-sm font-medium text-slate-700 py-1.5"
                    >
                      How it works
                    </a>
                    <a
                      href="#pricing"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-sm font-medium text-slate-700 py-1.5"
                    >
                      Pricing
                    </a>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setActiveInfoModal("faq");
                        setOpenFaqIndex(0);
                      }}
                      className="block w-full text-left text-sm font-medium text-slate-700 py-1.5 bg-transparent border-0 p-0"
                    >
                      FAQ
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>

            <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8">
              {/* HERO SECTION */}
              <section className="pt-12 pb-16 md:pt-20 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-6 flex flex-col items-start text-left">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-[#246BFD] uppercase bg-[#EAF2FF] mb-6 border border-blue-100">
                    WEBSITE INTELLIGENCE FOR BUILDERS
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-extrabold text-[#101828] tracking-tight leading-[1.08] mb-6 [text-wrap:balance]">
                    Your website <br />
                    tells a story. <br />
                    <span className="text-[#246BFD]">Is it the right one?</span>
                  </h1>

                  <p className="text-base sm:text-lg text-[#526078] leading-relaxed mb-8 max-w-lg font-normal">
                    Understand what your website communicates, where visitors may lose trust, and what you should improve first.
                  </p>

                  <form onSubmit={handleAnalyze} className="w-full max-w-lg">
                    <div
                      className={`relative flex items-center bg-white rounded-full border shadow-md transition-all p-1.5 pl-4 sm:pl-6 min-h-[56px] sm:min-h-[60px] ${
                        errorMessage || urlValidation.status === "invalid"
                          ? "border-rose-400 focus-within:ring-4 focus-within:ring-rose-100"
                          : urlValidation.status === "valid"
                          ? "border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100"
                          : "border-[#E3EAF5] hover:border-slate-300 focus-within:border-[#246BFD] focus-within:ring-4 focus-within:ring-blue-100"
                      }`}
                    >
                      <Link2 className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                      <input
                        ref={inputRef}
                        type="text"
                        disabled={isVerifying}
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="https://yourwebsite.com"
                        className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base outline-none font-normal pr-2 disabled:opacity-75"
                        aria-label="Website URL"
                      />
                      <button
                        type="submit"
                        disabled={isVerifying || urlValidation.status === "invalid" || !url.trim()}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm cursor-pointer ${
                          urlValidation.status === "invalid" || !url.trim()
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            : isVerifying
                            ? "bg-[#246BFD] text-white opacity-90 cursor-wait"
                            : "bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white"
                        }`}
                        aria-label="Analyse website"
                        title="Analyse website"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        ) : (
                          <ArrowRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {(errorMessage || urlValidation.status === "invalid") && (
                      <p className="text-rose-600 text-xs sm:text-sm mt-2.5 font-medium">
                        {errorMessage || urlValidation.message}
                      </p>
                    )}
                  </form>

                  <div className="flex items-center gap-6 mt-5 text-xs text-[#526078] font-medium">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Free preview
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> No signup
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> No credit card
                    </span>
                  </div>
                </div>

                {/* Hero Dashboard Preview (NO SIDEBAR!) */}
                <div className="lg:col-span-6 w-full flex justify-center">
                  <div className="w-full max-w-[540px] bg-white border border-[#E3EAF5] rounded-3xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-b from-white to-[#F5F8FF]/50">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-bold">P</div>
                        <span className="font-bold text-slate-900 text-sm">Percept</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">example.com</span>
                      </div>
                    </div>

                    {/* Mini Score & Verdict */}
                    <div className="bg-white border border-[#E3EAF5] rounded-2xl p-4 mb-4 shadow-xs flex items-center gap-4">
                      <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                          <circle cx="50" cy="50" r="40" stroke="#f59e0b" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="75" strokeLinecap="round" fill="transparent" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-bold text-slate-950 leading-none">72</span>
                          <span className="text-[9px] text-slate-400">/100</span>
                        </div>
                      </div>
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 mb-1">Needs work</span>
                        <p className="text-xs text-slate-700 font-medium leading-snug">
                          The website clearly communicates its core offering, but lacks trust signals and a stronger call to action.
                        </p>
                      </div>
                    </div>

                    {/* 5 Signals Row */}
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {[
                        { label: "Impression", score: 80 },
                        { label: "Audience", score: 70 },
                        { label: "Value", score: 85 },
                        { label: "Trust", score: 20 },
                        { label: "Action", score: 60 },
                      ].map((sig, i) => (
                        <div key={i} className="bg-white border border-[#E3EAF5] rounded-xl p-2 text-center shadow-2xs">
                          <span className="text-[10px] text-slate-500 block truncate">{sig.label}</span>
                          <span className="text-sm font-bold text-slate-900">{sig.score}</span>
                        </div>
                      ))}
                    </div>

                    {/* What your website is actually saying */}
                    <div className="bg-white border border-[#E3EAF5] rounded-2xl p-3.5 mb-3 shadow-2xs">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">What your website is actually saying</span>
                      <p className="text-xs text-slate-700 leading-normal">
                        This product appears to be a tool that helps people do something specific. The core offering is clear, but trust signals and proof points are limited.
                      </p>
                    </div>

                    {/* If you change only one thing */}
                    <div className="bg-white border border-[#E3EAF5] rounded-2xl p-3.5 shadow-2xs">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">If you change only one thing</span>
                      <p className="text-xs text-slate-800 font-medium">
                        Strengthen the trust behind your main claim.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: THE PROBLEM */}
              <section id="product" className="py-16 md:py-24 border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center mb-12">
                  <span className="text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                    THE PROBLEM
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-4 mb-4">
                    You know your product. <br />
                    Your visitors don{"'"}t.
                  </h2>
                  <p className="text-base sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                    You{"'"}ve spent hours building your product. But a new visitor sees only what{"'"}s on the page — and may miss what makes it valuable.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <div className="bg-[#F5F8FF] border border-[#E3EAF5] rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">WHAT YOU WANT TO SAY</span>
                      <h3 className="text-lg font-bold text-slate-950 mb-3">Your complete product vision</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        All your features, benefits, use cases, and nuanced positioning perfectly understood in context.
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs text-slate-500 font-medium">
                      Intended message
                    </div>
                  </div>

                  <div className="bg-white border border-[#E3EAF5] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xs">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#246BFD] block mb-2">WHAT VISITORS MIGHT UNDERSTAND</span>
                      <h3 className="text-lg font-bold text-slate-950 mb-3">First-time stranger impression</h3>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2"><span className="text-blue-600">?</span> What is this product?</li>
                        <li className="flex items-center gap-2"><span className="text-blue-600">?</span> Is this actually for me?</li>
                        <li className="flex items-center gap-2"><span className="text-blue-600">?</span> Why should I trust this?</li>
                        <li className="flex items-center gap-2"><span className="text-blue-600">?</span> What should I do next?</li>
                      </ul>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                      Actual 5-second reality
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: WHAT PERCEPT REVEALS */}
              <section className="py-16 md:py-24 border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center mb-12">
                  <span className="text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                    WHAT PERCEPT REVEALS
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-4 mb-4">
                    See your website from every important angle.
                  </h2>
                  <p className="text-base sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                    Percept analyses your website through five key signals to understand what a first-time visitor actually sees.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { title: "First Impression", question: "Is it clear and engaging?", icon: Eye },
                    { title: "Audience", question: "Is this for me?", icon: Users },
                    { title: "Value", question: "Why should I care?", icon: Sparkles },
                    { title: "Trust", question: "Why should I believe it?", icon: Shield },
                    { title: "Action", question: "What is the next step?", icon: ArrowRight },
                  ].map((card, idx) => {
                    const IconComponent = card.icon;
                    return (
                      <div key={idx} className="bg-white border border-[#E3EAF5] rounded-2xl p-5 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-colors">
                        <div>
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#246BFD] flex items-center justify-center mb-3">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-950 text-sm mb-1">{card.title}</h3>
                          <p className="text-xs text-slate-500">{card.question}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* SECTION: REAL PRODUCT PREVIEW */}
              <section className="py-16 md:py-24 border-t border-slate-100">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  <div className="lg:col-span-5">
                    <span className="text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      REAL PRODUCT PREVIEW
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-4 mb-4">
                      Not another generic website score.
                    </h2>
                    <p className="text-base text-[#526078] leading-relaxed mb-6 font-normal">
                      Get a clear, evidence-based diagnosis with specific findings and actionable recommendations based on what your website actually shows.
                    </p>
                    <button
                      onClick={scrollToInput}
                      className="rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white font-medium px-6 py-3 inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer text-sm"
                    >
                      <span>Try it free</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="lg:col-span-7 bg-[#F5F8FF] border border-[#E3EAF5] rounded-3xl p-6 shadow-lg">
                    <div className="bg-white border border-[#E3EAF5] rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">Results · example.com</span>
                        </div>
                        <span className="text-[11px] bg-slate-100 px-2.5 py-0.5 rounded text-slate-600">Checked just now</span>
                      </div>

                      <div className="flex items-center gap-4 mb-4 bg-slate-50 rounded-xl p-3">
                        <div className="text-2xl font-extrabold text-slate-900">67<span className="text-xs text-slate-400">/100</span></div>
                        <div>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Needs work</span>
                          <p className="text-xs text-slate-700 mt-1">The website clearly communicates its core offering, but value proposition, trust signals and a stronger call to action could improve first-time visitor confidence.</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-slate-700">
                        <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
                          <strong className="text-blue-900 block mb-0.5 font-semibold">What your website is actually saying:</strong>
                          This product appears to be a tool that helps people do something specific. The core offering is clear, but trust signals and proof points are limited.
                        </div>
                        <div className="p-2.5 bg-rose-50/60 rounded-lg border border-rose-100">
                          <strong className="text-rose-900 block mb-0.5 font-semibold">Risk found (Trust risk):</strong>
                          Limited visible proof for key claims.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: FROM DIAGNOSIS TO ACTION */}
              <section className="py-16 md:py-24 border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center mb-12">
                  <span className="text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                    FROM DIAGNOSIS TO ACTION
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-4 mb-4">
                    Know what to fix first.
                  </h2>
                  <p className="text-base sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                    Percept helps you go from confusion to clarity with an understanding of what works, what doesn{"'"}t, and what to improve.
                  </p>
                </div>

                <div id="how-it-works" className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {[
                    { step: "01", title: "Understand", desc: "See what your website communicates to visitors." },
                    { step: "02", title: "Discover", desc: "Find where clarity, value or trust breaks down." },
                    { step: "03", title: "Improve", desc: "Know which change deserves attention first." },
                  ].map((s, idx) => (
                    <div key={idx} className="bg-white border border-[#E3EAF5] rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#246BFD] bg-[#EAF2FF] px-2.5 py-1 rounded-md inline-block mb-4">{s.step}</span>
                        <h3 className="text-lg font-bold text-slate-950 mb-2">{s.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION: PRICING */}
              <section id="pricing" className="py-16 md:py-24 border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center mb-12">
                  <span className="text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                    PRICING
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-4 mb-4">
                    Simple, transparent pricing.
                  </h2>
                  <p className="text-base sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                    Start with a free preview. Upgrade anytime for a detailed, far deeper analysis and full recommendations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {PRICING_PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                        plan.popular
                          ? "bg-[#F5F8FF] border-2 border-[#246BFD] shadow-lg relative"
                          : "bg-white border border-[#E3EAF5] shadow-xs"
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#246BFD] text-white text-[10px] font-bold tracking-wider uppercase px-3 py-0.5 rounded-full shadow-xs">
                          Most popular
                        </span>
                      )}

                      <div>
                        <h3 className="font-bold text-slate-950 text-xl mb-1">{plan.name}</h3>
                        <p className="text-xs text-slate-500 mb-4">{plan.tagline}</p>

                        <div className="flex items-baseline gap-1 mb-6 pb-4 border-b border-slate-100">
                          <span className="text-4xl font-extrabold text-slate-950">${plan.price}</span>
                          <span className="text-xs text-slate-500">/{plan.period}</span>
                        </div>

                        <div className="space-y-3 mb-8 text-sm text-slate-700">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={scrollToInput}
                        className={`w-full py-3 px-4 rounded-full text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                          plan.popular
                            ? "bg-[#246BFD] hover:bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                        }`}
                      >
                        <span>{plan.cta}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION: FAQ */}
              <section className="py-16 md:py-24 border-t border-slate-100 max-w-3xl mx-auto px-4">
                <div className="text-center mb-12">
                  <span className="text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                    FAQ
                  </span>
                  <h2 className="text-3xl font-extrabold text-[#101828] tracking-tight mt-4">
                    Frequently asked questions
                  </h2>
                </div>

                <div className="space-y-4 divide-y divide-slate-100">
                  {FAQ_ITEMS.map((item, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className="pt-4 first:pt-0">
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between gap-4 text-left py-2 group cursor-pointer bg-transparent border-0"
                          aria-expanded={isOpen}
                        >
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base">
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
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
                              <p className="py-3 text-sm text-[#526078] leading-relaxed">
                                {item.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* FINAL CTA & FOOTER */}
              <section className="py-16 md:py-24 border-t border-slate-100 text-center">
                <div className="max-w-4xl mx-auto rounded-3xl bg-[#F5F8FF] border border-[#E3EAF5] p-10 md:p-16 mb-12 shadow-sm">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mb-4">
                    Your website deserves a second look.
                  </h2>
                  <p className="text-base text-[#526078] max-w-xl mx-auto mb-8 font-normal">
                    Understand what your website communicates before your next visitor does.
                  </p>
                  <button
                    onClick={scrollToInput}
                    className="rounded-full bg-[#246BFD] hover:bg-blue-600 text-white font-medium px-8 py-4 inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer text-base"
                  >
                    <span>Analyse your website</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <footer className="pt-8 pb-12 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#526078]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-bold">P</div>
                    <span className="font-bold text-slate-900">Percept</span>
                    <span>© {new Date().getFullYear()} Percept. All rights reserved.</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <a href="#product" className="hover:text-slate-900">Product</a>
                    <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
                    <a href="#pricing" className="hover:text-slate-900">Pricing</a>
                    <button onClick={() => { setActiveInfoModal("faq"); setOpenFaqIndex(0); }} className="hover:text-slate-900 bg-transparent border-0 p-0 text-xs text-[#526078]">FAQ</button>
                  </div>
                </footer>
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

      {/* FAQ MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "faq" && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
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
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[85vh] flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-950 text-xl tracking-tight">Frequently Asked Questions</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Everything you need to know about website intelligence.</p>
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
                  return (
                    <div key={idx} className="py-3.5 first:pt-2 last:pb-2">
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-3 text-left py-1 group cursor-pointer bg-transparent border-0"
                        aria-expanded={isOpen}
                      >
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base">
                          {item.question}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
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
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
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
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[85vh] flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-950 text-xl tracking-tight">Simple, Transparent Pricing</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Start with a free preview or get full reports.</p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  aria-label="Close Pricing"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-y-auto flex-1 pr-1 pb-1">
                {PRICING_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-5 flex flex-col justify-between ${
                      plan.popular
                        ? "bg-[#F5F8FF] border-2 border-[#246BFD] shadow-sm relative"
                        : "bg-white border border-[#E3EAF5]"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#246BFD] text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                        Most popular
                      </span>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-950 text-lg mb-1">{plan.name}</h4>
                      <p className="text-xs text-slate-500 mb-4">{plan.tagline}</p>
                      <div className="flex items-baseline gap-1 mb-4 pb-3 border-b border-slate-100">
                        <span className="text-3xl font-extrabold text-slate-950">${plan.price}</span>
                        <span className="text-xs text-slate-500">/{plan.period}</span>
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
                      onClick={scrollToInput}
                      className={`w-full py-2.5 px-4 rounded-full text-xs font-semibold transition-all inline-flex items-center justify-center gap-1 cursor-pointer ${
                        plan.popular
                          ? "bg-[#246BFD] hover:bg-blue-600 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      }`}
                    >
                      <span>{plan.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
