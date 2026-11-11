// Centralized Dispatcher Operations API Service
// Strictly follows VoltOps API contract: live endpoints with deliberate error classification,
// honest telemetry, human-verified assignment, and arithmetic matching.

import api from "../api/axios";
import { ServiceRequest, WorkOrder, TechnicianProfile, ServiceCategory } from "../types";
import { CANONICAL_SERVICE_CATEGORIES } from "../types";
import {
  DispatcherMetrics,
  ServiceRequestFilterParams,
  WorkOrderFilterParams,
  TechnicianRecommendation,
  CreateWorkOrderDTO,
  AssignTechnicianDTO,
  DispatchEventLog,
  DispatcherApiResponse,
} from "../types/dispatcher";
import {
  INITIAL_SERVICE_REQUESTS,
  INITIAL_WORK_ORDERS,
  INITIAL_FIELD_TECHNICIANS,
  INITIAL_DISPATCH_EVENTS,
} from "./mockDispatcherData";

/**
 * Custom error class for Dispatcher API operations with explicit classification flags.
 */
export class DispatcherApiError extends Error {
  status?: number;
  code?: string;
  isServerError?: boolean;
  isAuthError?: boolean;
  isResourceNotFound?: boolean;
  isMalformedResponse?: boolean;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      isServerError?: boolean;
      isAuthError?: boolean;
      isResourceNotFound?: boolean;
      isMalformedResponse?: boolean;
    }
  ) {
    super(message);
    this.name = "DispatcherApiError";
    this.status = options?.status;
    this.code = options?.code;
    this.isServerError = options?.isServerError;
    this.isAuthError = options?.isAuthError;
    this.isResourceNotFound = options?.isResourceNotFound;
    this.isMalformedResponse = options?.isMalformedResponse;
  }
}

// Local mutable state for demonstration / offline preview
let localRequests: ServiceRequest[] = JSON.parse(JSON.stringify(INITIAL_SERVICE_REQUESTS));
let localWorkOrders: WorkOrder[] = JSON.parse(JSON.stringify(INITIAL_WORK_ORDERS));
let localTechnicians: TechnicianProfile[] = JSON.parse(JSON.stringify(INITIAL_FIELD_TECHNICIANS));
let localEvents: DispatchEventLog[] = JSON.parse(JSON.stringify(INITIAL_DISPATCH_EVENTS));

/**
 * Work Order valid linear state transitions map.
 * Enforces strict operational lifecycle integrity and prevents illegal jumps.
 */
export const VALID_WORK_ORDER_TRANSITIONS: Record<WorkOrder["status"], WorkOrder["status"][]> = {
  UNASSIGNED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["TRAVELLING", "CANCELLED"],
  TRAVELLING: ["ON_SITE", "CANCELLED"],
  ON_SITE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // Terminal state - cannot be reopened
  CANCELLED: [], // Terminal state
};

/**
 * Deliberate HTTP Error Classifier.
 * Distinguishes authentication, authorization, server crashes, missing resources,
 * and confirmed unmounted route endpoints.
 */
