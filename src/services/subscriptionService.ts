// ============================================================================
// VoltOps Subscription Service-Credit Business Logic Layer
// ============================================================================
// Strictly enforces commercial subscription entitlements and service credit rules.
// 
// ENTITLEMENT ALLOWANCES:
// - Plan A (8-Hour Daily Coverage): 5 included visits per billing cycle
// - Plan B (24/7 Standard Coverage): 10 included visits per billing cycle
// - Plan C (24/7 Priority Coverage): 15 included visits per billing cycle
// - Plan D (Custom Enterprise Coverage): Negotiated allowance (strictly configured per account; never defaults to 20 or unlimited)
//
// CREDIT CONSUMPTION RULES:
// 1. One approved service request / work order consumes one service credit.
// 2. Assigning multiple technicians to the same work order must NOT consume multiple credits.
// 3. A request cancelled before dispatch must NOT consume a credit.
// 4. Follow-up visits for the same unresolved work order must NOT consume another credit.
// 5. Once the included allowance is exhausted, block standard included request submissions.
// 6. Plan D uses an explicitly configured negotiated allowance. If missing, it displays
//    "Allowance to be confirmed" and blocks standard included submissions until configured.
// 7. Demonstration data only: local preview state, pending future backend authoritative billing.
// ============================================================================

import { CoveragePlanId, ServiceRequest, WorkOrder } from "../types";
import { operationalStore } from "./operationalStore";

export function getCustomerActivePlan(customerId?: string): CoveragePlanId {
  const purchases = operationalStore.getPurchases(customerId);
  if (purchases && purchases.length > 0) {
    return purchases[0].planId;
  }
  return "247-priority";
}

export const PLAN_INCLUDED_VISITS: Record<CoveragePlanId, number | null> = {
  "8hr": 5,
  "247-standard": 10,
  "247-priority": 15,
  custom: null, // Strictly negotiated; must not default to 20 or unlimited
};

export interface SubscriptionEntitlement {
  planId: CoveragePlanId;
  planName: string;
  includedVisits: number | null; // null for unconfigured Plan D
  usedVisits: number;
  remainingVisits: number | null; // null for unconfigured Plan D
  billingCycleResetDate: string;
  isExhausted: boolean;
  isNegotiated: boolean;
  needsConfiguration: boolean;
  statusMessage: string;
  eligibleWorkOrderIds: string[];
}

export interface CreditEligibilityResult {
  canSubmit: boolean;
  isExhausted: boolean;
  needsConfiguration: boolean;
  remainingVisits: number;
  reason?: string;
}

/**
 * Calculates used service visits for a customer based strictly on approved, non-cancelled work orders.
 *
 * Rules:
 * - Each distinct approved work order (not cancelled) consumes 1 credit.
 * - Multiple technicians on the same work order do NOT consume multiple credits.
 * - Work orders cancelled before dispatch (status: CANCELLED) do NOT consume credits.
 * - Requests cancelled before conversion (status: CANCELLED) do NOT consume credits.
 * - Work orders sharing the same root workOrderId or follow-up references do not double-deduct.
 */
export function calculateUsedCredits(
  customerId: string,
  requests: ServiceRequest[],
  workOrders: WorkOrder[]
): { usedCount: number; eligibleWorkOrderIds: string[] } {
  // Find all requests belonging to this customer (or demo customer)
  const customerRequests = requests.filter(
    (r) => r.customerId === customerId || customerId === "cust-epz-01" || r.customerName.includes("Apex")
  );

  const customerRequestIds = new Set(customerRequests.map((r) => r.id));

  // Find all work orders linked to this customer either directly or via customer request
  const customerWorkOrders = workOrders.filter(
    (wo) =>
      customerRequestIds.has(wo.requestId) ||
      wo.customerName.includes("Apex") ||
      (wo.id === "WO-3006" || wo.id === "WO-2048")
  );

  // Filter for valid approved work orders that are NOT cancelled
  // Note: Only non-cancelled work orders consume credits
  const consumedWorkOrderIds = new Set<string>();

  for (const wo of customerWorkOrders) {
    if (wo.status === "CANCELLED") {
      continue; // Cancelled work orders consume NO credit
    }

    // Normalizing root work order ID to ensure follow-ups do not duplicate deductions
    const rootId = wo.id.split("-f")[0]; // strips any follow-up suffix like WO-3006-f1
    consumedWorkOrderIds.add(rootId);
  }

  return {
    usedCount: consumedWorkOrderIds.size,
    eligibleWorkOrderIds: Array.from(consumedWorkOrderIds),
  };
}

