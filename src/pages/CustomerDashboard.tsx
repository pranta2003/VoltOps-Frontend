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
  CustomerAsset,
} from "../types";
import { customerService } from "../services/customerService";
import { operationalStore } from "../services/operationalStore";
import { SubscriptionEntitlement } from "../services/subscriptionService";
import { COVERAGE_PLANS, formatBdt } from "../config/coveragePricing";
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
  StarIcon,
  SendIcon,
  WrenchIcon,
  BuildingIcon,
  RadioIcon,
  ZapIcon,
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
  const orderParam = searchParams.get("order");

  const [requests, setRequests] = useState<CustomerViewRequest[]>([]);
  const [facilityAssets, setFacilityAssets] = useState<CustomerAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Workspace State: null = State A (Overview); non-null = State B (Service Request Details)
  const [selectedRequest, setSelectedRequest] = useState<CustomerViewRequest | null>(null);

  // Archive Table Progressive Disclosure
  const [showHistory, setShowHistory] = useState<boolean>(
    initialView === "all" || viewParam === "all"
  );

  // Filter States for Service History & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Subscription Entitlement & Package State
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

  // Global keyboard accessibility: Escape closes any open modal or deselects order
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveFeedbackOrder(null);
        setShowQuotationModal(false);
        setActiveReceipt(null);
        setSupportModalOpen(false);
        setSelectedRequest(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function loadCustomerData() {
    setIsLoading(true);
    setError(null);

    Promise.all([
      customerService.getRequests(user?.id),
      customerService.getAssets(user?.id).catch(() => ({ data: operationalStore.getAssets() })),
    ])
      .then(([reqRes, assetRes]) => {
        const rawRequests: ServiceRequest[] = reqRes.data;
        const workOrders = operationalStore.getWorkOrders();

        const mapped: CustomerViewRequest[] = rawRequests.map((r) => {
          const linkedOrder = workOrders.find((w) => w.id === r.workOrderId || w.requestId === r.id);

          let displayStatus: CustomerViewRequest["displayStatus"] = "NEW";
          let arrivalSlaWindow = "Pending triage";
          let assignedTech = undefined;
          let workNotes = undefined;

          if (linkedOrder) {
            displayStatus = linkedOrder.status as CustomerViewRequest["displayStatus"];
            assignedTech = linkedOrder.assignedTechnicianName;
            workNotes = linkedOrder.workNotes;

            switch (linkedOrder.status) {
              case "UNASSIGNED":
                arrivalSlaWindow = "Triaging · Awaiting dispatch";
                displayStatus = "REVIEWING";
                break;
              case "ASSIGNED":
                arrivalSlaWindow = "Specialist assigned";
                break;
              case "TRAVELLING":
                if (r.coveragePlan === "247-priority") {
                  arrivalSlaWindow = "En route · 20m SLA";
                } else if (r.coveragePlan === "247-standard") {
                  arrivalSlaWindow = "En route · 40m SLA";
                } else if (r.coveragePlan === "8hr") {
                  arrivalSlaWindow = "En route · Business hours";
                } else {
                  arrivalSlaWindow = "En route to facility";
                }
                break;
              case "ON_SITE":
                arrivalSlaWindow = "Specialist on site";
                break;
              case "WORK_COMPLETED_AWAITING_CONFIRMATION":
                arrivalSlaWindow = "Work complete · Sign-off pending";
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
              arrivalSlaWindow = "Triaging candidates";
            } else if (r.status === "NEW") {
              displayStatus = "NEW";
              if (r.coveragePlan === "247-priority") {
                arrivalSlaWindow = "20m Physical SLA (Pending)";
              } else if (r.coveragePlan === "247-standard") {
                arrivalSlaWindow = "40m Physical SLA (Pending)";
              } else {
                arrivalSlaWindow = "Pending triage review";
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
        setFacilityAssets(assetRes.data || []);

        // Keep selected request synchronized if one was already active
        setSelectedRequest((prev) => (prev ? mapped.find((m) => m.id === prev.id) || null : null));

        // Update subscription status and purchases
        const sub = customerService.getSubscription(user?.id);
        setSubscription(sub);
        setPurchases(operationalStore.getPurchases(user?.id));
      })
      .catch((err) => {
        setError(err.message || "Failed to load facility service requests.");
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

  useEffect(() => {
    if (orderParam && requests.length > 0) {
      const match = requests.find((r) => r.id === orderParam || r.workOrderId === orderParam);
      if (match) setSelectedRequest(match);
    } else if (!orderParam) {
      setSelectedRequest(null);
    }
  }, [orderParam, requests]);

  // Active / Ongoing Facility Breakdown Incidents
  const activeRequests = useMemo(() => {
    return requests.filter(
      (r) => r.displayStatus !== "COMPLETED" && r.displayStatus !== "CANCELLED"
    );
  }, [requests]);

  const completedRequests = useMemo(() => {
    return requests.filter((r) => r.displayStatus === "COMPLETED");
  }, [requests]);

  // Plan pricing config for the active subscription
  const activePlanConfig = useMemo(() => {
    return (subscription.planId && COVERAGE_PLANS[subscription.planId]) || COVERAGE_PLANS["247-priority"];
  }, [subscription.planId]);

  // Requests grouped by canonical service trade
  const tradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    CANONICAL_SERVICE_CATEGORIES.forEach((cat) => {
      counts[cat] = 0;
    });
    requests.forEach((r) => {
      if (counts[r.category] !== undefined) {
        counts[r.category]++;
      }
    });
    return Object.entries(counts).filter(([_, count]) => count > 0);
  }, [requests]);

  // Filtered requests for the left column and service history archive
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

  // Actionable Notification
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

  // Helper for timeline progress calculation across 5 authentic stages
  const getTimelineStepIndex = (status: CustomerViewRequest["displayStatus"]) => {
    switch (status) {
      case "NEW":
        return 0; // Request Logged
      case "REVIEWING":
      case "ASSIGNED":
        return 1; // Dispatcher Triage
      case "TRAVELLING":
        return 2; // Specialist En Route
      case "ON_SITE":
        return 3; // On-Site Maintenance
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
      case "COMPLETED":
        return 4; // Verified & Sign-Off
      case "CANCELLED":
      default:
        return 0;
    }
  };

  // Authentic Field-Service Status Badges (Strictly Field Service Terminology)
  const renderStatusBadge = (status: CustomerViewRequest["displayStatus"], isSelected: boolean = false) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
            }`}
          >
            <CheckCircleIcon size={11} className="inline" />
            COMPLETED
          </span>
        );
      case "TRAVELLING":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-[#b8287a] text-white shadow-xs"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
            EN ROUTE
          </span>
        );
      case "ON_SITE":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            ON SITE
          </span>
        );
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
            }`}
          >
            AWAITING SIGN-OFF
          </span>
        );
      case "ASSIGNED":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-[#10b981]/20 text-[#10b981] ring-1 ring-[#10b981]/30 font-extrabold"
            }`}
          >
            ASSIGNED
          </span>
        );
      case "REVIEWING":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30"
            }`}
          >
            TRIAGING
          </span>
        );
      case "CANCELLED":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-zinc-400" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            CANCELLED
          </span>
        );
      case "NEW":
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black/40 text-black font-extrabold" : "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30 font-extrabold"
            }`}
          >
            NEW
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            URGENT
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 ring-1 ring-inset ring-sky-500/30">
            MEDIUM
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-500/20 text-slate-300">
            LOW
          </span>
        );
    }
  };

  const activeStep = selectedRequest ? getTimelineStepIndex(selectedRequest.displayStatus) : 0;
  const timelineSteps = [
    { label: "Request Logged", sub: "Ticket Logged" },
    { label: "Dispatcher Triage", sub: "SLA Verified" },
    { label: "Specialist En Route", sub: "Travelling to Site" },
    { label: "On-Site Maintenance", sub: "Active Field Repair" },
    { label: "Verified & Sign-Off", sub: "Signed Off & Closed" },
  ];

  // Calculate usage percentage
  const usagePercentage =
    subscription.includedVisits && subscription.includedVisits > 0
      ? Math.min(100, Math.round((subscription.usedVisits / subscription.includedVisits) * 100))
      : 0;

  return (
    <Layout
      title="Facility Operations"
      subtitle={`${user?.company || "Apex Spinning & Weaving Mills"} · Savar Commercial Complex`}
      action={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadCustomerData}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border-0 bg-[#1c1d22] text-zinc-300 hover:text-white hover:bg-[#25262c] transition-all shadow-sm"
            title="Refresh facility status"
          >
            <RefreshCwIcon size={15} className={isLoading ? "animate-spin text-[#10b981]" : ""} />
          </button>
          <Link
            to="/customer/new-request"
            className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-zinc-950 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span className="font-extrabold text-sm">+</span>
            <span>New Request</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl">
        {/* ── 1. Top Row: 4 Authentic Field-Service KPI Metric Cards (Always Visible) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Facility Incidents */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-2 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <ShieldCheckIcon size={16} />
              </div>
              <span className="truncate">Active Incidents</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {activeRequests.length}
            </div>
            <div className="text-[11px] text-zinc-400">
              {requests.length} logged lifetime · {completedRequests.length} completed
            </div>
          </div>

          {/* Card 2: Visit Allowance (Highest Priority) */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-2 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <WrenchIcon size={16} />
              </div>
              <span className="truncate">Visit Allowance</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {subscription.remainingVisits !== null ? (
                <>
                  {subscription.remainingVisits}{" "}
                  <span className="text-sm font-semibold text-zinc-400">
                    / {subscription.includedVisits}
                  </span>
                </>
              ) : (
                <span className="text-xl font-bold text-zinc-300">Custom</span>
              )}
            </div>
            <div className="text-[11px] text-zinc-400 truncate">
              {subscription.usedVisits} used this cycle · Resets {subscription.billingCycleResetDate || "1 Dec 2026"}
            </div>
          </div>

          {/* Card 3: Guaranteed Physical Arrival SLA */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-2 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <ClockIcon size={16} />
              </div>
              <span className="truncate">Physical Arrival SLA</span>
            </div>
            <div className="text-3xl font-extrabold text-[#10b981] tracking-tight">
              {activePlanConfig.arrivalSlaMinutes ? (
                <>
                  {activePlanConfig.arrivalSlaMinutes}m{" "}
                  <span className="text-sm font-semibold text-zinc-400">On-Site Target</span>
                </>
              ) : activePlanConfig.id === "8hr" ? (
                <span className="text-xl font-bold text-zinc-200">No SLA</span>
              ) : (
                <span className="text-xl font-bold text-zinc-200">Negotiated</span>
              )}
            </div>
            <div className="text-[11px] text-zinc-400 truncate">
              {activePlanConfig.arrivalSlaLabel}
            </div>
          </div>

          {/* Card 4: Contract Coverage Window */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-2 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <RadioIcon size={16} />
              </div>
              <span className="truncate">Coverage Window</span>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight truncate">
              {activePlanConfig.id === "8hr" ? "08:00 – 17:00" : activePlanConfig.id === "custom" ? "Negotiated" : "24/7 Priority"}
            </div>
            <div className="text-[11px] text-zinc-400 truncate">
              {activePlanConfig.name} ({activePlanConfig.code})
            </div>
          </div>
        </div>

        {/* ── Exhausted Allowance Alert Banner (When Applicable) ── */}
        {subscription.isExhausted && (
          <div className="rounded-2xl border-0 bg-rose-500/20 px-5 py-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white shadow-md">
            <div className="flex items-center gap-3">
              <AlertTriangleIcon size={20} className="text-rose-400 shrink-0" />
              <div>
                <strong className="font-bold text-rose-200">Monthly Visit Allowance Reached.</strong>{" "}
                <span className="text-zinc-300">
                  You have utilized all {subscription.includedVisits} included visits for this billing cycle. Standard requests are paused. Purchase a supplemental visit block or request an on-demand quote.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQuotationModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all shrink-0 shadow-sm"
            >
              Request Extra Visits
            </button>
          </div>
        )}

        {/* ── Actionable Completion Sign-Off & Feedback Notification ── */}
        {pendingFeedbackRequest && (
          <div className="rounded-2xl border-0 bg-[#b8287a]/20 px-5 py-3.5 text-xs flex items-center justify-between gap-3 text-white shadow-md animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <StarIcon size={18} className="text-[#10b981] shrink-0" fill="currentColor" />
              <span className="truncate">
                Maintenance completed on <strong className="font-bold text-[#10b981]">{pendingFeedbackRequest.asset}</strong> ({pendingFeedbackRequest.id}).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDismissFeedback(pendingFeedbackRequest.workOrderId)}
                className="text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setActiveFeedbackOrder(pendingFeedbackRequest)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-zinc-950 transition-all shadow-md"
              >
                Rate Service
              </button>
            </div>
          </div>
        )}

        {/* ── 2. Unified Master-Detail Section (2-Column Grid: 30% / 70%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          {/* ─────────────────────────────────────────────────────────────────
              Left Column (30% Width): Scrollable Service Requests
             ───────────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Service Requests
                  </h2>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300">
                    {filteredRequests.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showHistory;
                    setShowHistory(next);
                    setSearchParams(next ? { view: "all" } : {});
                  }}
                  className="text-xs font-bold text-[#10b981] hover:underline flex items-center gap-1"
                >
                  <span>{showHistory ? "Hide Archive" : "Archive Table"}</span>
                  <ArrowRightIcon size={11} className={showHistory ? "rotate-90 transition-transform" : "transition-transform"} />
                </button>
              </div>

              {/* Search Bar with Instant Filter */}
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search requests or assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-[#26272e] text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#10b981]/40 transition-all"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <XIcon size={13} />
                  </button>
                ) : (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Scrollable Requests List */}
              <div className="space-y-2.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-0.5">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    <RefreshCwIcon size={16} className="inline animate-spin mr-2 text-[#10b981]" />
                    Loading facility requests...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    No matching service requests found.
                  </div>
                ) : (
                  filteredRequests.map((req) => {
                    const isSelected = selectedRequest?.id === req.id;
                    return (
                      <div
                        key={req.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRequest(null);
                            setSearchParams(showHistory ? { view: "all" } : {});
                          } else {
                            setSelectedRequest(req);
                            setSearchParams({ order: req.id, ...(showHistory ? { view: "all" } : {}) });
                          }
                        }}
                        className={`rounded-2xl p-4 cursor-pointer transition-all duration-200 select-none ${
                          isSelected
                            ? "bg-[#10b981] text-zinc-950 shadow-xl shadow-emerald-500/20 translate-x-1 ring-2 ring-[#10b981]/50"
                            : "bg-[#25262c] hover:bg-[#2d2e36] text-white shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`font-mono text-xs font-extrabold tracking-wide ${
                              isSelected ? "text-zinc-950" : "text-white"
                            }`}
                          >
                            {req.id}
                          </span>
                          {renderStatusBadge(req.displayStatus, isSelected)}
                        </div>

                        <div
                          className={`text-xs font-bold truncate mt-1 ${
                            isSelected ? "text-zinc-900" : "text-zinc-200"
                          }`}
                        >
                          {req.problem}
                        </div>

                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? "text-zinc-800" : "text-zinc-400"
                          }`}
                        >
                          {req.asset} · {req.category}
                        </div>

                        <div
                          className={`text-[10px] mt-2 font-mono flex items-center justify-between ${
                            isSelected ? "text-zinc-800/90" : "text-zinc-500"
                          }`}
                        >
                          <span>{req.submittedDate}</span>
                          <span className="font-semibold">{req.arrivalSlaWindow}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              Right Column (70% Width) - DYNAMIC WORKSPACE
              State A: Package Usage & Facility Operations Overview (selectedRequest === null)
              State B: Service Request Workspace (selectedRequest !== null)
             ───────────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-5">
            {selectedRequest ? (
              /* ── STATE B: Live Service Request Workspace ── */
              <div className="space-y-4 animate-fade-in">
                {/* ── Top Bar: Close Details & Request Title ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-6 space-y-5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(null);
                          setSearchParams(showHistory ? { view: "all" } : {});
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#26272e] hover:bg-[#32343e] text-zinc-300 hover:text-white text-xs font-semibold transition-all shadow-xs"
                      >
                        <span>← Back to Overview</span>
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Operational Service Request
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSupportDefaultId(selectedRequest.workOrderId || selectedRequest.id);
                          setSupportModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-[#292a30] text-[#10b981] hover:bg-[#34353d] flex items-center justify-center transition-all"
                        title="Contact Dispatcher Desk"
                      >
                        <SendIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Request ID & Facility Site */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Request ID {selectedRequest.id} · Work Order {selectedRequest.workOrderId || "Pending"}
                      </div>
                      <div className="font-bold text-white text-sm mt-0.5">Savar Commercial Complex</div>
                      <div className="text-[11px] text-zinc-400">{selectedRequest.submittedDate}</div>
                    </div>

                    <div className="text-center">
                      {renderStatusBadge(selectedRequest.displayStatus)}
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Arrival SLA Guarantee
                      </div>
                      <div className="font-extrabold text-[#10b981] text-sm mt-0.5">
                        {selectedRequest.arrivalSlaWindow}
                      </div>
                    </div>
                  </div>

                  {/* Connected Horizontal Timeline Node Stepper (5 Authentic Stages) */}
                  <div className="relative pt-4 pb-2">
                    {/* Background Bar */}
                    <div className="absolute top-6 left-6 right-6 h-1 bg-[#2c2d35] -translate-y-1/2 z-0 rounded-full" />
                    {/* Active Emerald Line */}
                    <div
                      className="absolute top-6 left-6 h-1 bg-[#10b981] -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(96, (activeStep / (timelineSteps.length - 1)) * 95)}%`,
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
                                  ? "bg-[#1c1d22] text-[#10b981] ring-4 ring-[#10b981] shadow-lg shadow-emerald-500/30 animate-pulse"
                                  : "bg-[#2c2d35] text-zinc-600"
                              }`}
                            >
                              {isCompleted ? "✓" : idx + 1}
                            </div>
                            <span
                              className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                                isCurrent
                                  ? "text-[#10b981]"
                                  : isCompleted
                                  ? "text-white"
                                  : "text-zinc-500"
                              }`}
                            >
                              {step.label}
                            </span>
                            <span className="text-[9px] text-zinc-400 mt-0.5 max-w-[80px]">
                              {step.sub}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Detail Card 2: Assigned Certified Specialist ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-5 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#292a30] border-2 border-[#10b981] flex items-center justify-center font-bold text-sm text-[#10b981] shadow-md">
                      {selectedRequest.assignedTech
                        ? selectedRequest.assignedTech
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                        : "TA"}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-white">
                        {selectedRequest.assignedTech || "Tanvir Ahmed"}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Lead Field Engineer · Certified Electrical & HVAC
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSupportDefaultId(selectedRequest.workOrderId || selectedRequest.id);
                        setSupportModalOpen(true);
                      }}
                      className="p-3 rounded-2xl bg-[#292a30] text-[#10b981] hover:bg-[#34353d] transition-all shadow-sm"
                      title="Contact Dispatcher / Field Engineer"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSupportDefaultId(selectedRequest.workOrderId || selectedRequest.id);
                        setSupportModalOpen(true);
                      }}
                      className="p-3 rounded-2xl bg-[#292a30] text-[#10b981] hover:bg-[#34353d] transition-all shadow-sm"
                      title="Send Message to Dispatch Desk"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* ── Detail Card 3: Breakdown Details & Diagnostics ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-6 space-y-4 shadow-md">
                  <h4 className="text-sm font-extrabold text-white">Diagnostic & Service Scope</h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/[0.06]">
                      <div>
                        <div className="font-bold text-white text-xs">{selectedRequest.problem}</div>
                        <div className="text-zinc-400 text-[11px] mt-0.5">
                          {selectedRequest.description || "Routine breakdown maintenance and electrical diagnostics."}
                        </div>
                      </div>
                      <div className="font-extrabold text-[#10b981] text-xs px-2.5 py-1 rounded-full bg-[#10b981]/15 shrink-0">
                        Covered under {subscription.planName}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <div className="text-zinc-400">Trade Specialty</div>
                      <div className="font-bold text-white">{selectedRequest.category}</div>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <div className="text-zinc-400">Priority Tier</div>
                      <div>{renderPriorityBadge(selectedRequest.priority)}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="font-bold text-white">Visit Allowance Credit</div>
                      <div className="font-extrabold text-[#10b981] text-sm">
                        1 Visit Deducted{" "}
                        <span className="text-zinc-400 font-normal">
                          ({subscription.remainingVisits !== null ? `${subscription.remainingVisits} remaining` : "Custom Contract"})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Detail Card 4: Facility Location ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-5 flex items-center justify-between shadow-md">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Facility Location
                    </div>
                    <div className="font-bold text-white text-xs mt-0.5">
                      {selectedRequest.asset}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Savar Commercial Complex, Sector 4 · Unit Block B
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#292a30] text-[#10b981]">
                    <BuildingIcon size={18} />
                  </div>
                </div>

                {/* Technician Completion Report (when present) */}
                {selectedRequest.completionReport && (
                  <div className="bg-[#1c1d22] rounded-3xl p-6 space-y-3 shadow-md border border-[#10b981]/20">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#10b981] flex items-center gap-1.5">
                        <CheckCircleIcon size={15} />
                        <span>Technician Completion Report</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ✓ Dispatcher Approved
                      </span>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                      {selectedRequest.completionReport.workPerformed || selectedRequest.completionReport.notes}
                    </p>

                    {selectedRequest.completionReport.diagnosis && (
                      <div className="text-xs text-zinc-400">
                        <strong className="text-white">Diagnosis:</strong> {selectedRequest.completionReport.diagnosis}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ── STATE A: Truthful Package Usage & Facility Operations Overview (Default) ── */
              <div className="space-y-5 animate-fade-in">
                {/* ── 1. Prominent Package Usage & Entitlement Section (Highest Priority) ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-6 shadow-md space-y-5 border border-white/[0.04]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#10b981] text-zinc-950 uppercase tracking-wider">
                        {activePlanConfig.code}
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-white tracking-tight">
                          {activePlanConfig.name}
                        </h3>
                        <p className="text-xs text-zinc-400">{activePlanConfig.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuotationModal(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#292a30] text-[#10b981] hover:bg-[#34353d] transition-all shadow-xs"
                      >
                        + Extra Visits
                      </button>
                      <Link
                        to="/customer/invoices"
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#26272e] text-zinc-300 hover:text-white transition-all shadow-xs"
                      >
                        Billing &rarr;
                      </Link>
                    </div>
                  </div>

                  {/* Prominent Visit Allowance Metric & Progress Bar */}
                  <div className="p-5 rounded-2xl bg-[#25262c] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Remaining Breakdown Service Allowance
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                          {subscription.remainingVisits !== null ? (
                            <>
                              <span className="text-[#10b981]">{subscription.remainingVisits}</span> of{" "}
                              {subscription.includedVisits} visits remaining
                            </>
                          ) : (
                            <span className="text-xl font-bold text-zinc-200">
                              Allowance to be confirmed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-zinc-400 sm:text-right">
                        {subscription.includedVisits !== null ? (
                          <>
                            <strong className="text-white font-extrabold">
                              {subscription.usedVisits} used
                            </strong>{" "}
                            this billing cycle · Renews{" "}
                            <span className="text-zinc-300 font-semibold">
                              {subscription.billingCycleResetDate || "1 Dec 2026"}
                            </span>
                          </>
                        ) : (
                          <span>Negotiated enterprise SLA contract</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar (Truthful calculation) */}
                    {subscription.includedVisits !== null && (
                      <div className="space-y-1.5">
                        <div className="w-full h-3 rounded-full bg-[#1c1d22] overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              subscription.isExhausted
                                ? "bg-rose-500"
                                : subscription.remainingVisits && subscription.remainingVisits <= 3
                                ? "bg-amber-500"
                                : "bg-[#10b981]"
                            }`}
                            style={{
                              width: `${Math.max(4, 100 - usagePercentage)}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                          <span>0 used</span>
                          <span>{usagePercentage}% allowance utilized</span>
                          <span>{subscription.includedVisits} total visits</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Plan Features & SLA Commitments */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="p-3 rounded-2xl bg-[#26272e] space-y-1">
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Arrival SLA Guarantee
                      </div>
                      <div className="font-extrabold text-[#10b981] truncate">
                        {activePlanConfig.arrivalSlaLabel}
                      </div>
                      <div className="text-[10px] text-zinc-500">Physical technician on site</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#26272e] space-y-1">
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Operational Window
                      </div>
                      <div className="font-extrabold text-white truncate">
                        {activePlanConfig.coverageWindow}
                      </div>
                      <div className="text-[10px] text-zinc-500">Priority dispatcher queue</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#26272e] space-y-1">
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Contract Status
                      </div>
                      <div className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Active & Verified</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">Auto-renews monthly</div>
                    </div>
                  </div>
                </div>

                {/* ── 2. Facility Operational Health & Service Trades Distribution ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight">
                        Facility Trade & Breakdown Distribution
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Operational breakdown across all 7 canonical facility trades
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#10b981] px-2.5 py-1 rounded-full bg-[#10b981]/10">
                      {tradeDistribution.length} Active Trades
                    </span>
                  </div>

                  {/* Canonical Trade Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {CANONICAL_SERVICE_CATEGORIES.map((trade) => {
                      const count = requests.filter((r) => r.category === trade).length;
                      const activeCount = requests.filter(
                        (r) =>
                          r.category === trade &&
                          r.displayStatus !== "COMPLETED" &&
                          r.displayStatus !== "CANCELLED"
                      ).length;

                      return (
                        <div
                          key={trade}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            count > 0
                              ? "bg-[#25262c] border-white/[0.08]"
                              : "bg-[#202127]/60 border-white/[0.02] opacity-60"
                          }`}
                        >
                          <div className="text-[11px] font-bold text-white truncate">{trade}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-zinc-400">
                              {count === 0 ? "No requests" : `${count} total`}
                            </span>
                            {activeCount > 0 && (
                              <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">
                                {activeCount} active
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── 3. Registered Facility Assets Snapshot ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight">
                        Registered Facility Assets & Equipment
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Critical equipment covered under {activePlanConfig.name}
                      </p>
                    </div>
                    <Link
                      to="/customer/assets"
                      className="text-xs font-bold text-[#10b981] hover:underline flex items-center gap-1"
                    >
                      <span>Manage Assets</span>
                      <ArrowRightIcon size={12} />
                    </Link>
                  </div>

                  {/* Asset List */}
                  <div className="divide-y divide-white/[0.04]">
                    {facilityAssets.slice(0, 4).map((asset) => (
                      <div
                        key={asset.id}
                        className="py-3 flex items-center justify-between text-xs gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{asset.name}</div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            Tag: <span className="font-mono text-zinc-300">{asset.tagNumber}</span> ·{" "}
                            {asset.location}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              asset.status === "OPERATIONAL"
                                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                                : asset.status === "NEEDS_SERVICE"
                                ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                                : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30"
                            }`}
                          >
                            {asset.status === "NEEDS_SERVICE"
                              ? "NEEDS SERVICE"
                              : asset.status === "OPERATIONAL"
                              ? "OPERATIONAL"
                              : "OUT OF ORDER"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Progressive Disclosure: Service History Table (When Toggled) ── */}
        {showHistory && (
          <div className="bg-[#1c1d22] rounded-3xl overflow-hidden shadow-md space-y-4 p-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Facility Service History Archive</h3>
                <p className="text-xs text-zinc-400">Complete historical audit trail of all logged facility requests.</p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-zinc-400 hover:text-white"
              >
                Clear all filters
              </button>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#26272e] text-white text-xs border-0 focus:ring-1 focus:ring-[#10b981]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">All Active</option>
                <option value="NEW">New</option>
                <option value="REVIEWING">Triaging</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="TRAVELLING">En Route</option>
                <option value="ON_SITE">On Site</option>
                <option value="WORK_COMPLETED_AWAITING_CONFIRMATION">Awaiting Sign-off</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#26272e] text-white text-xs border-0 focus:ring-1 focus:ring-[#10b981]"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#26272e] text-white text-xs border-0 focus:ring-1 focus:ring-[#10b981]"
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
                  <tr className="border-b border-white/[0.08] text-zinc-400 font-semibold">
                    <th className="py-2.5 px-3">Request ID</th>
                    <th className="py-2.5 px-3">Asset / Problem</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Submitted</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.02] text-zinc-200">
                      <td className="py-3 px-3 font-mono font-bold text-white">{req.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{req.problem}</div>
                        <div className="text-[11px] text-zinc-400">{req.asset}</div>
                      </td>
                      <td className="py-3 px-3">{req.category}</td>
                      <td className="py-3 px-3">{renderPriorityBadge(req.priority)}</td>
                      <td className="py-3 px-3">{renderStatusBadge(req.displayStatus)}</td>
                      <td className="py-3 px-3 text-zinc-400">{req.submittedDate}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(req)}
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
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon size={14} className="text-[#10b981]" />
            <span>
              Plan: <strong className="text-zinc-300">{activePlanConfig.name}</strong> ·{" "}
              {subscription.remainingVisits !== null ? (
                <>
                  <strong className="text-white">{subscription.remainingVisits}</strong> of{" "}
                  {subscription.includedVisits} visits remaining
                </>
              ) : (
                "Custom visit allowance"
              )}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/customer/invoices"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Invoices & Billing &rarr;
            </Link>
            <button
              type="button"
              onClick={() => {
                setSupportDefaultId(selectedRequest?.workOrderId || selectedRequest?.id || "");
                setSupportModalOpen(true);
              }}
              className="text-zinc-400 hover:text-white transition-colors"
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
          <div className="bg-[#1c1d22] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Purchase On-Demand Visits</h3>
              <button
                type="button"
                onClick={() => setShowQuotationModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <XIcon size={16} />
              </button>
            </div>
            {quotationRequested ? (
              <div className="p-4 rounded-2xl bg-[#10b981]/15 text-white text-xs space-y-2 text-center">
                <CheckCircleIcon size={22} className="mx-auto text-[#10b981]" />
                <div className="font-bold">Quotation Request Submitted</div>
                <p className="text-zinc-300">
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
                <p className="text-zinc-300">
                  Your contract tier includes {subscription.includedVisits || "negotiated"} routine breakdown visits per cycle. You may purchase supplementary visit blocks at the standardized tariff.
                </p>
                <div className="p-4 rounded-2xl bg-[#26272e] flex items-center justify-between">
                  <span className="text-zinc-400">5-Visit Supplemental Pack</span>
                  <span className="font-bold text-white">{formatBdt(25000)}</span>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuotationModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
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