function handleDispatcherHttpError(
  err: any,
  context: { isCollectionQuery?: boolean; resourceId?: string; actionName?: string }
): void {
  const status = err.response?.status;
  const data = err.response?.data;
  const message = data?.message || data?.error || err.message;

  // 1. Network unavailable: permitted to activate local preview
  if (err.code === "ERR_NETWORK" || !err.response || err.message?.includes("Network Error")) {
    return; // Fall through to local preview
  }

  // 2. Authentication failure: must propagate
  if (status === 401) {
    throw new DispatcherApiError(`Authentication required (401): ${message}`, {
      status: 401,
      isAuthError: true,
    });
  }

  // 3. Authorization failure: must propagate
  if (status === 403) {
    throw new DispatcherApiError(`Access forbidden (403): ${message}`, {
      status: 403,
      isAuthError: true,
    });
  }

  // 4. Server failures (500, 502, 503): MUST throw error and NEVER silently fall back
  if (status && status >= 500) {
    throw new DispatcherApiError(`Server error (${status}): ${message}`, {
      status,
      isServerError: true,
    });
  }

  // 5. Missing resource 404 vs unmounted endpoint 404:
  if (status === 404) {
    // If response indicates an unmounted route or unimplemented endpoint router
    if (
      message === "Route not found" ||
      message?.toLowerCase().includes("cannot get") ||
      message?.toLowerCase().includes("cannot post") ||
      message?.toLowerCase().includes("cannot patch")
    ) {
      return; // Fall through to local preview baseline
    }

    // If a specific resource ID was requested and endpoint returned 404, resource does not exist!
    if (context.resourceId) {
      throw new DispatcherApiError(`Resource not found (404): ${message || `Resource ${context.resourceId} not found`}`, {
        status: 404,
        isResourceNotFound: true,
      });
    }

    // If data indicates an entity was missing
    if (data?.code === "RESOURCE_NOT_FOUND") {
      throw new DispatcherApiError(`Resource not found (404): ${message}`, {
        status: 404,
        isResourceNotFound: true,
      });
    }

    // For collection queries (e.g. GET /dispatcher/requests), a 404 represents an unmounted endpoint router
    if (context.isCollectionQuery) {
      return; // Fall through to local preview baseline
    }

    // For any other 404, throw resource not found
    throw new DispatcherApiError(`Endpoint or target not found (404): ${message}`, {
      status: 404,
      isResourceNotFound: true,
    });
  }

  // For any other HTTP error (e.g. 400 Bad Request, 422 Unprocessable), throw immediately
  throw new DispatcherApiError(`Request failed (${status || "UNKNOWN"}): ${message}`, {
    status,
  });
}

