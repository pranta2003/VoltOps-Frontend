// ============================================================================
// VoltOps Operational Reach & Commercial Scale Configuration
// ============================================================================
// Illustrative demonstration figures for university demonstration & evaluation.
// Centralized configuration so figures can be edited or connected to live telemetry.
// ============================================================================

export interface OperationalReachMetric {
  id: string;
  targetValue: number;
  suffix: string;
  decimals?: number;
  label: string;
  description: string;
  highlight?: boolean;
}

export const OPERATIONAL_REACH_METRICS: OperationalReachMetric[] = [
  {
    id: "service-zones",
    targetValue: 24,
    suffix: "+",
    label: "Industrial Service Zones",
    description: "Active coverage corridors across Dhaka, Savar EPZ & Chittagong",
    highlight: false,
  },
  {
    id: "technician-network",
    targetValue: 85,
    suffix: "+",
    label: "Verified Field Technicians",
    description: "Trade-licensed specialists standby for deterministic emergency dispatch",
    highlight: true,
  },
  {
    id: "facilities-covered",
    targetValue: 140,
    suffix: "+",
    label: "Commercial Facilities Covered",
    description: "Manufacturing plants, export zones, server facilities & corporate towers",
    highlight: false,
  },
  {
    id: "sla-compliance",
    targetValue: 99.4,
    suffix: "%",
    decimals: 1,
    label: "SLA Arrival Compliance",
    description: "Physical arrivals fulfilled strictly within contractual SLA targets",
    highlight: false,
  },
];

export const OPERATIONAL_REACH_DISCLAIMER =
  "Illustrative platform figures for academic demonstration and system evaluation. Not independently audited corporate records.";
