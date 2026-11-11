// Centralized Dispatcher Operations API Service
// Strictly follows VoltOps API contract: live endpoints with deterministic fallback,
// honest connection telemetry, safe human-verified assignment, and arithmetic matching.

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

// Local mutable state for demonstration / offline operation
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
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

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
      if (res.data?.success && res.data?.data) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Offline fallback
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
      message: "[Local Demonstration Session] Backend offline or unmounted. Displaying verified local demonstration metrics.",
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
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Fallback
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
      message: "[Local Demonstration Session] Operating on local demonstration requests baseline.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Triage and convert an inbound service request into an actionable Work Order
   */
  async convertRequestToWorkOrder(dto: CreateWorkOrderDTO): Promise<DispatcherApiResponse<WorkOrder>> {
    try {
      const res = await api.post("/dispatcher/work-orders", dto);
      if (res.data?.success && res.data.data) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Offline fallback
    }

    const request = localRequests.find((r) => r.id === dto.requestId);
    if (!request) {
      throw new Error(`Service request ${dto.requestId} not found.`);
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

    // Update local state
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
      message: `[Local Demonstration Session] Work Order ${newWorkOrderId} simulated locally. (Will not persist to remote backend).`,
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
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Fallback
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
      message: "[Local Demonstration Session] Operating on local demonstration work orders baseline.",
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
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Fallback
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
   * 1. Must possess at least one skill in work order category
   * 2. Must possess an active, non-expired verified certification in trade
   * 3. Must not be UNAVAILABLE, ON_LEAVE, or OFF_DUTY
   * 4. Must not exceed maximum active concurrent jobs (<= 2 jobs)
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
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Fallback to client-side arithmetic matching engine
    }

    const order = localWorkOrders.find((w) => w.id === workOrderId);
    if (!order) {
      throw new Error(`Work order ${workOrderId} not found.`);
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

      // Hard check 3: Trade skill constraint
      const hasSkill = tech.skills.some((s) => s.category === order.category);
      if (!hasSkill) {
        continue;
      }

      // Hard check 4: License verification and expiry constraint
      // Must have at least one verified AND unexpired certification
      const activeVerifiedCerts = tech.certifications.filter((c) => {
        if (!c.verified) return false;
        if (!c.expiryDate) return true;
        const exp = new Date(c.expiryDate);
        return !isNaN(exp.getTime()) && exp >= new Date();
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
        (facilityLower.includes("uttara") && branchLower.includes("uttara"));

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
      message: "[Local Demonstration Session] Ranked via transparent arithmetic matching engine.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Human Dispatcher final assignment confirmation (AI is strictly advisory)
   */
  async assignTechnician(dto: AssignTechnicianDTO): Promise<DispatcherApiResponse<WorkOrder>> {
    try {
      const res = await api.post(`/dispatcher/work-orders/${dto.workOrderId}/assign`, dto);
      if (res.data?.success && res.data.data) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Fallback
    }

    const order = localWorkOrders.find((w) => w.id === dto.workOrderId);
    if (!order) {
      throw new Error(`Work order ${dto.workOrderId} not found.`);
    }

    const tech = localTechnicians.find((t) => t.id === dto.technicianId);
    if (!tech) {
      throw new Error(`Technician ${dto.technicianId} not found.`);
    }

    // State transition guard: can only assign from UNASSIGNED
    if (order.status !== "UNASSIGNED") {
      throw new Error(`Cannot assign technician to work order ${order.id} with status "${order.status}". Work order must be UNASSIGNED.`);
    }

    // Update work order
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
    try {
      const res = await api.patch(`/dispatcher/work-orders/${id}/status`, { status, notes });
      if (res.data?.success && res.data.data) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Fallback
    }

    const order = localWorkOrders.find((w) => w.id === id);
    if (!order) {
      throw new Error(`Work order ${id} not found.`);
    }

    // Lifecycle transition validation guard
    const allowedTransitions = VALID_WORK_ORDER_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(status)) {
      throw new Error(
        `Invalid status transition: Cannot transition Work Order ${order.id} from "${order.status}" to "${status}". Allowed transitions are: [${
          allowedTransitions.length ? allowedTransitions.join(", ") : "none (terminal state)"
        }].`
      );
    }

    order.status = status;
    if (status === "TRAVELLING" && !order.startedAt) {
      order.startedAt = new Date().toISOString();
    }
    if (status === "COMPLETED") {
      order.completedAt = new Date().toISOString();
      // Free technician
      if (order.assignedTechnicianId) {
        const tech = localTechnicians.find((t) => t.id === order.assignedTechnicianId);
        if (tech && tech.activeJobCount > 0) {
          tech.activeJobCount -= 1;
          if (tech.activeJobCount === 0) tech.status = "AVAILABLE";
        }
      }
    }

    if (notes) {
      order.workNotes = order.workNotes ? `${order.workNotes} | ${notes}` : notes;
    }

    localEvents.unshift({
      id: `EVT-D-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: "STATUS_CHANGED",
      actorName: "Tania Akter (Dispatcher)",
      targetId: order.id,
      summary: `Work Order ${order.id} status transitioned from ${order.status} to ${status}.`,
      severity: "INFO",
    });

    return {
      success: true,
      data: order,
      isOffline: true,
      message: `[Local Demonstration Session] Work Order ${order.id} transitioned to ${status} locally.`,
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
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        throw err;
      }
      // Fallback
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
