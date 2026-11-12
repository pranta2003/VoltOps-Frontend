// Centralized Reactive Operational Data Store for VoltOps
// Provides a unified, single source of truth for all four roles (Customer, Dispatcher, Technician, Admin)
// when running in local demonstration / offline mode, ensuring 100% end-to-end workflow coherence.

import { ServiceRequest, WorkOrder, TechnicianProfile, Invoice } from "../types";
import { DispatchEventLog } from "../types/dispatcher";
import {
  INITIAL_SERVICE_REQUESTS,
  INITIAL_WORK_ORDERS,
  INITIAL_FIELD_TECHNICIANS,
  INITIAL_DISPATCH_EVENTS,
} from "./mockDispatcherData";

const STORAGE_KEY = "voltops_operational_state_v1";
const EVENT_NAME = "voltops-operational-update";

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: "INV-4091",
    workOrderId: "WO-2048",
    customerId: "cust-epz-01",
    customerName: "Apex Spinning & Weaving Mills",
    assetName: "Standby Generator G-01",
    billingDate: "2026-11-10",
    dueDate: "2026-11-25",
    status: "PAYMENT_DUE",
    items: [
      {
        id: "li-1",
        description: "Emergency Diagnostic Callout & ATS Inspection (24/7 Coverage Window)",
        quantity: 1,
        unitPrice: 120,
        totalPrice: 120,
      },
      {
        id: "li-2",
        description: "Replaced 400A Automatic Transfer Switch Coil & Contactor Assembly",
        quantity: 1,
        unitPrice: 380,
        totalPrice: 380,
      },
      {
        id: "li-3",
        description: "Certified High Voltage On-Site Load & Synchronization Testing (2.5 hrs)",
        quantity: 2.5,
        unitPrice: 60,
        totalPrice: 150,
      },
    ],
    subtotal: 650,
    taxRate: 0.05,
    taxAmount: 32.5,
    totalAmount: 682.5,
    paymentNotice: "Payment is a UI preview only. No real banking transaction will be processed.",
  },
];

interface OperationalState {
  requests: ServiceRequest[];
  workOrders: WorkOrder[];
  technicians: TechnicianProfile[];
  invoices: Invoice[];
  events: DispatchEventLog[];
}

// In-memory fallback for SSR / test environments
let memoryState: OperationalState = {
  requests: JSON.parse(JSON.stringify(INITIAL_SERVICE_REQUESTS)),
  workOrders: JSON.parse(JSON.stringify(INITIAL_WORK_ORDERS)),
  technicians: JSON.parse(JSON.stringify(INITIAL_FIELD_TECHNICIANS)),
  invoices: JSON.parse(JSON.stringify(INITIAL_INVOICES)),
  events: JSON.parse(JSON.stringify(INITIAL_DISPATCH_EVENTS)),
};

function hasSessionStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

function loadState(): OperationalState {
  if (hasSessionStorage()) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed.requests) &&
          Array.isArray(parsed.workOrders) &&
          Array.isArray(parsed.technicians) &&
          Array.isArray(parsed.invoices) &&
          Array.isArray(parsed.events)
        ) {
          return parsed;
        }
      }
    } catch {
      // Fall through to memory
    }
  }
  return memoryState;
}

function saveState(state: OperationalState): void {
  memoryState = state;
  if (hasSessionStorage()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota or restriction
    }
  }
  notifySubscribers();
}

function notifySubscribers(): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    } catch {
      // Event dispatch fallback
    }
  }
}

export const operationalStore = {
  getRequests(): ServiceRequest[] {
    return loadState().requests;
  },

  setRequests(requests: ServiceRequest[]): void {
    const state = loadState();
    saveState({ ...state, requests });
  },

  getWorkOrders(): WorkOrder[] {
    return loadState().workOrders;
  },

  setWorkOrders(workOrders: WorkOrder[]): void {
    const state = loadState();
    saveState({ ...state, workOrders });
  },

  getTechnicians(): TechnicianProfile[] {
    return loadState().technicians;
  },

  setTechnicians(technicians: TechnicianProfile[]): void {
    const state = loadState();
    saveState({ ...state, technicians });
  },

  getInvoices(): Invoice[] {
    return loadState().invoices;
  },

  setInvoices(invoices: Invoice[]): void {
    const state = loadState();
    saveState({ ...state, invoices });
  },

  getEvents(): DispatchEventLog[] {
    return loadState().events;
  },

  setEvents(events: DispatchEventLog[]): void {
    const state = loadState();
    saveState({ ...state, events });
  },

  /**
   * Reset store to pristine initial state (useful in testing)
   */
  reset(): void {
    const pristine: OperationalState = {
      requests: JSON.parse(JSON.stringify(INITIAL_SERVICE_REQUESTS)),
      workOrders: JSON.parse(JSON.stringify(INITIAL_WORK_ORDERS)),
      technicians: JSON.parse(JSON.stringify(INITIAL_FIELD_TECHNICIANS)),
      invoices: JSON.parse(JSON.stringify(INITIAL_INVOICES)),
      events: JSON.parse(JSON.stringify(INITIAL_DISPATCH_EVENTS)),
    };
    saveState(pristine);
  },

  /**
   * Subscribe to state mutations across the application
   */
  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return () => {};
    }
    const handler = () => callback();
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  },
};
