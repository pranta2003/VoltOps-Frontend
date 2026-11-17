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
  EyeIcon,
  StarIcon,
  SendIcon,
  RadioIcon,
  WrenchIcon,
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

  // Global keyboard accessibility: Escape closes any open modal or drawer safely
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

  // Active / Ongoing Incidents (The operational core answering "What is happening at my facility?")
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

  // Single Actionable Notification Identification (Only what genuinely needs attention right now)
  const pendingFeedbackRequest = useMemo(() => {
    return requests.find(
      (r) =>
        r.displayStatus === "COMPLETED" &&
        r.workOrderId &&
        !notificationService.hasProvidedFeedback(r.workOrderId) &&
        !dismissedFeedbackWos.includes(r.workOrderId)
    );
  }, [requests, dismissedFeedbackWos]);

  const pendingReviewRequest = useMemo(() => {
    return requests.find(
      (r) => r.displayStatus === "WORK_COMPLETED_AWAITING_CONFIRMATION"
    );
  }, [requests]);

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

  // Highly Stylized Badges: Crisp, High-Contrast B2B Aesthetics
  const renderPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 ring-1 ring-inset ring-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-500/15 text-zinc-400 ring-1 ring-inset ring-zinc-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            LOW
          </span>
        );
    }
  };

  const renderStatusBadge = (status: CustomerViewRequest["displayStatus"]) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400 text-zinc-950 shadow-xs">
            <CheckCircleIcon size={11} />
            COMPLETED
          </span>
        );
      case "TRAVELLING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 ring-1 ring-inset ring-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
            EN ROUTE
          </span>
        );
      case "ON_SITE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 ring-1 ring-inset ring-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
            ON SITE
          </span>
        );
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30">
            <ClockIcon size={11} />
            AWAITING SIGN-OFF
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
            ASSIGNED
          </span>
        );
      case "REVIEWING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30">
            TRIAGING
          </span>
        );
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            NEW
          </span>
        );
      case "CANCELLED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700/50">
            CANCELLED
          </span>
        );
    }
  };

  return (
    <Layout
      title="Facility Operations"
      subtitle={`${user?.company || "Apex Spinning & Weaving Mills"} · Savar Commercial Complex`}
      action={
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadCustomerData}
            disabled={isLoading}
            className="p-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#18191d] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-white/5 transition-all shadow-xs"
            title="Refresh active status"
          >
            <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
          <Link
            to="/customer/new-request"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span className="font-bold">+</span>
            <span>New Request</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 max-w-5xl">
        {/* ── 1. Compact Actionable Notification (High-Contrast Callout) ── */}
        {pendingFeedbackRequest ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/10 px-4 py-3 text-xs flex items-center justify-between gap-3 text-zinc-800 dark:text-zinc-100 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <StarIcon size={16} className="text-amber-400 shrink-0" fill="currentColor" />
              <span className="truncate">
                Service completed on <strong className="font-semibold text-zinc-900 dark:text-white">{pendingFeedbackRequest.asset}</strong> ({pendingFeedbackRequest.id}).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDismissFeedback(pendingFeedbackRequest.workOrderId)}
                className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2 py-1 rounded transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setActiveFeedbackOrder(pendingFeedbackRequest)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all shadow-xs"
              >
                Rate service
              </button>
            </div>
          </div>
        ) : pendingReviewRequest ? (
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 dark:bg-cyan-500/10 px-4 py-3 text-xs flex items-center justify-between gap-3 text-zinc-800 dark:text-zinc-100 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <ClockIcon size={16} className="text-cyan-400 shrink-0" />
              <span className="truncate">
                On-site repair for <strong className="font-semibold text-zinc-900 dark:text-white">{pendingReviewRequest.asset}</strong> completed. Dispatcher review in progress.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRequest(pendingReviewRequest)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shrink-0 transition-all shadow-xs"
            >
              Inspect
            </button>
          </div>
        ) : subscription.isExhausted ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/10 px-4 py-3 text-xs flex items-center justify-between gap-3 text-zinc-800 dark:text-zinc-100 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangleIcon size={16} className="text-amber-400 shrink-0" />
              <span className="truncate">
                Monthly visit allowance exhausted ({subscription.includedVisits} of {subscription.includedVisits} used).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuotationModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 shrink-0 transition-all shadow-xs"
            >
              Request Pack +
            </button>
          </div>
        ) : null}

        {/* ── 2. Active Requests List (Deep-Space Dark Surface & Micro-Elevations) ── */}
        <div className="rounded-xl border border-zinc-200/80 dark:border-white/5 bg-white dark:bg-[#141518] overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-zinc-200/80 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Active Requests
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-semibold ring-1 ring-inset ring-white/5">
                {activeRequests.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !showHistory;
                setShowHistory(next);
                setSearchParams(next ? { view: "all" } : {});
              }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors"
            >
              <span>{showHistory ? "Hide Service History" : "View Service History"}</span>
              <ArrowRightIcon size={12} className={showHistory ? "rotate-90 transition-transform" : "transition-transform"} />
            </button>
          </div>

          {/* Active Request Rows */}
          {isLoading ? (
            <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              <RefreshCwIcon size={14} className="inline animate-spin mr-2 text-blue-500" />
              Checking facility requests...
            </div>
          ) : activeRequests.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto ring-1 ring-inset ring-emerald-500/20">
                <CheckCircleIcon size={20} />
              </div>
              <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-50">
                All facility equipment operational
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                No active breakdown tickets are open.
              </p>
              <Link
                to="/customer/new-request"
                className="inline-block mt-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20"
              >
                + New Request
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/60 dark:divide-white/5">
              {activeRequests.map((req) => (
                <div
                  key={req.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-zinc-50/80 dark:hover:bg-white/[0.03] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white shrink-0 tabular-nums">
                      {req.id}
                    </span>

                    <div className="min-w-0">
                      <div className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {req.problem}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {req.asset} · <span className="text-zinc-400 dark:text-zinc-500">{req.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {renderPriorityBadge(req.priority)}
                    {renderStatusBadge(req.displayStatus)}

                    <button
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 ring-1 ring-inset ring-white/5 transition-all flex items-center gap-1 active:scale-[0.98]"
                    >
                      <span>View details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Progressive Disclosure: Service History Table (Aired Out with Subtle Borders) ── */}
        {showHistory && (
          <div className="rounded-xl border border-zinc-200/80 dark:border-white/5 bg-white dark:bg-[#141518] overflow-hidden shadow-xs animate-fade-in">
            <div className="px-5 py-3 border-b border-zinc-200/80 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <SearchIcon
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                />
                <input
                  id="dashboard-search"
                  name="search"
                  type="text"
                  placeholder="Filter by ID, asset, keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  id="dashboard-status-filter"
                  name="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                  aria-label="Filter status"
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
                  className="px-3 py-1.5 rounded-lg text-xs border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                  aria-label="Filter priority"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                </select>

                {searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL" ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 px-1"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>

            {/* Aired-Out Table with Seamless Header & Generous Padding */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200/80 dark:border-white/5 bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5">ID</th>
                    <th className="py-3.5 px-5">Problem</th>
                    <th className="py-3.5 px-5">Asset</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        No service records found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors">
                        <td className="py-4 px-5 font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                          {r.id}
                        </td>
                        <td className="py-4 px-5 text-zinc-900 dark:text-zinc-100 font-medium max-w-xs truncate">
                          {r.problem}
                        </td>
                        <td className="py-4 px-5 text-zinc-600 dark:text-zinc-300 truncate">
                          {r.asset}
                        </td>
                        <td className="py-4 px-5">
                          {renderStatusBadge(r.displayStatus)}
                        </td>
                        <td className="py-4 px-5 text-zinc-500 dark:text-zinc-400 tabular-nums text-[11px]">
                          {r.submittedDate}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(r)}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                          >
                            View details
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

        {/* ── 4. Progressive Disclosure Footer: Coverage & Billing Links ── */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/80 dark:border-white/5 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon size={15} className="text-emerald-500" />
            <span>
              Plan: <strong className="text-zinc-900 dark:text-white font-semibold">{subscription.planName}</strong>
              {subscription.remainingVisits !== null ? ` · ${subscription.remainingVisits} of ${subscription.includedVisits} visits remaining` : ""}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/customer/invoices"
              className="hover:text-zinc-900 dark:hover:text-white hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Invoices & Billing</span>
              <ArrowRightIcon size={12} />
            </Link>

            <button
              type="button"
              onClick={() => {
                setSupportDefaultId("");
                setSupportModalOpen(true);
              }}
              className="hover:text-zinc-900 dark:hover:text-white hover:underline flex items-center gap-1 transition-colors"
            >
              <SendIcon size={12} />
              <span>Contact Support</span>
            </button>
          </div>
        </div>

        {/* ── 5. Slide-Out Operational Detail Drawer (Timeline Tracking UI + Flat Surface) ── */}
        {selectedRequest && (() => {
          const activeStep = getTimelineStepIndex(selectedRequest.displayStatus);
          const timelineSteps = [
            { label: "Logged", sub: "Ticket registered" },
            { label: "Triaged", sub: "Dispatcher routed" },
            { label: "En route", sub: "Technician transit" },
            { label: "On site", sub: "Resolving incident" },
          ];

          return (
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedRequest(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs animate-fade-in"
            >
              <div className="w-full max-w-md h-full bg-white dark:bg-[#0f1013] border-l border-zinc-200 dark:border-white/10 p-6 shadow-2xl flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-zinc-200/80 dark:border-white/5">
                  <div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tracking-wider uppercase font-semibold">
                      Ticket {selectedRequest.id}
                    </div>
                    <h3 className="font-heading font-bold text-lg text-zinc-900 dark:text-white mt-0.5">
                      {selectedRequest.asset}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    aria-label="Close details"
                  >
                    <XIcon size={14} />
                  </button>
                </div>

                {/* Status and Urgency Row */}
                <div className="py-3.5 border-b border-zinc-200/80 dark:border-white/5 flex items-center gap-2.5">
                  {renderStatusBadge(selectedRequest.displayStatus)}
                  {renderPriorityBadge(selectedRequest.priority)}
                  <span className="text-[11px] font-mono text-zinc-400 ml-auto tabular-nums">
                    {selectedRequest.submittedDate}
                  </span>
                </div>

                {/* ── Polished Connected Horizontal Progress Timeline ── */}
                <div className="py-5 border-b border-zinc-200/80 dark:border-white/5 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Incident Tracking Lifecycle
                  </div>

                  {/* Connected Step Bar */}
                  <div className="relative pt-2 pb-1">
                    {/* Background Track */}
                    <div className="absolute top-5 left-3 right-3 h-0.5 bg-zinc-200 dark:bg-zinc-800 -translate-y-1/2 z-0" />
                    {/* Active Fill Track */}
                    <div
                      className="absolute top-5 left-3 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500"
                      style={{
                        width: `${(activeStep / (timelineSteps.length - 1)) * 92}%`,
                      }}
                    />

                    {/* Nodes Grid */}
                    <div className="relative z-10 flex justify-between">
                      {timelineSteps.map((step, idx) => {
                        const isCompleted = idx < activeStep;
                        const isCurrent = idx === activeStep;
                        return (
                          <div key={step.label} className="flex flex-col items-center text-center w-20">
                            {/* Node Dot */}
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isCompleted
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : isCurrent
                                  ? "bg-blue-500 text-white ring-4 ring-blue-500/25 shadow-md shadow-blue-500/30 animate-pulse"
                                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                              }`}
                            >
                              {isCompleted ? "✓" : idx + 1}
                            </div>
                            {/* Label */}
                            <span
                              className={`mt-2 text-[10px] uppercase font-bold tracking-wider ${
                                isCurrent
                                  ? "text-blue-500 dark:text-blue-400"
                                  : isCompleted
                                  ? "text-zinc-800 dark:text-zinc-200"
                                  : "text-zinc-400 dark:text-zinc-500"
                              }`}
                            >
                              {step.label}
                            </span>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5 hidden sm:block">
                              {step.sub}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Problem Statement (Flattened, Typography-Driven) */}
                <div className="py-4 border-b border-zinc-200/80 dark:border-white/5 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Problem Summary
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {selectedRequest.problem}
                  </div>
                  {selectedRequest.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                      {selectedRequest.description}
                    </p>
                  )}
                </div>

                {/* Operational Metadata (Flattened Label / Value Grid with High Contrast SLA) */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 py-4 border-b border-zinc-200/80 dark:border-white/5 text-xs">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Trade Category</dt>
                    <dd className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{selectedRequest.category}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target Arrival SLA</dt>
                    <dd className="mt-1 font-bold text-cyan-400 tracking-tight flex items-center gap-1">
                      <ClockIcon size={12} className="text-cyan-400" />
                      <span>{selectedRequest.arrivalSlaWindow || getCoveragePlanSlaLabel(selectedRequest.coveragePlan)}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Work Order ID</dt>
                    <dd className="mt-1 font-mono text-zinc-900 dark:text-zinc-200 font-bold">{selectedRequest.workOrderId || "Pending assignment"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assigned Technician</dt>
                    <dd className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{selectedRequest.assignedTech || "Pending dispatch"}</dd>
                  </div>
                </dl>

                {/* Technician Completion Report (when completed) */}
                {selectedRequest.completionReport && (
                  <div className="py-4 border-b border-zinc-200/80 dark:border-white/5 space-y-3 text-xs">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <CheckCircleIcon size={14} />
                      <span>Technician Completion Report</span>
                    </div>
                    <dl className="space-y-2.5">
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Work Performed</dt>
                        <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                          {selectedRequest.completionReport.workPerformed || selectedRequest.completionReport.notes}
                        </dd>
                      </div>
                      {selectedRequest.completionReport.diagnosis && (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Diagnosis</dt>
                          <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200 font-medium">
                            {selectedRequest.completionReport.diagnosis}
                          </dd>
                        </div>
                      )}
                      {selectedRequest.completionReport.materialsUsed && (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Materials Used</dt>
                          <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200 font-medium">
                            {selectedRequest.completionReport.materialsUsed}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>Tech: {selectedRequest.completionReport.technicianName}</span>
                      <span className="text-emerald-400 font-sans font-bold">✓ Dispatcher Verified</span>
                    </div>
                  </div>
                )}

                {/* Drawer Actions */}
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedRequest.workOrderId || selectedRequest.id;
                      setSelectedRequest(null);
                      setSupportDefaultId(id);
                      setSupportModalOpen(true);
                    }}
                    className="text-xs font-semibold text-zinc-400 hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                  >
                    <SendIcon size={12} />
                    <span>Report issue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/15 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Additional Modals (Preserved Without Mutation) ── */}
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141518] p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/5">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
                  Additional Service Pack
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuotationModal(false);
                    setQuotationRequested(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <XIcon size={13} />
                </button>
              </div>

              {quotationRequested ? (
                <div className="p-4 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs space-y-2 text-center ring-1 ring-inset ring-emerald-500/20">
                  <CheckCircleIcon size={20} className="mx-auto text-emerald-400" />
                  <div className="font-bold text-xs uppercase tracking-wider text-white">Quotation Request Logged</div>
                  <p className="text-[11px] text-zinc-300">
                    A formal quotation for a 5-visit on-demand service pack has been routed to your facility manager.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuotationModal(false);
                      setQuotationRequested(false);
                    }}
                    className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/20"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-zinc-400 text-[11px]">
                    Your facility has fully utilized included visits for this billing cycle.
                  </p>
                  <div className="py-2.5 px-3 rounded-lg border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 space-y-1">
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Enterprise On-Demand 5-Pack</div>
                    <ul className="space-y-0.5 text-zinc-400 text-[10px]">
                      <li>• 5 additional certified technician on-site visits</li>
                      <li>• Retains {subscription.planName} arrival SLA commitments</li>
                    </ul>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowQuotationModal(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotationRequested(true)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-500/20"
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
