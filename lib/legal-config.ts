export const BRAND_NAME = "StrangerLens";

export const LEGAL_CONFIG = {
  brandName: BRAND_NAME,
  productName: BRAND_NAME,
  tagline: "AI-Powered Website First-Impression & Homepage Communication Analyzer",
  // Founder Completion Note: If formal operator legal identity or physical address disclosure is required in your jurisdiction prior to commercial publication, complete that disclosure before enabling live checkout.
  supportEmail: "hello.skyorigin@gmail.com",
  billingSupportNote:
    "For order receipts, VAT/sales tax invoices, or payment inquiries, include the email address used at checkout and your order reference.",
  supportResponseWindow: "Within 24–48 business hours (Monday–Friday)",
  effectiveDate: "October 12, 2026",
  lastUpdated: "October 12, 2026",
  pricing: {
    freeTier: {
      name: "Free Preview",
      price: "$0",
      billingType: "Free (No account or card required)",
      summary:
        "Discover what's unclear. Includes overall first-impression score, short main verdict, five signal scores, biggest issue with evidence, and your #1 priority fix.",
    },
    singleReport: {
      name: "Full Report",
      price: "$5 USD",
      billingType: "One-time payment · No subscription",
      summary:
        "Know exactly what to change. Includes everything in Free Preview, prioritized 1-2-3 fix plan, copy-ready website rewrites, detailed five-signal analysis, complete homepage evidence, supporting-page insights when available, and communication risks and recommendations.",
    },
    threeReportPack: {
      name: "3-Report Pack",
      price: "$12 USD",
      billingType: "One-time payment · No subscription ($4 per report · Save $3)",
      summary:
        "Improve more. Check again. Includes 3 complete Full Reports, all premium insights per report, and copy-ready recommendations for multiple websites or before/after evaluations (unlocking from an existing free preview uses 1 credit for the current report, leaving 2 report credits).",
    },
  },
  refundPolicySummary:
    "Digital report purchases are generally final once delivered. StrangerLens does not offer a separate voluntary money-back guarantee. Refunds remain subject to applicable consumer protection laws and Paddle's Refund Policy.",
  merchantOfRecord: {
    name: "Paddle",
    disclosure:
      "Our order process is conducted by our online reseller and Merchant of Record, Paddle.com. Paddle.com is the Merchant of Record for all paid StrangerLens orders, provides customer service inquiries regarding billing, and handles payment processing, invoicing, and applicable sales tax / VAT.",
  },
  links: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Contact Support", href: "/contact" },
  ] as const,
};