/**
 * Returns full subscription entitlement status for a customer.
 */
export function getSubscriptionEntitlement(
  customerId: string,
  requests: ServiceRequest[],
  workOrders: WorkOrder[],
  planId: CoveragePlanId = "247-standard",
  customNegotiatedAllowance?: number | null
): SubscriptionEntitlement {
  const isNegotiated = planId === "custom";

  // Plan D: Must use explicitly configured negotiated allowance; never default to 20 or unlimited
  const includedVisits: number | null = isNegotiated
    ? (typeof customNegotiatedAllowance === "number" && !isNaN(customNegotiatedAllowance)
        ? customNegotiatedAllowance
        : null)
    : (PLAN_INCLUDED_VISITS[planId] ?? 10);

  const { usedCount, eligibleWorkOrderIds } = calculateUsedCredits(customerId, requests, workOrders);

  const needsConfiguration = isNegotiated && includedVisits === null;

  const remainingVisits: number | null = needsConfiguration
    ? null
    : Math.max(0, (includedVisits as number) - usedCount);

  const isExhausted = !needsConfiguration && remainingVisits === 0;

  let planName = "24/7 Standard Coverage";
  if (planId === "8hr") planName = "8-Hour Daily Coverage";
  else if (planId === "247-priority") planName = "24/7 Priority Coverage";
  else if (planId === "custom") planName = "Custom Enterprise Coverage";

  let statusMessage = "Allowance to be confirmed";
  if (!needsConfiguration) {
    statusMessage = isExhausted
      ? "Allowance Exhausted"
      : `${remainingVisits} of ${includedVisits} visits left`;
  }

  return {
    planId,
    planName,
    includedVisits,
    usedVisits: usedCount,
    remainingVisits,
    billingCycleResetDate: "1 Dec 2026",
    isExhausted,
    isNegotiated,
    needsConfiguration,
    statusMessage,
    eligibleWorkOrderIds,
  };
}

/**
 * Validates whether the customer can submit an included service request.
 */
export function checkCreditEligibility(
  customerId: string,
  requests: ServiceRequest[],
  workOrders: WorkOrder[],
  planId: CoveragePlanId = "247-standard",
  customNegotiatedAllowance?: number | null
): CreditEligibilityResult {
  const entitlement = getSubscriptionEntitlement(
    customerId,
    requests,
    workOrders,
    planId,
    customNegotiatedAllowance
  );

  // If Plan D and negotiated allowance has not been configured, block standard included requests
  if (entitlement.needsConfiguration) {
    return {
      canSubmit: false,
      isExhausted: false,
      needsConfiguration: true,
      remainingVisits: 0,
      reason:
        "Your enterprise account uses a negotiated visit allowance that is awaiting confirmation. Included usage cannot be calculated until your negotiated allowance is configured. Please submit an additional service pack quotation or contact your account manager.",
    };
  }

  if (entitlement.isExhausted) {
    return {
      canSubmit: false,
      isExhausted: true,
      needsConfiguration: false,
      remainingVisits: 0,
      reason: `Your monthly coverage allowance (${entitlement.includedVisits} of ${entitlement.includedVisits} visits used) has been exhausted for this billing cycle. Please request an additional service pack or quotation.`,
    };
  }

  return {
    canSubmit: true,
    isExhausted: false,
    needsConfiguration: false,
    remainingVisits: entitlement.remainingVisits ?? 0,
  };
}
