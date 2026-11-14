// ============================================================================
// VoltOps Centralized Coverage Pricing & SLA Configuration
// ============================================================================
// SINGLE SOURCE OF TRUTH FOR:
// - Landing Page plan cards
// - Plan selection handlers
// - Registration package summary
// - Checkout breakdown & order total
// - Demonstration receipts
// - Customer portal subscription entitlements & purchase history
//
// COMMERCIAL DISCLAIMER:
// All prices below are illustrative prototype demonstration rates for evaluation.
// They are NOT approved commercial rates.
// ============================================================================

export type CoveragePlanId = "8hr" | "247-standard" | "247-priority" | "custom";

export interface CoveragePlanPricing {
  id: CoveragePlanId;
  code: "Plan A" | "Plan B" | "Plan C" | "Plan D";
  name: string;
  shortName: string;
  tagline: string;
  coverageWindow: string;
  includedVisits: number | null; // null for custom negotiated
  includedVisitsLabel: string;
  arrivalSlaMinutes: number | null;
  arrivalSlaLabel: string;
  monthlyBdtPrice: number | null; // null for custom quote
  formattedPrice: string;
  billingUnit: string;
  prototypeNotice: string;
  features: string[];
  isPopular?: boolean;
}

export const COVERAGE_PLANS: Record<CoveragePlanId, CoveragePlanPricing> = {
  "8hr": {
    id: "8hr",
    code: "Plan A",
    name: "8-Hour Daily Coverage",
    shortName: "Plan A (Daily)",
    tagline: "Standard business daytime operational window",
    coverageWindow: "08:00 – 17:00 (Business Hours)",
    includedVisits: 5,
    includedVisitsLabel: "5 included visits / cycle",
    arrivalSlaMinutes: null,
    arrivalSlaLabel: "No guaranteed arrival SLA",
    monthlyBdtPrice: 1200,
    formattedPrice: "৳1,200",
    billingUnit: "/month",
    prototypeNotice: "Illustrative Demo Price • Prototype Pricing",
    features: [
      "5 included service visits per billing cycle",
      "Daytime coverage window (08:00 – 17:00)",
      "Qualified coordination across all 7 trades",
      "Digital work order & repair audit logs",
      "Scheduled preventive maintenance",
    ],
  },
  "247-standard": {
    id: "247-standard",
    code: "Plan B",
    name: "24/7 Standard Coverage",
    shortName: "Plan B (Standard)",
    tagline: "Round-the-clock commercial facility coverage",
    coverageWindow: "24 Hours / 7 Days a Week",
    includedVisits: 10,
    includedVisitsLabel: "10 included visits / cycle",
    arrivalSlaMinutes: 40,
    arrivalSlaLabel: "40-minute physical arrival SLA",
    monthlyBdtPrice: 2500,
    formattedPrice: "৳2,500",
    billingUnit: "/month",
    prototypeNotice: "Illustrative Demo Price • Prototype Pricing",
    features: [
      "10 included service visits per billing cycle",
      "24/7 round-the-clock emergency dispatch",
      "40-minute physical technician arrival SLA",
      "All 7 canonical service trades covered",
      "Multi-party dispatcher & customer sign-off",
      "Real-time route & arrival tracking",
    ],
  },
  "247-priority": {
    id: "247-priority",
    code: "Plan C",
    name: "24/7 Priority Coverage",
    shortName: "Plan C (Priority)",
    tagline: "Time-critical industrial & commercial complexes",
    coverageWindow: "24 Hours / 7 Days a Week",
    includedVisits: 15,
    includedVisitsLabel: "15 included visits / cycle",
    arrivalSlaMinutes: 20,
    arrivalSlaLabel: "20-minute physical arrival SLA (2× faster)",
    monthlyBdtPrice: 4000,
    formattedPrice: "৳4,000",
    billingUnit: "/month",
    prototypeNotice: "Illustrative Demo Price • Prototype Pricing",
    features: [
      "15 included service visits per billing cycle",
      "24/7 prioritized emergency callout hotline",
      "20-minute physical technician arrival SLA (2× faster)",
      "Priority standby queue at Savar & Gazipur hubs",
      "Senior master certified technicians assigned",
      "Dedicated account manager & emergency ATS/HVAC coverage",
    ],
    isPopular: true,
  },
  custom: {
    id: "custom",
    code: "Plan D",
    name: "Custom Enterprise Coverage",
    shortName: "Plan D (Custom)",
    tagline: "Multi-facility complexes & customized operational schedules",
    coverageWindow: "Negotiated Operational Window",
    includedVisits: null,
    includedVisitsLabel: "Negotiated visit allowance",
    arrivalSlaMinutes: null,
    arrivalSlaLabel: "Negotiated terms (no invented SLA)",
    monthlyBdtPrice: null,
    formattedPrice: "Custom Quote",
    billingUnit: "",
    prototypeNotice: "Enterprise Negotiated • Quotation Basis",
    features: [
      "Custom visit limit per facility or multi-site pool",
      "Tailored emergency response windows & SLAs",
      "Dedicated technician fleet & parts consignment",
      "Custom billing terms and quarterly SLA reviews",
      "Enterprise SCADA & telemetry integration",
    ],
  },
};

/**
 * Safely retrieve plan pricing configuration with fallback
 */
export function getCoveragePlanPricing(planId?: string | null): CoveragePlanPricing {
  if (!planId) return COVERAGE_PLANS["247-priority"];
  const normalized = planId.toLowerCase().trim() as CoveragePlanId;
  return COVERAGE_PLANS[normalized] || COVERAGE_PLANS["247-priority"];
}

/**
 * Format any BDT numerical currency amount cleanly
 */
export function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}
