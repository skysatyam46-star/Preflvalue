import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";
import { BRAND_NAME, LEGAL_CONFIG } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: `Terms of Service — ${BRAND_NAME}`,
  description:
    "Terms of Service governing the use of StrangerLens AI website first-impression reviews and one-time report purchases.",
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      activePage="terms"
      badge="TERMS OF SERVICE"
      title="Terms of Service"
      subtitle="Clear terms governing your use of StrangerLens free website previews, full 15-section diagnostic reports, and one-time report packs."
    >
      {/* 1. Agreement to Terms */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          1. Agreement to Terms
        </h2>
        {/* Founder Note: Insert registered business entity or sole proprietor legal name here prior to commercial publication if required by applicable jurisdiction. */}
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of{" "}
          <strong>{BRAND_NAME}</strong> (&ldquo;StrangerLens&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By accessing {BRAND_NAME}, running a website scan, or purchasing a report pack, you agree to be bound by these Terms.
        </p>
      </section>

      {/* 2. Description of Service */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          2. Description of the Service
        </h2>
        <p>
          {LEGAL_CONFIG.productName} is an AI-powered website first-impression and homepage communication analysis tool. When you submit a public website URL, our system fetches publicly accessible homepage HTML, extracts visible text and structural cues, and evaluates five core visitor signals: <strong>First Impression</strong>, <strong>Audience</strong>, <strong>Value</strong>, <strong>Trust</strong>, and <strong>Action</strong>.
        </p>
        <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 text-xs sm:text-sm text-[#526078] space-y-1.5">
          <p className="font-bold text-[#101828]">Scope of Analysis Notice:</p>
          <p>
            {LEGAL_CONFIG.productName} evaluates homepage messaging clarity based on extracted public HTML text. It is <strong>not</strong> a cybersecurity scanner, technical SEO crawler, PageSpeed performance benchmark, accessibility compliance certification, or human usability study.
          </p>
        </div>
      </section>

      {/* 3. Pricing, One-Time Purchases & Merchant of Record */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          3. Pricing, One-Time Report Packs &amp; Merchant of Record
        </h2>
        <p>
          {LEGAL_CONFIG.productName} offers a free diagnostic preview and optional one-time paid report unlocks with <strong>no recurring subscriptions</strong>:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {LEGAL_CONFIG.pricing.freeTier.name}
            </span>
            <p className="text-lg font-extrabold text-[#101828]">
              {LEGAL_CONFIG.pricing.freeTier.price}{" "}
              <span className="text-xs font-medium text-slate-500">· Free</span>
            </p>
            <p className="text-xs text-[#526078]">{LEGAL_CONFIG.pricing.freeTier.summary}</p>
          </div>

          <div className="bg-[#F5F8FF] border border-blue-200 rounded-2xl p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#246BFD]">
              {LEGAL_CONFIG.pricing.singleReport.name}
            </span>
            <p className="text-lg font-extrabold text-[#101828]">
              {LEGAL_CONFIG.pricing.singleReport.price}{" "}
              <span className="text-xs font-medium text-slate-500">· One-time</span>
            </p>
            <p className="text-xs text-[#526078]">{LEGAL_CONFIG.pricing.singleReport.summary}</p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {LEGAL_CONFIG.pricing.threeReportPack.name}
            </span>
            <p className="text-lg font-extrabold text-[#101828]">
              {LEGAL_CONFIG.pricing.threeReportPack.price}{" "}
              <span className="text-xs font-medium text-slate-500">· One-time</span>
            </p>
            <p className="text-xs text-[#526078]">{LEGAL_CONFIG.pricing.threeReportPack.summary}</p>
          </div>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 text-xs sm:text-sm text-[#526078] mt-3">
          <p className="font-bold text-[#101828] mb-1">
            Merchant of Record Disclosure ({LEGAL_CONFIG.merchantOfRecord.name}):
          </p>
          <p>{LEGAL_CONFIG.merchantOfRecord.disclosure}</p>
        </div>
      </section>

      {/* 4. Acceptable Use */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          4. Acceptable Use &amp; Rate Limits
        </h2>
        <p>When using {LEGAL_CONFIG.productName}, you agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#526078]">
          <li>Submit private, internal-network, or restricted URLs that you do not have permission to access.</li>
          <li>Attempt to bypass API rate limits, automated request protections, or security controls.</li>
          <li>Use automated bots or scripts to bulk-harvest analyses or overload our infrastructure.</li>
          <li>Misrepresent AI-generated communication suggestions as certified legal, financial, or security audits.</li>
        </ul>
      </section>

      {/* 5. Intellectual Property & Report Usage */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          5. Intellectual Property &amp; License to Use Reports
        </h2>
        <p>
          You retain all rights to the websites and content you submit for review. Upon generating a free preview or purchasing a full report, we grant you a worldwide, royalty-free, non-exclusive license to use, download, share internally or with clients, and implement any recommendations or copy-ready wording generated in your {LEGAL_CONFIG.productName} report.
        </p>
      </section>

      {/* 6. Refunds & Cancellations */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          6. Refunds &amp; Digital Product Policy
        </h2>
        <p>
          Because {LEGAL_CONFIG.productName} only offers one-time digital purchases (never recurring subscriptions), there is no recurring billing to cancel after purchase. Digital report purchases are generally final once delivered, and {LEGAL_CONFIG.productName} does not offer a separate voluntary money-back guarantee. Refunds remain subject to applicable consumer protection laws and Paddle&apos;s Refund Policy, as detailed in our{" "}
          <Link href="/refund-policy" className="font-semibold text-[#246BFD] hover:underline">
            Refund Policy
          </Link>
          .
        </p>
      </section>

      {/* 7. Disclaimer of Warranties & Limitation of Liability */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          7. Disclaimers &amp; Limitation of Liability
        </h2>
        <p>
          {LEGAL_CONFIG.productName} is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. While our pipeline validates extracted page evidence and uses deterministic scoring rules, AI-generated evaluations and copy suggestions are advisory only. We do not guarantee specific commercial outcomes, conversion rate increases, or uninterrupted availability of third-party websites being scanned.
        </p>
        <p>
          To the maximum extent permitted by applicable law, {BRAND_NAME}&apos;s total cumulative liability arising out of or relating to your use of {BRAND_NAME} shall not exceed the greater of (a) the total amount paid by you for {BRAND_NAME} reports in the twelve (12) months preceding the claim, or (b) $25 USD.
        </p>
      </section>

      {/* 8. Contact Information */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          8. Contact Us
        </h2>
        <p>
          Questions about these Terms can be sent to{" "}
          <a
            href={`mailto:${LEGAL_CONFIG.supportEmail}`}
            className="font-semibold text-[#246BFD] hover:underline"
          >
            {LEGAL_CONFIG.supportEmail}
          </a>{" "}
          or via our{" "}
          <Link href="/contact" className="font-semibold text-[#246BFD] hover:underline">
            Contact Support
          </Link>{" "}
          page.
        </p>
      </section>
    </LegalLayout>
  );
}
