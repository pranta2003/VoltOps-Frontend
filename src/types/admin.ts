// ============================================================================
// VoltOps Admin Module — Typed Data Models & DTO Contracts
// ============================================================================
// Single source of truth for Admin dashboards, user management, technician
// verification passports, and system security audit ledgers.
// ============================================================================

import { Role, ServiceCategory, TechnicianStatus } from "./index";

// ── 1. Admin Dashboard Telemetry DTOs ─────────────────────────────────────────

export interface AdminOperationalMetrics {
  totalUsers: number | null;
  activeTechnicians: number | null;
  pendingVerifications: number | null;
  dispatchersOnDuty: number | null;
  slaComplianceRate: number | null; // null if no resolved work orders exist yet
  dataSource: "LIVE_API" | "UNAVAILABLE" | "OFFLINE_BASELINE";
  telemetryTimestamp?: string;
  notes?: string;
}

// ── 2. User Management DTOs ───────────────────────────────────────────────────

export interface ManagedUserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch: string;
  department?: string;
  designation?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface CreateStaffAccountPayload {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "DISPATCHER" | "TECHNICIAN";
  branch: string;
  department?: string;
  designation?: string;
}

export interface UpdateUserStatusPayload {
  isActive: boolean;
  reason?: string;
}

export interface UserListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role | "ALL";
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  sortBy?: "name" | "createdAt" | "role";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── 3. Technician Verification DTOs ───────────────────────────────────────────

export type VerificationDecision = "VERIFIED" | "PENDING_REVIEW" | "REJECTED";

export interface TechnicianVerificationProfile {
  id: string;
  userId?: string;
  technicianName: string;
  employeeId: string;
  email: string;
  phone?: string;
  branch: string;
  currentArea: string;
  status: TechnicianStatus;
  primaryTrade: ServiceCategory;
  secondaryTrades: ServiceCategory[];
  licenseName: string;
  licenseNumber: string;
  issuingAuthority: string;
  expiryDate: string;
  verificationStatus: VerificationDecision;
  submittedDate: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  hasLicenseDocument: boolean;
  documentUrl?: string;
}

export interface SubmitVerificationDecisionPayload {
  status: "VERIFIED" | "REJECTED";
  notes: string;
}

// ── 4. System Security Audit Ledger DTOs ─────────────────────────────────────

export type AuditEventCategory =
  | "AUTH"
  | "ROLE_CHANGE"
  | "DISPATCH"
  | "VERIFICATION"
  | "SECURITY"
  | "ACCOUNT";

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface SystemAuditEvent {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  actorRole: Role | "SYSTEM" | "SECURITY";
  actorIp: string;
  category: AuditEventCategory;
  action: string;
  targetEntity: string;
  targetId?: string;
  severity: AuditSeverity;
  details: string;
}

export interface AuditListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: AuditEventCategory | "ALL";
  severity?: AuditSeverity | "ALL";
  startDate?: string;
  endDate?: string;
}

// ── 5. Standard API Service Result Pattern ────────────────────────────────────

export interface ServiceResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  isLive: boolean;
  statusCode?: number;
  endpointConnected: boolean;
}
