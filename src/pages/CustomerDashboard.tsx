import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import {
  ServiceRequest,
  PriorityLevel,
  ServiceCategory,
  CoveragePlanId,
  CANONICAL_SERVICE_CATEGORIES,
  WorkOrderCompletionReport,
  CustomerPurchase,
} from "../types";
import { customerService } from "../services/customerService";
import { operationalStore } from "../services/operationalStore";
import {
  SubscriptionEntitlement,
} from "../services/subscriptionService";
import { formatBdt } from "../config/coveragePricing";
import { DemonstrationReceiptModal } from "../components/DemonstrationReceiptModal";
import { CustomerFeedbackModal } from "../components/CustomerFeedbackModal";
import { CustomerSupportModal } from "../components/CustomerSupportModal";
import { notificationService } from "../services/notificationService";
import {
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XIcon,
  SearchIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  StarIcon,
  SendIcon,
  LockIcon,
} from "../components/Icons";

export interface CustomerViewRequest {
  id: string;
  category: ServiceCategory;
  asset: string;
  problem: string;
  description: string;
  priority: PriorityLevel;
  coveragePlan?: CoveragePlanId;
  displayStatus:
    | "NEW"
    | "REVIEWING"
    | "ASSIGNED"
    | "TRAVELLING"
    | "ON_SITE"
    | "WORK_COMPLETED_AWAITING_CONFIRMATION"
    | "COMPLETED"
    | "CANCELLED";
  submittedDate: string;
  rawSubmittedAt: string;
  arrivalSlaWindow?: string;
  assignedTech?: string;
  workOrderId?: string;
  workNotes?: string;
  completionReport?: WorkOrderCompletionReport;
}

interface CustomerDashboardProps {
  initialView?: "recent" | "all";
}

