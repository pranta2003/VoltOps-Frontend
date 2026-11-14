// ============================================================================
// VoltOps Admin Module — Centralized Admin Service Layer
// ============================================================================
// Encapsulates all Admin API integration points, data transformations, error
// boundaries, and honest integration state reporting.
//
// INTEGRATION CONTRACTS:
// - GET   /api/admin/metrics          -> Aggregate governance telemetry
// - GET   /api/admin/users            -> Paginated staff & user directory
// - POST  /api/admin/users            -> Privileged staff account creation
// - PATCH /api/admin/users/:id/status -> Account activation/deactivation
// - GET   /api/technicians            -> Live technician directory (Existing)
// - PATCH /api/technicians/:id/verify -> Technician credential decisions
// - GET   /api/admin/audit            -> System security audit log ledger
// ============================================================================

import api from "../api/axios";
import {
  AdminOperationalMetrics,
  ManagedUserAccount,
  CreateStaffAccountPayload,
  UserListQueryParams,
  PaginatedResponse,
  TechnicianVerificationProfile,
  SubmitVerificationDecisionPayload,
  SystemAuditEvent,
  AuditListQueryParams,
  ServiceResult,
} from "../types/admin";
import {
  OFFLINE_BASELINE_USERS,
  OFFLINE_BASELINE_TECHNICIANS,
  OFFLINE_BASELINE_AUDIT_EVENTS,
} from "./mockAdminData";
import { ServiceCategory, Role } from "../types";
import { operationalStore } from "./operationalStore";
import { notificationService } from "./notificationService";

const STORAGE_ADMIN_TECHS_KEY = "voltops_admin_technicians_v1";
const STORAGE_ADMIN_AUDIT_KEY = "voltops_admin_audit_logs_v1";

export function isLocalPreviewSession(): boolean {
  if (typeof window === "undefined") return true;
  return Boolean(
    sessionStorage.getItem("voltops_preview_role") ||
    sessionStorage.getItem("voltops_preview_user") ||
    !localStorage.getItem("voltops_token")
  );
}

export function getLocalAdminTechnicians(): TechnicianVerificationProfile[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_ADMIN_TECHS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
  }
  return JSON.parse(JSON.stringify(OFFLINE_BASELINE_TECHNICIANS));
}

export function saveLocalAdminTechnicians(techs: TechnicianVerificationProfile[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_ADMIN_TECHS_KEY, JSON.stringify(techs));
    } catch {
      // fallback
    }
  }
}

export function getLocalAuditLogs(): SystemAuditEvent[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_ADMIN_AUDIT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
  }
  return JSON.parse(JSON.stringify(OFFLINE_BASELINE_AUDIT_EVENTS));
}

export function saveLocalAuditLogs(logs: SystemAuditEvent[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_ADMIN_AUDIT_KEY, JSON.stringify(logs));
    } catch {
      // fallback
    }
  }
}

export class AdminService {
  /**
   * Retrieves Admin Governance Metrics.
   * Probes /api/admin/metrics first; falls back to live /api/technicians if aggregate metrics are unavailable.
   * Never fabricates fake SLA compliance rates or phantom users.
   */
  static async getDashboardMetrics(): Promise<AdminOperationalMetrics> {
    try {
      // 1. Attempt future aggregate metrics endpoint
      const metricsRes = await api.get("/admin/metrics");
      if (
        metricsRes.data &&
        typeof metricsRes.data === "object" &&
        metricsRes.data.success &&
        metricsRes.data.data
      ) {
        const d = metricsRes.data.data;
        return {
          totalUsers: typeof d.totalUsers === "number" ? d.totalUsers : null,
          activeTechnicians:
            typeof d.activeTechnicians === "number" ? d.activeTechnicians : null,
          pendingVerifications:
            typeof d.pendingVerifications === "number"
              ? d.pendingVerifications
              : null,
          dispatchersOnDuty:
            typeof d.dispatchersOnDuty === "number" ? d.dispatchersOnDuty : null,
          slaComplianceRate:
            typeof d.slaComplianceRate === "number" ? d.slaComplianceRate : null,
          dataSource: "LIVE_API",
          telemetryTimestamp: new Date().toISOString(),
          notes: "Live aggregate telemetry from /api/admin/metrics",
        };
      }
    } catch {
      // Fallback: /api/admin/metrics is not yet mounted in backend
    }

    try {
      // 2. Probe existing live endpoint /api/technicians
      const techRes = await api.get("/technicians");
      const technicians = Array.isArray(techRes.data?.technicians)
        ? techRes.data.technicians
        : [];
      const pendingCount = technicians.filter(
        (t: any) => t && t.verificationStatus === "PENDING_REVIEW"
      ).length;

      return {
        totalUsers: null, // Awaiting /api/admin/users endpoint
        activeTechnicians: technicians.length,
        pendingVerifications: pendingCount,
        dispatchersOnDuty: null, // Awaiting /api/admin/users endpoint
        slaComplianceRate: null, // Honest: No historical work orders resolved yet
        dataSource: "LIVE_API",
        telemetryTimestamp: new Date().toISOString(),
        notes: "Partially live via /api/technicians. Full telemetry requires /api/admin/metrics.",
      };
    } catch (err: any) {
      // 3. Backend is completely offline or unreachable
      return {
        totalUsers: null,
        activeTechnicians: null,
        pendingVerifications: null,
        dispatchersOnDuty: null,
        slaComplianceRate: null,
        dataSource: "OFFLINE_BASELINE",
        notes: "Backend server unreachable (http://localhost:5000). Awaiting backend service start.",
      };
    }
  }

