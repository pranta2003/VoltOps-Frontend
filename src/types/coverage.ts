// Canonical VoltOps Coverage Plans & SLA Business Rules
// Strictly defines the 4 approved commercial facility coverage plans:
// Plan A: 8-Hour Daily Coverage (08:00 - 16:00, NO physical arrival SLA)
// Plan B: 24/7 Standard Coverage (40-minute physical arrival SLA)
// Plan C: 24/7 Priority Coverage (20-minute physical arrival SLA)
// Plan D: Custom Enterprise Coverage (Negotiated terms, NO invented SLA)

export type CoveragePlanId = "8hr" | "247-standard" | "247-priority" | "custom";

export interface CoveragePlanDefinition {
  id: CoveragePlanId;
  name: string;
  code: string;
  dailyWindow: string;
  physicalArrivalSlaMinutes: number | null; // null for 8hr and custom
  includedVisits: number | null; // included visits per billing cycle (null for custom negotiated)
  slaLabel: string;
  description: string;
  isGuaranteedSla: boolean;
}

export const APPROVED_COVERAGE_PLANS: Record<CoveragePlanId, CoveragePlanDefinition> = {
  "8hr": {
    id: "8hr",
    name: "8-Hour Daily Coverage",
    code: "Plan A",
    dailyWindow: "08:00 – 16:00 Business Hours",
    physicalArrivalSlaMinutes: null,
    includedVisits: 15,
    slaLabel: "Daily Window Only (No Physical Arrival SLA)",
    description: "Scheduled daytime repairs within business hours. No guaranteed physical arrival SLA.",
    isGuaranteedSla: false,
  },
  "247-standard": {
    id: "247-standard",
    name: "24/7 Standard Coverage",
    code: "Plan B",
    dailyWindow: "24/7 Facility Support",
    physicalArrivalSlaMinutes: 40,
    includedVisits: 25,
    slaLabel: "40-Minute Physical Arrival SLA",
    description: "Continuous commercial facility protection with a 40-minute guaranteed physical arrival SLA.",
    isGuaranteedSla: true,
  },
  "247-priority": {
    id: "247-priority",
    name: "24/7 Priority Coverage",
    code: "Plan C",
    dailyWindow: "24/7 Mission-Critical Support",
    physicalArrivalSlaMinutes: 20,
    includedVisits: 30,
    slaLabel: "20-Minute Rapid Arrival SLA",
    description: "High-priority commercial uptime with a 20-minute rapid on-site technician arrival SLA.",
    isGuaranteedSla: true,
  },
  custom: {
    id: "custom",
    name: "Custom Enterprise Coverage",
    code: "Plan D",
    dailyWindow: "Custom Negotiated Schedule",
    physicalArrivalSlaMinutes: null,
    includedVisits: null,
    slaLabel: "Negotiated Terms (No Default SLA)",
    description: "Tailored enterprise SLA across multi-site facilities. No invented default price or arrival SLA.",
    isGuaranteedSla: false,
  },
};

/**
 * Computes guaranteed physical arrival SLA deadline in minutes based strictly
 * on the coverage plan. Request urgency describes failure severity, NOT arrival SLA.
 */
export function getPhysicalArrivalSlaMinutes(plan: CoveragePlanId | string | undefined): number | null {
  if (!plan) return null;
  const canonical = APPROVED_COVERAGE_PLANS[plan as CoveragePlanId];
  return canonical ? canonical.physicalArrivalSlaMinutes : null;
}

/**
 * Returns formatted arrival SLA window label for UI display.
 */
export function getCoveragePlanSlaLabel(plan: CoveragePlanId | string | undefined): string {
  if (!plan) return "Standard Operating Window";
  const canonical = APPROVED_COVERAGE_PLANS[plan as CoveragePlanId];
  return canonical ? canonical.slaLabel : "Standard Operating Window";
}