export function CustomerDashboard({ initialView }: CustomerDashboardProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");

  const [requests, setRequests] = useState<CustomerViewRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CustomerViewRequest | null>(null);

  // Auto-select first active request by default when loaded
  useEffect(() => {
    if (!selectedRequest && requests.length > 0) {
      const firstActive = requests.find(
        (r) => r.displayStatus !== "COMPLETED" && r.displayStatus !== "CANCELLED"
      );
      setSelectedRequest(firstActive || requests[0]);
    }
  }, [requests, selectedRequest]);

  // View state: 'active' (default operational screen) vs 'history' (progressive disclosure archive)
  const [showHistory, setShowHistory] = useState<boolean>(
    initialView === "all" || viewParam === "all"
  );

  // Filter States for Service History
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Subscription Credit State
  const [subscription, setSubscription] = useState<SubscriptionEntitlement>(() =>
    customerService.getSubscription(user?.id)
  );

  // Purchases & Receipts State
  const [purchases, setPurchases] = useState<CustomerPurchase[]>(() =>
    operationalStore.getPurchases(user?.id)
  );
  const [activeReceipt, setActiveReceipt] = useState<CustomerPurchase | null>(null);

  // Extra service pack quote modal state
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationRequested, setQuotationRequested] = useState(false);

  // Dedicated Modals State
  const [activeFeedbackOrder, setActiveFeedbackOrder] = useState<CustomerViewRequest | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportDefaultId, setSupportDefaultId] = useState("");

  // Persistent dismissed feedback tracking
  const [dismissedFeedbackWos, setDismissedFeedbackWos] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("voltops_dismissed_feedback_wos");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const handleDismissFeedback = (workOrderId?: string) => {
    if (workOrderId) {
      setDismissedFeedbackWos((prev) => {
        const next = Array.from(new Set([...prev, workOrderId]));
        try {
          localStorage.setItem("voltops_dismissed_feedback_wos", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    setActiveFeedbackOrder(null);
  };

  // Global keyboard accessibility: Escape closes any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveFeedbackOrder(null);
        setShowQuotationModal(false);
        setActiveReceipt(null);
        setSupportModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function loadCustomerData() {
    setIsLoading(true);
    setError(null);

    customerService
      .getRequests(user?.id)
      .then((res) => {
        const rawRequests: ServiceRequest[] = res.data;
        const workOrders = operationalStore.getWorkOrders();

        const mapped: CustomerViewRequest[] = rawRequests.map((r) => {
          const linkedOrder = workOrders.find((w) => w.id === r.workOrderId || w.requestId === r.id);

          let displayStatus: CustomerViewRequest["displayStatus"] = "NEW";
          let arrivalSlaWindow = "Pending review";
          let assignedTech = undefined;
          let workNotes = undefined;

          if (linkedOrder) {
            displayStatus = linkedOrder.status as CustomerViewRequest["displayStatus"];
            assignedTech = linkedOrder.assignedTechnicianName;
            workNotes = linkedOrder.workNotes;

            switch (linkedOrder.status) {
              case "UNASSIGNED":
                arrivalSlaWindow = "Work order created · Dispatching";
                displayStatus = "REVIEWING";
                break;
              case "ASSIGNED":
                arrivalSlaWindow = "Technician assigned";
                break;
              case "TRAVELLING":
                if (r.coveragePlan === "247-priority") {
                  arrivalSlaWindow = "En route · 20m SLA";
                } else if (r.coveragePlan === "247-standard") {
                  arrivalSlaWindow = "En route · 40m SLA";
                } else if (r.coveragePlan === "8hr") {
                  arrivalSlaWindow = "En route · Business hours";
                } else {
                  arrivalSlaWindow = "En route";
                }
                break;
              case "ON_SITE":
                arrivalSlaWindow = "On site";
                break;
              case "WORK_COMPLETED_AWAITING_CONFIRMATION":
                arrivalSlaWindow = "Work complete · Dispatcher reviewing";
                break;
              case "COMPLETED":
                arrivalSlaWindow = "Completed & verified";
                break;
              case "CANCELLED":
                arrivalSlaWindow = "Cancelled";
                break;
            }
          } else {
            if (r.status === "REVIEWING") {
              displayStatus = "REVIEWING";
              arrivalSlaWindow = "Reviewing candidates";
            } else if (r.status === "NEW") {
              displayStatus = "NEW";
              if (r.coveragePlan === "247-priority") {
                arrivalSlaWindow = "20m SLA (Pending)";
              } else if (r.coveragePlan === "247-standard") {
                arrivalSlaWindow = "40m SLA (Pending)";
              } else {
                arrivalSlaWindow = "Pending review";
              }
            }
          }

          let formattedDate = r.submittedAt;
          try {
            formattedDate = new Date(r.submittedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            // Keep raw string
          }

          return {
            id: r.id,
            category: r.category,
            asset: r.assetName,
            problem: r.problemTitle,
            description: r.problemDescription,
            priority: r.priority,
            coveragePlan: r.coveragePlan,
            displayStatus,
            submittedDate: formattedDate,
            rawSubmittedAt: r.submittedAt,
            arrivalSlaWindow,
            assignedTech,
            workOrderId: linkedOrder?.id || r.workOrderId,
            workNotes,
            completionReport: linkedOrder?.completionReport,
          };
        });

        setRequests(mapped);

        // Auto-select first active request if none selected
        const active = mapped.filter((r) => r.displayStatus !== "COMPLETED" && r.displayStatus !== "CANCELLED");
        if (active.length > 0) {
          setSelectedRequest((prev) => (prev && mapped.some((m) => m.id === prev.id) ? prev : active[0]));
        } else if (mapped.length > 0) {
          setSelectedRequest((prev) => (prev && mapped.some((m) => m.id === prev.id) ? prev : mapped[0]));
        }

        // Update subscription status and purchases
        const sub = customerService.getSubscription(user?.id);
        setSubscription(sub);
        setPurchases(operationalStore.getPurchases(user?.id));
      })
      .catch((err) => {
        setError(err.message || "Failed to load service requests.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    loadCustomerData();
    const unsubscribe = operationalStore.subscribe(() => {
      loadCustomerData();
    });
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (viewParam === "all") {
      setShowHistory(true);
    }
  }, [viewParam]);

  // Active / Ongoing Incidents
  const activeRequests = useMemo(() => {
    return requests.filter(
      (r) => r.displayStatus !== "COMPLETED" && r.displayStatus !== "CANCELLED"
    );
  }, [requests]);

  // Filtered requests for the progressive disclosure archive
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.id.toLowerCase().includes(q) ||
          r.asset.toLowerCase().includes(q) ||
          r.problem.toLowerCase().includes(q) ||
          (r.assignedTech && r.assignedTech.toLowerCase().includes(q)) ||
          (r.workOrderId && r.workOrderId.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE") {
          if (r.displayStatus === "COMPLETED" || r.displayStatus === "CANCELLED") return false;
        } else if (r.displayStatus !== statusFilter) {
          return false;
        }
      }

      if (priorityFilter !== "ALL" && r.priority !== priorityFilter) {
        return false;
      }

      if (categoryFilter !== "ALL" && r.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  // Single Actionable Notification Identification
  const pendingFeedbackRequest = useMemo(() => {
    return requests.find(
      (r) =>
        r.displayStatus === "COMPLETED" &&
        r.workOrderId &&
        !notificationService.hasProvidedFeedback(r.workOrderId) &&
        !dismissedFeedbackWos.includes(r.workOrderId)
    );
  }, [requests, dismissedFeedbackWos]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
  };

  // Helper for timeline progress calculation
  const getTimelineStepIndex = (status: CustomerViewRequest["displayStatus"]) => {
    switch (status) {
      case "NEW":
        return 0; // Logged
      case "REVIEWING":
      case "ASSIGNED":
        return 1; // Triaged & Assigned
      case "TRAVELLING":
        return 2; // En Route
      case "ON_SITE":
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
      case "COMPLETED":
        return 3; // On Site / Complete
      case "CANCELLED":
      default:
        return 0;
    }
  };

  // High-Contrast Status Badges: VoltOps Commercial Field-Service Standards (NO YELLOW)
  const renderStatusBadge = (status: CustomerViewRequest["displayStatus"], isSelected: boolean = false) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected
                ? "bg-zinc-950 text-[#10b981]"
                : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-[#10b981]/15 dark:text-[#10b981] dark:border-[#10b981]/30 border"
            }`}
          >
            COMPLETED
          </span>
        );
      case "TRAVELLING":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected
                ? "bg-zinc-950 text-[#10b981]"
                : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 border"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping inline-block" />
            EN ROUTE
          </span>
        );
      case "ON_SITE":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected
                ? "bg-zinc-950 text-[#10b981]"
                : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 border"
            }`}
          >
            ON SITE
          </span>
        );
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected
                ? "bg-zinc-950 text-[#10b981]"
                : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-[#10b981]/20 dark:text-[#10b981] dark:border-[#10b981]/30 border font-extrabold"
            }`}
          >
            SIGN-OFF
          </span>
        );
      case "ASSIGNED":
      case "REVIEWING":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected
                ? "bg-zinc-950 text-[#10b981]"
                : "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 border font-bold"
            }`}
          >
            ASSIGNED
          </span>
        );
      case "NEW":
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected
                ? "bg-zinc-950 text-[#06b6d4]"
                : "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30 border font-bold"
            }`}
          >
            LOGGED
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            URGENT
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
            MEDIUM
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-slate-500/20 dark:text-slate-300 dark:border-transparent">
            LOW
          </span>
        );
    }
  };

  const activeRequestObj = selectedRequest || activeRequests[0] || requests[0];
  const activeStep = activeRequestObj ? getTimelineStepIndex(activeRequestObj.displayStatus) : 0;
  const timelineSteps = [
    { label: "Logged" },
    { label: "Triaged" },
    { label: "En Route" },
    { label: "On Site" },
  ];

  // ── Single Active Request Rule & Telemetry Metrics ──
  const hasActiveRequest = activeRequests.length > 0;
  const remainingVisits = subscription.remainingVisits ?? 27;
  const includedVisits = subscription.includedVisits ?? 30;
  const allowancePct = Math.min(
    100,
    Math.max(0, Math.round((remainingVisits / includedVisits) * 100))
  );

  const slaLabel = useMemo(() => {
    switch (subscription.planId) {
      case "247-priority":
        return "20m Physical Arrival SLA";
      case "247-standard":
        return "40m Physical Arrival SLA";
      case "8hr":
        return "8-Hour Operational Window";
      default:
        return "Negotiated SLA";
    }
  }, [subscription.planId]);

  const completedIncidentsCount = useMemo(
    () => requests.filter((r) => r.displayStatus === "COMPLETED").length,
    [requests]
  );
  const activeIncidentsCount = activeRequests.length;

  return (
    <Layout
      title="Facility Operations"
      action={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadCustomerData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-xs"
            title="Refresh active status"
          >
            <RefreshCwIcon size={15} className={isLoading ? "animate-spin text-[#10b981]" : ""} />
          </button>
          {hasActiveRequest ? (
            <div
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/5 flex items-center gap-1.5 cursor-not-allowed select-none"
              title="Active request open. You must complete or resolve your current request before submitting a new one."
            >
              <LockIcon size={13} className="text-zinc-500" />
              <span>Active request open</span>
            </div>
          ) : (
            <Link
              to="/customer/new-request"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-zinc-950 transition-all shadow-md flex items-center gap-1.5 active:scale-[0.98]"
            >
              <span className="font-extrabold text-sm">+</span>
              <span>New Request</span>
            </Link>
          )}
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl">
        {/* ── 1. Sleek 2-Card Visual Strip (Truthful VoltOps Telemetry) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Visit Allowance Gauge */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-md flex items-center gap-5">
            {/* Animated SVG Ring Gauge */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 84 84">
                <circle
                  cx="42"
                  cy="42"
                  r="34"
                  fill="none"
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-white/10"
                  strokeWidth="7"
                />
                <circle
                  cx="42"
                  cy="42"
                  r="34"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={213.63}
                  strokeDashoffset={213.63 - (allowancePct / 100) * 213.63}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-extrabold text-zinc-900 dark:text-white leading-none tracking-tight">
                  {remainingVisits}
                </span>
                <span className="text-[9px] font-semibold text-zinc-500 mt-0.5">
                  /{includedVisits} left
                </span>
              </div>
            </div>

            {/* Plan Info & SLA Window */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-[#10b981]/15 dark:text-[#10b981] dark:border-[#10b981]/30 border">
                  {subscription.planName || "24/7 Priority Plan"}
                </span>
              </div>
              <div className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
                {remainingVisits} of {includedVisits} Visits Remaining
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <ClockIcon size={12} className="text-[#10b981] shrink-0" />
                <span className="truncate">{slaLabel}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Facility Service Breakdown */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-md flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-900 dark:text-white tracking-tight">Facility Service Breakdown</span>
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">{requests.length} Total Incidents</span>
            </div>

            {/* Segmented Proportional Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 flex overflow-hidden gap-0.5">
                {activeIncidentsCount > 0 && (
                  <div
                    className="bg-[#06b6d4] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(activeIncidentsCount / (requests.length || 1)) * 100}%`,
                    }}
                    title={`${activeIncidentsCount} Active`}
                  />
                )}
                {completedIncidentsCount > 0 && (
                  <div
                    className="bg-[#10b981] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(completedIncidentsCount / (requests.length || 1)) * 100}%`,
                    }}
                    title={`${completedIncidentsCount} Completed`}
                  />
                )}
              </div>

              {/* Legend & Status Counts */}
              <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                  <span>Active ({activeIncidentsCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span>Completed ({completedIncidentsCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                  <span>Total Logged ({requests.length})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actionable Alerts (When Genuinely Required) ── */}
        {pendingFeedbackRequest && (
          <div className="rounded-xl border border-white/5 bg-[#b8287a]/20 px-5 py-3.5 text-xs flex items-center justify-between gap-3 text-white shadow-md animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <StarIcon size={18} className="text-[#10b981] shrink-0" fill="currentColor" />
              <span className="truncate">
                Service completed on <strong className="font-bold text-[#10b981]">{pendingFeedbackRequest.asset}</strong> ({pendingFeedbackRequest.id}).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDismissFeedback(pendingFeedbackRequest.workOrderId)}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setActiveFeedbackOrder(pendingFeedbackRequest)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950 transition-all shadow-md"
              >
                Rate service
              </button>
            </div>
          </div>
        )}

        {/* ── 2. Unified Single-Page Workspace: Service Requests (35%) & Work Order Detail (65%) ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Left Column: Service Requests List (35% width) ── */}
          <div className="w-full lg:w-[35%] space-y-4 shrink-0">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 space-y-4 border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Service Requests
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showHistory;
                    setShowHistory(next);
                    setSearchParams(next ? { view: "all" } : {});
                  }}
                  className="text-xs font-bold text-[#10b981] hover:underline flex items-center gap-1"
                >
                  <span>{showHistory ? "Hide Table" : "Archive Table"}</span>
                  <ArrowRightIcon size={12} className={showHistory ? "rotate-90 transition-transform" : "transition-transform"} />
                </button>
              </div>

              {/* Search Bar with Filter Icon */}
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#10b981] border border-zinc-300 dark:border-white/5 transition-all"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
                  >
                    <XIcon size={13} />
                  </button>
                ) : (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" />
                      <line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Request Cards List */}
              <div className="space-y-2.5 pt-1">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    <RefreshCwIcon size={16} className="inline animate-spin mr-2 text-[#10b981]" />
                    Loading requests...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    No requests match filter.
                  </div>
                ) : (
                  filteredRequests.map((req) => {
                    const isSelected = activeRequestObj?.id === req.id;
                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`rounded-xl p-3 cursor-pointer transition-all duration-150 select-none border ${
                          isSelected
                            ? "bg-[#10b981] text-zinc-950 border-[#10b981] shadow-md shadow-emerald-500/10"
                            : "bg-zinc-50 hover:bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:text-white dark:border-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-mono text-xs font-bold tracking-tight ${
                              isSelected ? "text-zinc-950" : "text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {req.id}
                          </span>
                          {renderStatusBadge(req.displayStatus, isSelected)}
                        </div>

                        <div
                          className={`text-xs font-medium truncate mt-1 ${
                            isSelected ? "text-zinc-950 font-semibold" : "text-zinc-800 dark:text-zinc-300"
                          }`}
                          title={req.problem}
                        >
                          {req.problem}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Operational Work Order Workspace (65% width) ── */}
          <div className="w-full lg:w-[65%] space-y-4 min-w-0">
            {activeRequestObj ? (
              <>
                {/* ── Detail Card 1: Request ID, Facility & 4-Step Lifecycle Timeline ── */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 space-y-5 border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                        Request {activeRequestObj.workOrderId || activeRequestObj.id}
                      </h3>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {activeRequestObj.asset} · Savar Commercial Complex
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSupportDefaultId(activeRequestObj.workOrderId || activeRequestObj.id);
                          setSupportModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-emerald-800 border-zinc-200 dark:bg-zinc-800 dark:text-[#10b981] dark:hover:bg-zinc-700 dark:border-white/5 flex items-center justify-center transition-all border"
                        title="Contact Support or Report Issue"
                      >
                        <SendIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Date & Destination Banner */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{activeRequestObj.submittedDate}</div>
                    </div>

                    <div className="text-center">
                      {renderStatusBadge(activeRequestObj.displayStatus)}
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Target Arrival SLA</div>
                      <div className="font-extrabold text-emerald-700 dark:text-[#10b981] text-sm">
                        {activeRequestObj.arrivalSlaWindow || (subscription.planId === "247-priority" ? "20m Target" : "40m Target")}
                      </div>
                    </div>
                  </div>

                  {/* Connected Horizontal Timeline Node Stepper: Logged -> Triaged -> En Route -> On Site */}
                  <div className="relative pt-3 pb-2">
                    {/* Background Bar */}
                    <div className="absolute top-5 left-4 right-4 h-1 bg-zinc-200 dark:bg-zinc-800 -translate-y-1/2 z-0 rounded-full" />
                    {/* Active Emerald Line */}
                    <div
                      className="absolute top-5 left-4 h-1 bg-[#10b981] -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(94, (activeStep / (timelineSteps.length - 1)) * 92)}%`,
                      }}
                    />

                    {/* Nodes */}
                    <div className="relative z-10 flex justify-between">
                      {timelineSteps.map((step, idx) => {
                        const isCompleted = idx < activeStep;
                        const isCurrent = idx === activeStep;
                        return (
                          <div key={step.label} className="flex flex-col items-center text-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all ${
                                isCompleted
                                  ? "bg-[#10b981] text-zinc-950 shadow-md shadow-emerald-500/20"
                                  : isCurrent
                                  ? "bg-white text-emerald-800 ring-4 ring-[#10b981] shadow-lg shadow-emerald-500/20 animate-pulse dark:bg-zinc-900 dark:text-[#10b981]"
                                  : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500"
                              }`}
                            >
                              {isCompleted ? "✓" : idx + 1}
                            </div>
                            <span
                              className={`mt-2 text-[10px] font-bold tracking-wider ${
                                isCurrent
                                  ? "text-emerald-700 dark:text-[#10b981]"
                                  : isCompleted
                                  ? "text-zinc-900 dark:text-white"
                                  : "text-zinc-500 dark:text-zinc-500"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Detail Card 2: Assigned Certified Specialist ── */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 flex items-center justify-between border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-md">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-lg bg-zinc-100 border border-emerald-300 dark:bg-zinc-800 dark:border-[#10b981]/30 flex items-center justify-center font-bold text-sm text-emerald-800 dark:text-[#10b981] shadow-xs">
                      {activeRequestObj.assignedTech
                        ? activeRequestObj.assignedTech
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                        : "TA"}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-zinc-900 dark:text-white">
                        {activeRequestObj.assignedTech || "Tanvir Ahmed"}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Electrical & HVAC
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSupportDefaultId(activeRequestObj.workOrderId || activeRequestObj.id);
                        setSupportModalOpen(true);
                      }}
                      className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-emerald-800 border-zinc-200 dark:bg-zinc-800 dark:text-[#10b981] dark:hover:bg-zinc-700 dark:border-white/5 transition-all shadow-xs border"
                      title="Contact Dispatcher / Technician"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSupportDefaultId(activeRequestObj.workOrderId || activeRequestObj.id);
                        setSupportModalOpen(true);
                      }}
                      className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-emerald-800 border-zinc-200 dark:bg-zinc-800 dark:text-[#10b981] dark:hover:bg-zinc-700 dark:border-white/5 transition-all shadow-xs border"
                      title="Send Message"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* ── Detail Card 3: Incident Details ── */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 space-y-4 border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-md">
                  <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white">Incident Details</h4>

                  <div className="space-y-3 text-xs">
                    <div className="pb-3 border-b border-zinc-200 dark:border-white/[0.06]">
                      <div className="font-bold text-zinc-900 dark:text-white text-xs">{activeRequestObj.problem}</div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">{activeRequestObj.description || "Routine breakdown maintenance and electrical diagnostics."}</div>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/[0.06]">
                      <div className="text-zinc-500 dark:text-zinc-400">Trade Specialty</div>
                      <div className="font-bold text-zinc-900 dark:text-white">{activeRequestObj.category}</div>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/[0.06]">
                      <div className="text-zinc-500 dark:text-zinc-400">Priority Tier</div>
                      <div>{renderPriorityBadge(activeRequestObj.priority)}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="font-bold text-zinc-900 dark:text-white">Visit Credit</div>
                      <div className="font-extrabold text-emerald-700 dark:text-[#10b981] text-sm">
                        1 Visit Deducted <span className="text-zinc-500 dark:text-zinc-400 font-normal">({remainingVisits} left)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technician Completion Report (when present) */}
                {activeRequestObj.completionReport && (
                  <div className="bg-emerald-50/60 dark:bg-zinc-900 rounded-xl p-5 space-y-3 border border-emerald-200 dark:border-[#10b981]/30 shadow-sm dark:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-[#10b981] flex items-center gap-1.5">
                        <CheckCircleIcon size={15} />
                        <span>Technician Completion Report</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-transparent px-2 py-0.5 rounded-full">
                        ✓ Dispatcher Approved
                      </span>
                    </div>

                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                      {activeRequestObj.completionReport.workPerformed || activeRequestObj.completionReport.notes}
                    </p>

                    {activeRequestObj.completionReport.diagnosis && (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        <strong className="text-zinc-900 dark:text-white">Diagnosis:</strong> {activeRequestObj.completionReport.diagnosis}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-12 text-center text-zinc-500 dark:text-zinc-400 space-y-2 border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-md">
                <CheckCircleIcon size={24} className="mx-auto text-[#10b981]" />
                <div className="text-sm font-bold text-zinc-900 dark:text-white">No Request Selected</div>
                <p className="text-xs">Select a request from the left list to view live tracking.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Progressive Disclosure: Service History Table (When Toggled) ── */}
        {showHistory && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-sm dark:shadow-md space-y-4 p-5 border border-zinc-200 dark:border-white/5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Facility Service History Archive</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Complete historical audit trail of all logged facility requests.</p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Clear all filters
              </button>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs border border-zinc-300 dark:border-white/5 focus:ring-1 focus:ring-[#10b981]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">All Active</option>
                <option value="NEW">New</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="TRAVELLING">Travelling</option>
                <option value="ON_SITE">On Site</option>
                <option value="WORK_COMPLETED_AWAITING_CONFIRMATION">Awaiting Confirmation</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs border border-zinc-300 dark:border-white/5 focus:ring-1 focus:ring-[#10b981]"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs border border-zinc-300 dark:border-white/5 focus:ring-1 focus:ring-[#10b981]"
              >
                <option value="ALL">All Categories</option>
                {CANONICAL_SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Archive Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 font-semibold">
                    <th className="py-2.5 px-3">Request ID</th>
                    <th className="py-2.5 px-3">Asset / Problem</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Submitted</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/[0.04]">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] text-zinc-800 dark:text-zinc-200">
                      <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-white">{req.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-900 dark:text-white">{req.problem}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{req.asset}</div>
                      </td>
                      <td className="py-3 px-3">{req.category}</td>
                      <td className="py-3 px-3">{renderPriorityBadge(req.priority)}</td>
                      <td className="py-3 px-3">{renderStatusBadge(req.displayStatus)}</td>
                      <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400">{req.submittedDate}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(req);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-xs font-bold text-[#10b981] hover:underline"
                        >
                          View In Workspace
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 4. Compact Facility Footer Bar ── */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-500 gap-3 border-t border-zinc-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon size={14} className="text-[#10b981]" />
            <span>VoltOps Commercial Operations Platform</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/customer/invoices"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              Invoices & Billing &rarr;
            </Link>
            <button
              type="button"
              onClick={() => {
                setSupportDefaultId(activeRequestObj?.workOrderId || activeRequestObj?.id || "");
                setSupportModalOpen(true);
              }}
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* ── All Modals (Preserved 100% Functionality) ── */}
      {activeReceipt && (
        <DemonstrationReceiptModal
          purchase={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {showQuotationModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1d22] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-zinc-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Purchase On-Demand Visits</h3>
              <button
                type="button"
                onClick={() => setShowQuotationModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                <XIcon size={16} />
              </button>
            </div>
            {quotationRequested ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#10b981]/15 text-zinc-900 dark:text-white text-xs space-y-2 text-center border border-emerald-200 dark:border-transparent">
                <CheckCircleIcon size={22} className="mx-auto text-[#10b981]" />
                <div className="font-bold">Quotation Request Submitted</div>
                <p className="text-zinc-600 dark:text-zinc-300">
                  A VoltOps accounts manager will contact your facility desk within 2 business hours.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuotationRequested(false);
                    setShowQuotationModal(false);
                  }}
                  className="mt-3 px-5 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-zinc-600 dark:text-zinc-300">
                  Your contract tier includes {subscription.includedVisits} routine breakdown visits per month. You may purchase supplementary visit blocks at the standardized tariff.
                </p>
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#26272e] border border-zinc-200 dark:border-transparent flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">5-Visit Supplemental Pack</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{formatBdt(25000)}</span>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuotationModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuotationRequested(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950 hover:bg-[#059669]"
                  >
                    Request Quotation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeFeedbackOrder && (
        <CustomerFeedbackModal
          isOpen={Boolean(activeFeedbackOrder)}
          onClose={(dismissId) => handleDismissFeedback(dismissId || activeFeedbackOrder.workOrderId)}
          workOrderId={activeFeedbackOrder.workOrderId || activeFeedbackOrder.id}
          technicianName={activeFeedbackOrder.assignedTech}
          assetName={activeFeedbackOrder.asset}
          onSubmitSuccess={() => {
            loadCustomerData();
            setActiveFeedbackOrder(null);
          }}
        />
      )}

      {supportModalOpen && (
        <CustomerSupportModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          defaultRelatedId={supportDefaultId}
        />
      )}
    </Layout>
  );
}
