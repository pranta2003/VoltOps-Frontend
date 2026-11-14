// ============================================================================
// VoltOps Unified Notification & Feedback Type Definitions
// ============================================================================

import { Role } from "./index";

export type NotificationType = "info" | "success" | "warning" | "alert";

export interface AppNotification {
  id: string;
  role: Role;
  userId?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
  link?: string;
  actionLabel?: string;
}

export interface CustomerFeedback {
  workOrderId: string;
  requestId?: string;
  rating: number; // 1 to 5 stars
  comment?: string;
  submittedAt?: string;
  timestamp?: string;
  customerName?: string;
}
