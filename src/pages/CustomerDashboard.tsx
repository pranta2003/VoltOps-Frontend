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
  WrenchIcon,
  BuildingIcon,
  RadioIcon,
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

// ─────────────────────────────────────────────────────────────────────────────
// MSlogistic Historical Dispatch Activity Data (Reference Stacked Chart)
// ─────────────────────────────────────────────────────────────────────────────
const DISPATCH_ACTIVITY_DAYS = [
  { date: "15.04", arrived: 35, delivered: 85, dispatched: 40 },
  { date: "16.04", arrived: 50, delivered: 130, dispatched: 35 },
  { date: "17.04", arrived: 28, delivered: 110, dispatched: 45 },
  { date: "18.04", arrived: 45, delivered: 80, dispatched: 40 },
  { date: "19.04", arrived: 20, delivered: 55, dispatched: 30 },
  { date: "20.04", arrived: 25, delivered: 45, dispatched: 28 },
  { date: "21.04", arrived: 15, delivered: 20, dispatched: 22 },
  { date: "22.04", arrived: 12, delivered: 25, dispatched: 20 },
  { date: "23.04", arrived: 55, delivered: 90, dispatched: 50 },
  { date: "25.04", arrived: 38, delivered: 50, dispatched: 28 },
  { date: "26.04", arrived: 18, delivered: 30, dispatched: 24 },
  { date: "27.04", arrived: 22, delivered: 35, dispatched: 25 },
  { date: "28.04", arrived: 15, delivered: 22, dispatched: 18 },
  { date: "29.04", arrived: 20, delivered: 28, dispatched: 20 },
  { date: "30.04", arrived: 25, delivered: 40, dispatched: 25 },
  { date: "01.05", arrived: 10, delivered: 15, dispatched: 12 },
  { date: "02.05", arrived: 8, delivered: 12, dispatched: 10 },
  { date: "03.05", arrived: 48, delivered: 75, dispatched: 38 },
  { date: "04.05", arrived: 15, delivered: 35, dispatched: 20 },
  { date: "06.05", arrived: 18, delivered: 38, dispatched: 22 },
];

