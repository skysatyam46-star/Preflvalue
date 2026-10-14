import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";
import { BRAND_NAME, LEGAL_CONFIG } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND_NAME}`,
  description:
    "Learn how StrangerLens collects, processes, and protects information when you analyze a website or purchase a full report.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      activePage="privacy"
      badge="PRIVACY POLICY"
      title="Privacy Policy"
      subtitle="How StrangerLens handles website URLs, publicly accessible homepage content, local browser storage, and checkout information."
    >
      {/* 1. Overview & Scope */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          1. Overview &amp; Scope
        </h2>
        <p>
          This Privacy Policy explains how <strong>{BRAND_NAME}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, and safeguards information when you use our website first-impression analysis service, preview free diagnostic results, or purchase a paid report.
        </p>
        <p>
          We design {BRAND_NAME} around data minimization: you can run a free homepage first-impression review without creating an account, and we only process the data necessary to deliver your website analysis and fulfill report purchases.
        </p>
      </section>

      {/* 2. Information We Collect */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          2. Information We Collect and Process
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1.5">
            <h3 className="font-bold text-[#101828] text-sm">
              A. Website URLs &amp; Public Page Content
            </h3>
            <p className="text-xs sm:text-sm text-[#526078]">
              When you submit a URL for analysis, our servers verify reachability and fetch the publicly accessible HTML and visible text of that homepage (and, where enabled, a small number of public supporting pages) to generate your first-impression assessment.
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1.5">
            <h3 className="font-bold text-[#101828] text-sm">
              B. Email Address (Report Delivery &amp; Support)
            </h3>
            <p className="text-xs sm:text-sm text-[#526078]">
              When you unlock a paid report ($5 Full Report or $12 Three-Report Pack) or reach out to support, we collect your email address to deliver report access, order confirmations, receipts, and customer support responses.
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1.5">
            <h3 className="font-bold text-[#101828] text-sm">
              C. Payment &amp; Billing Information
            </h3>
            <p className="text-xs sm:text-sm text-[#526078]">
              All paid transactions are processed by our Merchant of Record,{" "}
              <strong>{LEGAL_CONFIG.merchantOfRecord.name}</strong>. We do <strong>not</strong> collect, inspect, or store credit card numbers, CVV codes, or raw payment credentials on {LEGAL_CONFIG.productName} servers.
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1.5">
            <h3 className="font-bold text-[#101828] text-sm">
              D. Technical Request &amp; Rate-Limit Metadata
            </h3>
            <p className="text-xs sm:text-sm text-[#526078]">
              To protect service reliability and prevent automated abuse, our API processes transient request metadata (such as IP address and request timestamps) for short-term rate limiting and security protection.
            </p>
          </div>
        </div>
      </section>

      {/* 3. How AI Analysis Processes Website Content */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          3. How AI Analysis Works
        </h2>
        <p>
          When you request a website review, {LEGAL_CONFIG.productName} extracts publicly visible text elements (such as page titles, meta descriptions, headings, body copy, navigation labels, and calls to action) from the submitted public URL. This extracted text is transmitted over encrypted HTTPS connections to our inference provider (such as Groq / LLM API providers) solely to generate structured communication scores, evidence citations, and wording recommendations.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#526078]">
          <li>We only analyze publicly reachable web pages; we do not bypass authentication, paywalls, or private intranet pages.</li>
          <li>Deterministic evidence validation and scoring rules run on our server to verify that quoted snippets match the extracted page text.</li>
        </ul>
      </section>

      {/* 4. Local Browser Storage */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          4. Local Browser Storage &amp; Cookies
        </h2>
        <p>
          {LEGAL_CONFIG.productName} uses your browser&apos;s local storage (<code>localStorage</code>) on your own device to power the <strong>Recheck &amp; Compare</strong> feature. This stores your baseline scan summary (domain name, scan timestamp, overall score, and five signal scores) locally in your browser so you can compare before-and-after results when you rescan your website.
        </p>
        <p className="text-xs sm:text-sm text-[#526078]">
          You can clear this local comparison history at any time by clearing your browser&apos;s site data for {LEGAL_CONFIG.productName}. During checkout, our Merchant of Record ({LEGAL_CONFIG.merchantOfRecord.name}) may use essential checkout cookies required for fraud prevention, tax calculation, and payment session completion.
        </p>
      </section>

      {/* 5. Third-Party Service Providers */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          5. Third-Party Service Providers &amp; Subprocessors
        </h2>
        <p>
          We do not sell or rent your personal information to third parties. We share limited data only with essential infrastructure partners required to operate the service:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#526078]">
          <li>
            <strong>Payment Processing &amp; Merchant of Record ({LEGAL_CONFIG.merchantOfRecord.name}):</strong> Processes checkout payments, tax/VAT compliance, invoicing, and payment receipts.
          </li>
          <li>
            <strong>AI Inference Providers:</strong> Processes extracted public website text to return structured first-impression evaluations.
          </li>
          <li>
            <strong>Cloud Hosting Infrastructure:</strong> Hosts our Next.js web application and API endpoints.
          </li>
        </ul>
      </section>

      {/* 6. Data Retention & Your Rights */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          6. Data Retention &amp; Your Privacy Rights
        </h2>
        <p>
          Rate-limiting logs are kept transiently in memory to prevent abuse. Order and tax records associated with paid report purchases are retained as required by applicable tax and accounting laws. Depending on your jurisdiction (including GDPR, UK GDPR, and CCPA), you have the right to request access to, correction of, or deletion of personal data associated with your email address.
        </p>
        <p>
          To exercise any privacy right or ask a question about data handling, email us at{" "}
          <a
            href={`mailto:${LEGAL_CONFIG.supportEmail}`}
            className="font-semibold text-[#246BFD] hover:underline"
          >
            {LEGAL_CONFIG.supportEmail}
          </a>{" "}
          or visit our{" "}
          <Link href="/contact" className="font-semibold text-[#246BFD] hover:underline">
            Contact Support
          </Link>{" "}
          page.
        </p>
      </section>
    </LegalLayout>
  );
}
