// Centralized Customer Service & Breakdown Request Service
// Handles service breakdown request creation, tracking, itemized invoicing, and payment.

import api from "../api/axios";
import { ServiceRequest, Invoice, ServiceCategory, PriorityLevel } from "../types";
import { operationalStore } from "./operationalStore";

export interface CreateServiceRequestDTO {
  category: ServiceCategory;
  assetName: string;
  problemTitle: string;
  problemDescription: string;
  priority: PriorityLevel;
  facilityAddress?: string;
  contactPhone?: string;
  preferredDateTime?: string;
  coveragePlan?: "8hr" | "247-standard" | "247-priority" | "custom";
}

export interface CustomerApiResponse<T> {
  success: boolean;
  data: T;
  isOffline: boolean;
  message?: string;
  timestamp: string;
}

export class CustomerApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = "CustomerApiError";
    this.status = options?.status;
    this.code = options?.code;
  }
}

export const customerService = {
  /**
   * Fetch customer breakdown requests
   */
  async getRequests(customerId?: string): Promise<CustomerApiResponse<ServiceRequest[]>> {
    try {
      const res = await api.get("/customer/requests");
      if (res.data?.success && Array.isArray(res.data.data)) {
        return {
          success: true,
          data: res.data.data,
          isOffline: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // Fall through to local operational baseline
    }

    const allRequests = operationalStore.getRequests();
    const filtered = customerId
      ? allRequests.filter((r) => r.customerId === customerId || r.customerId === "cust-epz-01")
      : allRequests;

    return {
      success: true,
      data: filtered,
      isOffline: true,
      message: "[Local Preview] Operating on synchronized operational store.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Submit a new commercial facility service request
   */
  async createRequest(
    dto: CreateServiceRequestDTO,
    customer?: { id?: string; name?: string; address?: string; phone?: string }
  ): Promise<CustomerApiResponse<ServiceRequest>> {
    // Client-side validation
    if (!dto.problemTitle?.trim()) {
      throw new CustomerApiError("Problem title is required.", { code: "VALIDATION_ERROR" });
    }
    if (!dto.problemDescription?.trim()) {
      throw new CustomerApiError("Problem description is required.", { code: "VALIDATION_ERROR" });
    }
    if (!dto.assetName?.trim()) {
      throw new CustomerApiError("Asset selection is required.", { code: "VALIDATION_ERROR" });
    }

    try {
      const res = await api.post("/customer/requests", dto);
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

    const currentRequests = operationalStore.getRequests();
    const newId = `SR-${1000 + currentRequests.length + 1}`;
    const plan = dto.coveragePlan || "247-standard";

    let slaRemainingMinutes: number | null = null;
    if (plan === "247-priority") {
      slaRemainingMinutes = 20;
    } else if (plan === "247-standard") {
      slaRemainingMinutes = 40;
    } else {
      slaRemainingMinutes = null;
    }

    const newRequest: ServiceRequest = {
      id: newId,
      customerId: customer?.id || "cust-epz-01",
      customerName: customer?.name || "Apex Spinning & Weaving Mills",
      facilityAddress:
        dto.facilityAddress || customer?.address || "Plot 14-18, Sector 3, DEPZ, Savar",
      contactPhone: dto.contactPhone || customer?.phone || "+880 1711-204918",
      category: dto.category,
      assetName: dto.assetName,
      problemTitle: dto.problemTitle.trim(),
      problemDescription: dto.problemDescription.trim(),
      priority: dto.priority,
      status: "NEW",
      submittedAt: new Date().toISOString(),
      preferredDateTime: dto.preferredDateTime || "Immediate / ASAP",
      coveragePlan: plan,
      slaRemainingMinutes,
    };

    operationalStore.setRequests([newRequest, ...currentRequests]);

    // Record operational event
    const events = operationalStore.getEvents();
    operationalStore.setEvents([
      {
        id: `EVT-C-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: "REQUEST_REVIEWED",
        actorName: customer?.name || "Commercial Customer",
        targetId: newId,
        summary: `New service request submitted: ${newId} (${dto.category} - ${dto.assetName}).`,
        severity: dto.priority === "URGENT" ? "CRITICAL" : "INFO",
      },
      ...events,
    ]);

    return {
      success: true,
      data: newRequest,
      isOffline: true,
      message: `[Local Demonstration] Service Request ${newId} logged to active dispatcher queue.`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Fetch customer billing invoices
   */
  async getInvoices(customerId?: string): Promise<CustomerApiResponse<Invoice[]>> {
    try {
      const res = await api.get("/customer/invoices");
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

    const invoices = operationalStore.getInvoices();
    const filtered = customerId
      ? invoices.filter((inv) => inv.customerId === customerId || inv.customerId === "cust-epz-01")
      : invoices;

    return {
      success: true,
      data: filtered,
      isOffline: true,
      message: "[Local Preview] Operating on synchronized operational invoices.",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Pay a customer invoice
   */
  async payInvoice(invoiceId: string): Promise<CustomerApiResponse<Invoice>> {
    try {
      const res = await api.post(`/customer/invoices/${invoiceId}/pay`);
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

    const invoices = operationalStore.getInvoices();
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      throw new CustomerApiError(`Invoice ${invoiceId} not found.`, { status: 404 });
    }

    inv.status = "PAID";
    operationalStore.setInvoices([...invoices]);

    return {
      success: true,
      data: inv,
      isOffline: true,
      message: `[Local Preview] Invoice ${invoiceId} marked as PAID.`,
      timestamp: new Date().toISOString(),
    };
  },
};