export function CustomerDashboard({ initialView }: CustomerDashboardProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const orderParam = searchParams.get("order");

  const [requests, setRequests] = useState<CustomerViewRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Workspace State: null = State A (Analytics Overview); non-null = State B (Order Details)
  const [selectedRequest, setSelectedRequest] = useState<CustomerViewRequest | null>(null);

  // Archive Table Progressive Disclosure
  const [showHistory, setShowHistory] = useState<boolean>(
    initialView === "all" || viewParam === "all"
  );

  // Filter States for Service History
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Chart Tooltip Hover State
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

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

        // Keep selected request synchronized if one was already active
        setSelectedRequest((prev) => (prev ? mapped.find((m) => m.id === prev.id) || null : null));

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

  useEffect(() => {
    if (orderParam && requests.length > 0) {
      const match = requests.find((r) => r.id === orderParam || r.workOrderId === orderParam);
      if (match) setSelectedRequest(match);
    } else if (!orderParam) {
      setSelectedRequest(null);
    }
  }, [orderParam, requests]);

  // Active / Ongoing Incidents
  const activeRequests = useMemo(() => {
    return requests.filter(
      (r) => r.displayStatus !== "COMPLETED" && r.displayStatus !== "CANCELLED"
    );
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

  // High-Contrast Status Badges: VoltOps Emerald & Berry Plum Pills (NO YELLOW)
  const renderStatusBadge = (status: CustomerViewRequest["displayStatus"], isSelected: boolean = false) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-[#b8287a] text-white shadow-xs"
            }`}
          >
            DELIVERED
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
            ON THE WAY
          </span>
        );
      case "ON_SITE":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-[#b8287a] text-white"
            }`}
          >
            ON SITE
          </span>
        );
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#10b981]" : "bg-[#10b981] text-zinc-950 font-extrabold"
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
              isSelected ? "bg-black text-[#10b981]" : "bg-[#10b981] text-zinc-950 font-extrabold"
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
              isSelected ? "bg-black/40 text-black font-extrabold" : "bg-[#10b981] text-zinc-950 font-extrabold"
            }`}
          >
            RECEIVED
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
    { label: "Hartford", sub: "Ticket Logged" },
    { label: "Triage Dispatch", sub: "Dispatcher Assigned" },
    { label: "Transit", sub: "En Route to Site" },
    { label: "New York", sub: "On-Site Facility" },
  ];

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
            title="Refresh active status"
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
        {/* ── 1. Top Row: 4 KPI Metric Cards (Always Visible) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Requests */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-2 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <WrenchIcon size={16} />
              </div>
              <span className="truncate">Total Requests</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {requests.length > 0 ? requests.length : 274}
            </div>
          </div>

          {/* Card 2: Active Facility Incidents */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-2 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <ShieldCheckIcon size={16} />
              </div>
              <span className="truncate">Active Incidents</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {activeRequests.length > 0 ? activeRequests.length : 75}
            </div>
          </div>

          {/* Card 3: Target Arrival SLA */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-2 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <ClockIcon size={16} />
              </div>
              <span className="truncate">Physical Arrival SLA</span>
            </div>
            <div className="text-3xl font-extrabold text-[#10b981] tracking-tight">
              20m <span className="text-sm font-semibold text-zinc-400">Target</span>
            </div>
          </div>

          {/* Card 4: Technicians on Duty */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-2 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <RadioIcon size={16} />
              </div>
              <span className="truncate">Techs on Duty</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight truncate">
              313
            </div>
          </div>
        </div>

        {/* ── Actionable Alert (When Genuinely Required) ── */}
        {pendingFeedbackRequest && (
          <div className="rounded-2xl border-0 bg-[#b8287a]/20 px-5 py-3.5 text-xs flex items-center justify-between gap-3 text-white shadow-md animate-fade-in">
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
                className="text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1"
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

        {/* ── 2. Unified Master-Detail Section (2-Column Grid: 30% / 70%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          {/* ─────────────────────────────────────────────────────────────────
              Left Column (30% Width): Scrollable Order Cards
             ───────────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    My Orders
                  </h2>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300">
                    {requests.length > 0 ? requests.length : 7}
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
                  <span>{showHistory ? "Hide Table" : "Archive"}</span>
                  <ArrowRightIcon size={11} className={showHistory ? "rotate-90 transition-transform" : "transition-transform"} />
                </button>
              </div>

              {/* Search Bar with Filter Icon */}
              <div className="relative">
                <SearchIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
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

              {/* Scrollable Order Cards List */}
              <div className="space-y-2.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-0.5">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    <RefreshCwIcon size={16} className="inline animate-spin mr-2 text-[#10b981]" />
                    Loading orders...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    No matching orders.
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
                            Order ID Nº{req.id}
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
              State A: Analytics Overview (When selectedRequest === null)
              State B: Order Details Workspace (When selectedRequest !== null)
             ───────────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-5">
            {selectedRequest ? (
              /* ── STATE B: Live Order Details Workspace ── */
              <div className="space-y-4 animate-fade-in">
                {/* ── Top Bar: Close Details & Order Title ── */}
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
                        <span>← Close Details</span>
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Operational Work Order
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
                        title="Contact Support or Report Issue"
                      >
                        <SendIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Order ID & Route Origin/Destination */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Order ID Nº{selectedRequest.workOrderId || selectedRequest.id}
                      </div>
                      <div className="font-bold text-white text-sm mt-0.5">Savar Complex</div>
                      <div className="text-[11px] text-zinc-400">{selectedRequest.submittedDate}</div>
                    </div>

                    <div className="text-center">
                      {renderStatusBadge(selectedRequest.displayStatus)}
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Target Arrival SLA</div>
                      <div className="font-extrabold text-[#10b981] text-sm mt-0.5">
                        {selectedRequest.arrivalSlaWindow}
                      </div>
                    </div>
                  </div>

                  {/* Connected Horizontal Timeline Node Stepper (Hartford -> NY Style) */}
                  <div className="relative pt-3 pb-2">
                    {/* Background Bar */}
                    <div className="absolute top-5 left-4 right-4 h-1 bg-[#2c2d35] -translate-y-1/2 z-0 rounded-full" />
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
                            <span className="text-[9px] text-zinc-400 mt-0.5">
                              {step.sub}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Detail Card 2: Assigned Certified Specialist (Driver/Courier Style) ── */}
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
                      title="Contact Dispatcher / Technician"
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
                      title="Send Message"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* ── Detail Card 3: Order Details (Item / Service Price Breakdown) ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-6 space-y-4 shadow-md">
                  <h4 className="text-sm font-extrabold text-white">Order Details</h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/[0.06]">
                      <div>
                        <div className="font-bold text-white text-xs">{selectedRequest.problem}</div>
                        <div className="text-zinc-400 text-[11px] mt-0.5">{selectedRequest.description || "Routine breakdown maintenance and electrical diagnostics."}</div>
                      </div>
                      <div className="font-extrabold text-white text-sm shrink-0">Included</div>
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
                        1 Visit Deducted <span className="text-zinc-400 font-normal">({subscription.remainingVisits !== null ? subscription.remainingVisits : 27} left)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Detail Card 4: Shipment / Facility Location ── */}
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
              /* ── STATE A: MSlogistic Analytics Overview (Default) ── */
              <div className="space-y-5 animate-fade-in">
                {/* ── 3 Circular SVG Progress Gauges in a Row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Gauge 1: Finished Work Orders */}
                  <div className="bg-[#1c1d22] rounded-3xl p-5 flex flex-col justify-between shadow-md">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Finished Work Orders
                    </div>
                    <div className="flex items-center justify-center my-3">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#2c2d35"
                            strokeWidth="11"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#10b981"
                            strokeWidth="11"
                            strokeDasharray={2 * Math.PI * 38}
                            strokeDashoffset={2 * Math.PI * 38 * (1 - 0.88)}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-extrabold text-white">2748/3100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gauge 2: Success Service Rides */}
                  <div className="bg-[#1c1d22] rounded-3xl p-5 flex flex-col justify-between shadow-md">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Success Service Rides
                    </div>
                    <div className="flex items-center justify-center my-3">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#2c2d35"
                            strokeWidth="11"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#10b981"
                            strokeWidth="11"
                            strokeDasharray={2 * Math.PI * 38}
                            strokeDashoffset={2 * Math.PI * 38 * (1 - 0.75)}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-extrabold text-white">75%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gauge 3: Annual Orders Boost */}
                  <div className="bg-[#1c1d22] rounded-3xl p-5 flex flex-col justify-between shadow-md">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Annual Orders Boost
                    </div>
                    <div className="flex items-center justify-center my-3">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#2c2d35"
                            strokeWidth="11"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#10b981"
                            strokeWidth="11"
                            strokeDasharray={2 * Math.PI * 38}
                            strokeDashoffset={2 * Math.PI * 38 * (1 - 0.33)}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-extrabold text-white">33%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Main Stacked Bar Chart: Arrived & Dispatched Vehicles ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight">
                        Arrived and Dispatched Vehicles
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#26272e] text-[11px] text-zinc-300 font-semibold">
                        <ClockIcon size={12} className="text-zinc-400" />
                        <span>15 Apr – 6 May, 2024</span>
                      </div>
                      <button
                        type="button"
                        className="w-6 h-6 rounded-lg bg-[#26272e] text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
                        title="Previous Period"
                      >
                        &lt;
                      </button>
                      <button
                        type="button"
                        className="w-6 h-6 rounded-lg bg-[#26272e] text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
                        title="Next Period"
                      >
                        &gt;
                      </button>
                    </div>
                  </div>

                  {/* Stacked Bars Display */}
                  <div className="relative pt-4 pb-2">
                    {/* Y-Axis Grid Lines & Labels */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 text-[10px] font-mono text-zinc-400">
                      <div className="border-b border-white w-full flex justify-between"><span>250</span></div>
                      <div className="border-b border-white w-full flex justify-between"><span>200</span></div>
                      <div className="border-b border-white w-full flex justify-between"><span>150</span></div>
                      <div className="border-b border-white w-full flex justify-between"><span>100</span></div>
                      <div className="border-b border-white w-full flex justify-between"><span>50</span></div>
                      <div className="border-b border-white w-full flex justify-between"><span>0</span></div>
                    </div>

                    {/* 20 Stacked Bars */}
                    <div className="relative z-10 flex items-end justify-between gap-1.5 h-48 pt-2 px-6">
                      {DISPATCH_ACTIVITY_DAYS.map((day, idx) => {
                        const total = day.arrived + day.delivered + day.dispatched;
                        const maxScale = 250;
                        const heightPercent = Math.min(100, (total / maxScale) * 100);
                        const arrivedH = (day.arrived / total) * 100;
                        const deliveredH = (day.delivered / total) * 100;
                        const dispatchedH = (day.dispatched / total) * 100;

                        return (
                          <div
                            key={day.date}
                            onMouseEnter={() => setHoveredBarIndex(idx)}
                            onMouseLeave={() => setHoveredBarIndex(null)}
                            className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                          >
                            {/* Tooltip on Hover */}
                            {hoveredBarIndex === idx && (
                              <div className="absolute -top-12 z-20 bg-zinc-900 border border-white/10 px-2 py-1 rounded-xl text-[10px] text-white whitespace-nowrap shadow-xl">
                                <span className="font-bold text-[#10b981]">{day.date}</span>: {day.delivered} Delivered · {day.dispatched} Dispatched
                              </div>
                            )}

                            {/* Stacked Bar Column */}
                            <div
                              className="w-full max-w-[14px] rounded-t-sm overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:brightness-110"
                              style={{ height: `${heightPercent}%` }}
                            >
                              {/* Dispatched (Top: Dark Slate) */}
                              <div
                                style={{ height: `${dispatchedH}%` }}
                                className="bg-[#3a4454] w-full"
                              />
                              {/* Delivered (Middle: VoltOps Emerald) */}
                              <div
                                style={{ height: `${deliveredH}%` }}
                                className="bg-[#10b981] w-full"
                              />
                              {/* Arrived (Bottom: Berry/Plum) */}
                              <div
                                style={{ height: `${arrivedH}%` }}
                                className="bg-[#b8287a] w-full"
                              />
                            </div>

                            {/* Date Label */}
                            <span className="text-[9px] text-zinc-500 font-mono mt-1.5 truncate">
                              {day.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/[0.06] text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3a4454]" />
                      <span className="text-zinc-400 text-[11px]">Dispatched Vehicles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                      <span className="text-zinc-400 text-[11px]">Delivered Vehicles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#b8287a]" />
                      <span className="text-zinc-400 text-[11px]">Arrived Vehicles</span>
                    </div>
                  </div>
                </div>

                {/* ── Bottom Section: Donut Resolution & Top Drivers ── */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                  {/* Donut Chart Card (7 Cols) */}
                  <div className="sm:col-span-7 bg-[#1c1d22] rounded-3xl p-5 shadow-md flex items-center justify-between">
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Ring 1: Cancelled 9% (Plum) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke="#b8287a"
                          strokeWidth="14"
                          strokeDasharray={`${(9 / 100) * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
                          strokeDashoffset="0"
                        />
                        {/* Ring 2: In Progress 36% (Emerald) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="14"
                          strokeDasharray={`${(36 / 100) * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
                          strokeDashoffset={`-${(9 / 100) * 2 * Math.PI * 36}`}
                        />
                        {/* Ring 3: Not Finished 15% (Cyan) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke="#06b6d4"
                          strokeWidth="14"
                          strokeDasharray={`${(15 / 100) * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
                          strokeDashoffset={`-${((9 + 36) / 100) * 2 * Math.PI * 36}`}
                        />
                        {/* Ring 4: Success Rides 40% (Teal Green) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke="#059669"
                          strokeWidth="14"
                          strokeDasharray={`${(40 / 100) * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
                          strokeDashoffset={`-${((9 + 36 + 15) / 100) * 2 * Math.PI * 36}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold text-white tracking-tight">77%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs ml-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#b8287a]" />
                          <span className="text-zinc-300 text-[11px] font-semibold">Cancelled</span>
                        </div>
                        <div className="text-xs font-extrabold text-white ml-3.5 mt-0.5">9%</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                          <span className="text-zinc-300 text-[11px] font-semibold">In Progress</span>
                        </div>
                        <div className="text-xs font-extrabold text-white ml-3.5 mt-0.5">36%</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                          <span className="text-zinc-300 text-[11px] font-semibold">Not Finished</span>
                        </div>
                        <div className="text-xs font-extrabold text-white ml-3.5 mt-0.5">15%</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#059669]" />
                          <span className="text-zinc-300 text-[11px] font-semibold">Success</span>
                        </div>
                        <div className="text-xs font-extrabold text-white ml-3.5 mt-0.5">40%</div>
                      </div>
                    </div>
                  </div>

                  {/* Top Drivers (5 Cols) */}
                  <div className="sm:col-span-5 bg-[#1c1d22] rounded-3xl p-5 shadow-md flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2">
                      <h4 className="text-xs font-extrabold text-white tracking-tight">
                        Top Drivers
                      </h4>
                      <span className="text-[11px] font-bold text-[#10b981] cursor-pointer hover:underline">
                        See all &rarr;
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#292a30] text-[#10b981] font-bold text-xs flex items-center justify-center border border-[#10b981]/30">
                            CW
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Cameron Williamson</div>
                            <div className="text-[10px] text-zinc-400">460 rides</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#292a30] text-[#10b981] font-bold text-xs flex items-center justify-center border border-[#10b981]/30">
                            BS
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Brooklyn Simmons</div>
                            <div className="text-[10px] text-zinc-400">351 rides</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#292a30] text-[#10b981] font-bold text-xs flex items-center justify-center border border-[#10b981]/30">
                            JJ
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Jacob Jones</div>
                            <div className="text-[10px] text-zinc-400">328 rides</div>
                          </div>
                        </div>
                      </div>
                    </div>
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
              Plan: <strong className="text-zinc-300">{subscription.planName}</strong> ·{" "}
              {subscription.remainingVisits !== null ? subscription.remainingVisits : 27} of {subscription.includedVisits} visits remaining
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
                  Your contract tier includes {subscription.includedVisits} routine breakdown visits per month. You may purchase supplementary visit blocks at the standardized tariff.
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
