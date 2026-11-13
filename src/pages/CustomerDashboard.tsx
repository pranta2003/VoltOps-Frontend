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
} from "../types";
import { customerService } from "../services/customerService";
import { technicianService } from "../services/technicianService";
import { operationalStore } from "../services/operationalStore";
import {
  getSubscriptionEntitlement,
  SubscriptionEntitlement,
} from "../services/subscriptionService";
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
} from "../components/Icons";

interface CustomerViewRequest {
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

  // View Mode: 'recent' vs 'all'
  const [viewMode, setViewMode] = useState<"recent" | "all">(
    initialView || (viewParam === "all" ? "all" : "recent")
  );

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Subscription Credit State
  const [subscription, setSubscription] = useState<SubscriptionEntitlement>(() =>
    customerService.getSubscription(user?.id)
  );

  // Extra service pack quote modal state
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationRequested, setQuotationRequested] = useState(false);

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
                  arrivalSlaWindow = "En route · 20m SLA";
                } else if (r.coveragePlan === "247-standard") {
                  arrivalSlaWindow = "En route · 40m SLA";
                } else if (r.coveragePlan === "8hr") {
                  arrivalSlaWindow = "En route · Business hours";
                } else if (r.coveragePlan === "custom") {
                  arrivalSlaWindow = "En route · Custom SLA";
                } else {
                  arrivalSlaWindow = "En route";
                }
                break;
              case "ON_SITE":
                arrivalSlaWindow = "On site";
                break;
              case "WORK_COMPLETED_AWAITING_CONFIRMATION":
                arrivalSlaWindow = "Work done · Awaiting your confirmation";
                break;
              case "COMPLETED":
                arrivalSlaWindow = "Completed & signed off";
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
          };
        });

        setRequests(mapped);

        // Update subscription status
        const sub = getSubscriptionEntitlement(user?.id || "cust-epz-01", rawRequests, workOrders);
        setSubscription(sub);
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
      setViewMode("all");
    }
  }, [viewParam]);

  // Quick stats
  const activeCount = requests.filter((r) => r.displayStatus !== "COMPLETED" && r.displayStatus !== "CANCELLED").length;
  const inProgressCount = requests.filter(
    (r) => r.displayStatus === "ASSIGNED" || r.displayStatus === "TRAVELLING" || r.displayStatus === "ON_SITE"
  ).length;

  // Filtered requests
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

  // Sliced according to viewMode (Recent = top 5, All = complete list)
  const displayedRequests = useMemo(() => {
    if (viewMode === "recent" && !searchQuery && statusFilter === "ALL" && priorityFilter === "ALL" && categoryFilter === "ALL") {
      return filteredRequests.slice(0, 5);
    }
    return filteredRequests;
  }, [filteredRequests, viewMode, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
  };

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL";

  const getStatusBadge = (status: CustomerViewRequest["displayStatus"]) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "REVIEWING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "ASSIGNED":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
      case "TRAVELLING":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20 font-bold animate-pulse";
      case "ON_SITE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 font-bold";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold";
      case "CANCELLED":
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-bold";
      case "HIGH":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "LOW":
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <Layout
      title="Commercial Facility Portal"
      subtitle={`${user?.company || "Apex Spinning & Weaving Mills"} · Savar Facility`}
      action={
        <div className="flex items-center gap-2">
          <Link
            to="/customer/new-request"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+ New Service Request</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Summary & Subscription Row ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Requests */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>Active Requests</span>
              <AlertTriangleIcon size={16} className="text-amber-500" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-[var(--text-primary)]">
              {isLoading ? "—" : activeCount}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">Awaiting inspection or repair</div>
          </div>

          {/* Card 2: Field Dispatched */}
          <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>Field Dispatched</span>
              <ClockIcon size={16} className="text-blue-500" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-blue-600 dark:text-blue-400">
              {isLoading ? "—" : inProgressCount}
            </div>
            <div className="mt-1 text-xs text-blue-600/80 font-medium">Technician en route or on site</div>
          </div>

          {/* Card 3: Coverage Plan & SLA */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>Coverage Plan</span>
              <ShieldCheckIcon size={16} className="text-[#10b981]" />
            </div>
            <div className="mt-2 text-lg font-bold font-heading text-[#10b981] truncate">
              {subscription.planName}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">40-minute arrival SLA guaranteed</div>
          </div>

          {/* Card 4: Service Credits & Allowance */}
          <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
            subscription.isExhausted
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-[var(--border)] bg-[var(--bg-surface)]"
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>Service Visit Credits</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                subscription.needsConfiguration
                  ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                  : subscription.isExhausted
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/10 text-[#10b981] border-emerald-500/20"
              }`}>
                {subscription.needsConfiguration
                  ? "NEGOTIATED"
                  : subscription.isExhausted
                  ? "ALLOWANCE USED"
                  : "ACTIVE CYCLE"}
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              {subscription.needsConfiguration ? (
                <div>
                  <span className="text-base font-bold font-heading text-[var(--text-primary)]">
                    Allowance to be confirmed
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
                    Configured per enterprise contract
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold font-heading text-[var(--text-primary)]">
                  {subscription.remainingVisits}
                  <span className="text-xs font-normal text-[var(--text-muted)] ml-1">
                    of {subscription.includedVisits} left
                  </span>
                </span>
              )}
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {subscription.usedVisits} used
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2.5 h-1.5 w-full bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  subscription.needsConfiguration
                    ? "bg-slate-400"
                    : subscription.isExhausted
                    ? "bg-amber-500"
                    : "bg-[#10b981]"
                }`}
                style={{
                  width: subscription.needsConfiguration
                    ? "0%"
                    : `${Math.min(100, (subscription.usedVisits / (subscription.includedVisits || 1)) * 100)}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>Resets {subscription.billingCycleResetDate}</span>
              {subscription.needsConfiguration ? (
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(true)}
                  className="font-bold text-[#10b981] hover:underline"
                >
                  Request Pack +
                </button>
              ) : subscription.isExhausted ? (
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(true)}
                  className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Request Pack +
                </button>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Included in plan</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Exhausted or Unconfigured Allowance Warning Banner ──────────────────────────── */}
        {subscription.needsConfiguration ? (
          <div className="p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-800 dark:text-slate-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangleIcon size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Negotiated Visit Allowance Awaiting Confirmation:</strong>{" "}
                <span>
                  Your commercial plan uses a negotiated visit allowance that is awaiting confirmation. Included usage cannot be calculated until your negotiated allowance is configured. Standard requests are submitted as additional quotation packs.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQuotationModal(true)}
              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#10b981] hover:bg-[#059669] text-[#06090e] transition-all shrink-0 shadow-sm"
            >
              Request Service Pack
            </button>
          </div>
        ) : subscription.isExhausted ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangleIcon size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Subscription Service Allowance Exhausted:</strong>{" "}
                <span>
                  Your commercial plan allowance ({subscription.includedVisits} of {subscription.includedVisits} visits) has been utilized for this billing cycle.
                  Additional emergency visits require an approved service quotation pack.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQuotationModal(true)}
              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all shrink-0 shadow-sm"
            >
              Request Additional Pack
            </button>
          </div>
        ) : null}

        {/* ── Central Service Requests & History Section ───────────────────── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm space-y-0">
          {/* Header & View Mode Switcher */}
          <div className="p-4 sm:p-5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  {viewMode === "recent" ? "Recent Service Requests" : "Complete Request History"}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
                  {filteredRequests.length} total
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Real-time dispatch milestones, technician status, and on-site repair progress
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="p-0.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("recent");
                    setSearchParams({});
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    viewMode === "recent"
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Recent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("all");
                    setSearchParams({ view: "all" });
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    viewMode === "all"
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  All History
                </button>
              </div>

              <button
                type="button"
                onClick={loadCustomerData}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5"
                title="Refresh service requests"
              >
                <RefreshCwIcon size={12} className={isLoading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <Link
                to="/customer/new-request"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1"
              >
                <span>+ Report Breakdown</span>
              </Link>
            </div>
          </div>

          {/* ── Search & Filter Toolbar ────────────────────────────────────── */}
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface-2)]/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Search Box */}
              <div className="relative">
                <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="dashboard-search"
                  name="search"
                  type="text"
                  placeholder="Search ID, asset, problem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
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

              {/* Status Filter */}
              <div>
                <select
                  id="dashboard-status-filter"
                  name="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  aria-label="Filter by lifecycle status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active (Unresolved)</option>
                  <option value="IN_PROGRESS">In Progress (Dispatched)</option>
                  <option value="NEW">New (Awaiting Review)</option>
                  <option value="REVIEWING">Reviewing</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="TRAVELLING">Travelling</option>
                  <option value="ON_SITE">On Site</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  id="dashboard-priority-filter"
                  name="priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  aria-label="Filter by priority urgency"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent (Immediate Impact)</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  id="dashboard-category-filter"
                  name="category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  aria-label="Filter by trade category"
                >
                  <option value="ALL">All Service Trades</option>
                  {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                <span>
                  Showing <strong className="text-[var(--text-primary)]">{displayedRequests.length}</strong> matching requests
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-[#10b981] hover:underline flex items-center gap-1"
                >
                  <span>Reset filters</span>
                  <XIcon size={12} />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadCustomerData}
                className="font-bold underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Request Table ──────────────────────────────────────────────── */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Asset & Category</th>
                  <th className="py-3 px-4">Problem Summary</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA & Technician</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      <RefreshCwIcon size={16} className="inline animate-spin mr-2 text-[#10b981]" />
                      Loading service requests...
                    </td>
                  </tr>
                ) : displayedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
                      {hasActiveFilters ? (
                        <>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">No matching requests found</p>
                          <p>Try resetting filters or adjusting search keywords.</p>
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-block px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                          >
                            Clear Filters
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">No breakdown requests logged yet</p>
                          <p>Submit your first breakdown request to dispatch a certified technician.</p>
                          <Link
                            to="/customer/new-request"
                            className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e]"
                          >
                            + Submit First Request
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  displayedRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {r.id}
                        {r.workOrderId && (
                          <div className="text-[10px] font-mono text-[var(--text-muted)]">
                            WO: {r.workOrderId}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">{r.asset}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{r.category}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-[var(--text-primary)] font-medium truncate">{r.problem}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{r.submittedDate}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${getPriorityBadge(
                            r.priority
                          )}`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${getStatusBadge(
                            r.displayStatus
                          )}`}
                        >
                          {r.displayStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {r.arrivalSlaWindow ? (
                          <div>
                            <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                              {r.arrivalSlaWindow}
                            </span>
                            {r.assignedTech && (
                              <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs mt-0.5">
                                Tech: {r.assignedTech}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all flex items-center gap-1 ml-auto"
                        >
                          <EyeIcon size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* View Mode Footer (when in recent view with more available) */}
          {viewMode === "recent" && filteredRequests.length > 5 && (
            <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-surface-2)]/30 text-center">
              <button
                type="button"
                onClick={() => {
                  setViewMode("all");
                  setSearchParams({ view: "all" });
                }}
                className="text-xs font-bold text-[#10b981] hover:underline inline-flex items-center gap-1"
              >
                <span>View all {filteredRequests.length} historical requests</span>
                <ArrowRightIcon size={12} />
              </button>
            </div>
          )}
        </div>

        {/* ── Inspection Detail Modal ────────────────────────────────────── */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <span className="text-[11px] font-mono font-bold text-[var(--text-muted)]">
                    Service Request Details
                  </span>
                  <h3 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                    {selectedRequest.id} · {selectedRequest.asset}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={14} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1">
                  <div className="text-[var(--text-muted)] font-semibold text-[10px]">Problem Summary</div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">{selectedRequest.problem}</div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">{selectedRequest.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Trade Category</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedRequest.category}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Urgency</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{selectedRequest.priority}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Coverage SLA</span>
                    <span className="font-bold text-[#10b981]">{getCoveragePlanSlaLabel(selectedRequest.coveragePlan)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Status</span>
                    <span className="font-bold text-[#10b981]">{selectedRequest.displayStatus.replace("_", " ")}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Work Order</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{selectedRequest.workOrderId || "Pending"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Submitted</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedRequest.submittedDate}</span>
                  </div>
                </div>

                {selectedRequest.assignedTech && (
                  <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-1">
                    <div className="font-bold text-blue-700 dark:text-blue-300">Assigned Technician:</div>
                    <div className="font-semibold text-[var(--text-primary)]">{selectedRequest.assignedTech}</div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400">{selectedRequest.arrivalSlaWindow}</div>
                  </div>
                )}

                {selectedRequest.workNotes && (
                  <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                    <div className="font-bold text-emerald-800 dark:text-emerald-300">Technician Sign-Off Notes:</div>
                    <p className="text-slate-800 dark:text-slate-200">{selectedRequest.workNotes}</p>
                  </div>
                )}

                {selectedRequest.displayStatus === "WORK_COMPLETED_AWAITING_CONFIRMATION" && (
                  <div className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon size={18} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-bold text-sm text-[var(--text-primary)]">
                          Technician Submitted Work Completion
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Please verify the work performed on-site before confirming satisfactory completion.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedRequest.workOrderId) {
                          await technicianService.confirmJobCompletion(
                            selectedRequest.workOrderId,
                            user?.name || "Customer"
                          );
                          loadCustomerData();
                          setSelectedRequest(null);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
                    >
                      Confirm Satisfactory Completion
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Additional Service Pack Quotation Modal (Demo Mode) ─────────── */}
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon size={18} className="text-[#10b981]" />
                  <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                    Additional Service Pack
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuotationModal(false);
                    setQuotationRequested(false);
                  }}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {quotationRequested ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-2 text-center animate-fade-in">
                  <CheckCircleIcon size={24} className="mx-auto text-emerald-500" />
                  <div className="font-bold text-sm">Quotation Request Logged (Demo Mode)</div>
                  <p className="text-slate-600 dark:text-slate-300">
                    A formal quotation for a 5-visit on-demand service pack has been dispatched to your facility account manager.
                    No monetary transaction or automated billing was triggered.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuotationModal(false);
                      setQuotationRequested(false);
                    }}
                    className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e]"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Your facility has fully utilized the included <strong>{subscription.includedVisits} on-site visits</strong> for the current billing cycle.
                  </p>

                  <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-2">
                    <div className="font-bold text-sm text-[var(--text-primary)]">Enterprise On-Demand 5-Pack</div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      <li>• 5 additional certified technician on-site visits</li>
                      <li>• Retains {subscription.planName} arrival SLA commitments</li>
                      <li>• Commercial facility invoice generated post-signoff</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-700 dark:text-amber-400">
                    <em>Prototype Notice:</em> Quotation requests are simulated locally. No real banking session or monetary charge will occur.
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setShowQuotationModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotationRequested(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all"
                    >
                      Submit Quotation Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