  /**
   * Retrieves paginated, filtered user accounts.
   * Target: GET /api/admin/users
   */
  static async getUsers(
    params: UserListQueryParams = {}
  ): Promise<ServiceResult<PaginatedResponse<ManagedUserAccount>>> {
    try {
      const res = await api.get("/admin/users", { params });
      if (res.data && typeof res.data === "object") {
        let users: ManagedUserAccount[] = [];
        let total = 0;
        let page = params.page || 1;
        let limit = params.limit || 6;
        let totalPages = 1;

        if (Array.isArray(res.data.data)) {
          users = res.data.data;
          total = res.data.meta?.total ?? users.length;
          page = res.data.meta?.page ?? page;
          limit = res.data.meta?.limit ?? limit;
          totalPages = res.data.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));
        } else if (Array.isArray(res.data.users)) {
          users = res.data.users;
          total = res.data.total ?? users.length;
          totalPages = Math.max(1, Math.ceil(total / limit));
        } else if (Array.isArray(res.data)) {
          users = res.data;
          total = users.length;
          totalPages = Math.max(1, Math.ceil(total / limit));
        } else {
          throw new Error("Malformed API response: expected array of users.");
        }

        return {
          success: true,
          data: {
            success: true,
            data: users,
            meta: { page, limit, total, totalPages },
          },
          isLive: true,
          endpointConnected: true,
        };
      }
    } catch (err: any) {
      const status = err.response?.status;
      const endpointConnected = status !== 404 && err.code !== "ERR_NETWORK";

      // Filter offline baseline for demonstration
      let filtered = [...OFFLINE_BASELINE_USERS];
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.branch.toLowerCase().includes(q)
        );
      }
      if (params.role && params.role !== "ALL") {
        filtered = filtered.filter((u) => u.role === params.role);
      }
      if (params.status && params.status !== "ALL") {
        filtered = filtered.filter((u) =>
          params.status === "ACTIVE" ? u.isActive : !u.isActive
        );
      }

      const page = params.page || 1;
      const limit = params.limit || 6;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const paged = filtered.slice((page - 1) * limit, page * limit);

      return {
        success: true,
        data: {
          success: true,
          message:
            "Offline development baseline (endpoint /api/admin/users pending backend implementation)",
          data: paged,
          meta: { page, limit, total, totalPages },
        },
        isLive: false,
        statusCode: status,
        endpointConnected,
        error:
          status === 404
            ? "Backend endpoint GET /api/admin/users is not yet implemented."
            : err.message,
      };
    }

    return {
      success: false,
      data: null,
      isLive: false,
      endpointConnected: false,
      error: "Unexpected response shape from user directory API.",
    };
  }

  /**
   * Creates a staff account (ADMIN, DISPATCHER, TECHNICIAN).
   * Target: POST /api/admin/users
   * RULE: Never pretends persistence if backend endpoint is unavailable.
   */
  static async createStaffUser(
    payload: CreateStaffAccountPayload
  ): Promise<ServiceResult<ManagedUserAccount>> {
    try {
      const res = await api.post("/admin/users", payload);
      const createdUser = res.data?.user || res.data?.data;
      if (createdUser && typeof createdUser === "object" && createdUser.id) {
        return {
          success: true,
          data: createdUser,
          isLive: true,
          endpointConnected: true,
        };
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (status === 404
          ? "Backend endpoint POST /api/admin/users is not yet implemented in the backend repository. Account cannot be saved."
          : err.message || "Failed to create staff account.");

      return {
        success: false,
        data: null,
        isLive: false,
        statusCode: status,
        endpointConnected: status !== 404 && err.code !== "ERR_NETWORK",
        error: message,
      };
    }

    return {
      success: false,
      data: null,
      isLive: false,
      endpointConnected: false,
      error: "Unable to process staff account creation: invalid response structure.",
    };
  }

  /**
   * Activates or deactivates a user account.
   * Target: PATCH /api/admin/users/:id/status
   * RULE: Never pretends persistence if backend endpoint is unavailable.
   */
  static async updateUserStatus(
    userId: string,
    isActive: boolean,
    reason?: string
  ): Promise<ServiceResult<{ id: string; isActive: boolean }>> {
    try {
      const res = await api.patch(`/admin/users/${userId}/status`, {
        isActive,
        reason,
      });
      if (res.data) {
        return {
          success: true,
          data: { id: userId, isActive },
          isLive: true,
          endpointConnected: true,
        };
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (status === 404
          ? "Backend endpoint PATCH /api/admin/users/:id/status is not yet implemented in the backend repository. Status change cannot be saved."
          : err.message || "Failed to update account status.");

      return {
        success: false,
        data: null,
        isLive: false,
        statusCode: status,
        endpointConnected: status !== 404 && err.code !== "ERR_NETWORK",
        error: message,
      };
    }

    return {
      success: false,
      data: null,
      isLive: false,
      endpointConnected: false,
      error: "Status update request could not be processed.",
    };
  }

  /**
   * Retrieves technician credential passports for verification.
   * Target: GET /api/technicians
   */
  static async getTechnicians(): Promise<ServiceResult<TechnicianVerificationProfile[]>> {
    try {
      const res = await api.get("/technicians");
      if (res.data && Array.isArray(res.data.technicians)) {
        const liveItems: TechnicianVerificationProfile[] = res.data.technicians.map(
          (bt: any, idx: number) => {
            const primaryCert =
              bt.certifications?.[0]?.certification?.name ||
              bt.licenseName ||
              "Electrical Safety Certification";
            const expiryStr = bt.certifications?.[0]?.expiryDate
              ? new Date(bt.certifications[0].expiryDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : bt.licenseExpiryDate
              ? new Date(bt.licenseExpiryDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "15 Dec 2027";

            return {
              id: bt.id || `tech-live-${idx}`,
              userId: bt.userId || bt.user?.id,
              technicianName: bt.user?.name || `Technician ${idx + 1}`,
              employeeId: bt.employeeId || `TECH-00${idx + 1}`,
              email: bt.user?.email || "technician@voltops.test",
              phone: bt.phone || "+880 1700 000000",
              branch: bt.branch || "EPZ Industrial Core",
              currentArea: bt.currentArea || "Industrial Zone 1",
              status: bt.status || "AVAILABLE",
              primaryTrade: "Electrical and power systems" as ServiceCategory,
              secondaryTrades: ["AC, HVAC, and cooling" as ServiceCategory],
              licenseName: primaryCert,
              licenseNumber: bt.licenseNumber || `ELB-${bt.employeeId || idx + 101}`,
              issuingAuthority:
                bt.issuingAuthority || "Electrical Licensing Board (ELB), Bangladesh",
              expiryDate: expiryStr,
              verificationStatus: (bt.verificationStatus || "PENDING_REVIEW") as any,
              submittedDate: new Date(bt.joiningDate || Date.now()).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
              verifiedAt: bt.verifiedAt,
              verifiedBy: bt.verifiedBy,
              verificationNotes: bt.verificationNotes,
              hasLicenseDocument: Boolean(bt.licenseNumber || bt.certifications?.length),
            };
          }
        );

        return {
          success: true,
          data: liveItems,
          isLive: true,
          endpointConnected: true,
        };
      }
    } catch (err: any) {
      // Backend is offline or forbidden
      return {
        success: true,
        data: getLocalAdminTechnicians(),
        isLive: false,
        statusCode: err.response?.status,
        endpointConnected: false,
        error:
          err.code === "ERR_NETWORK"
            ? "Backend server offline. Displaying offline technician passport baseline."
            : err.message,
      };
    }

    return {
      success: true,
      data: getLocalAdminTechnicians(),
      isLive: false,
      endpointConnected: false,
    };
  }

  /**
   * Submits a formal verification decision (Approve / Reject) with audit notes.
   * Target: PATCH /api/technicians/:id/verify
   * In Local Preview Mode, updates operational store and logs audit event.
   */
  static async submitVerificationDecision(
    techId: string,
    payload: SubmitVerificationDecisionPayload
  ): Promise<ServiceResult<{ id: string; status: string; technicianName?: string }>> {
    const isPreview = isLocalPreviewSession();
    const localTechs = getLocalAdminTechnicians();
    const tech = localTechs.find((t) => t.id === techId);

    // Business Logic Validation: Expired credentials cannot be approved
    if (payload.status === "VERIFIED" && tech?.expiryDate) {
      const expDate = new Date(tech.expiryDate);
      if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
        return {
          success: false,
          data: null,
          isLive: false,
          endpointConnected: false,
          error: `Validation Error: Cannot approve expired credential (${tech.expiryDate}). Formal certificate renewal or supervisor exception is required.`,
        };
      }
    }

    // Business Logic Validation: Rejection requires explanatory audit note
    if (payload.status === "REJECTED" && (!payload.notes || !payload.notes.trim())) {
      return {
        success: false,
        data: null,
        isLive: false,
        endpointConnected: false,
        error: "Validation Error: An administrative audit note explaining the rejection reason is required before proceeding.",
      };
    }

    // Attempt live backend update if not in local preview mode
    if (!isPreview) {
      try {
        const res = await api.patch(`/technicians/${techId}/verify`, payload);
        if (res.data) {
          return {
            success: true,
            data: { id: techId, status: payload.status, technicianName: tech?.technicianName },
            isLive: true,
            endpointConnected: true,
          };
        }
      } catch (err: any) {
        const status = err.response?.status;
        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          (status === 404
            ? "Backend endpoint PATCH /api/technicians/:id/verify is not yet implemented in the backend repository. Decision cannot be saved."
            : err.message || "Failed to submit credential verification decision.");

        return {
          success: false,
          data: null,
          isLive: false,
          statusCode: status,
          endpointConnected: status !== 404 && err.code !== "ERR_NETWORK",
          error: message,
        };
      }
    }

    // Local Preview Mode: Execute and persist locally in operational store & audit log
    const previousStatus = tech?.verificationStatus || "PENDING_REVIEW";
    const reviewingAdmin = "Pranta (Lead Admin)";
    const reviewTimestamp = new Date().toISOString();
    const formattedReviewTimestamp = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 1. Update technician profile in local store
    const updatedTechs = localTechs.map((t) =>
      t.id === techId
        ? {
            ...t,
            verificationStatus: payload.status,
            verifiedAt: formattedReviewTimestamp,
            verifiedBy: reviewingAdmin,
            verificationNotes: payload.notes.trim(),
          }
        : t
    );
    saveLocalAdminTechnicians(updatedTechs);

    // 2. Synchronize with operationalStore field technicians if matching
    const opTechs = operationalStore.getTechnicians();
    const matchingOpTech = opTechs.find((ot) => ot.id === techId || ot.name === tech?.technicianName);
    if (matchingOpTech) {
      operationalStore.setTechnicians(
        opTechs.map((ot) =>
          ot.id === matchingOpTech.id
            ? {
                ...ot,
                status: payload.status === "VERIFIED" ? (ot.status === "UNAVAILABLE" ? "AVAILABLE" : ot.status) : ot.status,
              }
            : ot
        )
      );
    }

    // 3. Record full audit event with all required fields
    const auditLogs = getLocalAuditLogs();
    const newAuditEvent: SystemAuditEvent = {
      id: `demo-aud-${Date.now()}`,
      timestamp: formattedReviewTimestamp,
      actorName: reviewingAdmin,
      actorRole: "ADMIN",
      actorIp: "127.0.0.1 (Local Preview)",
      category: "VERIFICATION",
      action: `Technician credential ${payload.status === "VERIFIED" ? "approved" : "rejected"}: ${tech?.technicianName || techId}`,
      targetEntity: `Technician ${tech?.technicianName || techId} (${tech?.employeeId || "ID: " + techId})`,
      targetId: techId,
      severity: payload.status === "VERIFIED" ? "INFO" : "WARNING",
      details: JSON.stringify({
        technicianId: techId,
        credentialId: tech?.licenseNumber || "LIC-REG",
        previousStatus,
        newStatus: payload.status,
        reviewingAdmin,
        reviewTimestamp,
        auditNote: payload.notes.trim(),
      }),
    };
    auditLogs.unshift(newAuditEvent);
    saveLocalAuditLogs(auditLogs);

    // 4. Trigger in-app notification for Technician
    notificationService.addNotification({
      role: "TECHNICIAN",
      title: payload.status === "VERIFIED" ? "Skills Passport Verified" : "Credential Audit Notice",
      message: `Your ${tech?.licenseName || "license"} was ${payload.status === "VERIFIED" ? "approved" : "rejected"} by ${reviewingAdmin}. Audit Note: "${payload.notes.trim()}"`,
      type: payload.status === "VERIFIED" ? "success" : "warning",
      link: "/technician/skills",
    });

    return {
      success: true,
      data: {
        id: techId,
        status: payload.status,
        technicianName: tech?.technicianName,
      },
      isLive: false,
      endpointConnected: false,
    };
  }

  /**
   * Retrieves system security audit events.
   * Target: GET /api/admin/audit
   */
  static async getAuditLogs(
    params: AuditListQueryParams = {}
  ): Promise<ServiceResult<PaginatedResponse<SystemAuditEvent>>> {
    try {
      const res = await api.get("/admin/audit", { params });
      if (res.data && typeof res.data === "object") {
        let events: SystemAuditEvent[] = [];
        let total = 0;
        let page = params.page || 1;
        let limit = params.limit || 5;
        let totalPages = 1;

        if (Array.isArray(res.data.data)) {
          events = res.data.data;
          total = res.data.meta?.total ?? events.length;
          page = res.data.meta?.page ?? page;
          limit = res.data.meta?.limit ?? limit;
          totalPages = res.data.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));
        } else if (Array.isArray(res.data.events)) {
          events = res.data.events;
          total = res.data.total ?? events.length;
          totalPages = Math.max(1, Math.ceil(total / limit));
        } else if (Array.isArray(res.data)) {
          events = res.data;
          total = events.length;
          totalPages = Math.max(1, Math.ceil(total / limit));
        } else {
          throw new Error("Malformed API response: expected array of audit events.");
        }

        return {
          success: true,
          data: {
            success: true,
            data: events,
            meta: { page, limit, total, totalPages },
          },
          isLive: true,
          endpointConnected: true,
        };
      }
    } catch (err: any) {
      const status = err.response?.status;
      const endpointConnected = status !== 404 && err.code !== "ERR_NETWORK";

      // Filter offline baseline (with local preview persistence)
      let filtered = [...getLocalAuditLogs()];
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (evt) =>
            evt.action.toLowerCase().includes(q) ||
            evt.actorName.toLowerCase().includes(q) ||
            evt.targetEntity.toLowerCase().includes(q) ||
            evt.id.toLowerCase().includes(q)
        );
      }
      if (params.category && params.category !== "ALL") {
        filtered = filtered.filter((evt) => evt.category === params.category);
      }
      if (params.severity && params.severity !== "ALL") {
        filtered = filtered.filter((evt) => evt.severity === params.severity);
      }

      const page = params.page || 1;
      const limit = params.limit || 5;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const paged = filtered.slice((page - 1) * limit, page * limit);

      return {
        success: true,
        data: {
          success: true,
          message:
            "Offline baseline (endpoint GET /api/admin/audit pending backend implementation)",
          data: paged,
          meta: { page, limit, total, totalPages },
        },
        isLive: false,
        statusCode: status,
        endpointConnected,
        error:
          status === 404
            ? "Backend endpoint GET /api/admin/audit is not yet implemented."
            : err.message,
      };
    }

    return {
      success: false,
      data: null,
      isLive: false,
      endpointConnected: false,
      error: "Audit log request could not be completed.",
    };
  }
}
