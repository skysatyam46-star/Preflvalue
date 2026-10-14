"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  Check,
  ArrowRight,
  Shield,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Mail,
  Zap,
} from "lucide-react";
import { PaymentPlanId } from "@/types/payment";
import { LOCKED_SECTION_NAMES } from "@/lib/storage/sanitizer";

interface PaywallCardProps {
  reportId?: string;
  accessToken?: string;
  domain?: string;
  onUnlockSuccess: (unlockedData: any) => void;
}

declare global {
  interface Window {
    Paddle?: any;
  }
}

export default function PaywallCard({
  reportId,
  accessToken,
  domain,
  onUnlockSuccess,
}: PaywallCardProps) {
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlanId>("ONE_FULL_REPORT");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Credit redemption & recovery states
  const [existingCredits, setExistingCredits] = useState<number | null>(null);
  const [isRedeemingCredit, setIsRedeemingCredit] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Poll report status after checkout completion
  const handleCheckoutCompleted = React.useCallback(async () => {
    if (!reportId) return;
    setIsConfirming(true);
    setStatusNotice("Payment received. Confirming your access...");

    let attempts = 0;
    const maxAttempts = 12; // 24 seconds max polling
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/reports/${reportId}?token=${accessToken || ""}`);
        const data = await res.json();
        if (res.ok && data.success && data.isUnlocked && data.analysis) {
          clearInterval(interval);
          setIsConfirming(false);
          setIsLoading(false);
          onUnlockSuccess(data.analysis);
          return;
        }
      } catch (err) {
        // Continue polling
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setIsConfirming(false);
        setIsLoading(false);
        setStatusNotice(
          "Payment processing. If your report does not unlock automatically within a minute, refresh the page or contact support."
        );
      }
    }, 2000);
  }, [reportId, accessToken, onUnlockSuccess]);

  // Initialize Paddle.js if script is loaded
  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox";

    if (typeof window !== "undefined" && window.Paddle && clientToken) {
      try {
        if (paddleEnv === "sandbox" && window.Paddle.Environment?.set) {
          window.Paddle.Environment.set("sandbox");
        }
        window.Paddle.Initialize({
          token: clientToken,
          eventCallback: (data: any) => {
            if (data?.name === "checkout.completed") {
              handleCheckoutCompleted();
            }
          },
        });
      } catch (e) {
        console.warn("Paddle.Initialize error:", e);
      }
    }
  }, [handleCheckoutCompleted]);

  const handleStartCheckout = async (planOverride?: PaymentPlanId) => {
    const plan = planOverride || selectedPlan;
    if (!reportId) {
      setErrorMessage("No report identifier found. Please run a website scan first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusNotice(null);

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          accessToken,
          planId: plan,
          customerEmail: customerEmail.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === "PAYMENT_UNCONFIGURED") {
          setErrorMessage(
            "Paddle checkout is awaiting live merchant credentials. Missing environment variables: " +
              (data.missingVars?.join(", ") || "API credentials") +
              ". Live billing will activate once configured."
          );
        } else {
          setErrorMessage(data.message || "Failed to initiate checkout. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      // Check if report is already unlocked
      if (data.alreadyUnlocked) {
        handleCheckoutCompleted();
        return;
      }

      // Check if user has existing credits
      if (data.hasCreditsAvailable) {
        setExistingCredits(data.creditsRemaining);
        setStatusNotice(data.message);
        setIsLoading(false);
        return;
      }

      // If Paddle.js is present and initialized, open overlay
      if (typeof window !== "undefined" && window.Paddle?.Checkout?.open && data.paddle?.priceId) {
        window.Paddle.Checkout.open({
          settings: {
            displayMode: "overlay",
            theme: "light",
            locale: "en",
          },
          items: [
            {
              priceId: data.paddle.priceId,
              quantity: 1,
            },
          ],
          customData: data.paddle.customData,
          customer: customerEmail.trim() ? { email: customerEmail.trim() } : undefined,
        });
        setIsLoading(false);
      } else {
        // Paddle overlay is not loaded or credentials not injected
        setErrorMessage(
          "Paddle Checkout Overlay requires NEXT_PUBLIC_PADDLE_CLIENT_TOKEN and active price configuration. Please check the setup instructions."
        );
        setIsLoading(false);
      }
    } catch (err: unknown) {
      console.error("Checkout creation error:", err);
      setErrorMessage("A network error occurred while connecting to payment service.");
      setIsLoading(false);
    }
  };

  const handleUnlockWithCredit = async () => {
    if (!reportId || !customerEmail.trim()) {
      setErrorMessage("Please provide your email address to verify report credits.");
      return;
    }

    setIsRedeemingCredit(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/reports/unlock-with-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          email: customerEmail.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.analysis) {
        onUnlockSuccess(data.analysis);
      } else {
        setErrorMessage(data.message || "Failed to unlock report with credit.");
      }
    } catch (err) {
      setErrorMessage("Network error redeeming report credit.");
    } finally {
      setIsRedeemingCredit(false);
    }
  };

  const handleAccountRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setIsRecovering(true);
    setRecoveryMessage(null);

    try {
      const res = await fetch("/api/reports/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.found) {
          setRecoveryMessage(
            `Found account: ${data.creditsRemaining} remaining credit(s) and ${data.unlockedReportsCount} unlocked report(s). ${data.message}`
          );
          if (data.creditsRemaining > 0) {
            setExistingCredits(data.creditsRemaining);
            setCustomerEmail(recoveryEmail.trim());
          }
        } else {
          setRecoveryMessage("No past purchases found for this email address.");
        }
      } else {
        setRecoveryMessage(data.message || "Unable to recover account at this time.");
      }
    } catch {
      setRecoveryMessage("Network error during account recovery.");
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div id="results-paywall-container" className="my-8 sm:my-12">
      {/* PRIMARY PAYWALL CARD */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-10">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>Complete Website Diagnosis</span>
          </div>

          {/* Headline & Supporting Text */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            Unlock Your Complete Website Report
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
            You&apos;ve seen your biggest clarity issue. Get the full improvement plan, copy-ready
            recommendations, and deeper insights.
          </p>

          {/* Existing Credits Notice */}
          {existingCredits !== null && existingCredits > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  You have {existingCredits} report credit{existingCredits > 1 ? "s" : ""} available!
                </p>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  Unlock this report immediately using your existing credit balance.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUnlockWithCredit}
                disabled={isRedeemingCredit}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {isRedeemingCredit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    Unlock with 1 Credit <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Plan Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-8 max-w-2xl mx-auto">
            {/* Plan 1: One Full Report ($5) */}
            <div
              onClick={() => setSelectedPlan("ONE_FULL_REPORT")}
              className={`relative p-5 rounded-2xl border transition-all cursor-pointer ${
                selectedPlan === "ONE_FULL_REPORT"
                  ? "bg-slate-800/90 border-blue-500 shadow-lg ring-2 ring-blue-500/20"
                  : "bg-slate-850/60 border-slate-700/80 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Full Report
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/20 text-blue-300">
                  Popular
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-3xl font-extrabold text-white">$5</span>
                <span className="text-xs text-slate-400">· One-time payment</span>
              </div>
              <p className="text-xs text-slate-300 leading-normal">
                Unlocks this full report. Consumes 1 report credit.
              </p>
            </div>

            {/* Plan 2: 3 Full Reports ($12) */}
            <div
              onClick={() => setSelectedPlan("THREE_REPORT_PACK")}
              className={`relative p-5 rounded-2xl border transition-all cursor-pointer ${
                selectedPlan === "THREE_REPORT_PACK"
                  ? "bg-slate-800/90 border-blue-500 shadow-lg ring-2 ring-blue-500/20"
                  : "bg-slate-850/60 border-slate-700/80 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  3 Full Reports
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300">
                  Best Value
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-3xl font-extrabold text-white">$12</span>
                <span className="text-xs text-slate-400">· One-time ($4/report)</span>
              </div>
              <p className="text-xs text-slate-300 leading-normal">
                Unlocks this report and leaves 2 credits for future websites.
              </p>
            </div>
          </div>

          {/* Value Benefits List */}
          <div className="bg-slate-900/60 rounded-2xl p-5 mb-8 border border-slate-800 text-left max-w-2xl mx-auto">
            <p className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-3">
              Included in your full report:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                "Complete prioritized improvement plan",
                "Copy-ready website improvements",
                "Detailed five-signal analysis",
                "Supporting-page insights when available",
                "Communication risks",
                "Complete evidence and recommendations",
              ].map((benefit, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Email input for receipt & accountless recovery */}
          <div className="max-w-md mx-auto mb-5">
            <label
              htmlFor="checkout-email"
              className="block text-left text-xs font-medium text-slate-300 mb-1.5"
            >
              Receipt email (for credit recovery &amp; receipt):
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="checkout-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="your.email@company.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Actions & CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-4">
            <button
              type="button"
              onClick={() => handleStartCheckout("ONE_FULL_REPORT")}
              disabled={isLoading || isConfirming}
              className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                selectedPlan === "ONE_FULL_REPORT"
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 ring-2 ring-blue-400/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              {isLoading && selectedPlan === "ONE_FULL_REPORT" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Unlock Full Report — $5 →
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleStartCheckout("THREE_REPORT_PACK")}
              disabled={isLoading || isConfirming}
              className={`w-full py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                selectedPlan === "THREE_REPORT_PACK"
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 ring-2 ring-blue-400/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              {isLoading && selectedPlan === "THREE_REPORT_PACK" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Get 3 Full Reports for $12 →
                </>
              )}
            </button>
          </div>

          {/* Confirmation indicator */}
          {isConfirming && (
            <div className="my-4 p-3 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-200 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>{statusNotice || "Payment received. Confirming your access..."}</span>
            </div>
          )}

          {/* Feedback & Error Banner */}
          {errorMessage && (
            <div className="my-4 p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Trust Line & Recovery Link */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              One-time payment · No subscription
            </span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <button
              type="button"
              onClick={() => setShowRecoveryModal(true)}
              className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
            >
              Already purchased? Restore access
            </button>
          </div>
        </div>
      </div>

      {/* ACCOUNTLESS RECOVERY MODAL */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-white shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Restore Report Access</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Enter the email address used during your Paddle purchase to locate your report credits
              and unlocked analyses.
            </p>
            <form onSubmit={handleAccountRecovery}>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="purchaser@example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 mb-4"
              />
              {recoveryMessage && (
                <div className="mb-4 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200">
                  {recoveryMessage}
                </div>
              )}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5"
                >
                  {isRecovering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...
                    </>
                  ) : (
                    "Restore Access"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPACT LOCKED SECTIONS TEASER GRID (Below Paywall) */}
      <div className="mt-8 pt-6 border-t border-slate-200/80">
        <div className="text-center mb-6">
          <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            PREMIUM SECTIONS LOCKED
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-2">
            9 in-depth sections ready to unlock
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Full diagnostic findings are withheld from this free preview until unlocked.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {LOCKED_SECTION_NAMES.map((secName, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 flex items-start gap-3 opacity-80 select-none"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{secName}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Available in Full Report
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
