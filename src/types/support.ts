// ============================================================================
// VoltOps Customer Support & Issue Reporting Types
// ============================================================================

export type SupportIssueCategory =
  | "BILLING"
  | "SERVICE_QUALITY"
  | "ARRIVAL_SLA"
  | "PORTAL_ISSUE"
  | "OTHER";

export interface CustomerSupportTicket {
  name: string;
  email: string;
  facility: string;
  relatedId?: string;
  category: SupportIssueCategory;
  subject: string;
  message: string;
  submittedAt?: string;
}

export const SUPPORT_CATEGORIES: { value: SupportIssueCategory; label: string }[] = [
  { value: "SERVICE_QUALITY", label: "Service Quality & Repair Feedback" },
  { value: "ARRIVAL_SLA", label: "Technician Arrival & SLA Inquiries" },
  { value: "BILLING", label: "Billing, Subscription & Invoice Questions" },
  { value: "PORTAL_ISSUE", label: "Portal Navigation or Technical Issue" },
  { value: "OTHER", label: "General Enterprise Inquiries" },
];
