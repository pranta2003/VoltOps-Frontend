// Dispatcher Operations Module TypeScript Definitions
// Strictly aligned with AGENTS.md, canonical 7 trades, and Admin design contract.

import {
  ServiceCategory,
  PriorityLevel,
  RequestStatus,
  WorkOrderStatus,
  TechnicianStatus,
  ServiceRequest,
  WorkOrder,
  TechnicianProfile,
} from "./index";

export interface WorkOrderFilterParams {
  search?: string;
  status?: WorkOrderStatus | "ALL";
  category?: ServiceCategory | "ALL";
  priority?: PriorityLevel | "ALL";
  branch?: string;
}

export interface ServiceRequestFilterParams {
  search?: string;
  status?: RequestStatus | "ALL";
  category?: ServiceCategory | "ALL";
  priority?: PriorityLevel | "ALL";
}

export interface TechnicianRecommendation {
  technicianId: string;
  technicianName: string;
  employeeId: string;
  designation: string;
  category: ServiceCategory;
  branch: string;
  status: TechnicianStatus;
  etaMinutes: number;
  matchScore: number; // 0..100 calculated arithmetic score
  skills: string[];
  certifications: string[];
  explanation: string;
  isEligible: boolean;
  activeJobCount: number;
}

export interface CreateWorkOrderDTO {
  requestId: string;
  priority: PriorityLevel;
  slaDeadline: string; // ISO 8601
  notes?: string;
}

export interface AssignTechnicianDTO {
  workOrderId: string;
  technicianId: string;
  dispatcherNotes?: string;
}

export interface DispatcherMetrics {
  unassignedRequests: number;
  activeWorkOrders: number;
  techniciansOnDuty: number;
  urgentSlaWatch: number;
  totalCompletedToday: number;
  tradeCoverage: {
    category: ServiceCategory;
    availableCount: number;
    activeCount: number;
  }[];
}

export interface DispatcherApiResponse<T> {
  success: boolean;
  data: T;
  isOffline: boolean;
  message?: string;
  timestamp: string;
}

export interface DispatchEventLog {
  id: string;
  timestamp: string;
  action: "REQUEST_REVIEWED" | "ORDER_CREATED" | "TECH_DISPATCHED" | "STATUS_CHANGED" | "CANCELLED";
  actorName: string;
  targetId: string;
  summary: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}
