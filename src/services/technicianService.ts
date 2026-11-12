// Centralized Technician Job Progression & Field Service Execution Service
// Manages daily job rosters, en-route progress, arrival milestones, and completion sign-off.

import api from "../api/axios";
import { WorkOrder, WorkOrderStatus, Invoice } from "../types";
import { VALID_WORK_ORDER_TRANSITIONS } from "./dispatcherService";
import { operationalStore } from "./operationalStore";

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
    let relevantJobs = allWorkOrders.filter(
      (w) =>
        w.assignedTechnicianId === targetTechId ||
        w.assignedTechnicianName?.toLowerCase().includes("kamrul") ||
        w.status === "ASSIGNED" ||
        w.status === "TRAVELLING" ||
        w.status === "ON_SITE" ||
        w.status === "COMPLETED"
    );

    // If no filtered jobs found for specific tech, return all non-unassigned orders so preview technician can test
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
      // Technician physically present on site: SLA is met!
      order.startedAt = order.startedAt || new Date().toISOString();
    } else if (newStatus === "COMPLETED") {
      order.completedAt = new Date().toISOString();

      // 1. Release technician back to AVAILABLE
      const techs = operationalStore.getTechnicians();
      const assignedTech = techs.find((t) => t.id === order.assignedTechnicianId);
      if (assignedTech) {
        assignedTech.activeJobCount = Math.max(0, (assignedTech.activeJobCount || 1) - 1);
        if (assignedTech.activeJobCount === 0 && assignedTech.status === "ON_JOB") {
          assignedTech.status = "AVAILABLE";
        }
        operationalStore.setTechnicians([...techs]);
      }

      // 2. Automatically generate itemized Customer Invoice
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
        paymentNotice: "Payment is a UI preview only. No real banking transaction will be processed.",
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
};
