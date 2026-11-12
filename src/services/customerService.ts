// ============================================================================
// VoltOps Customer Service Layer & Integration Boundary
// ============================================================================
// Encapsulates all Customer portal business logic, request creation, itemized
// billing retrieval, and payment gateway integration boundaries.
//
// INTEGRATION CONTRACTS (Future Backend):
// - GET   /api/customer/requests                -> Breakdown requests for customer
// - POST  /api/customer/requests                -> Submit breakdown request
// - GET   /api/customer/invoices                -> Itemized billing statements
// - POST  /api/customer/invoices/:id/initiate-payment -> Create gateway payment intent
// - POST  /api/webhooks/payment                 -> Backend gateway webhook confirming PAID
// ============================================================================

import api from "../api/axios";
import { ServiceRequest, Invoice, ServiceCategory, PriorityLevel, CoveragePlanId, CustomerAsset } from "../types";
import { getPhysicalArrivalSlaMinutes } from "../types/coverage";
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
  coveragePlan?: CoveragePlanId;
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

export class PaymentGatewayPendingError extends CustomerApiError {
  constructor(invoiceId: string) {
    super(
      `Payment processing for Invoice ${invoiceId} requires external payment gateway integration. Invoices cannot be marked PAID in offline/demo mode without backend confirmation.`,
      { status: 501, code: "GATEWAY_INTEGRATION_PENDING" }
    );
    this.name = "PaymentGatewayPendingError";
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
   * Submit a new commercial facility service request.
   * SLA RULE: Physical arrival SLA is determined strictly by the customer's coverage plan,
   * NOT by the urgency level. Urgency describes failure impact, not arrival guarantees.
   */
  async createRequest(
    dto: CreateServiceRequestDTO,
    customer?: { id?: string; name?: string; address?: string; phone?: string; coveragePlan?: CoveragePlanId }
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
    
    // Coverage plan hierarchy: explicit DTO plan -> customer profile plan -> default standard plan
    const plan: CoveragePlanId = dto.coveragePlan || customer?.coveragePlan || "247-standard";

    // SLA Deadline calculation: strictly governed by Coverage Plan, NEVER by priority urgency
    const slaRemainingMinutes = getPhysicalArrivalSlaMinutes(plan);

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
        summary: `New service request submitted: ${newId} (${dto.category} - ${dto.assetName}). Plan: ${plan}.`,
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
   * Fetch commercial facility assets for customer
   */
  async getAssets(_customerId?: string): Promise<CustomerApiResponse<CustomerAsset[]>> {
    try {
      const res = await api.get("/customer/assets");
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

    const assets = operationalStore.getAssets();
    return {
      success: true,
      data: assets,
      isOffline: true,
      message: "[Local Preview] Operating on synchronized customer facility assets.",
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
   * Initiate invoice payment.
   * PAYMENT BOUNDARY ENFORCEMENT:
   * Frontend cannot confirm financial settlement without backend payment gateway webhook.
   * Calling initiatePayment separates payment initiation from confirmation.
   * If offline or in demo mode, status transitions to PAYMENT_PENDING with an explicit integration notice.
   * Invoices are NEVER marked PAID by frontend actions alone.
   */
  async initiatePayment(invoiceId: string): Promise<CustomerApiResponse<Invoice>> {
    try {
      const res = await api.post(`/customer/invoices/${invoiceId}/initiate-payment`);
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

    // Do NOT mark as PAID. Advance to PAYMENT_PENDING indicating payment gateway session active.
    inv.status = "PAYMENT_PENDING";
    inv.paymentNotice = "Payment initiated: Awaiting payment gateway webhook confirmation. Invoices cannot be marked PAID in frontend demo mode.";
    operationalStore.setInvoices([...invoices]);

    return {
      success: true,
      data: inv,
      isOffline: true,
      message: `[Payment Boundary] Payment intent created for ${invoiceId}. Invoices require backend financial confirmation before transition to PAID.`,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Legacy alias for initiatePayment to preserve backwards compatibility while strictly enforcing semantics.
   */
  async payInvoice(invoiceId: string): Promise<CustomerApiResponse<Invoice>> {
    return this.initiatePayment(invoiceId);
  },
};
