// ============================================================================
// VoltOps Technician Service Layer & Execution Boundary
// ============================================================================
// Manages daily job rosters, en-route progress, arrival milestones, and completion sign-off.
//
// INTEGRATION CONTRACTS (Future Backend):
// - GET   /api/technician/jobs           -> Assigned work orders for technician
// - PATCH /api/technician/jobs/:id/status -> Advance job status (linear lifecycle)
// ============================================================================

import api from "../api/axios";
import { WorkOrder, WorkOrderStatus, Invoice } from "../types";
import { VALID_WORK_ORDER_TRANSITIONS } from "./dispatcherService";
import { operationalStore, reconcileTechnicianOperationalStatus } from "./operationalStore";
import { notificationService } from "./notificationService";

export interface TechnicianApiResponse<T> {
  success: boolean;
  data: T;
  isOffline: boolean;
  message?: string;
  timestamp: string;
}

export class TechnicianApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = "TechnicianApiError";
    this.status = options?.status;
    this.code = options?.code;
  }
}

export const technicianService = {
  /**
   * Fetch active job roster assigned to the authenticated technician
   */
  async getJobs(technicianId?: string): Promise<TechnicianApiResponse<WorkOrder[]>> {
    try {
      const res = await api.get("/technician/jobs");
      if (res.data?.success && Array.isArray(res.data.data)) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // Fall through to local operational store
    }

    const allWorkOrders = operationalStore.getWorkOrders();

    // If a technician ID is specified (or preview Kamrul Islam tech-01), filter assigned work orders
    const targetTechId = technicianId || "tech-01";
    let relevantJobs = allWorkOrders.filter((w) => {
      if (w.assignedTechnicianId === targetTechId) return true;
      if (targetTechId === "tech-01" && w.assignedTechnicianName && w.assignedTechnicianName.toLowerCase().includes("kamrul")) {
        return true;
      }
      return false;
    });

    // If no filtered jobs found for specific tech (e.g. demo test user), return non-unassigned orders
    if (relevantJobs.length === 0) {
      relevantJobs = allWorkOrders.filter((w) => w.status !== "UNASSIGNED");
    }

    return {
      success: true,
      data: relevantJobs,
      isOffline: true,
      message: "[Local Preview] Operating on synchronized technician work order roster.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Advance job status along the strict linear progression:
   * ASSIGNED -> TRAVELLING -> ON_SITE -> COMPLETED
   *
   * AVAILABILITY RULE:
   * A technician does NOT automatically become AVAILABLE simply because one job completes.
   * Other active assignments, existing workload, and off-duty states (e.g. ON_LEAVE)
   * are strictly verified.
   */
  async updateJobStatus(
    workOrderId: string,
    newStatus: WorkOrderStatus,
    workNotes?: string,
    actorName: string = "Kamrul Islam (Technician)"
  ): Promise<TechnicianApiResponse<WorkOrder>> {
    try {
      const res = await api.patch(`/technician/jobs/${workOrderId}/status`, {
        status: newStatus,
        workNotes,
      });
      if (res.data?.success && res.data.data) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // Fall through to local operational store
    }

    const workOrders = operationalStore.getWorkOrders();
    const order = workOrders.find((w) => w.id === workOrderId);
    if (!order) {
      throw new TechnicianApiError(`Work Order ${workOrderId} not found in active roster.`, {
        status: 404,
      });
    }

    // If already COMPLETED and confirming customer sign-off, record customer verification
    if (order.status === "COMPLETED" && newStatus === "COMPLETED") {
      if (order.completionReport) {
        order.completionReport.confirmedByCustomer = true;
        order.completionReport.confirmedAt = new Date().toISOString();
      }
      operationalStore.setWorkOrders([...workOrders]);
      return {
        success: true,
        data: order,
        isOffline: true,
        message: `[Local Preview] Work Order ${workOrderId} customer sign-off recorded.`,
        timestamp: new Date().toISOString(),
      };
    }

    // Strict validation of linear lifecycle transition
    const validNextStates = VALID_WORK_ORDER_TRANSITIONS[order.status] || [];
    if (!validNextStates.includes(newStatus)) {
      throw new TechnicianApiError(
        `Illegal status transition: Cannot change Work Order ${workOrderId} from "${order.status}" to "${newStatus}". Valid next states are: ${
          validNextStates.length > 0 ? validNextStates.join(", ") : "None (terminal state)"
        }.`,
        { code: "INVALID_TRANSITION" }
      );
    }

    const previousStatus = order.status;
    order.status = newStatus;

    if (workNotes) {
      order.workNotes = order.workNotes ? `${order.workNotes} | ${workNotes}` : workNotes;
    }

    if (newStatus === "TRAVELLING" && !order.startedAt) {
      order.startedAt = new Date().toISOString();
    } else if (newStatus === "ON_SITE") {
      // Physical technician arrival milestone reached: Arrival SLA met
      order.startedAt = order.startedAt || new Date().toISOString();
    } else if (newStatus === "WORK_COMPLETED_AWAITING_CONFIRMATION") {
      order.completionReport = {
        completedAt: new Date().toISOString(),
        notes: workNotes || "Work completed on site. Awaiting customer confirmation.",
        technicianName: actorName,
        confirmedByCustomer: false,
      };
    } else if (newStatus === "COMPLETED") {
      order.completedAt = new Date().toISOString();
      if (order.completionReport) {
        order.completionReport.confirmedByCustomer = true;
        order.completionReport.confirmedAt = new Date().toISOString();
      }

      // 1. Reconcile technician availability safely against ALL remaining active assignments
      if (order.assignedTechnicianId) {
        const techs = operationalStore.getTechnicians();
        const assignedTech = techs.find((t) => t.id === order.assignedTechnicianId);
        if (assignedTech) {
          reconcileTechnicianOperationalStatus(assignedTech, workOrders);
          operationalStore.setTechnicians([...techs]);
        }
      }

      // 2. Automatically generate itemized Customer Invoice (Demonstration Draft)
      const invoices = operationalStore.getInvoices();
      const invoiceId = `INV-${4100 + invoices.length + 1}`;
      const newInvoice: Invoice = {
        id: invoiceId,
        workOrderId: order.id,
        customerId: "cust-epz-01",
        customerName: order.customerName,
        assetName: order.assetName,
        billingDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "PAYMENT_DUE",
        items: [
          {
            id: `li-${Date.now()}-1`,
            description: `On-Site Diagnostic & SLA Callout: ${order.category}`,
            quantity: 1,
            unitPrice: 120,
            totalPrice: 120,
          },
          {
            id: `li-${Date.now()}-2`,
            description: `Certified Repair & Component Restoration (${order.problemSummary})`,
            quantity: 1,
            unitPrice: 280,
            totalPrice: 280,
          },
        ],
        subtotal: 400,
        taxRate: 0.05,
        taxAmount: 20,
        totalAmount: 420,
        paymentNotice: "Demonstration Statement: Official billing and settlement require backend financial gateway integration.",
      };
      operationalStore.setInvoices([newInvoice, ...invoices]);
    }

    operationalStore.setWorkOrders([...workOrders]);

    // Record operational event
    const events = operationalStore.getEvents();
    operationalStore.setEvents([
      {
        id: `EVT-T-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: "STATUS_CHANGED",
        actorName,
        targetId: workOrderId,
        summary: `Work Order ${workOrderId} updated from ${previousStatus} to ${newStatus}.${
          workNotes ? ` Notes: ${workNotes}` : ""
        }`,
        severity: newStatus === "COMPLETED" ? "INFO" : "WARNING",
      },
      ...events,
    ]);

    return {
      success: true,
      data: order,
      isOffline: true,
      message: `[Local Preview] Work Order ${workOrderId} status updated to ${newStatus}.`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Submit technician completion report with notes and materials.
   * Transitions status to WORK_COMPLETED_AWAITING_CONFIRMATION.
   */
  async submitJobCompletion(
    workOrderId: string,
    report: {
      notes: string;
      materialsUsed?: string;
      workPerformed?: string;
      diagnosis?: string;
      technicianName?: string;
    }
  ): Promise<TechnicianApiResponse<WorkOrder>> {
    const actorName = report.technicianName || "Kamrul Islam (Technician)";
    const workOrders = operationalStore.getWorkOrders();
    const order = workOrders.find((w) => w.id === workOrderId);
    if (!order) {
      throw new TechnicianApiError(`Work Order ${workOrderId} not found.`, { status: 404 });
    }

    const res = await this.updateJobStatus(
      workOrderId,
      "WORK_COMPLETED_AWAITING_CONFIRMATION",
      report.notes,
      actorName
    );

    if (order.completionReport) {
      if (report.materialsUsed) order.completionReport.materialsUsed = report.materialsUsed;
      if (report.workPerformed) order.completionReport.workPerformed = report.workPerformed;
      if (report.diagnosis) order.completionReport.diagnosis = report.diagnosis;
      order.completionReport.dispatcherApproved = false;
      order.completionReport.correctionRequested = false;
      operationalStore.setWorkOrders([...workOrders]);
    }

    // Notify Dispatcher that a completion report requires review
    notificationService.addNotification({
      role: "DISPATCHER",
      title: "New Completion Report Submitted",
      message: `${actorName} submitted completion report for Work Order ${workOrderId} (${order.assetName}). Dispatcher review required.`,
      type: "warning",
      link: "/dispatcher",
      actionLabel: "Review Report",
    });

    return res;
  },

  /**
   * Record interim work progress notes while technician is ON_SITE
   */
  async recordWorkProgress(
    workOrderId: string,
    progressNotes: string,
    actorName: string = "Kamrul Islam (Technician)"
  ): Promise<TechnicianApiResponse<WorkOrder>> {
    const workOrders = operationalStore.getWorkOrders();
    const order = workOrders.find((w) => w.id === workOrderId);
    if (!order) {
      throw new TechnicianApiError(`Work Order ${workOrderId} not found.`, { status: 404 });
    }

    order.workNotes = order.workNotes ? `${order.workNotes} | ${progressNotes}` : progressNotes;
    operationalStore.setWorkOrders([...workOrders]);

    const events = operationalStore.getEvents();
    operationalStore.setEvents([
      {
        id: `EVT-T-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: "STATUS_CHANGED",
        actorName,
        targetId: workOrderId,
        summary: `Work Order ${workOrderId} progress update: ${progressNotes}`,
        severity: "INFO",
      },
      ...events,
    ]);

    return {
      success: true,
      data: order,
      isOffline: true,
      message: `[Local Preview] Progress recorded for Work Order ${workOrderId}.`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Confirm job completion (Customer action).
   * Transitions status from WORK_COMPLETED_AWAITING_CONFIRMATION to COMPLETED.
   */
  async confirmJobCompletion(
    workOrderId: string,
    customerName: string = "Customer"
  ): Promise<TechnicianApiResponse<WorkOrder>> {
    return this.updateJobStatus(
      workOrderId,
      "COMPLETED",
      `Completion confirmed by customer ${customerName}.`,
      `${customerName} (Customer)`
    );
  },
};
