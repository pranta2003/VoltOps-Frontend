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

        // Auto-select first active request if none selected (to power the 2-column work UI)
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

  // Highly Stylized Badges: Matching User's Reference Palette (Magenta & Warm Yellow Pills)
  const renderStatusBadge = (status: CustomerViewRequest["displayStatus"], isSelected: boolean = false) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#F9C333]" : "bg-[#b8287a] text-white shadow-xs"
            }`}
          >
            DELIVERED
          </span>
        );
      case "TRAVELLING":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#F9C333]" : "bg-[#b8287a] text-white shadow-xs"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
            ON THE WAY
          </span>
        );
      case "ON_SITE":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#F9C333]" : "bg-[#b8287a] text-white"
            }`}
          >
            ON SITE
          </span>
        );
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#F9C333]" : "bg-[#F9C333] text-black"
            }`}
          >
            SIGN-OFF
          </span>
        );
      case "ASSIGNED":
      case "REVIEWING":
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black text-[#F9C333]" : "bg-[#F9C333] text-black"
            }`}
          >
            ASSIGNED
          </span>
        );
      case "NEW":
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSelected ? "bg-black/30 text-black font-extrabold" : "bg-[#F9C333] text-black"
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#F9C333]/20 text-[#F9C333]">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-700/50 text-zinc-300">
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400">
            LOW
          </span>
        );
    }
  };

  const activeRequestObj = selectedRequest || activeRequests[0] || requests[0];
  const activeStep = activeRequestObj ? getTimelineStepIndex(activeRequestObj.displayStatus) : 0;
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
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadCustomerData}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border-0 bg-[#1c1d22] text-zinc-300 hover:text-white hover:bg-[#25262c] transition-all shadow-sm"
            title="Refresh active status"
          >
            <RefreshCwIcon size={15} className={isLoading ? "animate-spin text-[#F9C333]" : ""} />
          </button>
          <Link
            to="/customer/new-request"
            className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#F9C333] hover:bg-[#eab327] text-zinc-950 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span className="font-extrabold text-sm">+</span>
            <span>New Request</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl">
        {/* ── 1. Top Operational Stat Cards (Matching Image 1: MSlogistic Style) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total / Active Incidents */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-3 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-medium">
              <div className="w-8 h-8 rounded-xl bg-[#F9C333]/15 text-[#F9C333] flex items-center justify-center">
                <WrenchIcon size={16} />
              </div>
              <span className="truncate">Active Requests</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {activeRequests.length}
            </div>
          </div>

          {/* Card 2: Visits in Allowance */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-3 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-medium">
              <div className="w-8 h-8 rounded-xl bg-[#F9C333]/15 text-[#F9C333] flex items-center justify-center">
                <ShieldCheckIcon size={16} />
              </div>
              <span className="truncate">Visits Allowance</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {subscription.remainingVisits !== null ? subscription.remainingVisits : "30"}
              <span className="text-sm font-semibold text-zinc-500 ml-1">/ {subscription.includedVisits}</span>
            </div>
          </div>

          {/* Card 3: Target Arrival SLA */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-3 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-medium">
              <div className="w-8 h-8 rounded-xl bg-[#F9C333]/15 text-[#F9C333] flex items-center justify-center">
                <ClockIcon size={16} />
              </div>
              <span className="truncate">Physical Arrival SLA</span>
            </div>
            <div className="text-3xl font-extrabold text-[#F9C333] tracking-tight">
              20m <span className="text-sm font-semibold text-zinc-400">Target</span>
            </div>
          </div>

          {/* Card 4: Plan Tier */}
          <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-3 shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-medium">
              <div className="w-8 h-8 rounded-xl bg-[#F9C333]/15 text-[#F9C333] flex items-center justify-center">
                <RadioIcon size={16} />
              </div>
              <span className="truncate">Coverage Plan</span>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight truncate">
              {subscription.planName}
            </div>
          </div>
        </div>

        {/* ── Actionable Alerts (When Genuinely Required) ── */}
        {pendingFeedbackRequest && (
          <div className="rounded-2xl border-0 bg-[#b8287a]/20 px-5 py-3.5 text-xs flex items-center justify-between gap-3 text-white shadow-md animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <StarIcon size={18} className="text-[#F9C333] shrink-0" fill="currentColor" />
              <span className="truncate">
                Service completed on <strong className="font-bold text-[#F9C333]">{pendingFeedbackRequest.asset}</strong> ({pendingFeedbackRequest.id}).
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
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F9C333] text-zinc-950 transition-all shadow-md"
              >
                Rate service
              </button>
            </div>
          </div>
        )}

        {/* ── 2. Split Work Screen (Matching Image 2: "My Orders: 7" Master-Detail Workspace) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Column: Master Service Requests List (45%) ── */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#1c1d22] rounded-3xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  My Orders: {requests.length}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showHistory;
                    setShowHistory(next);
                    setSearchParams(next ? { view: "all" } : {});
                  }}
                  className="text-xs font-bold text-[#F9C333] hover:underline flex items-center gap-1"
                >
                  <span>{showHistory ? "Hide Table" : "Archive Table"}</span>
                  <ArrowRightIcon size={12} className={showHistory ? "rotate-90 transition-transform" : "transition-transform"} />
                </button>
              </div>

              {/* Search Bar with Filter Icon */}
              <div className="relative">
                <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#26272e] text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F9C333]/40 transition-all"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <XIcon size={13} />
                  </button>
                ) : (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
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
              <div className="space-y-3 pt-1">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    <RefreshCwIcon size={16} className="inline animate-spin mr-2 text-[#F9C333]" />
                    Loading requests...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    No requests match filter.
                  </div>
                ) : (
                  filteredRequests.map((req) => {
                    const isSelected = activeRequestObj?.id === req.id;
                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`rounded-2xl p-4.5 cursor-pointer transition-all duration-200 select-none ${
                          isSelected
                            ? "bg-[#F9C333] text-zinc-950 shadow-xl shadow-amber-500/20 translate-x-1"
                            : "bg-[#25262c] hover:bg-[#2d2e36] text-white shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
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
                            isSelected ? "text-zinc-800/80" : "text-zinc-500"
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

          {/* ── Right Column: Live Work Order Inspection Workspace (55%) ── */}
          <div className="lg:col-span-7 space-y-4">
            {activeRequestObj ? (
              <>
                {/* ── Detail Card 1: Order ID, Route & Connected Horizontal Timeline ── */}
                <div className="bg-[#1c1d22] rounded-3xl p-6 space-y-5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Operational Work Order
                      </span>
                      <h3 className="text-base font-extrabold text-white mt-0.5">
                        Order ID Nº{activeRequestObj.workOrderId || activeRequestObj.id}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSupportDefaultId(activeRequestObj.workOrderId || activeRequestObj.id);
                          setSupportModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-[#292a30] text-[#F9C333] hover:bg-[#34353d] flex items-center justify-center transition-all"
                        title="Contact Support or Report Issue"
                      >
                        <SendIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Date & Destination Banner */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <div className="text-[11px] text-zinc-400">{activeRequestObj.submittedDate}</div>
                      <div className="font-bold text-white text-sm">Savar Complex</div>
                    </div>

                    <div className="text-center">
                      {renderStatusBadge(activeRequestObj.displayStatus)}
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-zinc-400">Target Arrival SLA</div>
                      <div className="font-extrabold text-[#F9C333] text-sm">
                        {activeRequestObj.arrivalSlaWindow}
                      </div>
                    </div>
                  </div>

                  {/* Connected Horizontal Timeline Node Stepper (Hartford -> NY Style) */}
                  <div className="relative pt-3 pb-2">
                    {/* Background Bar */}
                    <div className="absolute top-5 left-4 right-4 h-1 bg-[#2c2d35] -translate-y-1/2 z-0 rounded-full" />
                    {/* Active Golden Line */}
                    <div
                      className="absolute top-5 left-4 h-1 bg-[#F9C333] -translate-y-1/2 z-0 rounded-full transition-all duration-500"
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
                                  ? "bg-[#F9C333] text-black shadow-md shadow-amber-500/20"
                                  : isCurrent
                                  ? "bg-[#1c1d22] text-[#F9C333] ring-4 ring-[#F9C333] shadow-lg shadow-amber-500/30 animate-pulse"
                                  : "bg-[#2c2d35] text-zinc-600"
                              }`}
                            >
                              {isCompleted ? "✓" : idx + 1}
                            </div>
                            <span
                              className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                                isCurrent
                                  ? "text-[#F9C333]"
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
                    <div className="w-12 h-12 rounded-2xl bg-[#292a30] border-2 border-[#F9C333] flex items-center justify-center font-bold text-sm text-[#F9C333] shadow-md">
                      {activeRequestObj.assignedTech
                        ? activeRequestObj.assignedTech
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                        : "TA"}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-white">
                        {activeRequestObj.assignedTech || "Tanvir Ahmed"}
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
                        setSupportDefaultId(activeRequestObj.workOrderId || activeRequestObj.id);
                        setSupportModalOpen(true);
                      }}
                      className="p-3 rounded-2xl bg-[#292a30] text-[#F9C333] hover:bg-[#34353d] transition-all shadow-sm"
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
                      className="p-3 rounded-2xl bg-[#292a30] text-[#F9C333] hover:bg-[#34353d] transition-all shadow-sm"
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
                        <div className="font-bold text-white text-xs">{activeRequestObj.problem}</div>
                        <div className="text-zinc-400 text-[11px] mt-0.5">{activeRequestObj.description || "Routine breakdown maintenance and electrical diagnostics."}</div>
                      </div>
                      <div className="font-extrabold text-white text-sm shrink-0">Included</div>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <div className="text-zinc-400">Trade Specialty</div>
                      <div className="font-bold text-white">{activeRequestObj.category}</div>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <div className="text-zinc-400">Priority Tier</div>
                      <div>{renderPriorityBadge(activeRequestObj.priority)}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="font-bold text-white">Visit Allowance Credit</div>
                      <div className="font-extrabold text-[#F9C333] text-sm">
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
                      {activeRequestObj.asset}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Savar Commercial Complex, Sector 4 · Unit Block B
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#292a30] text-[#F9C333]">
                    <BuildingIcon size={18} />
                  </div>
                </div>

                {/* Technician Completion Report (when present) */}
                {activeRequestObj.completionReport && (
                  <div className="bg-[#1c1d22] rounded-3xl p-6 space-y-3 shadow-md border border-[#F9C333]/20">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#F9C333] flex items-center gap-1.5">
                        <CheckCircleIcon size={15} />
                        <span>Technician Completion Report</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ✓ Dispatcher Approved
                      </span>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                      {activeRequestObj.completionReport.workPerformed || activeRequestObj.completionReport.notes}
                    </p>

                    {activeRequestObj.completionReport.diagnosis && (
                      <div className="text-xs text-zinc-400">
                        <strong className="text-white">Diagnosis:</strong> {activeRequestObj.completionReport.diagnosis}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[#1c1d22] rounded-3xl p-12 text-center text-zinc-400 space-y-2">
                <CheckCircleIcon size={24} className="mx-auto text-[#F9C333]" />
                <div className="text-sm font-bold text-white">No Request Selected</div>
                <p className="text-xs">Select a request from the left list to view live tracking.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Progressive Disclosure: Service History Table (When Toggled) ── */}
        {showHistory && (
          <div className="bg-[#1c1d22] rounded-3xl overflow-hidden shadow-md space-y-4 p-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
              <h3 className="font-bold text-sm text-white">Service History Archive</h3>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-[#25262c] text-white border-0 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-[#25262c] text-white border-0 focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/[0.06]">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Problem</th>
                    <th className="py-3 px-4">Asset</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">Nº{r.id}</td>
                      <td className="py-3.5 px-4 text-zinc-200 font-medium max-w-xs truncate">{r.problem}</td>
                      <td className="py-3.5 px-4 text-zinc-400">{r.asset}</td>
                      <td className="py-3.5 px-4">{renderStatusBadge(r.displayStatus)}</td>
                      <td className="py-3.5 px-4 text-zinc-400 text-[11px] font-mono">{r.submittedDate}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(r)}
                          className="text-xs font-bold text-[#F9C333] hover:underline"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Additional Modals (Preserved Without Mutation) ── */}
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#1c1d22] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                  Additional Service Pack
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuotationModal(false);
                    setQuotationRequested(false);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {quotationRequested ? (
                <div className="p-4 rounded-2xl bg-[#F9C333]/15 text-white text-xs space-y-2 text-center">
                  <CheckCircleIcon size={22} className="mx-auto text-[#F9C333]" />
                  <div className="font-bold text-sm text-white">Quotation Request Logged</div>
                  <p className="text-xs text-zinc-300">
                    A formal quotation for a 5-visit on-demand service pack has been routed to your facility manager.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuotationModal(false);
                      setQuotationRequested(false);
                    }}
                    className="mt-3 px-5 py-2 rounded-xl text-xs font-bold bg-[#F9C333] text-zinc-950"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-zinc-400 text-xs">
                    Your facility has fully utilized included visits for this billing cycle.
                  </p>
                  <div className="p-4 rounded-2xl bg-[#26272e] space-y-1">
                    <div className="font-bold text-white text-xs">Enterprise On-Demand 5-Pack</div>
                    <ul className="space-y-1 text-zinc-400 text-[11px]">
                      <li>• 5 additional certified technician on-site visits</li>
                      <li>• Retains {subscription.planName} arrival SLA commitments</li>
                    </ul>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setShowQuotationModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotationRequested(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F9C333] text-zinc-950 hover:bg-[#eab327]"
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
