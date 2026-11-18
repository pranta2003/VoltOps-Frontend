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

  // Persistent dismissed feedback tracking (does not reopen on future visits)
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
                arrivalSlaWindow = "Work done · Awaiting dispatcher review";
                break;
              case "COMPLETED":
                if (linkedOrder.dispatcherApproved) {
                  arrivalSlaWindow = "OK — Work completed and dispatcher approved";
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

  // Modern, soft-tinted status badges with subtle inset ring
  const getStatusBadge = (status: CustomerViewRequest["displayStatus"]) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/25";
      case "REVIEWING":
        return "bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-500/25";
      case "ASSIGNED":
        return "bg-[#10b981]/15 text-[#10b981] ring-1 ring-inset ring-[#10b981]/30 font-semibold";
      case "TRAVELLING":
        return "bg-cyan-500/10 text-cyan-400 ring-1 ring-inset ring-cyan-500/25 font-bold animate-pulse";
      case "ON_SITE":
        return "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/25 font-bold";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/25 font-semibold";
      case "CANCELLED":
        return "bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700/50";
    }
  };

  // Modern, soft-tinted priority badges with subtle inset ring
  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/25 font-bold";
      case "HIGH":
        return "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/25 font-semibold";
      case "MEDIUM":
        return "bg-sky-500/10 text-sky-400 ring-1 ring-inset ring-sky-500/25";
      case "LOW":
      default:
        return "bg-zinc-800 text-zinc-400 ring-1 ring-inset ring-zinc-700/40";
    }
  };

  return (
    <Layout
      title="Facility Operations"
      subtitle={`${user?.company || "Apex Spinning & Weaving Mills"} · Savar Commercial Complex`}
      action={
        <div className="flex items-center gap-2">
          <Link
            to="/customer/new-request"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-zinc-950 transition-all shadow-md shadow-emerald-500/15 flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span>+ New Service Request</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl">
        {/* ── 1. Top Row: 4 Metric Cards (Clean, Elevated Surfaces) ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Requests */}
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-zinc-900/90 shadow-sm hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
              <span>Active requests</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangleIcon size={15} className="text-amber-400" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-zinc-50 tracking-tight font-mono">
              {isLoading ? "—" : activeCount}
            </div>
            <div className="mt-1 text-xs text-zinc-400">Awaiting inspection or repair</div>
          </div>

          {/* Card 2: Field Dispatched */}
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-zinc-900/90 shadow-sm hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
              <span>Field dispatched</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <ClockIcon size={15} className="text-sky-400" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-sky-400 tracking-tight font-mono">
              {isLoading ? "—" : inProgressCount}
            </div>
            <div className="mt-1 text-xs text-zinc-400">Technician en route or on site</div>
          </div>

          {/* Card 3: Coverage Plan & SLA */}
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-zinc-900/90 shadow-sm hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
              <span>Coverage plan</span>
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center">
                <ShieldCheckIcon size={15} className="text-[#10b981]" />
              </div>
            </div>
            <div className="mt-3 text-base font-extrabold text-[#10b981] truncate">
              {subscription.planName}
            </div>
            <div className="mt-1 text-xs text-zinc-400 truncate">
              {subscription.planId === "247-priority"
                ? "20-minute physical arrival SLA"
                : subscription.planId === "247-standard"
                ? "40-minute physical arrival SLA"
                : subscription.planId === "8hr"
                ? "8-Hour daily window (08:00 – 17:00)"
                : subscription.hasActiveSubscription
                ? "Negotiated operational terms"
                : "Active subscription required"}
            </div>
          </div>

          {/* Card 4: Service Credits & Allowance */}
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-zinc-900/90 shadow-sm hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
              <span>Service visit credits</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${
                  subscription.needsConfiguration
                    ? "bg-zinc-800 text-zinc-300 ring-zinc-700/50"
                    : subscription.isExhausted
                    ? "bg-amber-500/10 text-amber-400 ring-amber-500/25"
                    : "bg-emerald-500/10 text-[#10b981] ring-emerald-500/25"
                }`}
              >
                {subscription.needsConfiguration
                  ? "Negotiated"
                  : subscription.isExhausted
                  ? "Allowance used"
                  : "Active cycle"}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              {subscription.needsConfiguration ? (
                <div>
                  <span className="text-sm font-bold text-zinc-50">
                    Allowance to be confirmed
                  </span>
                  <span className="block text-[11px] text-zinc-400 mt-0.5">
                    Configured per contract
                  </span>
                </div>
              ) : (
                <div className="text-3xl font-extrabold text-zinc-50 tracking-tight font-mono">
                  {subscription.remainingVisits}
                  <span className="text-xs font-normal text-zinc-400 ml-1.5 font-sans">
                    / {subscription.includedVisits} left
                  </span>
                </div>
              )}
              <span className="text-xs font-mono text-zinc-400">
                {subscription.usedVisits} used
              </span>
            </div>

            {/* Sleek Progress Bar */}
            <div className="mt-3 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  subscription.needsConfiguration
                    ? "bg-zinc-600"
                    : subscription.isExhausted
                    ? "bg-rose-500"
                    : subscription.remainingVisits && subscription.remainingVisits <= 3
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

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Resets {subscription.billingCycleResetDate || "1 Dec 2026"}</span>
              {subscription.needsConfiguration || subscription.isExhausted ? (
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(true)}
                  className="font-bold text-[#10b981] hover:underline"
                >
                  Request Pack +
                </button>
              ) : (
                <span className="text-emerald-400 font-medium">Included in plan</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Exhausted or Unconfigured Allowance Warning Banner ──────────────────────────── */}
        {subscription.needsConfiguration ? (
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08] text-zinc-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangleIcon size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-zinc-100">Negotiated Visit Allowance Awaiting Confirmation:</strong>{" "}
                <span className="text-zinc-400">
                  Your commercial plan uses a negotiated visit allowance awaiting confirmation. Included usage cannot be calculated until configured. Standard requests are submitted as additional quotation packs.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQuotationModal(true)}
              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#10b981] hover:bg-[#059669] text-zinc-950 transition-all shrink-0 shadow-sm"
            >
              Request Service Pack
            </button>
          </div>
        ) : subscription.isExhausted ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangleIcon size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-100">Subscription Service Allowance Exhausted:</strong>{" "}
                <span className="text-zinc-300">
                  Your commercial plan allowance ({subscription.includedVisits} of {subscription.includedVisits} visits) has been utilized for this billing cycle. Additional emergency visits require an approved service quotation pack.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQuotationModal(true)}
              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-600 text-white transition-all shrink-0 shadow-sm"
            >
              Request Additional Pack
            </button>
          </div>
        ) : null}

        {/* ── Pending Job Completion Notifications ────────────────────────── */}
        {requests
          .filter((r) => r.displayStatus === "WORK_COMPLETED_AWAITING_CONFIRMATION")
          .map((pReq) => (
            <div
              key={`pending-comp-${pReq.id}`}
              className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fade-in"
            >
              <div className="flex items-start gap-2.5">
                <ClockIcon size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-zinc-100">On-Site Work Reported Complete:</strong>{" "}
                  <span className="text-zinc-300">
                    Technician {pReq.assignedTech || "on site"} has completed work for Request{" "}
                    <span className="font-mono font-bold text-cyan-300">{pReq.id}</span> ({pReq.category} ·{" "}
                    {pReq.asset}). Awaiting senior dispatcher review and sign-off.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(pReq)}
                className="px-4 py-1.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white transition-all shrink-0 shadow-sm"
              >
                Inspect Report
              </button>
            </div>
          ))}

        {/* ── Completed & Dispatcher Approved Feedback Prompts ────────────── */}
        {requests
          .filter(
            (r) =>
              r.displayStatus === "COMPLETED" &&
              r.workOrderId &&
              !notificationService.hasProvidedFeedback(r.workOrderId) &&
              !dismissedFeedbackWos.includes(r.workOrderId)
          )
          .map((cReq) => (
            <div
              key={`feedback-prompt-${cReq.id}`}
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fade-in"
            >
              <div className="flex items-start gap-2.5">
                <StarIcon size={18} className="text-amber-400 shrink-0 mt-0.5" fill="currentColor" />
                <div>
                  <strong className="font-bold text-zinc-100">Work Completed & Dispatcher Approved:</strong>{" "}
                  <span className="text-zinc-300">
                    Service for Request <span className="font-mono font-bold text-amber-300">{cReq.id}</span> ({cReq.asset}) is complete. How was your experience with technician {cReq.assignedTech || "on site"}?
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDismissFeedback(cReq.workOrderId)}
                  className="px-2.5 py-1.5 rounded-xl font-medium text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  Maybe later
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFeedbackOrder(cReq)}
                  className="px-4 py-1.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-zinc-950 transition-all shadow-sm"
                >
                  Rate Service (★)
                </button>
              </div>
            </div>
          ))}

        {/* ── 2. Subscribed Plan & Demonstration Purchase Receipts ─────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/90 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-bold text-base text-zinc-50 tracking-tight">
                  Active Facility Coverage & Purchases
                </h2>
                {subscription.hasActiveSubscription ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
                    {subscription.planName}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/25">
                    No Active Subscription
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {subscription.hasActiveSubscription ? (
                  <>
                    Physical arrival commitment: <strong className="text-zinc-200">{subscription.planId === "247-priority" ? "20-minute rapid arrival SLA" : subscription.planId === "247-standard" ? "40-minute arrival SLA" : subscription.planId === "8hr" ? "8-Hour daily window" : "Negotiated terms"}</strong> • {subscription.remainingVisits !== null ? `${subscription.remainingVisits} of ${subscription.includedVisits} service visits available` : "Negotiated allowance"}
                  </>
                ) : (
                  <span>An active subscription plan is required to submit on-site dispatch requests and receive guaranteed arrival SLAs.</span>
                )}
              </p>
            </div>

            <Link
              to={subscription.hasActiveSubscription && subscription.planId ? `/checkout?plan=${subscription.planId}` : "/#packages"}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <span>{subscription.hasActiveSubscription ? "Change Plan / Checkout" : "Subscribe to a Plan"}</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>

          {/* Receipts List */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              Demonstration Receipts ({purchases.length})
            </span>

            {purchases.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No purchases recorded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {purchases.map((pur) => (
                  <div
                    key={pur.purchaseId}
                    className="p-4 rounded-xl border border-white/[0.06] bg-zinc-950/60 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-100">{pur.receiptId}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
                          {pur.paymentStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1">
                        {pur.planName} • {new Date(pur.date).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="text-xs font-mono font-bold text-zinc-200 mt-1">
                        {formatBdt(pur.totalAmount)} ({pur.billingPeriod})
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveReceipt(pur)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all flex items-center gap-1 shrink-0"
                    >
                      <EyeIcon size={13} />
                      <span>View Receipt</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Central Service Requests Table & Filter Toolbar ─────────────── */}
        <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/90 overflow-hidden shadow-sm space-y-0">
          {/* Header & View Mode Switcher */}
          <div className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-bold text-base text-zinc-50 tracking-tight">
                  {viewMode === "recent" ? "Recent Service Requests" : "Complete Request History"}
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-zinc-300 font-mono">
                  {filteredRequests.length} total
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time dispatch milestones, technician status, and on-site repair progress
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sleek Segmented Control */}
              <div className="p-1 rounded-xl border border-white/[0.08] bg-zinc-950/80 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("recent");
                    setSearchParams({});
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    viewMode === "recent"
                      ? "bg-zinc-800 text-zinc-50 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
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
                      ? "bg-zinc-800 text-zinc-50 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All History
                </button>
              </div>

              <button
                type="button"
                onClick={loadCustomerData}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.08] bg-zinc-950/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                title="Refresh service requests"
              >
                <RefreshCwIcon size={12} className={isLoading ? "animate-spin text-[#10b981]" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSupportDefaultId("");
                  setSupportModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/[0.08] bg-zinc-950/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1.5"
                title="Contact VoltOps Operations Support"
              >
                <SendIcon size={12} className="text-[#10b981]" />
                <span className="hidden sm:inline">Contact Support</span>
              </button>

              <Link
                to="/customer/new-request"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-zinc-950 transition-all shadow-sm flex items-center gap-1"
              >
                <span>+ Report Breakdown</span>
              </Link>
            </div>
          </div>

          {/* ── Search & Filter Toolbar ────────────────────────────────────── */}
          <div className="p-4 border-b border-white/[0.06] bg-zinc-950/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Search Box */}
              <div className="relative">
                <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="dashboard-search"
                  name="search"
                  type="text"
                  placeholder="Search ID, asset, problem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 rounded-xl text-xs border border-white/[0.08] bg-zinc-950/80 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
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
                  className="w-full px-3 py-2 rounded-xl text-xs border border-white/[0.08] bg-zinc-950/80 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
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
                  className="w-full px-3 py-2 rounded-xl text-xs border border-white/[0.08] bg-zinc-950/80 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
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
                  className="w-full px-3 py-2 rounded-xl text-xs border border-white/[0.08] bg-zinc-950/80 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
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
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                <span>
                  Showing <strong className="text-zinc-100">{displayedRequests.length}</strong> matching requests
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
            <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
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
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 text-zinc-400 font-bold uppercase tracking-wider text-xs">
                  <th className="py-3.5 px-4">Request ID</th>
                  <th className="py-3.5 px-4">Asset & Category</th>
                  <th className="py-3.5 px-4">Problem Summary</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">SLA & Technician</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-zinc-400">
                      <RefreshCwIcon size={16} className="inline animate-spin mr-2 text-[#10b981]" />
                      Loading service requests...
                    </td>
                  </tr>
                ) : displayedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-zinc-400 space-y-2">
                      {hasActiveFilters ? (
                        <>
                          <p className="font-semibold text-sm text-zinc-100">No matching requests found</p>
                          <p className="text-zinc-500">Try resetting filters or adjusting search keywords.</p>
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-block px-4 py-2 rounded-xl text-xs font-bold border border-white/[0.08] bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
                          >
                            Clear Filters
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm text-zinc-100">No breakdown requests logged yet</p>
                          <p className="text-zinc-500">Submit your first breakdown request to dispatch a certified technician.</p>
                          <Link
                            to="/customer/new-request"
                            className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950 shadow-md"
                          >
                            + Submit First Request
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  displayedRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-50">
                        {r.id}
                        {r.workOrderId && (
                          <div className="text-[10px] font-mono text-zinc-400">
                            WO: {r.workOrderId}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-100">{r.asset}</div>
                        <div className="text-[11px] text-zinc-400">{r.category}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-zinc-200 font-medium truncate">{r.problem}</div>
                        <div className="text-[11px] text-zinc-500">{r.submittedDate}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] ${getPriorityBadge(
                            r.priority
                          )}`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] ${getStatusBadge(
                            r.displayStatus
                          )}`}
                        >
                          {r.displayStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {r.arrivalSlaWindow ? (
                          <div>
                            <span className="font-semibold text-sky-400 block">
                              {r.arrivalSlaWindow}
                            </span>
                            {r.assignedTech && (
                              <div className="text-[11px] text-zinc-400 truncate max-w-xs mt-0.5">
                                Tech: {r.assignedTech}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 hover:text-white border border-white/[0.07] transition-all flex items-center gap-1.5 ml-auto shadow-xs"
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
            <div className="p-3.5 border-t border-white/[0.06] bg-zinc-950/30 text-center">
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

        {/* ── 4. Inspection Detail Modal / Flattened Drawer (Anti-Nesting) ───── */}
        {selectedRequest && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedRequest(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-xl rounded-3xl border border-white/[0.08] bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block font-mono">
                    Service Request Details
                  </span>
                  <h3 className="font-bold text-xl text-zinc-50 mt-0.5 tracking-tight">
                    {selectedRequest.id} · {selectedRequest.asset}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="w-8 h-8 rounded-full border border-white/[0.08] bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {/* Flattened Single-Surface Body */}
              <div className="space-y-5 text-xs">
                {/* Problem Summary (Flat section) */}
                <div className="pb-4 border-b border-white/[0.06] space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Problem Summary
                  </span>
                  <div className="font-bold text-sm text-zinc-50">{selectedRequest.problem}</div>
                  <p className="text-zinc-300 leading-relaxed pt-1">
                    {selectedRequest.description || "Routine breakdown maintenance and diagnostic check."}
                  </p>
                </div>

                {/* Clean Label / Value Grid (No nested box-within-a-box) */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 pb-4 border-b border-white/[0.06]">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Trade Category
                    </span>
                    <span className="font-semibold text-zinc-100 text-xs">{selectedRequest.category}</span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Urgency
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${getPriorityBadge(selectedRequest.priority)}`}>
                      {selectedRequest.priority}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Coverage SLA
                    </span>
                    <span className="font-semibold text-[#10b981] text-xs">
                      {getCoveragePlanSlaLabel(selectedRequest.coveragePlan)}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Status
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${getStatusBadge(selectedRequest.displayStatus)}`}>
                      {selectedRequest.displayStatus.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Work Order
                    </span>
                    <span className="font-mono font-bold text-zinc-200 text-xs">
                      {selectedRequest.workOrderId || "Pending"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Submitted
                    </span>
                    <span className="font-semibold text-zinc-200 text-xs">{selectedRequest.submittedDate}</span>
                  </div>
                </div>

                {/* Assigned Technician (Flat divider block) */}
                {selectedRequest.assignedTech && (
                  <div className="pb-4 border-b border-white/[0.06] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Assigned Specialist
                      </span>
                      <div className="font-bold text-sm text-zinc-50">{selectedRequest.assignedTech}</div>
                      <div className="text-xs text-sky-400 font-medium mt-0.5">{selectedRequest.arrivalSlaWindow}</div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-[#10b981]/15 text-[#10b981] font-bold text-xs flex items-center justify-center border border-[#10b981]/30">
                      {selectedRequest.assignedTech.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                  </div>
                )}

                {/* Technician Sign-Off Notes */}
                {selectedRequest.workNotes && (
                  <div className="pb-4 border-b border-white/[0.06] space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                      Technician Sign-Off Notes
                    </span>
                    <p className="text-zinc-200 leading-relaxed">{selectedRequest.workNotes}</p>
                  </div>
                )}

                {/* State 1: Work Reported Complete — Awaiting Dispatcher Review */}
                {selectedRequest.displayStatus === "WORK_COMPLETED_AWAITING_CONFIRMATION" && (
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 space-y-3">
                    <div className="flex items-center gap-2">
                      <ClockIcon size={18} className="text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-bold text-sm text-zinc-50">
                          Technician Submitted Work Completion
                        </div>
                        <div className="text-xs text-zinc-300">
                          Work performed on-site by technician {selectedRequest.assignedTech || "assigned"}. Queued for senior dispatcher review and sign-off.
                        </div>
                      </div>
                    </div>

                    {selectedRequest.completionReport && (
                      <div className="pt-2 border-t border-cyan-500/20 text-xs space-y-1.5">
                        <div className="font-semibold text-zinc-100">Work Performed:</div>
                        <p className="text-zinc-300">
                          {selectedRequest.completionReport.workPerformed || selectedRequest.completionReport.notes}
                        </p>
                        {selectedRequest.completionReport.diagnosis && (
                          <div className="text-zinc-400">
                            <span className="font-semibold text-zinc-200">Diagnosis: </span>
                            {selectedRequest.completionReport.diagnosis}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* State 2: Work Completed and Approved by Dispatcher */}
                {selectedRequest.displayStatus === "COMPLETED" && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon size={18} className="text-emerald-400 shrink-0" />
                        <span className="font-bold text-sm text-emerald-300">
                          OK — Work completed and dispatcher approved
                        </span>
                      </div>
                      {selectedRequest.completionReport?.dispatcherApprovedAt && (
                        <span className="text-[10px] text-emerald-400/80 font-mono">
                          Approved: {new Date(selectedRequest.completionReport.dispatcherApprovedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {selectedRequest.completionReport && (
                      <div className="pt-2 border-t border-emerald-500/20 text-xs space-y-1.5">
                        <div>
                          <span className="font-semibold text-zinc-100">Work Performed: </span>
                          <span className="text-zinc-300">
                            {selectedRequest.completionReport.workPerformed || selectedRequest.completionReport.notes}
                          </span>
                        </div>
                        {selectedRequest.completionReport.diagnosis && (
                          <div>
                            <span className="font-semibold text-zinc-100">Diagnosis: </span>
                            <span className="text-zinc-300">{selectedRequest.completionReport.diagnosis}</span>
                          </div>
                        )}
                        <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-emerald-500/15">
                          <span>Specialist: <strong className="text-zinc-200">{selectedRequest.completionReport.technicianName}</strong></span>
                          <span>Reviewer: <strong className="text-zinc-200">{selectedRequest.completionReport.dispatcherApprovedBy || "Tania Akter (Senior Dispatcher)"}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Customer Feedback Action inside Modal */}
                    {selectedRequest.workOrderId && (
                      <div className="pt-2 flex items-center justify-between text-xs">
                        {notificationService.hasProvidedFeedback(selectedRequest.workOrderId) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-emerald-400">
                              Your Rating:
                            </span>
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => {
                                const fb = notificationService.getFeedback(selectedRequest.workOrderId!);
                                const r = fb?.rating || 5;
                                return (
                                  <StarIcon
                                    key={s}
                                    size={13}
                                    fill={s <= r ? "currentColor" : "none"}
                                    className={s <= r ? "text-amber-400" : "text-zinc-700"}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const target = selectedRequest;
                              setSelectedRequest(null);
                              setActiveFeedbackOrder(target);
                            }}
                            className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-zinc-950 transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <StarIcon size={14} fill="currentColor" />
                            <span>Rate This Service (★)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedRequest.workOrderId || selectedRequest.id;
                    setSelectedRequest(null);
                    setSupportDefaultId(id);
                    setSupportModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                >
                  <SendIcon size={12} className="text-[#10b981]" />
                  <span>Report an Issue</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 border border-white/[0.08] text-zinc-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. Additional Service Pack Quotation Modal (Demo Mode) ─────────── */}
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-zinc-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon size={18} className="text-[#10b981]" />
                  <h3 className="font-bold text-lg text-zinc-50">
                    Additional Service Pack
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuotationModal(false);
                    setQuotationRequested(false);
                  }}
                  className="w-8 h-8 rounded-full border border-white/[0.08] bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {quotationRequested ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs space-y-2 text-center animate-fade-in">
                  <CheckCircleIcon size={24} className="mx-auto text-emerald-400" />
                  <div className="font-bold text-sm text-zinc-50">Quotation Request Logged (Demo Mode)</div>
                  <p className="text-zinc-300">
                    A formal quotation for a 5-visit on-demand service pack has been dispatched to your facility account manager.
                    No monetary transaction or automated billing was triggered.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuotationModal(false);
                      setQuotationRequested(false);
                    }}
                    className="mt-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950 hover:bg-[#059669] transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <p className="text-zinc-300 leading-relaxed">
                    Your facility has fully utilized the included <strong>{subscription.includedVisits} on-site visits</strong> for the current billing cycle.
                  </p>

                  <div className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-950/60 space-y-2">
                    <div className="font-bold text-sm text-zinc-100">Enterprise On-Demand 5-Pack</div>
                    <ul className="space-y-1.5 text-zinc-300">
                      <li>• 5 additional certified technician on-site visits</li>
                      <li>• Retains {subscription.planName} arrival SLA commitments</li>
                      <li>• Commercial facility invoice generated post-signoff</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-300">
                    <em>Prototype Notice:</em> Quotation requests are simulated locally. No real banking session or monetary charge will occur.
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setShowQuotationModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotationRequested(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-zinc-950 transition-all shadow-sm"
                    >
                      Submit Quotation Request
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
