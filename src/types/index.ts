// Shared TypeScript definitions for VoltOps
// Single source of truth across all forms, tables, dashboards, and API clients.

// ── 1. User Roles & Authentication ───────────────────────────────────────
export type Role = "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "CUSTOMER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials?: string;
  company?: string;
  avatarUrl?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ── 2. Canonical 7 Service Categories (Strict Standard across VoltOps) ───
export const CANONICAL_SERVICE_CATEGORIES = [
  "Electrical and power systems",
  "AC, HVAC, and cooling",
  "CCTV and security",
  "Internet, networking, and hardware",
  "IT and software support",
  "Plumbing and water systems",
  "Facility maintenance",
] as const;

export type ServiceCategory = (typeof CANONICAL_SERVICE_CATEGORIES)[number];

// ── 3. Priorities & Urgency Levels ───────────────────────────────────────
// Request urgency describes operational impact and failure severity.
// Guaranteed physical technician arrival times are strictly governed by Coverage Plans.
export type PriorityLevel = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface PriorityInfo {
  level: PriorityLevel;
  label: string;
  impactDescription: string;
  badgeColorClass: string;
}

export * from "./coverage";

// ── 4. Service Requests (Customer -> Dispatcher) ──────────────────────────
export type RequestStatus = "NEW" | "REVIEWING" | "CONVERTED" | "CANCELLED";

export interface ServiceRequest {
  id: string; // e.g. "SR-001" or "SR-1024"
  customerId: string;
  customerName: string;
  facilityAddress: string;
  contactPhone?: string;
  category: ServiceCategory;
  assetName: string; // e.g. "Generator G-01", "Transformer T-04"
  problemTitle: string;
  problemDescription: string;
  priority: PriorityLevel;
  status: RequestStatus;
  submittedAt: string; // ISO 8601
  preferredDateTime?: string;
  coveragePlan?: "8hr" | "247-standard" | "247-priority" | "custom";
  slaRemainingMinutes?: number | null;
  workOrderId?: string;
}

// ── 5. Work Orders (Dispatcher -> Technician) ─────────────────────────────
export type WorkOrderStatus = "UNASSIGNED" | "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "COMPLETED" | "CANCELLED";

export interface WorkOrder {
  id: string; // e.g. "WO-1024" or "WO-2048"
  requestId: string;
  customerName: string;
  facilityAddress: string;
  category: ServiceCategory;
  assetName: string;
  problemSummary: string;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  coveragePlan?: "8hr" | "247-standard" | "247-priority" | "custom";
  slaDeadline?: string | null; // ISO 8601 or null for 8-Hour/Custom coverage without physical arrival SLA
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  workNotes?: string;
}

// ── 6. Technicians & Skills ───────────────────────────────────────────────
export type TechnicianStatus = "AVAILABLE" | "ON_JOB" | "TRAVELLING" | "BREAK" | "OFF_DUTY" | "ON_LEAVE" | "UNAVAILABLE";

export interface TechnicianSkill {
  id: string;
  name: string;
  category: ServiceCategory;
}

export interface TechnicianCertification {
  id: string;
  name: string;
  issuedBy: string;
  expiryDate: string;
  verified: boolean;
}

export interface TechnicianProfile {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  designation: string;
  status: TechnicianStatus;
  currentArea?: string;
  skills: TechnicianSkill[];
  certifications: TechnicianCertification[];
  activeJobCount: number;
  matchScore?: number; // 0..100 computed by Matching Engine
  matchReason?: string; // Plain English generated explanation
}

// ── 7. Customers & Assets ─────────────────────────────────────────────────
export interface CustomerAsset {
  id: string;
  name: string;
  tagNumber: string;
  category: ServiceCategory;
  location: string;
  installedDate?: string;
  lastServiceDate?: string;
  status: "OPERATIONAL" | "NEEDS_SERVICE" | "OUT_OF_ORDER";
}

export interface CustomerProfile {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  coveragePlan: "8hr" | "247-standard" | "247-priority" | "custom";
  assets: CustomerAsset[];
}

// ── 8. Invoices & Billing ─────────────────────────────────────────────────
// Payment confirmation requires external payment gateway webhook or banking settlement.
export type InvoiceStatus = "PAYMENT_DUE" | "PAYMENT_PENDING" | "PAID" | "UNPAID" | "CANCELLED";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string; // e.g. "INV-4091"
  workOrderId: string;
  customerId: string;
  customerName: string;
  assetName: string;
  billingDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  subtotal: number;
  taxRate: number; // e.g. 0.05
  taxAmount: number;
  totalAmount: number;
  paymentNotice?: string;
}
