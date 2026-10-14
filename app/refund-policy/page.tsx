import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";
import { BRAND_NAME, LEGAL_CONFIG } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: `Refund Policy — ${BRAND_NAME}`,
  description:
    "Refund Policy for StrangerLens one-time digital report purchases ($5 Full Report and $12 3-Report Pack), statutory consumer rights, and Paddle Merchant of Record refund terms.",
};

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      activePage="refund"
      badge="REFUND POLICY"
      title="Refund Policy"
      subtitle="Clear refund terms for StrangerLens one-time digital report purchases, technical delivery issues, statutory consumer rights, and Paddle Merchant of Record support."
    >
      {/* Summary Callout */}
      <section className="bg-[#F5F8FF] border border-blue-200/80 rounded-2xl p-5 space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#246BFD] block">
          ONE-TIME DIGITAL PURCHASES · NO SUBSCRIPTIONS
        </span>
        <h2 className="text-base sm:text-lg font-extrabold text-[#101828]">
          Policy Summary
        </h2>
        <p className="text-xs sm:text-sm text-[#526078] leading-relaxed">
          Digital report purchases are generally final once delivered. {LEGAL_CONFIG.productName} does not offer a separate voluntary money-back guarantee. Refunds remain subject to applicable consumer protection laws and Paddle&apos;s Refund Policy.
        </p>
      </section>

      {/* 1. Digital Product Purchases */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          1. Digital Product Purchases
        </h2>
        <p>
          All paid offerings on <strong>{LEGAL_CONFIG.productName}</strong> — the{" "}
          <strong>$5 Full Report</strong> and the <strong>$12 3-Report Pack</strong> — are one-time digital product purchases with no recurring subscriptions or automatic renewals.
        </p>
        <p>
          Before purchasing any paid report, you can run a <strong>Free Preview ($0)</strong> to see your overall first-impression score, short main verdict, five signal scores, biggest issue with evidence, and #1 priority fix at no cost.
        </p>
      </section>

      {/* 2. General Refund Approach */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          2. General Refund Approach
        </h2>
        <p>
          Because {LEGAL_CONFIG.productName} reports are on-demand digital diagnostic products delivered immediately upon unlock, digital report purchases are generally final once delivered. {LEGAL_CONFIG.productName} does not offer a separate voluntary money-back guarantee or satisfaction-based trial period.
        </p>
        <p>
          All refund requests are evaluated in accordance with applicable consumer protection laws and the refund policies of our Merchant of Record, <strong>{LEGAL_CONFIG.merchantOfRecord.name}</strong>.
        </p>
      </section>

      {/* 3. Failed Delivery or Technical Issues */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          3. Failed Delivery or Technical Issues
        </h2>
        <p>
          If you experience a technical delivery problem — such as a paid report failing to unlock after payment confirmation, a report failing to generate due to a technical system error, or inability to access your purchased report credits — please contact our support team at{" "}
          <a
            href={`mailto:${LEGAL_CONFIG.supportEmail}?subject=StrangerLens%20Technical%20Delivery%20Issue`}
            className="font-semibold text-[#246BFD] hover:underline"
          >
            {LEGAL_CONFIG.supportEmail}
          </a>
          .
        </p>
        <p>
          Please include the email address used at checkout, the website URL analyzed, and your {LEGAL_CONFIG.merchantOfRecord.name} order reference so we can investigate the delivery issue or assist with a resolution.
        </p>
      </section>

      {/* 4. Duplicate or Incorrect Charges */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          4. Duplicate or Incorrect Charges
        </h2>
        <p>
          If you believe you were charged more than once for the same order or experienced an accidental duplicate transaction, please contact us or reach out through your {LEGAL_CONFIG.merchantOfRecord.name} receipt with your transaction details so the charge can be reviewed.
        </p>
      </section>

      {/* 5. Statutory Consumer Rights */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          5. Statutory Consumer Rights
        </h2>
        <p>
          Nothing in this Refund Policy waives, limits, or excludes any mandatory statutory consumer protection or cancellation rights that apply to you under the laws of your jurisdiction (including applicable EU, EEA, UK, or local consumer protection regulations).
        </p>
      </section>

      {/* 6. Paddle Refund Requests */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          6. Paddle Refund Requests
        </h2>
        <p>
          {LEGAL_CONFIG.merchantOfRecord.disclosure}
        </p>
        <p>
          Eligible refund requests are handled by <strong>{LEGAL_CONFIG.merchantOfRecord.name}</strong> in accordance with Paddle&apos;s buyer terms and refund rules. You can review Paddle&apos;s official policies or contact Paddle buyer support directly at the links below:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#526078]">
          <li>
            <strong>Paddle Refund Policy:</strong>{" "}
            <a
              href="https://www.paddle.com/legal/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#246BFD] hover:underline"
            >
              https://www.paddle.com/legal/refund-policy
            </a>
          </li>
          <li>
            <strong>Paddle Checkout Buyer Terms:</strong>{" "}
            <a
              href="https://www.paddle.com/legal/buyer-terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#246BFD] hover:underline"
            >
              https://www.paddle.com/legal/buyer-terms
            </a>
          </li>
          <li>
            <strong>Paddle Buyer Support &amp; Order Lookup:</strong>{" "}
            <a
              href="https://paddle.net"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#246BFD] hover:underline"
            >
              https://paddle.net
            </a>
          </li>
        </ul>
      </section>

      {/* 7. Customer Support */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          7. Customer Support
        </h2>
        <p>
          If you need help with a report delivery issue, billing receipt, or order question, please visit our{" "}
          <Link href="/contact" className="font-semibold text-[#246BFD] hover:underline">
            Contact Support
          </Link>{" "}
          page or email us directly at{" "}
          <a
            href={`mailto:${LEGAL_CONFIG.supportEmail}`}
            className="font-semibold text-[#246BFD] hover:underline"
          >
            {LEGAL_CONFIG.supportEmail}
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
