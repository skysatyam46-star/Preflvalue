"use client";

import React, { useEffect, useState } from "react";
import { Link2, ArrowRight, Check, X, Sparkles, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Stage {
  number: string;
  title: string;
  activeDescription: string;
  defaultDescription: string;
}

const STAGES: Stage[] = [
  {
    number: "01",
    title: "First impression",
    activeDescription: "Reading what visitors see first.",
    defaultDescription: "Reading what visitors see first.",
  },
  {
    number: "02",
    title: "Audience",
    activeDescription: "Figuring out who this appears to be for.",
    defaultDescription: "Identifying who this product appears to be for.",
  },
  {
    number: "03",
    title: "Value",
    activeDescription: "Checking if the benefit is obvious.",
    defaultDescription: "Checking whether the promised value is immediately clear.",
  },
  {
    number: "04",
    title: "Trust",
    activeDescription: "Looking for reasons a visitor would trust it.",
    defaultDescription: "Looking for evidence behind the promise.",
  },
  {
    number: "05",
    title: "Action",
    activeDescription: "Checking whether the next step feels natural.",
    defaultDescription: "Checking whether the next step is obvious.",
  },
];

interface ScanScreenProps {
  rawUrl: string;
  onBackToLanding: () => void;
  onOpenFaq: () => void;
  onOpenPricing: () => void;
  onGoToResults?: () => void;
  isBackendReady?: boolean;
  backendError?: string | null;
}

export default function ScanScreen({
  rawUrl,
  onBackToLanding,
  onOpenFaq,
  onOpenPricing,
  onGoToResults,
  isBackendReady = true,
  backendError = null,
}: ScanScreenProps) {
  // Extract clean domain dynamically from rawUrl
  const cleanDomain = React.useMemo(() => {
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

  // Current stage: 0 (stage 1 active), 1 (stage 2 active), ..., 4 (stage 5 active), 5 (all completed)
  const [activeStage, setActiveStage] = useState<number>(0);

  // Progressive timing for the 5 signals (01 First impression, 02 Audience, 03 Value, 04 Trust, 05 Action)
  // Total scan duration ~6.5 seconds for a realistic, responsive experience
  useEffect(() => {
    setActiveStage(0);

    const t1 = setTimeout(() => setActiveStage(1), 1200);
    const t2 = setTimeout(() => setActiveStage(2), 2400);
    const t3 = setTimeout(() => setActiveStage(3), 3600);
    const t4 = setTimeout(() => setActiveStage(4), 4800);
    const t5 = setTimeout(() => setActiveStage(5), 6000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [rawUrl]);

  const isCompleted = activeStage >= 5;
  const currentSignalCount = Math.min(5, Math.max(1, activeStage + 1));

  // Seamless transition: Once 5/5 signals complete and backend data is ready, transition directly to Results Screen.
  // Brief graceful transition delay (300ms) prevents abrupt flashing and feels completely natural.
  useEffect(() => {
    if (isCompleted && isBackendReady && !backendError && onGoToResults) {
      const timer = setTimeout(() => {
        onGoToResults();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, isBackendReady, backendError, onGoToResults]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col relative overflow-x-hidden">
      {/* 1. DEDICATED SCAN HEADER: Minimal & Focused (No FAQ, Pricing, or Check Website buttons) */}
      <header className="w-full bg-white border-b border-slate-100 sticky top-0 z-30 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-[60px] sm:h-16 flex items-center justify-between">
          <div className="flex items-center shrink-0">
            <button
              onClick={onBackToLanding}
              className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 hover:opacity-85 transition cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              title="Return to ValueCheck Home"
            >
              ValueCheck
            </button>
          </div>

          {/* Essential scan context: current website being analyzed */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs sm:text-[13px] text-slate-600 font-medium truncate max-w-[200px] sm:max-w-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <span className="truncate">{cleanDomain}</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN SCAN CONTENT CONTAINER */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 md:pt-10 pb-16 sm:pb-24 flex flex-col items-center">
        {/* Domain Badge Pill */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#f8fafc] border border-slate-200/80 shadow-2xs text-xs sm:text-[13px] text-slate-600"
        >
          <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-[240px] sm:max-w-xs">
            <strong className="font-semibold text-slate-950">{cleanDomain}</strong> · First-impression check
          </span>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl min-[390px]:text-4xl sm:text-[44px] md:text-5xl font-bold text-slate-950 tracking-tight text-center mt-5 sm:mt-7 leading-[1.08]"
        >
          Analyzing your website
        </motion.h1>

        {/* Supporting Copy */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mt-2.5 sm:mt-3.5 space-y-1"
        >
          <p className="text-slate-700 text-base sm:text-lg font-medium">
            Seeing your product like a first-time visitor.
          </p>
          <p className="text-slate-500 text-xs sm:text-sm font-normal max-w-md mx-auto leading-relaxed">
            We’re reading what a new visitor sees, understands, and misses.
          </p>
        </motion.div>

        {/* 3. FIVE-STAGE TIMELINE */}
        <div className="w-full mt-9 sm:mt-12">
          <div className="flex flex-col space-y-2.5 sm:space-y-3">
            {STAGES.map((stage, index) => {
              const isStageCompleted = activeStage > index;
              const isStageActive = activeStage === index;
              const isStagePending = activeStage < index;

              return (
                <div
                  key={stage.number}
                  className={`relative flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all duration-300 ${
                    isStageActive
                      ? "bg-[#f0f6ff]/75 border border-blue-100/70 shadow-2xs"
                      : "bg-transparent border border-transparent"
                  }`}
                >
                  {/* Left Column: Number Pill */}
                  <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-[13px] font-semibold transition-colors duration-300 ${
                        isStageCompleted || isStageActive
                          ? "bg-[#eff6ff] text-[#2563eb]"
                          : "bg-slate-100/80 text-slate-400"
                      }`}
                    >
                      {stage.number}
                    </div>
                  </div>

                  {/* Middle Column 1: Status Indicator with vertical connecting dashed lines */}
                  <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center relative">
                    {/* Top connecting line (from previous row to this circle) */}
                    {index > 0 && (
                      <div
                        className={`absolute -top-4 sm:-top-5 bottom-1/2 left-1/2 -translate-x-1/2 w-0 border-l border-dashed transition-colors duration-400 z-0 ${
                          activeStage >= index
                            ? "border-emerald-300"
                            : "border-slate-200"
                        }`}
                      />
                    )}

                    {/* Bottom connecting line (from this circle to next row) */}
                    {index < STAGES.length - 1 && (
                      <div
                        className={`absolute top-1/2 -bottom-4 sm:-bottom-5 left-1/2 -translate-x-1/2 w-0 border-l border-dashed transition-colors duration-400 z-0 ${
                          activeStage > index
                            ? "border-emerald-300"
                            : activeStage === index
                            ? "border-blue-200"
                            : "border-slate-200"
                        }`}
                      />
                    )}

                    {/* Circle Indicator Element */}
                    <div className="relative z-10 flex items-center justify-center">
                      {isStageCompleted ? (
                        // Green check circle
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center shadow-2xs"
                        >
                          <Check className="w-4 h-4 stroke-[2.6]" />
                        </motion.div>
                      ) : isStageActive ? (
                        // Blue circular indicator with subtle radiating breathing ring
                        <div className="relative flex items-center justify-center">
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0.15, 0.35] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1d68f5]"
                          />
                          <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-[#1d68f5] shadow-xs relative z-10" />
                        </div>
                      ) : (
                        // Soft gray circle
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#e2e8f0]" />
                      )}
                    </div>
                  </div>

                  {/* Middle Column 2: Stage Title & Description */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h3
                      className={`text-sm sm:text-base font-semibold tracking-tight transition-colors duration-200 ${
                        isStagePending ? "text-slate-700" : "text-slate-950"
                      }`}
                    >
                      {stage.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 leading-snug line-clamp-2 sm:line-clamp-none">
                      {isStageActive ? stage.activeDescription : stage.defaultDescription}
                    </p>
                  </div>

                  {/* Right Column: Semantic Status Pill */}
                  <div className="shrink-0 text-right">
                    {isStageCompleted ? (
                      <span className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-[#dcfce7] text-[#16a34a]">
                        UNDERSTOOD
                      </span>
                    ) : isStageActive ? (
                      <span className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-[#eff6ff] text-[#1d68f5]">
                        ANALYZING
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-[#f1f5f9] text-slate-400">
                        NEXT
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. PROGRESS BAR (X of 5 signals + 5 horizontal segments) */}
        <div className="mt-10 sm:mt-12 flex flex-col items-center">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 mb-2.5">
            {currentSignalCount} of 5 signals
          </span>

          {/* 5 Small Horizontal Segments */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[0, 1, 2, 3, 4].map((segIndex) => {
              const isFilled = isCompleted || activeStage >= segIndex;
              return (
                <div
                  key={segIndex}
                  className={`w-7 sm:w-9 h-1.5 rounded-full transition-colors duration-300 ${
                    isFilled ? "bg-[#1d68f5]" : "bg-slate-200"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* 5. SEAMLESS TRANSITION / ERROR FEEDBACK */}
        {/* If an error occurs, show honest error message and allow retry */}
        <AnimatePresence>
          {backendError && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-8 w-full max-w-lg bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center shadow-xs flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold tracking-wider uppercase mb-2">
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>CHECK FAILED</span>
              </div>
              <p className="text-xs sm:text-sm text-rose-700 mb-4 leading-relaxed max-w-sm">
                {backendError}
              </p>
              <button
                onClick={onBackToLanding}
                className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm px-6 py-2.5 transition shadow-xs cursor-pointer inline-flex items-center justify-center"
              >
                Go back & try another URL
              </button>
            </motion.div>
          )}

          {/* If 5/5 completed and waiting for backend response, show subtle inline indicator directly under progress */}
          {isCompleted && !isBackendReady && !backendError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="mt-5 inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1d68f5]" />
              <span>Connecting to diagnostic results...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
