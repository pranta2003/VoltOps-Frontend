// ============================================================================
// VoltOps Unified Notification & Customer Feedback Service
// ============================================================================
// Serves all four portals: CUSTOMER, DISPATCHER, TECHNICIAN, ADMIN.
// Backed by operationalStore / localStorage persistence.
// ============================================================================

import { Role } from "../types";
import { AppNotification, CustomerFeedback } from "../types/notification";
import { operationalStore } from "./operationalStore";

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  // Customer Notifications
  {
    id: "notif-cust-1",
    role: "CUSTOMER",
    userId: "cust-epz-01",
    title: "Plan C Subscription Active",
    message: "Your 24/7 Priority Coverage plan is active with 30 monthly included service visits and a 20-minute physical arrival SLA.",
    timestamp: "2026-11-14T09:30:00Z",
    read: false,
    type: "success",
    link: "/customer",
  },
  {
    id: "notif-cust-2",
    role: "CUSTOMER",
    userId: "cust-epz-01",
    title: "Service Request Acknowledged",
    message: "Request SR-1004 for Core Switch Stack was assigned to Senior Network Tech. Dispatcher confirmed route dispatch.",
    timestamp: "2026-11-14T11:15:00Z",
    read: false,
    type: "info",
    link: "/customer",
  },
  {
    id: "notif-cust-3",
    role: "CUSTOMER",
    userId: "cust-epz-01",
    title: "Work Order Completed & Approved",
    message: "Work Order WO-2990 (Biometric Turnstile Array) is completed and dispatcher approved. Please view report.",
    timestamp: "2026-11-14T14:20:00Z",
    read: false,
    type: "success",
    link: "/customer",
  },

  // Dispatcher Notifications
  {
    id: "notif-disp-1",
    role: "DISPATCHER",
    title: "Pending Completion Review",
    message: "Technician Kamrul Islam submitted completion report for Work Order WO-2998 (Air Circuit Breaker Trip). Review required.",
    timestamp: "2026-11-14T16:45:00Z",
    read: false,
    type: "warning",
    link: "/dispatcher",
    actionLabel: "Review Report",
  },
  {
    id: "notif-disp-2",
    role: "DISPATCHER",
    title: "New Emergency Request",
    message: "Unassigned emergency request SR-1004 (Core Switch Stack) from Square Pharmaceuticals Distribution Hub awaiting triage.",
    timestamp: "2026-11-14T15:30:00Z",
    read: false,
    type: "alert",
    link: "/dispatcher/requests",
    actionLabel: "Triage Request",
  },
  {
    id: "notif-disp-3",
    role: "DISPATCHER",
    title: "Rapid SLA Timer Active",
    message: "Work Order WO-3002 at Megna Cement is within its 40-minute guaranteed arrival SLA window.",
    timestamp: "2026-11-14T16:00:00Z",
    read: true,
    type: "info",
    link: "/dispatcher/work-orders",
  },

  // Technician Notifications
  {
    id: "notif-tech-1",
    role: "TECHNICIAN",
    title: "New Job Assignment",
    message: "You have been assigned to Work Order WO-2998 (Main Distribution Switchboard MSB-01) at ACI Foods Processing Plant.",
    timestamp: "2026-11-14T08:20:00Z",
    read: false,
    type: "info",
    link: "/technician/jobs",
    actionLabel: "View Assignment",
  },
  {
    id: "notif-tech-2",
    role: "TECHNICIAN",
    title: "Skills Passport Verified",
    message: "Your Master Electrician credential (HV Panel Certification) has been verified by Lead Administrator.",
    timestamp: "2026-11-13T10:00:00Z",
    read: true,
    type: "success",
    link: "/technician/skills",
  },

  // Admin Notifications
  {
    id: "notif-admin-1",
    role: "ADMIN",
    title: "Technician Credential Pending Review",
    message: "Farhan Kabir (HVAC Specialist) submitted updated Air Conditioning License for administrative audit.",
    timestamp: "2026-11-14T12:00:00Z",
    read: false,
    type: "warning",
    link: "/admin/technicians",
    actionLabel: "Audit Credential",
  },
  {
    id: "notif-admin-2",
    role: "ADMIN",
    title: "Dispatcher Roster Verified",
    message: "2 active dispatchers currently on shift across EPZ Industrial Core and Gazipur hubs.",
    timestamp: "2026-11-14T08:00:00Z",
    read: true,
    type: "info",
    link: "/admin/dispatchers",
  },
];

const STORAGE_NOTIFS_KEY = "voltops_notifications_v1";
const STORAGE_FEEDBACK_KEY = "voltops_customer_feedback_v1";

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [...INITIAL_NOTIFICATIONS];
}

function saveNotifications(notifs: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(notifs));
  } catch {
    // ignore
  }
}

function loadFeedbacks(): Record<string, CustomerFeedback> {
  try {
    const raw = localStorage.getItem(STORAGE_FEEDBACK_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
}

function saveFeedbacks(feedbacks: Record<string, CustomerFeedback>): void {
  try {
    localStorage.setItem(STORAGE_FEEDBACK_KEY, JSON.stringify(feedbacks));
  } catch {
    // ignore
  }
}

export const notificationService = {
  getNotifications(role: Role, userId?: string): AppNotification[] {
    const all = loadNotifications();
    return all.filter((n) => {
      if (n.role !== role) return false;
      if (role === "CUSTOMER" && userId && n.userId) {
        return n.userId === userId || n.userId === "cust-epz-01";
      }
      return true;
    });
  },

  getUnreadCount(role: Role, userId?: string): number {
    return this.getNotifications(role, userId).filter((n) => !n.read).length;
  },

  markAsRead(notificationId: string): void {
    const all = loadNotifications();
    const target = all.find((n) => n.id === notificationId);
    if (target) {
      target.read = true;
      saveNotifications(all);
    }
  },

  markAllAsRead(role: Role, userId?: string): void {
    const all = loadNotifications();
    for (const n of all) {
      if (n.role === role) {
        if (role === "CUSTOMER" && userId && n.userId && n.userId !== userId && n.userId !== "cust-epz-01") {
          continue;
        }
        n.read = true;
      }
    }
    saveNotifications(all);
  },

  addNotification(notification: Omit<AppNotification, "id" | "timestamp" | "read">): AppNotification {
    const all = loadNotifications();
    const newNotif: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    all.unshift(newNotif);
    saveNotifications(all);
    return newNotif;
  },

  // Customer Feedback API
  submitFeedback(feedback: CustomerFeedback): void {
    const feedbacks = loadFeedbacks();
    feedbacks[feedback.workOrderId] = feedback;
    saveFeedbacks(feedbacks);

    // Also notify Dispatcher of feedback received
    this.addNotification({
      role: "DISPATCHER",
      title: "Customer Rating Submitted",
      message: `${feedback.customerName || "Customer"} submitted a ${feedback.rating}★ rating for Work Order ${feedback.workOrderId}${feedback.comment ? `: "${feedback.comment}"` : "."}`,
      type: "success",
      link: "/dispatcher/work-orders",
    });
  },

  hasProvidedFeedback(workOrderId: string): boolean {
    const feedbacks = loadFeedbacks();
    return Boolean(feedbacks[workOrderId]);
  },

  getFeedback(workOrderId: string): CustomerFeedback | null {
    const feedbacks = loadFeedbacks();
    return feedbacks[workOrderId] || null;
  },
};
