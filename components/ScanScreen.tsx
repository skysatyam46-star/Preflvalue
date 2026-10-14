"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, RotateCcw, ArrowLeft, Aperture } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

interface ScanScreenProps {
  rawUrl: string;
  onBackToLanding: () => void;
  onCancel?: () => void;
  onOpenFaq?: () => void;
  onOpenPricing?: () => void;
  onGoToResults?: () => void;
  onRetry?: () => void;
  isBackendReady?: boolean;
  isScanning?: boolean;
  backendError?: string | null;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SCAN_FOCUS_MESSAGES = [
  "Understanding your website's message",
  "Evaluating clarity and value",
  "Reviewing trust and next steps",
  "Connecting findings to page evidence",
] as const;

const FOCUS_ROTATION_INTERVAL_MS = 3400;

/**
 * Ensures error messages shown to the user remain concise, understandable,
 * and never expose raw stack traces, API keys, or internal server diagnostics.
 */
function formatSafeErrorMessage(rawError: string | null | undefined): string {
  if (!rawError || typeof rawError !== "string") {
    return "We couldn’t complete the analysis for this website. Please verify the URL and try again.";
  }

  const trimmed = rawError.trim();
  if (!trimmed) {
    return "We couldn’t complete the analysis for this website. Please verify the URL and try again.";
  }

  // Guard against accidental stack traces, raw JSON dumps, or internal key references
  const hasInternalLeak =
    trimmed.includes("\n    at ") ||
    trimmed.includes("SyntaxError") ||
    trimmed.includes("TypeError") ||
    trimmed.includes("API_KEY") ||
    trimmed.includes("Bearer ") ||
    trimmed.startsWith("{") ||
    trimmed.length > 220;

  if (hasInternalLeak) {
    return "Analysis is temporarily unavailable or the website could not be read. Please try again in a moment.";
  }

  return trimmed;
}

export default function ScanScreen({
  rawUrl,
  onBackToLanding,
  onCancel,
  onGoToResults,
  onRetry,
  isBackendReady = false,
  backendError = null,
}: ScanScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasTransitionedRef = useRef(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const hasError = Boolean(backendError);
  const isActivelyScanning = !hasError && !isBackendReady;
  const handleCancel = onCancel || onBackToLanding;

  // Extract clean hostname dynamically from the actual analysis input
  const cleanDomain = useMemo(() => {
    const cleaned = rawUrl.trim();
    if (!cleaned) return "";
    try {
      const withProtocol = /^https?:\/\//i.test(cleaned)
        ? cleaned
        : `https://${cleaned}`;
      const parsed = new URL(withProtocol);
      return parsed.hostname.replace(/^www\./i, "") || cleaned;
    } catch {
      return (
        cleaned
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .split("/")[0]
          .split("?")[0] || cleaned
      );
    }
  }, [rawUrl]);

  // Reset transition guard when a new URL scan starts
  useEffect(() => {
    hasTransitionedRef.current = false;
  }, [rawUrl, isBackendReady, backendError]);

  // Rotate explanatory focus messages every 3.4s while actively scanning; clear on unmount, error, or completion
  useEffect(() => {
    if (!isActivelyScanning || shouldReduceMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setFocusIndex((prev) => (prev + 1) % SCAN_FOCUS_MESSAGES.length);
    }, FOCUS_ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isActivelyScanning, shouldReduceMotion, rawUrl]);

  // Show Results immediately after valid response (no artificial delays)
  useEffect(() => {
    if (
      isBackendReady &&
      !backendError &&
      onGoToResults &&
      !hasTransitionedRef.current
    ) {
      hasTransitionedRef.current = true;
      onGoToResults();
    }
  }, [isBackendReady, backendError, onGoToResults]);

  const safeErrorMessage = useMemo(
    () => (hasError ? formatSafeErrorMessage(backendError) : null),
    [hasError, backendError]
  );

  const handleRetryAction = () => {
    setFocusIndex(0);
    if (onRetry) {
      onRetry();
    } else {
      onBackToLanding();
    }
  };

  return (
    <div className="min-h-dvh bg-[#FAFAFA] text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between overflow-x-hidden">
      {/* HEADER: StrangerLens (left) & Cancel (right) */}
      <header className="w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-md shrink-0">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 h-[60px] sm:h-[68px] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer bg-transparent border-0 p-0 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] rounded-lg"
            aria-label="Return to StrangerLens home"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-xs sm:text-sm tracking-tighter shadow-xs shrink-0 transition-transform duration-200 group-hover:scale-[1.03]">
              S
            </div>
            <span className="text-base sm:text-xl font-bold tracking-tight text-slate-950 truncate">
              StrangerLens
            </span>
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-950 px-3.5 py-1.5 rounded-full hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD]"
          >
            Cancel
          </button>
        </div>
      </header>

      {/* CENTERED MINIMAL SCANNING LAYOUT (max-width 520px on desktop, compact on mobile) */}
      <main className="flex-1 w-full max-w-[520px] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center text-center min-w-0">
        {/* 1. ANIMATED AI LENS (~100px mobile, ~116px desktop) */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="relative w-[100px] h-[100px] sm:w-[116px] sm:h-[116px] flex items-center justify-center mb-7 sm:mb-8 shrink-0"
          aria-hidden="true"
        >
          {/* Very subtle soft blue ambient glow */}
          <div
            className={`absolute inset-2 rounded-full blur-xl transition-opacity duration-500 ${
              hasError
                ? "bg-rose-500/[0.08]"
                : "bg-[#246BFD]/[0.11]"
            }`}
          />

          {/* Concentric Ring 1 (Outer ring with gentle breathing pulse) */}
          <motion.div
            className={`absolute inset-0 rounded-full border ${
              hasError
                ? "border-rose-200/80 bg-rose-50/20"
                : "border-[#246BFD]/18 bg-[#246BFD]/[0.02]"
            }`}
            animate={
              isActivelyScanning && !shouldReduceMotion
                ? { scale: [1, 1.06, 1], opacity: [0.75, 0.35, 0.75] }
                : { scale: 1, opacity: 0.75 }
            }
            transition={
              isActivelyScanning && !shouldReduceMotion
                ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
          />

          {/* Concentric Ring 2 (Middle structural optical ring) */}
          <div
            className={`absolute inset-[13px] sm:inset-[15px] rounded-full border ${
              hasError
                ? "border-rose-200/90 bg-white/80"
                : "border-[#246BFD]/22 bg-white/75 shadow-[0_4px_24px_-4px_rgba(36,107,253,0.14)]"
            }`}
          />

          {/* Smoothly moving blue scanning arc */}
          {isActivelyScanning && !shouldReduceMotion && (
            <motion.div
              className="absolute inset-[6px] sm:inset-[7px] rounded-full border-[2px] border-transparent border-t-[#246BFD] border-r-[#246BFD]/40"
              animate={{ rotate: 360 }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}

          {/* Central Optical Lens Core */}
          <motion.div
            animate={
              isActivelyScanning && !shouldReduceMotion
                ? { scale: [1, 1.03, 1] }
                : { scale: 1 }
            }
            transition={
              isActivelyScanning && !shouldReduceMotion
                ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
            className={`relative w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center border shadow-xs ${
              hasError
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "bg-gradient-to-b from-white via-[#F5F9FF] to-[#EBF3FF] border-[#246BFD]/30 text-[#246BFD] shadow-[0_0_20px_-4px_rgba(36,107,253,0.28)]"
            }`}
          >
            {hasError ? (
              <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#246BFD]/[0.09] border border-[#246BFD]/25 flex items-center justify-center">
                <Aperture className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-[#246BFD] stroke-[1.9]" />
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* HEADING */}
        <motion.h1
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight leading-[1.2] max-w-full"
        >
          Analyzing your website
        </motion.h1>

        {/* DESCRIPTION */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04, ease: EASE_OUT_EXPO }}
          className="mt-2.5 sm:mt-3 text-sm sm:text-base text-[#526078] font-normal leading-relaxed max-w-[440px]"
        >
          Checking how clearly your website communicates its purpose, value, and next steps.
        </motion.p>

        {/* DOMAIN: Show the actual submitted website domain */}
        {cleanDomain && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: EASE_OUT_EXPO }}
            className="mt-4 sm:mt-5 max-w-full px-3.5 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs"
          >
            <p
              className="text-xs sm:text-sm font-semibold text-slate-700 truncate max-w-[250px] min-[375px]:max-w-[300px] sm:max-w-[420px]"
              title={cleanDomain}
            >
              {cleanDomain}
            </p>
          </motion.div>
        )}

        {/* 3. PROGRESS BAR: Thin blue progress bar with smooth continuous light trail */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT_EXPO }}
          className="w-full max-w-[260px] sm:max-w-[320px] h-[3px] bg-slate-200/80 relative overflow-hidden mt-6 sm:mt-7 rounded-full"
          role="progressbar"
          aria-label="Analysis in progress"
          aria-busy={isActivelyScanning}
        >
          {hasError ? (
            <div className="w-full h-full bg-rose-500/80 rounded-full" />
          ) : shouldReduceMotion || isBackendReady ? (
            <div className="w-full h-full bg-[#246BFD] rounded-full" />
          ) : (
            <motion.div
              className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[#60A5FA]/70 to-[#246BFD] rounded-full shadow-[0_0_8px_rgba(36,107,253,0.45)]"
              initial={{ x: "-100%" }}
              animate={{ x: "220%" }}
              transition={{
                duration: 1.75,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </motion.div>

        {/* 2. DYNAMIC CHANGING FOCUS TEXT + FIXED LOADING INDICATOR */}
        {/* Single polite screen-reader status to avoid repeated announcements on decorative text rotation */}
        <span className="sr-only" role="status" aria-live="polite">
          {hasError ? "Check failed" : "Analysis in progress"}
        </span>

        <div
          className="mt-3.5 min-h-[28px] sm:min-h-[30px] w-full flex items-center justify-center px-2"
          aria-hidden="true"
        >
          {hasError ? (
            <p className="text-xs sm:text-sm font-semibold tracking-wide text-rose-700 uppercase">
              CHECK FAILED
            </p>
          ) : (
            <div className="inline-flex items-center justify-center gap-2 max-w-full">
              {/* Small fixed loading indicator so users know analysis is actively running */}
              <span className="relative flex h-2 w-2 shrink-0">
                {!shouldReduceMotion && isActivelyScanning && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#246BFD] opacity-45" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#246BFD]" />
              </span>

              <div className="relative flex items-center justify-center min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={focusIndex}
                    initial={
                      shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 5 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      shouldReduceMotion ? { opacity: 0, y: 0 } : { opacity: 0, y: -5 }
                    }
                    transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                    className="text-xs sm:text-sm font-semibold text-[#246BFD] tracking-wide leading-snug"
                  >
                    {SCAN_FOCUS_MESSAGES[focusIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Existing error & retry behavior preserved when backendError occurs */}
        <AnimatePresence>
          {hasError && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
              className="w-full mt-5 pt-4 border-t border-rose-100"
            >
              <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl mb-3.5 text-left">
                <p className="text-xs text-rose-700 leading-relaxed font-medium">
                  {safeErrorMessage}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryAction}
                  className="flex-1 min-w-[120px] rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white font-semibold text-xs py-2.5 px-4 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD]"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Try again</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium text-xs py-2.5 px-4 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Change URL</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Balanced bottom spacer to maintain optical vertical centering across mobile & desktop */}
      <div className="h-6 sm:h-10 shrink-0" aria-hidden="true" />
    </div>
  );
}