export const dispatcherService = {
  /**
   * Probe backend connectivity to provide truthful UI state indicator
   */
  async pingBackend(): Promise<boolean> {
    try {
      const response = await api.get("/health", { timeout: 2500 });
      return response.status === 200;
    } catch {
      return false;
    }
  },

  /**
   * Fetch operational overview metrics
   */
  async getMetrics(): Promise<DispatcherApiResponse<DispatcherMetrics>> {
    try {
      const res = await api.get("/dispatcher/metrics");
      if (res.data?.success && res.data?.data && typeof res.data.data === "object") {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected metrics data object from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { isCollectionQuery: true, actionName: "getMetrics" });
    }

    // Compute truthful metrics from baseline state
    const unassignedRequests = localRequests.filter((r) => r.status === "NEW" || r.status === "REVIEWING").length;
    const activeWorkOrders = localWorkOrders.filter(
      (w) => w.status === "ASSIGNED" || w.status === "TRAVELLING" || w.status === "ON_SITE"
    ).length;
    const techniciansOnDuty = localTechnicians.filter(
      (t) => t.status === "AVAILABLE" || t.status === "ON_JOB" || t.status === "TRAVELLING"
    ).length;
    const urgentSlaWatch = localRequests.filter(
      (r) => r.priority === "URGENT" && r.status !== "CONVERTED" && r.status !== "CANCELLED"
    ).length;
    const totalCompletedToday = localWorkOrders.filter((w) => w.status === "COMPLETED").length;

    const tradeCoverage = CANONICAL_SERVICE_CATEGORIES.map((cat) => {
      const techsInTrade = localTechnicians.filter((t) => t.skills.some((s) => s.category === cat));
      const availableCount = techsInTrade.filter((t) => t.status === "AVAILABLE").length;
      const activeCount = techsInTrade.filter((t) => t.status === "ON_JOB" || t.status === "TRAVELLING").length;
      return { category: cat, availableCount, activeCount };
    });

    return {
      success: true,
      data: {
        unassignedRequests,
        activeWorkOrders,
        techniciansOnDuty,
        urgentSlaWatch,
        totalCompletedToday,
        tradeCoverage,
      },
      isOffline: true,
      message: "[Local Preview] Backend offline or router unmounted. Displaying local demonstration metrics.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Fetch inbound customer service breakdown requests
   */
  async getServiceRequests(params?: ServiceRequestFilterParams): Promise<DispatcherApiResponse<ServiceRequest[]>> {
    try {
      const res = await api.get("/dispatcher/requests", { params });
      if (res.data?.success && Array.isArray(res.data.data)) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected array of service requests from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { isCollectionQuery: true, actionName: "getServiceRequests" });
    }

    let results = [...localRequests];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      results = results.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.problemTitle.toLowerCase().includes(q) ||
          r.assetName.toLowerCase().includes(q) ||
          r.facilityAddress.toLowerCase().includes(q)
      );
    }

    if (params?.status && params.status !== "ALL") {
      results = results.filter((r) => r.status === params.status);
    }

    if (params?.category && params.category !== "ALL") {
      results = results.filter((r) => r.category === params.category);
    }

    if (params?.priority && params.priority !== "ALL") {
      results = results.filter((r) => r.priority === params.priority);
    }

    return {
      success: true,
      data: results,
      isOffline: true,
      message: "[Local Preview] Operating on local demonstration requests baseline.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Triage and convert an inbound service request into an actionable Work Order
   */
  async convertRequestToWorkOrder(dto: CreateWorkOrderDTO): Promise<DispatcherApiResponse<WorkOrder>> {
    try {
      const res = await api.post("/dispatcher/work-orders", dto);
      if (res.data?.success && res.data.data && typeof res.data.data === "object") {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected work order data object from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { resourceId: dto.requestId, actionName: "convertRequestToWorkOrder" });
    }

    // Atomic local validation before modifying state
    const request = localRequests.find((r) => r.id === dto.requestId);
    if (!request) {
      throw new DispatcherApiError(`Service request ${dto.requestId} not found in local baseline.`, {
        status: 404,
        isResourceNotFound: true,
      });
    }

    if (request.status === "CONVERTED") {
      throw new DispatcherApiError(`Service request ${dto.requestId} is already converted into a Work Order.`, {
        code: "ALREADY_CONVERTED",
      });
    }

    const plan = dto.coveragePlan || request.coveragePlan || "247-standard";
    let slaDeadline: string | null = null;

    if (dto.slaDeadline !== undefined) {
      slaDeadline = dto.slaDeadline;
    } else if (plan === "247-priority") {
      slaDeadline = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    } else if (plan === "247-standard") {
      slaDeadline = new Date(Date.now() + 40 * 60 * 1000).toISOString();
    } else {
      // 8hr Daily window or Custom coverage: no physical arrival SLA
      slaDeadline = null;
    }

    const newWorkOrderId = `WO-${3000 + localWorkOrders.length + 1}`;
    const newWorkOrder: WorkOrder = {
      id: newWorkOrderId,
      requestId: request.id,
      customerName: request.customerName,
      facilityAddress: request.facilityAddress,
      category: request.category,
      assetName: request.assetName,
      problemSummary: request.problemTitle,
      priority: dto.priority || request.priority,
      status: "UNASSIGNED",
      coveragePlan: plan,
      slaDeadline,
      createdAt: new Date().toISOString(),
      workNotes: dto.notes,
    };

    // Update local state atomically
    request.status = "CONVERTED";
    request.workOrderId = newWorkOrderId;
    localWorkOrders.unshift(newWorkOrder);

    // Record audit event
    localEvents.unshift({
      id: `EVT-D-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "ORDER_CREATED",
      actorName: "Tania Akter (Dispatcher)",
      targetId: newWorkOrderId,
      summary: `Converted request ${request.id} into Work Order ${newWorkOrderId} (${request.category}). Plan: ${plan}.`,
      severity: dto.priority === "URGENT" ? "CRITICAL" : "INFO",
    });

    return {
      success: true,
      data: newWorkOrder,
      isOffline: true,
      message: `[Local Demonstration Session] Work Order ${newWorkOrderId} created in local preview. (Will not persist to remote backend).`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Fetch active work orders ledger
   */
  async getWorkOrders(params?: WorkOrderFilterParams): Promise<DispatcherApiResponse<WorkOrder[]>> {
    try {
      const res = await api.get("/dispatcher/work-orders", { params });
      if (res.data?.success && Array.isArray(res.data.data)) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected array of work orders from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { isCollectionQuery: true, actionName: "getWorkOrders" });
    }

    let results = [...localWorkOrders];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      results = results.filter(
        (w) =>
          w.id.toLowerCase().includes(q) ||
          w.customerName.toLowerCase().includes(q) ||
          w.problemSummary.toLowerCase().includes(q) ||
          w.assetName.toLowerCase().includes(q) ||
          (w.assignedTechnicianName && w.assignedTechnicianName.toLowerCase().includes(q))
      );
    }

    if (params?.status && params.status !== "ALL") {
      results = results.filter((w) => w.status === params.status);
    }

    if (params?.category && params.category !== "ALL") {
      results = results.filter((w) => w.category === params.category);
    }

    if (params?.priority && params.priority !== "ALL") {
      results = results.filter((w) => w.priority === params.priority);
    }

    return {
      success: true,
      data: results,
      isOffline: true,
      message: "[Local Preview] Operating on local demonstration work orders baseline.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Fetch field technicians list
   */
  async getTechnicians(category?: ServiceCategory, branch?: string): Promise<DispatcherApiResponse<TechnicianProfile[]>> {
    try {
      const res = await api.get("/dispatcher/technicians", { params: { category, branch } });
      if (res.data?.success && Array.isArray(res.data.data)) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected array of technicians from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { isCollectionQuery: true, actionName: "getTechnicians" });
    }

    let results = [...localTechnicians];

    if (category && category !== ("ALL" as any)) {
      results = results.filter((t) => t.skills.some((s) => s.category === category));
    }

    if (branch && branch !== "ALL") {
      results = results.filter((t) => t.branch.toLowerCase().includes(branch.toLowerCase()));
    }

    return {
      success: true,
      data: results,
      isOffline: true,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Arithmetic Matching Engine: Computes ranked eligible technicians for a work order.
   * Hard constraints:
   * 1. Must possess at least one skill in target trade (primary or secondary)
   * 2. Must possess an active, non-expired verified certification in trade
   * 3. Must not be UNAVAILABLE, ON_LEAVE, or OFF_DUTY
   * 4. Must not exceed maximum active concurrent jobs (< 3 jobs)
   *
   * Transparent Tiering:
   * - TIER_1_PREFERRED: Trade certified, active license, 0 active jobs (standby)
   * - TIER_2_ELIGIBLE: Trade certified, active license, currently has 1-2 active jobs
   * - INELIGIBLE: Disqualified by hard constraints (filtered out)
   */
  async getMatchingTechnicians(workOrderId: string): Promise<DispatcherApiResponse<TechnicianRecommendation[]>> {
    try {
      const res = await api.get(`/dispatcher/work-orders/${workOrderId}/matching`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected array of recommendations from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { resourceId: workOrderId, actionName: "getMatchingTechnicians" });
    }

    const order = localWorkOrders.find((w) => w.id === workOrderId);
    if (!order) {
      throw new DispatcherApiError(`Work order ${workOrderId} not found in local baseline.`, {
        status: 404,
        isResourceNotFound: true,
      });
    }

    const recommendations: TechnicianRecommendation[] = [];

    for (const tech of localTechnicians) {
      // Hard check 1: Status exclusion (off duty, on leave, unavailable)
      if (tech.status === "UNAVAILABLE" || tech.status === "ON_LEAVE" || tech.status === "OFF_DUTY") {
        continue;
      }

      // Hard check 2: Overloaded technician exclusion (max concurrent active jobs is 2)
      if (tech.activeJobCount >= 3) {
        continue;
      }

      // Hard check 3: Trade skill constraint (primary or secondary trade competency)
      const hasSkill = tech.skills.some((s) => s.category === order.category);
      if (!hasSkill) {
        continue;
      }

      // Hard check 4: License verification and expiry constraint
      // Must have at least one verified AND unexpired certification
      const activeVerifiedCerts = tech.certifications.filter((c) => {
        if (!c.verified) return false;
        if (!c.expiryDate) return true; // Indefinite valid license
        const exp = new Date(c.expiryDate);
        return !isNaN(exp.getTime()) && exp.getTime() >= Date.now();
      });

      if (activeVerifiedCerts.length === 0) {
        continue; // Hard constraint: No active, verified license
      }

      const isStandby = tech.status === "AVAILABLE" && tech.activeJobCount === 0;

      // Proximity / branch affinity
      const facilityLower = order.facilityAddress.toLowerCase();
      const branchLower = tech.branch.toLowerCase();
      const branchMatched =
        (facilityLower.includes("epz") && branchLower.includes("epz")) ||
        (facilityLower.includes("gazipur") && branchLower.includes("gazipur")) ||
        (facilityLower.includes("tejgaon") && branchLower.includes("tejgaon")) ||
        (facilityLower.includes("uttara") && branchLower.includes("uttara")) ||
        ((facilityLower.includes("rupganj") || facilityLower.includes("narsingdi")) && branchLower.includes("epz"));

      // Arithmetic Score Calculation (Deterministic Heuristic)
      let score = 50; // Trade skill matched
      score += 25; // Verified active license
      if (isStandby) {
        score += 15;
      } else if (tech.activeJobCount === 1) {
        score += 10;
      } else if (tech.activeJobCount === 2) {
        score += 5;
      }

      let eta = 28;
      if (branchMatched && isStandby) {
        score += 10;
        eta = 15;
      } else if (branchMatched) {
        score += 10;
        eta = 22;
      } else if (isStandby) {
        eta = 25;
      } else {
        eta = 35;
      }

      score = Math.min(100, Math.max(0, score));

      const recommendationTier: "TIER_1_PREFERRED" | "TIER_2_ELIGIBLE" =
        isStandby ? "TIER_1_PREFERRED" : "TIER_2_ELIGIBLE";

      const tierBadge = recommendationTier === "TIER_1_PREFERRED" ? "Tier 1: Preferred" : "Tier 2: Eligible";
      const explanation = `${tierBadge} — Verified: ${activeVerifiedCerts.map((c) => c.name).join(", ")}. ${
        isStandby ? "Standby (0 active jobs)" : `Active with ${tech.activeJobCount} in-flight job(s)`
      }. Location: ${branchMatched ? "Local branch match" : "Cross-zone dispatch"} (~${eta}m ETA).`;

      recommendations.push({
        technicianId: tech.id,
        technicianName: tech.name,
        employeeId: tech.employeeId,
        designation: tech.designation,
        category: order.category,
        branch: tech.branch,
        status: tech.status,
        etaMinutes: eta,
        matchScore: score,
        recommendationTier,
        eligibilityFactors: {
          tradeMatched: true,
          licenseVerifiedAndActive: true,
          standbyAvailable: isStandby,
          branchMatched,
        },
        skills: tech.skills.filter((s) => s.category === order.category).map((s) => s.name),
        certifications: activeVerifiedCerts.map((c) => c.name),
        explanation,
        isEligible: true,
        activeJobCount: tech.activeJobCount,
      });
    }

    // Rank descending by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return {
      success: true,
      data: recommendations,
      isOffline: true,
      message: "[Local Preview] Ranked via transparent arithmetic matching engine.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Human Dispatcher final assignment confirmation (AI is strictly advisory)
   */
  async assignTechnician(dto: AssignTechnicianDTO): Promise<DispatcherApiResponse<WorkOrder>> {
    try {
      const res = await api.post(`/dispatcher/work-orders/${dto.workOrderId}/assign`, dto);
      if (res.data?.success && res.data.data && typeof res.data.data === "object") {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected assigned work order object from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { resourceId: dto.workOrderId, actionName: "assignTechnician" });
    }

    // Atomic local validation before modifying state
    const order = localWorkOrders.find((w) => w.id === dto.workOrderId);
    if (!order) {
      throw new DispatcherApiError(`Work order ${dto.workOrderId} not found in local baseline.`, {
        status: 404,
        isResourceNotFound: true,
      });
    }

    // Duplicate assignment prevention: cannot assign if already ASSIGNED or in-flight
    if (order.status !== "UNASSIGNED") {
      throw new DispatcherApiError(
        `Cannot assign technician to work order ${order.id} with status "${order.status}". Work order must be UNASSIGNED.`,
        { code: "INVALID_STATUS" }
      );
    }

    const tech = localTechnicians.find((t) => t.id === dto.technicianId);
    if (!tech) {
      throw new DispatcherApiError(`Technician ${dto.technicianId} not found in local baseline.`, {
        status: 404,
        isResourceNotFound: true,
      });
    }

    // Overload safeguard: technician cannot take a 4th job
    if (tech.activeJobCount >= 3) {
      throw new DispatcherApiError(
        `Cannot dispatch ${tech.name}: technician has ${tech.activeJobCount} active jobs and is overloaded (maximum is 2).`,
        { code: "TECHNICIAN_OVERLOADED" }
      );
    }

    // Update work order state atomically
    order.status = "ASSIGNED";
    order.assignedTechnicianId = tech.id;
    order.assignedTechnicianName = `${tech.name} (${tech.designation})`;
    if (dto.dispatcherNotes) {
      order.workNotes = order.workNotes ? `${order.workNotes} | Dispatch: ${dto.dispatcherNotes}` : dto.dispatcherNotes;
    }

    // Update technician status
    tech.status = "ON_JOB";
    tech.activeJobCount += 1;

    // Record audit event
    localEvents.unshift({
      id: `EVT-D-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "TECH_DISPATCHED",
      actorName: "Tania Akter (Dispatcher)",
      targetId: order.id,
      summary: `Assigned technician ${tech.name} to ${order.id} (${order.customerName}).`,
      severity: "INFO",
    });

    return {
      success: true,
      data: order,
      isOffline: true,
      message: `[Local Demonstration Session] Technician ${tech.name} assigned to ${order.id} locally. (Simulation only; real technician not notified).`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Update work order operational lifecycle status with linear validation guard
   */
  async updateWorkOrderStatus(
    id: string,
    status: WorkOrder["status"],
    notes?: string
  ): Promise<DispatcherApiResponse<WorkOrder>> {
    // 1. Lifecycle transition validation guard - reject invalid transitions BEFORE calling network
    const localOrder = localWorkOrders.find((w) => w.id === id);
    if (localOrder) {
      const allowedTransitions = VALID_WORK_ORDER_TRANSITIONS[localOrder.status] || [];
      if (!allowedTransitions.includes(status)) {
        throw new DispatcherApiError(
          `Invalid status transition: Cannot transition Work Order ${localOrder.id} from "${localOrder.status}" to "${status}". Allowed transitions are: [${
            allowedTransitions.length ? allowedTransitions.join(", ") : "none (terminal state)"
          }].`,
          { code: "INVALID_TRANSITION" }
        );
      }
    }

    try {
      const res = await api.patch(`/dispatcher/work-orders/${id}/status`, { status, notes });
      if (res.data?.success && res.data.data && typeof res.data.data === "object") {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected updated work order from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { resourceId: id, actionName: "updateWorkOrderStatus" });
    }

    if (!localOrder) {
      throw new DispatcherApiError(`Work order ${id} not found in local baseline.`, {
        status: 404,
        isResourceNotFound: true,
      });
    }

    localOrder.status = status;
    if (status === "TRAVELLING" && !localOrder.startedAt) {
      localOrder.startedAt = new Date().toISOString();
    }
    if (status === "COMPLETED") {
      localOrder.completedAt = new Date().toISOString();
      // Free technician
      if (localOrder.assignedTechnicianId) {
        const tech = localTechnicians.find((t) => t.id === localOrder.assignedTechnicianId);
        if (tech && tech.activeJobCount > 0) {
          tech.activeJobCount -= 1;
          if (tech.activeJobCount === 0) tech.status = "AVAILABLE";
        }
      }
    }

    if (notes) {
      localOrder.workNotes = localOrder.workNotes ? `${localOrder.workNotes} | ${notes}` : notes;
    }

    localEvents.unshift({
      id: `EVT-D-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "STATUS_CHANGED",
      actorName: "Tania Akter (Dispatcher)",
      targetId: localOrder.id,
      summary: `Work Order ${localOrder.id} status transitioned from ${localOrder.status} to ${status}.`,
      severity: "INFO",
    });

    return {
      success: true,
      data: localOrder,
      isOffline: true,
      message: `[Local Demonstration Session] Work Order ${localOrder.id} transitioned to ${status} locally.`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Fetch recent dispatch activity events
   */
  async getDispatchEvents(): Promise<DispatcherApiResponse<DispatchEventLog[]>> {
    try {
      const res = await api.get("/dispatcher/events");
      if (res.data?.success && Array.isArray(res.data.data)) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
      throw new DispatcherApiError("Malformed response: expected array of events from server", {
        isMalformedResponse: true,
      });
    } catch (err: any) {
      if (err instanceof DispatcherApiError) throw err;
      handleDispatcherHttpError(err, { isCollectionQuery: true, actionName: "getDispatchEvents" });
    }

    return {
      success: true,
      data: [...localEvents],
      isOffline: true,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Reset demonstration state (useful for test runs)
   */
  resetDemonstrationState() {
    localRequests = JSON.parse(JSON.stringify(INITIAL_SERVICE_REQUESTS));
    localWorkOrders = JSON.parse(JSON.stringify(INITIAL_WORK_ORDERS));
    localTechnicians = JSON.parse(JSON.stringify(INITIAL_FIELD_TECHNICIANS));
    localEvents = JSON.parse(JSON.stringify(INITIAL_DISPATCH_EVENTS));
  },
};
