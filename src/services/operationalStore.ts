// ============================================================================
// VoltOps Frontend — Client-Side Prototype Operational Store
// ============================================================================
// ARCHITECTURAL BOUNDARY & LIMITATIONS NOTICE:
// 1. SCOPE: This is a TEMPORARY, CLIENT-SIDE DEMONSTRATION STATE ENGINE.
//    It is NOT a persistent database and does not replace backend persistence.
// 2. LIFECYCLE: Persists strictly to browser `sessionStorage` (cleared on tab close).
//    In Node.js, test harnesses, and SSR environments, it falls back to in-memory state.
// 3. SECURITY & DATA ISOLATION:
//    - Operational state is strictly isolated from authentication credentials.
//    - NEVER store user passwords, JWT tokens, session cookies, or payment card details here.
//    - Authentication secrets remain exclusively within secure httpOnly cookies / AuthContext.
// 4. MALFORMED / CORRUPTED STORAGE PROTECTION:
//    - All incoming raw storage payloads are parsed within guarded try/catch blocks.
//    - Validated by structural type guards before acceptance.
//    - Corrupted or unparseable states are safely discarded, resetting to clean baselines.
// ============================================================================

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
    paymentNotice: "Demonstration Billing Statement: Payment gateway integration (Stripe / Bank ACH) pending backend milestone.",
  },
];

export interface OperationalState {
  requests: ServiceRequest[];
  workOrders: WorkOrder[];
  technicians: TechnicianProfile[];
  invoices: Invoice[];
  events: DispatchEventLog[];
}

function createPristineBaseline(): OperationalState {
  return {
    requests: JSON.parse(JSON.stringify(INITIAL_SERVICE_REQUESTS)),
    workOrders: JSON.parse(JSON.stringify(INITIAL_WORK_ORDERS)),
    technicians: JSON.parse(JSON.stringify(INITIAL_FIELD_TECHNICIANS)),
    invoices: JSON.parse(JSON.stringify(INITIAL_INVOICES)),
    events: JSON.parse(JSON.stringify(INITIAL_DISPATCH_EVENTS)),
  };
}

let memoryState: OperationalState = createPristineBaseline();

function hasSessionStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Structural Type Guard: Validates that an untrusted object meets OperationalState integrity.
 * Prevents corrupted or malicious storage structures from crashing UI components.
 */
export function validateOperationalState(candidate: unknown): OperationalState | null {
  if (!candidate || typeof candidate !== "object") return null;
  const c = candidate as Partial<OperationalState>;

  const isArrayOfObjectsWithId = (arr: unknown): boolean =>
    Array.isArray(arr) && arr.every((item) => item && typeof item === "object" && typeof (item as any).id === "string");

  if (!isArrayOfObjectsWithId(c.requests)) return null;
  if (!isArrayOfObjectsWithId(c.workOrders)) return null;
  if (!isArrayOfObjectsWithId(c.technicians)) return null;
  if (!isArrayOfObjectsWithId(c.invoices)) return null;
  if (!isArrayOfObjectsWithId(c.events)) return null;

  return candidate as OperationalState;
}

function loadState(): OperationalState {
  if (hasSessionStorage()) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const validated = validateOperationalState(parsed);
        if (validated) {
          return validated;
        }
        // Malformed structure detected: discard corrupted state safely
        console.warn("[VoltOps Demo Store] Malformed session storage structure discarded. Reverting to baseline.");
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn("[VoltOps Demo Store] Corrupted session storage JSON discarded:", err);
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore removal error
      }
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
      // Storage quota exceeded or disabled in strict security mode
    }
  }
  notifySubscribers();
}

function notifySubscribers(): void {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    } catch {
      // CustomEvent dispatch fallback
    }
  }
}

/**
 * Reconciles technician availability status strictly against active non-completed assignments.
 * Ensures consistent availability rules across Dispatcher and Technician portals:
 * - A technician with remaining active jobs (ASSIGNED, TRAVELLING, ON_SITE) remains ON_JOB / TRAVELLING.
 * - A technician with 0 remaining jobs returns to AVAILABLE only if their prior status was active duty.
 * - Technicians on leave (ON_LEAVE, OFF_DUTY, UNAVAILABLE) are NEVER forced to AVAILABLE.
 */
export function reconcileTechnicianOperationalStatus(
  tech: TechnicianProfile,
  allWorkOrders: WorkOrder[]
): TechnicianProfile {
  const activeAssignments = allWorkOrders.filter(
    (w) =>
      w.assignedTechnicianId === tech.id &&
      w.status !== "COMPLETED" &&
      w.status !== "CANCELLED"
  );

  tech.activeJobCount = activeAssignments.length;

  if (activeAssignments.length > 0) {
    const hasOnSite = activeAssignments.some((w) => w.status === "ON_SITE");
    const hasTravelling = activeAssignments.some((w) => w.status === "TRAVELLING");

    if (hasOnSite) {
      tech.status = "ON_JOB";
    } else if (hasTravelling) {
      tech.status = "TRAVELLING";
    } else {
      tech.status = "ON_JOB";
    }
  } else {
    // 0 active jobs: return to AVAILABLE only if previously in an active duty state
    if (tech.status === "ON_JOB" || tech.status === "TRAVELLING") {
      tech.status = "AVAILABLE";
    }
    // If ON_LEAVE, OFF_DUTY, UNAVAILABLE, or BREAK, preserve their existing off-duty status
  }

  return tech;
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
   * Reset store to pristine initial state (for test isolation and clean teardown)
   */
  reset(): void {
    const pristine = createPristineBaseline();
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
