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

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      case "HIGH":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "LOW":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getStatusBadge = (status: CustomerViewRequest["displayStatus"]) => {
    switch (status) {
      case "NEW":
        return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20";
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
            className="p-2 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh active status"
          >
            <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
          <Link
            to="/customer/new-request"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>+ New Request</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 max-w-5xl">
        {/* ── 1. Compact Actionable Notification (Only When Genuinely Required) ── */}
        {pendingFeedbackRequest ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <StarIcon size={14} className="text-amber-500 shrink-0" fill="currentColor" />
              <span className="truncate text-[var(--text-primary)]">
                Service completed on <strong>{pendingFeedbackRequest.asset}</strong> ({pendingFeedbackRequest.id}).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDismissFeedback(pendingFeedbackRequest.workOrderId)}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setActiveFeedbackOrder(pendingFeedbackRequest)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                Rate service
              </button>
            </div>
          </div>
        ) : pendingReviewRequest ? (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2.5 text-xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <ClockIcon size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate text-[var(--text-primary)]">
                On-site repair for <strong>{pendingReviewRequest.asset}</strong> completed. Dispatcher review in progress.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRequest(pendingReviewRequest)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shrink-0 transition-colors"
            >
              Inspect
            </button>
          </div>
        ) : subscription.isExhausted ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangleIcon size={14} className="text-amber-500 shrink-0" />
              <span className="truncate text-[var(--text-primary)]">
                Monthly visit allowance exhausted ({subscription.includedVisits} of {subscription.includedVisits} used).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuotationModal(true)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-600 hover:bg-amber-500 text-white shrink-0 transition-colors"
            >
              Request Pack +
            </button>
          </div>
        ) : null}

        {/* ── 2. Active Requests List (Answers: "What is happening at my facility?") ── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-semibold text-xs text-[var(--text-primary)]">
                Active Requests
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
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
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>{showHistory ? "Hide Service History" : "View Service History"}</span>
              <ArrowRightIcon size={11} className={showHistory ? "rotate-90 transition-transform" : ""} />
            </button>
          </div>

          {/* Active Request Rows */}
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              <RefreshCwIcon size={14} className="inline animate-spin mr-2 text-emerald-500" />
              Checking facility requests...
            </div>
          ) : activeRequests.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircleIcon size={18} />
              </div>
              <div className="font-semibold text-xs text-[var(--text-primary)]">
                All facility equipment operational
              </div>
              <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
                No active breakdown tickets are open.
              </p>
              <Link
                to="/customer/new-request"
                className="inline-block mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                + New Request
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {activeRequests.map((req) => (
                <div
                  key={req.id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-surface-2)]/60 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">
                      {req.id}
                    </span>

                    <div className="min-w-0">
                      <div className="font-medium text-xs text-[var(--text-primary)] truncate">
                        {req.problem}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {req.asset} · <span className="text-[var(--text-muted)]">{req.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getPriorityBadge(
                        req.priority
                      )}`}
                    >
                      {req.priority}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(
                        req.displayStatus
                      )}`}
                    >
                      {req.displayStatus === "TRAVELLING" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse inline-block mr-1.5" />
                      )}
                      {req.displayStatus.replace("_", " ")}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-1"
                    >
                      <span>View details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Progressive Disclosure: Service History Archive (Revealed on Demand) ── */}
        {showHistory && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-xs animate-fade-in">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface-2)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative w-full sm:w-72">
                <SearchIcon
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  id="dashboard-search"
                  name="search"
                  type="text"
                  placeholder="Filter by ID, asset, keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-6 py-1 rounded-md text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  >
                    <XIcon size={11} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <select
                  id="dashboard-status-filter"
                  name="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 rounded-md text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
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
                  className="px-2 py-1 rounded-md text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
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
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>

            {/* Scannable Compact Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] text-[11px] font-medium">
                    <th className="py-2 px-4">ID</th>
                    <th className="py-2 px-4">Problem</th>
                    <th className="py-2 px-4">Asset</th>
                    <th className="py-2 px-4">Status</th>
                    <th className="py-2 px-4">Date</th>
                    <th className="py-2 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-[var(--text-muted)]">
                        No requests found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-surface-2)]/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-[var(--text-primary)] tabular-nums">
                          {r.id}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--text-primary)] font-medium max-w-xs truncate">
                          {r.problem}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--text-muted)] truncate">
                          {r.asset}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-medium border ${getStatusBadge(
                              r.displayStatus
                            )}`}
                          >
                            {r.displayStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[var(--text-muted)] tabular-nums text-[11px]">
                          {r.submittedDate}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(r)}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
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
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border)] gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>
              Plan: <strong className="text-[var(--text-primary)]">{subscription.planName}</strong>
              {subscription.remainingVisits !== null ? ` · ${subscription.remainingVisits} of ${subscription.includedVisits} visits remaining` : ""}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/customer/invoices"
              className="hover:text-[var(--text-primary)] hover:underline flex items-center gap-1"
            >
              <span>Invoices & Billing</span>
              <ArrowRightIcon size={11} />
            </Link>

            <button
              type="button"
              onClick={() => {
                setSupportDefaultId("");
                setSupportModalOpen(true);
              }}
              className="hover:text-[var(--text-primary)] hover:underline flex items-center gap-1"
            >
              <SendIcon size={11} />
              <span>Contact Support</span>
            </button>
          </div>
        </div>

        {/* ── 5. Slide-Out Operational Detail Drawer (Encapsulates Secondary Information) ── */}
        {selectedRequest && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedRequest(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-fade-in"
          >
            <div className="w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border)] p-5 shadow-xl space-y-4 overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)]">
                    Ticket {selectedRequest.id}
                  </div>
                  <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)]">
                    {selectedRequest.asset}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Close details"
                >
                  <XIcon size={13} />
                </button>
              </div>

              {/* Status and Urgency */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                    selectedRequest.displayStatus
                  )}`}
                >
                  {selectedRequest.displayStatus.replace("_", " ")}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityBadge(
                    selectedRequest.priority
                  )}`}
                >
                  {selectedRequest.priority} Priority
                </span>
                <span className="text-[11px] text-[var(--text-muted)] ml-auto tabular-nums">
                  {selectedRequest.submittedDate}
                </span>
              </div>

              {/* Problem Statement */}
              <div className="p-3 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1">
                <div className="text-[11px] font-medium text-[var(--text-muted)]">Problem Summary</div>
                <div className="font-semibold text-xs text-[var(--text-primary)]">
                  {selectedRequest.problem}
                </div>
                {selectedRequest.description && (
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-1">
                    {selectedRequest.description}
                  </p>
                )}
              </div>

              {/* Operational Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Trade Category</span>
                  <span className="font-medium text-[var(--text-primary)] block mt-0.5">
                    {selectedRequest.category}
                  </span>
                </div>
                <div className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Arrival Target SLA</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {selectedRequest.arrivalSlaWindow || getCoveragePlanSlaLabel(selectedRequest.coveragePlan)}
                  </span>
                </div>
                <div className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Work Order ID</span>
                  <span className="font-mono text-[var(--text-primary)] block mt-0.5">
                    {selectedRequest.workOrderId || "Pending assignment"}
                  </span>
                </div>
                <div className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Assigned Technician</span>
                  <span className="font-medium text-[var(--text-primary)] block mt-0.5">
                    {selectedRequest.assignedTech || "Pending dispatch"}
                  </span>
                </div>
              </div>

              {/* Technician Completion Report (when completed) */}
              {selectedRequest.completionReport && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-xs">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircleIcon size={13} />
                    <span>Technician Completion Report</span>
                  </div>
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">Work Done: </span>
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
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
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
                  <SendIcon size={11} />
                  <span>Report issue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Additional Modals (Preserved Without Mutation) ── */}
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <h3 className="font-heading font-semibold text-xs text-[var(--text-primary)]">
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
                  <XIcon size={13} />
                </button>
              </div>

              {quotationRequested ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-2 text-center">
                  <CheckCircleIcon size={18} className="mx-auto text-emerald-500" />
                  <div className="font-semibold text-xs">Quotation Request Logged</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    A formal quotation for a 5-visit on-demand service pack has been routed to your facility manager.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuotationModal(false);
                      setQuotationRequested(false);
                    }}
                    className="mt-1 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-[var(--text-muted)] text-[11px]">
                    Your facility has fully utilized included visits for this billing cycle.
                  </p>
                  <div className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-1">
                    <div className="font-semibold text-xs text-[var(--text-primary)]">Enterprise On-Demand 5-Pack</div>
                    <ul className="space-y-0.5 text-[var(--text-muted)] text-[10px]">
                      <li>• 5 additional certified technician on-site visits</li>
                      <li>• Retains {subscription.planName} arrival SLA commitments</li>
                    </ul>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setShowQuotationModal(false)}
                      className="px-3 py-1 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-muted)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotationRequested(true)}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
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
