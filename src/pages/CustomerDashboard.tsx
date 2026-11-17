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
  getCoveragePlanSlaLabel,
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
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XIcon,
  SearchIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  WrenchIcon,
  EyeIcon,
  StarIcon,
  SendIcon,
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

  // Active Tab: 'active' (live repairs) vs 'history' (complete log) vs 'coverage' (plans & receipts)
  const [activeTab, setActiveTab] = useState<"active" | "history" | "coverage">(
    viewParam === "all" ? "history" : "active"
  );

  // Filter States for History
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

  // Global keyboard accessibility: Escape closes any open modal safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedRequest(null);
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
                arrivalSlaWindow = "Work order created · Dispatching tech";
                displayStatus = "REVIEWING";
                break;
              case "ASSIGNED":
                arrivalSlaWindow = "Tech assigned · Standby";
                break;
              case "TRAVELLING":
                if (r.coveragePlan === "247-priority") {
                  arrivalSlaWindow = "En route · 20m arrival SLA";
                } else if (r.coveragePlan === "247-standard") {
                  arrivalSlaWindow = "En route · 40m arrival SLA";
                } else if (r.coveragePlan === "8hr") {
                  arrivalSlaWindow = "En route · Business hours";
                } else if (r.coveragePlan === "custom") {
                  arrivalSlaWindow = "En route · Custom SLA";
                } else {
                  arrivalSlaWindow = "En route";
                }
                break;
              case "ON_SITE":
                arrivalSlaWindow = "Technician on site";
                break;
              case "WORK_COMPLETED_AWAITING_CONFIRMATION":
                arrivalSlaWindow = "Work done · Awaiting dispatcher review";
                break;
              case "COMPLETED":
                if (linkedOrder.dispatcherApproved) {
                  arrivalSlaWindow = "Work completed & dispatcher approved";
                } else {
                  arrivalSlaWindow = "Completed & signed off";
                }
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
                arrivalSlaWindow = "20m SLA (Pending review)";
              } else if (r.coveragePlan === "247-standard") {
                arrivalSlaWindow = "40m SLA (Pending review)";
              } else if (r.coveragePlan === "8hr") {
                arrivalSlaWindow = "Business hours (Pending review)";
              } else if (r.coveragePlan === "custom") {
                arrivalSlaWindow = "Custom SLA (Pending review)";
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
              year: "numeric",
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
      setActiveTab("history");
    }
  }, [viewParam]);

  // Active / Ongoing Incidents (The operational core)
  const activeRequests = useMemo(() => {
    return requests.filter(
      (r) => r.displayStatus !== "COMPLETED" && r.displayStatus !== "CANCELLED"
    );
  }, [requests]);

  const inProgressCount = useMemo(() => {
    return requests.filter(
      (r) => r.displayStatus === "ASSIGNED" || r.displayStatus === "TRAVELLING" || r.displayStatus === "ON_SITE"
    ).length;
  }, [requests]);

  // Filtered requests for the history archive
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
        } else if (statusFilter === "IN_PROGRESS") {
          if (!["ASSIGNED", "TRAVELLING", "ON_SITE"].includes(r.displayStatus)) return false;
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

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
  };

  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL";

  const getPriorityPill = (priority: PriorityLevel) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "HIGH":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "LOW":
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getStatusPill = (status: CustomerViewRequest["displayStatus"]) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "REVIEWING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "ASSIGNED":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
      case "TRAVELLING":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20";
      case "ON_SITE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "CANCELLED":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  // Helper for Stepper Stage in Live Cards
  const getStageIndex = (status: CustomerViewRequest["displayStatus"]): number => {
    switch (status) {
      case "NEW":
        return 0;
      case "REVIEWING":
        return 1;
      case "ASSIGNED":
        return 2;
      case "TRAVELLING":
        return 2;
      case "ON_SITE":
        return 3;
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
      case "COMPLETED":
        return 4;
      default:
        return 0;
    }
  };

  return (
    <Layout
      title="Facility Operations"
      subtitle={`${user?.company || "Apex Spinning & Weaving Mills"} · Savar Commercial Complex`}
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCustomerData}
            disabled={isLoading}
            className="p-2 rounded-xl text-xs font-medium border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh active status"
          >
            <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
          <Link
            to="/customer/new-request"
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+ Report Breakdown</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ── 1. Integrated Operational Command Ribbon (Less Reading, Pure Telemetry) ── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Active Facility & Guaranteed SLA */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheckIcon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-semibold text-sm text-[var(--text-primary)]">
                    {subscription.planName}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    {subscription.planId === "247-priority"
                      ? "20m arrival SLA"
                      : subscription.planId === "247-standard"
                      ? "40m arrival SLA"
                      : "Business hours"}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  Physical arrival of certified technician on site · 7 trades covered
                </div>
              </div>
            </div>

            {/* Center: Real-Time Incident Status Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("active");
                  setStatusFilter("ALL");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                  activeRequests.length > 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                    : "bg-[var(--bg-surface-2)] border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Active repairs:</span>
                <strong className="tabular-nums font-semibold">{activeRequests.length}</strong>
              </button>

              <div className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <ClockIcon size={13} />
                <span>In transit / on site:</span>
                <strong className="tabular-nums font-semibold">{inProgressCount}</strong>
              </div>
            </div>

            {/* Right: Compact Service Allowance Gauge */}
            <div className="flex items-center gap-3 border-t lg:border-t-0 pt-2 lg:pt-0 border-[var(--border)]">
              <div className="min-w-[140px] text-xs">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
                  <span>Visit allowance</span>
                  <span className="font-medium text-[var(--text-primary)] tabular-nums">
                    {subscription.remainingVisits !== null
                      ? `${subscription.remainingVisits} / ${subscription.includedVisits}`
                      : "Negotiated"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      subscription.isExhausted ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{
                      width: subscription.needsConfiguration
                        ? "0%"
                        : `${Math.min(
                            100,
                            (subscription.usedVisits / (subscription.includedVisits || 1)) * 100
                          )}%`,
                    }}
                  />
                </div>
              </div>

              {subscription.isExhausted ? (
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors shrink-0"
                >
                  + Pack
                </button>
              ) : (
                <Link
                  to={subscription.planId ? `/checkout?plan=${subscription.planId}` : "/#packages"}
                  className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                  title="Manage coverage & receipts"
                >
                  <ArrowRightIcon size={13} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. Action-Required Strip (Customer Sign-Off / Rating / Pack Prompts) ── */}
        {requests.some(
          (r) =>
            r.displayStatus === "COMPLETED" &&
            r.workOrderId &&
            !notificationService.hasProvidedFeedback(r.workOrderId) &&
            !dismissedFeedbackWos.includes(r.workOrderId)
        ) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <StarIcon size={16} className="text-amber-500 shrink-0" fill="currentColor" />
              <div>
                <span className="font-semibold text-[var(--text-primary)]">Work completed & signed off:</span>{" "}
                <span className="text-[var(--text-muted)]">
                  Please rate your experience with the technician to close out the operational record.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const target = requests.find(
                    (r) =>
                      r.displayStatus === "COMPLETED" &&
                      r.workOrderId &&
                      !notificationService.hasProvidedFeedback(r.workOrderId)
                  );
                  if (target) handleDismissFeedback(target.workOrderId);
                }}
                className="px-2.5 py-1 rounded-lg font-medium text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = requests.find(
                    (r) =>
                      r.displayStatus === "COMPLETED" &&
                      r.workOrderId &&
                      !notificationService.hasProvidedFeedback(r.workOrderId)
                  );
                  if (target) setActiveFeedbackOrder(target);
                }}
                className="px-3 py-1 rounded-lg font-semibold text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-xs"
              >
                Rate Service (★)
              </button>
            </div>
          </div>
        )}

        {/* ── 3. Focused View Navigation Tabs ── */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("active");
                setSearchParams({});
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              }`}
            >
              <span>Live Breakdown Status</span>
              {activeRequests.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  activeTab === "active" ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                }`}>
                  {activeRequests.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setSearchParams({ view: "all" });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              }`}
            >
              <span>Service History</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                activeTab === "history" ? "bg-white/20 text-white" : "bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
              }`}>
                {requests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("coverage");
                setSearchParams({ view: "coverage" });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "coverage"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              }`}
            >
              <span>Coverage & Receipts</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                activeTab === "coverage" ? "bg-white/20 text-white" : "bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
              }`}>
                {purchases.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSupportDefaultId("");
                setSupportModalOpen(true);
              }}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 hidden sm:flex"
            >
              <SendIcon size={12} />
              <span>Contact dispatch</span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: LIVE BREAKDOWNS (Purposeful Interactive Cards With Live Steppers) ── */}
        {activeTab === "active" && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-center text-xs text-[var(--text-muted)]">
                <RefreshCwIcon size={16} className="inline animate-spin mr-2 text-emerald-500" />
                Synchronizing live facility telemetry...
              </div>
            ) : activeRequests.length === 0 ? (
              <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircleIcon size={24} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)]">
                    All Facility Systems Operational
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mt-0.5">
                    No active breakdown tickets are open. Certified technicians are on standby under your {subscription.planName}.
                  </p>
                </div>
                <Link
                  to="/customer/new-request"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  <span>+ Report New Incident</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {activeRequests.map((req) => {
                  const stage = getStageIndex(req.displayStatus);
                  const isUrgent = req.priority === "URGENT";

                  return (
                    <div
                      key={req.id}
                      className={`rounded-xl border p-4 bg-[var(--bg-surface)] shadow-xs transition-all ${
                        isUrgent
                          ? "border-red-500/30 hover:border-red-500/50"
                          : "border-[var(--border)] hover:border-emerald-500/30"
                      }`}
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                            {req.id}
                          </span>
                          {req.workOrderId && (
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">
                              (WO: {req.workOrderId})
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${getPriorityPill(
                              req.priority
                            )}`}
                          >
                            {req.priority}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {req.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusPill(
                              req.displayStatus
                            )}`}
                          >
                            {req.displayStatus.replace("_", " ")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(req)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors flex items-center gap-1"
                          >
                            <EyeIcon size={12} />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </div>

                      {/* Main Info */}
                      <div className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-sm text-[var(--text-primary)]">
                            {req.asset} — {req.problem}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {req.description}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] pt-1 flex items-center gap-3">
                            <span>Logged: <strong className="text-[var(--text-primary)]">{req.submittedDate}</strong></span>
                            {req.assignedTech && (
                              <span>Technician: <strong className="text-[var(--text-primary)]">{req.assignedTech}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Arrival Target Window */}
                        {req.arrivalSlaWindow && (
                          <div className="p-3 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] md:text-right shrink-0">
                            <span className="text-[11px] text-[var(--text-muted)] block">Operational target</span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                              {req.arrivalSlaWindow}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 4-Stage Operational Stepper */}
                      <div className="pt-3 border-t border-[var(--border)]">
                        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                          <div className="space-y-1">
                            <div className="h-1.5 rounded-full bg-emerald-500" />
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">1. Logged</span>
                          </div>
                          <div className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                stage >= 1 ? "bg-emerald-500" : "bg-[var(--border)]"
                              }`}
                            />
                            <span
                              className={`font-medium ${
                                stage >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"
                              }`}
                            >
                              2. Triaged
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                stage >= 2 ? "bg-emerald-500" : "bg-[var(--border)]"
                              }`}
                            />
                            <span
                              className={`font-medium ${
                                stage >= 2 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"
                              }`}
                            >
                              3. En route
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                stage >= 3 ? "bg-emerald-500" : "bg-[var(--border)]"
                              }`}
                            />
                            <span
                              className={`font-medium ${
                                stage >= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"
                              }`}
                            >
                              4. On site
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SERVICE HISTORY ARCHIVE (Concise, Clean Data List) ── */}
        {activeTab === "history" && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
            {/* Search and Filters Toolbar */}
            <div className="p-3.5 border-b border-[var(--border)] bg-[var(--bg-surface-2)]/40 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <SearchIcon
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  id="dashboard-search"
                  name="search"
                  type="text"
                  placeholder="Search ID, asset, technician..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <select
                  id="dashboard-status-filter"
                  name="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                  aria-label="Filter by status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  id="dashboard-priority-filter"
                  name="priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                  aria-label="Filter by priority"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <select
                  id="dashboard-category-filter"
                  name="category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                  aria-label="Filter by trade"
                >
                  <option value="ALL">All 7 Trades</option>
                  {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Structured Table for Historical Scannability */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-medium text-[11px]">
                    <th className="py-2.5 px-4">Request ID</th>
                    <th className="py-2.5 px-4">Asset & Trade</th>
                    <th className="py-2.5 px-4">Problem</th>
                    <th className="py-2.5 px-4">Priority</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Serviced Date</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                        Loading service records...
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                        No service requests match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)] tabular-nums">
                          {r.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--text-primary)]">{r.asset}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{r.category}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[var(--text-primary)]">
                          {r.problem}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getPriorityPill(
                              r.priority
                            )}`}
                          >
                            {r.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusPill(
                              r.displayStatus
                            )}`}
                          >
                            {r.displayStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)] tabular-nums">
                          {r.submittedDate}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(r)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: COVERAGE & DEMONSTRATION RECEIPTS ── */}
        {activeTab === "coverage" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)]">
                    Facility Service Level Agreement & Billing
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Plan tier, contracted response commitments, and verified accounting receipts
                  </p>
                </div>
                <Link
                  to={
                    subscription.hasActiveSubscription && subscription.planId
                      ? `/checkout?plan=${subscription.planId}`
                      : "/#packages"
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Change Plan</span>
                  <ArrowRightIcon size={12} />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                <div className="p-3 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Contracted Tier</span>
                  <span className="font-semibold text-sm text-[var(--text-primary)] mt-0.5 block">
                    {subscription.planName}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Physical Arrival Guarantee</span>
                  <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {subscription.planId === "247-priority"
                      ? "20-minute rapid arrival SLA"
                      : subscription.planId === "247-standard"
                      ? "40-minute arrival SLA"
                      : "Business hours coverage"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Next Billing Cycle</span>
                  <span className="font-semibold text-sm text-[var(--text-primary)] mt-0.5 block tabular-nums">
                    Resets {subscription.billingCycleResetDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Demonstration Receipts Grid */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)]">
                  Subscription Purchase Receipts ({purchases.length})
                </h3>
              </div>

              {purchases.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                  No purchase records logged yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {purchases.map((pur) => (
                    <div
                      key={pur.purchaseId}
                      className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-xs text-[var(--text-primary)]">
                            {pur.receiptId}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            {pur.paymentStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {pur.planName} · {pur.billingPeriod}
                        </div>
                        <div className="text-xs font-mono font-semibold text-[var(--text-primary)] mt-1 tabular-nums">
                          {formatBdt(pur.totalAmount)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveReceipt(pur)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors flex items-center gap-1"
                      >
                        <EyeIcon size={12} />
                        <span>Receipt</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 4. Slide-Out Operational Inspection Drawer (Modern, Focused UI) ── */}
        {selectedRequest && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedRequest(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-fade-in"
          >
            <div className="w-full max-w-lg h-full bg-[var(--bg-surface)] border-l border-[var(--border)] p-6 shadow-2xl space-y-5 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    Ticket {selectedRequest.id}
                  </span>
                  <h3 className="font-heading font-semibold text-base text-[var(--text-primary)]">
                    {selectedRequest.asset}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {/* Status and Priority Row */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusPill(
                    selectedRequest.displayStatus
                  )}`}
                >
                  {selectedRequest.displayStatus.replace("_", " ")}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityPill(
                    selectedRequest.priority
                  )}`}
                >
                  {selectedRequest.priority} Priority
                </span>
                <span className="text-xs text-[var(--text-muted)] ml-auto">
                  {selectedRequest.submittedDate}
                </span>
              </div>

              {/* Problem Description */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1">
                <div className="text-[11px] font-medium text-[var(--text-muted)]">Reported Problem</div>
                <div className="font-semibold text-xs text-[var(--text-primary)]">
                  {selectedRequest.problem}
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">
                  {selectedRequest.description}
                </p>
              </div>

              {/* Operational Dispatch Summary */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Trade Domain</span>
                  <span className="font-medium text-[var(--text-primary)] mt-0.5 block">
                    {selectedRequest.category}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Guaranteed SLA</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {getCoveragePlanSlaLabel(selectedRequest.coveragePlan)}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Work Order ID</span>
                  <span className="font-mono font-medium text-[var(--text-primary)] mt-0.5 block">
                    {selectedRequest.workOrderId || "Pending assignment"}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[11px] text-[var(--text-muted)] block">Assigned Technician</span>
                  <span className="font-medium text-[var(--text-primary)] mt-0.5 block">
                    {selectedRequest.assignedTech || "Pending dispatch"}
                  </span>
                </div>
              </div>

              {/* Completion Report Details (if completed) */}
              {selectedRequest.completionReport && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-xs">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircleIcon size={14} />
                    <span>Technician Completion Report</span>
                  </div>
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">Work Performed: </span>
                    <span className="text-[var(--text-muted)]">
                      {selectedRequest.completionReport.workPerformed || selectedRequest.completionReport.notes}
                    </span>
                  </div>
                  {selectedRequest.completionReport.diagnosis && (
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">Diagnosis: </span>
                      <span className="text-[var(--text-muted)]">
                        {selectedRequest.completionReport.diagnosis}
                      </span>
                    </div>
                  )}
                  {selectedRequest.completionReport.materialsUsed && (
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">Materials: </span>
                      <span className="text-[var(--text-muted)]">
                        {selectedRequest.completionReport.materialsUsed}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Tech: {selectedRequest.completionReport.technicianName}</span>
                    <span>Dispatcher Sign-Off: OK</span>
                  </div>
                </div>
              )}

              {/* Drawer Actions */}
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedRequest.workOrderId || selectedRequest.id;
                    setSelectedRequest(null);
                    setSupportDefaultId(id);
                    setSupportModalOpen(true);
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                >
                  <SendIcon size={12} />
                  <span>Report an issue with this ticket</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Additional Modals (Preserved Without Mutation) ── */}
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)]">
                  Additional Service Pack
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuotationModal(false);
                    setQuotationRequested(false);
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {quotationRequested ? (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-2 text-center">
                  <CheckCircleIcon size={20} className="mx-auto text-emerald-500" />
                  <div className="font-semibold text-sm">Quotation Request Logged</div>
                  <p className="text-slate-600 dark:text-slate-300">
                    A formal quotation for a 5-visit on-demand service pack has been routed to your facility account manager.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuotationModal(false);
                      setQuotationRequested(false);
                    }}
                    className="mt-2 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-[var(--text-muted)]">
                    Your facility has fully utilized included visits for this billing cycle. An on-demand 5-pack can be added immediately.
                  </p>
                  <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-1">
                    <div className="font-semibold text-xs text-[var(--text-primary)]">Enterprise On-Demand 5-Pack</div>
                    <ul className="space-y-0.5 text-[var(--text-muted)] text-[11px]">
                      <li>• 5 additional certified technician on-site visits</li>
                      <li>• Retains {subscription.planName} arrival SLA commitments</li>
                    </ul>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setShowQuotationModal(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotationRequested(true)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Demonstration Receipt Modal */}
        {activeReceipt && (
          <DemonstrationReceiptModal
            purchase={activeReceipt}
            onClose={() => setActiveReceipt(null)}
          />
        )}

        {/* Customer Satisfaction Feedback Modal */}
        <CustomerFeedbackModal
          isOpen={Boolean(activeFeedbackOrder)}
          onClose={handleDismissFeedback}
          workOrderId={activeFeedbackOrder?.workOrderId || ""}
          technicianName={activeFeedbackOrder?.assignedTech}
          assetName={activeFeedbackOrder?.asset}
          onSubmitSuccess={loadCustomerData}
        />

        {/* Customer Support & Issue Escalation Modal */}
        <CustomerSupportModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          defaultRelatedId={supportDefaultId}
        />
      </div>
    </Layout>
  );
}
