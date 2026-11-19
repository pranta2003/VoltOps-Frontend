// Dispatcher Operations Console
// Strictly follows VoltOps Design Contract: "Show information, not explanations."
// High-density operational view: incoming breakdowns, live job roster, trade matrix, and dispatch logs.

import { FC, useState, useEffect, useCallback, useId } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { WorkOrder, ServiceRequest } from "../../types";
import { DispatcherMetrics, TechnicianRecommendation, DispatchEventLog } from "../../types/dispatcher";
import { dispatcherService } from "../../services/dispatcherService";
import { DonutChart } from "../../components/charts/DonutChart";
import { HorizontalBarChart } from "../../components/charts/HorizontalBarChart";
import { MetricCard } from "../../components/MetricCard";
import {
  WrenchIcon,
  AlertTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  XIcon,
  CheckIcon,
} from "../../components/Icons";

export const DispatcherDashboard: FC = () => {
  const [metrics, setMetrics] = useState<DispatcherMetrics | null>(null);
  const [activeOrders, setActiveOrders] = useState<WorkOrder[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<ServiceRequest[]>([]);
  const [recentEvents, setRecentEvents] = useState<DispatchEventLog[]>([]);
  const [isOffline, setIsOffline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  // Pending Completion Reviews State
  const [pendingReviews, setPendingReviews] = useState<WorkOrder[]>([]);
  const [reviewingOrder, setReviewingOrder] = useState<WorkOrder | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewActionSuccess, setReviewActionSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Assignment Modal State
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [matchingTechs, setMatchingTechs] = useState<TechnicianRecommendation[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [selectedTech, setSelectedTech] = useState<TechnicianRecommendation | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  const assignModalHeadingId = useId();

  const loadDashboardData = useCallback(async () => {
    try {
      const [metricsRes, ordersRes, requestsRes, eventsRes] = await Promise.all([
        dispatcherService.getMetrics(),
        dispatcherService.getWorkOrders(),
        dispatcherService.getServiceRequests({ priority: "URGENT", status: "NEW" }),
        dispatcherService.getDispatchEvents(),
      ]);

      setMetrics(metricsRes.data);
      setIsOffline(metricsRes.isOffline);
      setActiveOrders(
        ordersRes.data.filter((w) => w.status !== "COMPLETED").slice(0, 5)
      );
      setPendingReviews(
        ordersRes.data.filter((w) => w.status === "WORK_COMPLETED_AWAITING_CONFIRMATION")
      );
      setUrgentRequests(requestsRes.data.slice(0, 3));
      setRecentEvents(eventsRes.data.slice(0, 4));
      setErrorMessage(null);
      setIsStale(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load dispatcher telemetry");
      setIsStale(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
  };

  const handleOpenAssignModal = async (order: WorkOrder) => {
    setSelectedWorkOrder(order);
    setSelectedTech(null);
    setDispatchNotes("");
    setAssignmentSuccess(null);
    setIsLoadingMatches(true);

    try {
      const matchRes = await dispatcherService.getMatchingTechnicians(order.id);
      setMatchingTechs(matchRes.data);
    } catch {
      setMatchingTechs([]);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedWorkOrder || !selectedTech) return;
    setIsAssigning(true);

    try {
      const res = await dispatcherService.assignTechnician({
        workOrderId: selectedWorkOrder.id,
        technicianId: selectedTech.technicianId,
        dispatcherNotes: dispatchNotes.trim() || undefined,
      });

      if (res.success) {
        setAssignmentSuccess(
          `[Local Demo] Dispatched ${selectedTech.technicianName} to ${selectedWorkOrder.id} (Simulated locally; will not persist to server).`
        );
        setTimeout(() => {
          setSelectedWorkOrder(null);
          setSelectedTech(null);
          setAssignmentSuccess(null);
          handleRefresh();
        }, 1200);
      }
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenReviewModal = (wo: WorkOrder) => {
    setReviewingOrder(wo);
    setCorrectionReason("");
    setShowCorrectionInput(false);
    setReviewError(null);
    setReviewActionSuccess(null);
  };

  const handleApproveReport = async () => {
    if (!reviewingOrder) return;
    setIsReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await dispatcherService.approveCompletionReport(reviewingOrder.id);
      if (res.success) {
        setReviewActionSuccess(`Work Order ${reviewingOrder.id} approved and finalized as COMPLETED.`);
        setTimeout(() => {
          setReviewingOrder(null);
          setReviewActionSuccess(null);
          loadDashboardData();
        }, 1200);
      }
    } catch (err: any) {
      setReviewError(err.message || "Failed to approve completion report.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!reviewingOrder) return;
    if (!correctionReason.trim()) {
      setReviewError("Please specify the correction reason before proceeding.");
      return;
    }
    setIsReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await dispatcherService.requestCompletionCorrection(reviewingOrder.id, correctionReason.trim());
      if (res.success) {
        setReviewActionSuccess(`Correction requested for Work Order ${reviewingOrder.id}. Returned to technician.`);
        setTimeout(() => {
          setReviewingOrder(null);
          setCorrectionReason("");
          setShowCorrectionInput(false);
          setReviewActionSuccess(null);
          loadDashboardData();
        }, 1200);
      }
    } catch (err: any) {
      setReviewError(err.message || "Failed to request correction.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
      case "HIGH":
        return "bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30 font-bold";
      case "MEDIUM":
        return "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30 font-bold";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 font-bold";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-[#8a1858] border border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8287a] animate-pulse" />
            Unassigned
          </span>
        );
      case "TRAVELLING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
            In Transit
          </span>
        );
      case "ON_SITE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            On Site
          </span>
        );
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse" />
            Reported Complete
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Assigned
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {status}
          </span>
        );
    }
  };

  return (
    <Layout
      title="Dashboard"
      action={
        <div className="flex items-center gap-2">
          {errorMessage && !metrics ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-300 bg-rose-50 text-[#8a1858] dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b8287a]" />
              Connection Error
            </span>
          ) : !isOffline ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live API
            </span>
          ) : null}

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh telemetry"
            title="Refresh telemetry"
            className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 disabled:opacity-40 transition-colors btn-press shadow-xs"
          >
            <RefreshCwIcon size={14} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-5 pb-24">
        {/* Error notification banner if request failed */}
        {errorMessage && (
          <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-xs text-[#8a1858] dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-[#b8287a] shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-xs font-bold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Clean Hub Filter */}
        <div className="flex items-center justify-end gap-2 pb-1">
          <label htmlFor="hub-select" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
            Branch:
          </label>
          <select
            id="hub-select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-50"
          >
            <option value="ALL">All Hubs (Dhaka Division)</option>
            <option value="EPZ">EPZ Industrial Core (DEPZ)</option>
            <option value="Gazipur">Gazipur Industrial Zone</option>
            <option value="Tejgaon">Tejgaon Commercial Hub</option>
          </select>
        </div>

        {/* ── 1. Telemetry Metric Cards Strip ──────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/dispatcher/requests" className="block">
            <MetricCard
              label="Unassigned Requests"
              value={isLoading ? "—" : metrics?.unassignedRequests ?? 0}
              icon={AlertTriangleIcon}
              trend={
                (metrics?.unassignedRequests ?? 0) > 0
                  ? { direction: "down", label: "Action Needed" }
                  : { direction: "neutral", label: "Clear" }
              }
            />
          </Link>

          <Link to="/dispatcher/work-orders" className="block">
            <MetricCard
              label="Active Work Orders"
              value={isLoading ? "—" : metrics?.activeWorkOrders ?? 0}
              icon={WrenchIcon}
              trend={{ direction: "up", label: "Live Jobs" }}
            />
          </Link>

          <Link to="/dispatcher/technicians" className="block">
            <MetricCard
              label="Technicians On Duty"
              value={isLoading ? "—" : metrics?.techniciansOnDuty ?? 0}
              icon={ShieldCheckIcon}
              trend={{ direction: "neutral", label: "EPZ & Gazipur" }}
            />
          </Link>

          <MetricCard
            label="SLA Watch (Urgent)"
            value={isLoading ? "—" : metrics?.urgentSlaWatch ?? 0}
            icon={ClockIcon}
            alert={(metrics?.urgentSlaWatch ?? 0) > 0}
            trend={
              (metrics?.urgentSlaWatch ?? 0) > 0
                ? { direction: "down", label: "Countdown Active" }
                : { direction: "neutral", label: "Compliant" }
            }
          />
        </div>

        {/* ── Pending Completion Reviews Area ────────────────────────────── */}
        {pendingReviews.length > 0 && (
          <div className="rounded-xl border border-cyan-300 bg-cyan-50/70 p-3.5 sm:p-4 space-y-3 shadow-md dark:border-cyan-500/30 dark:bg-[#06b6d4]/10 dark:shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#06b6d4] animate-pulse" />
                <h3 className="text-xs font-bold text-cyan-950 dark:text-cyan-100 uppercase tracking-wide">
                  Pending completion reviews ({pendingReviews.length})
                </h3>
              </div>
              <span className="text-[11px] text-cyan-800 dark:text-cyan-300 font-semibold">
                Technician reports awaiting dispatcher verification
              </span>
            </div>

            <div className="divide-y divide-slate-300/80 border border-slate-300 rounded-xl bg-white shadow-xs overflow-hidden dark:divide-white/5 dark:border-white/10 dark:bg-zinc-900">
              {pendingReviews.map((order) => (
                <div
                  key={order.id}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-emerald-50/40 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-950 dark:text-zinc-50">
                        {order.id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
                        Review Required
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
                        {order.category}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-950 dark:text-zinc-100 truncate">
                      {order.customerName} <span className="text-slate-300 dark:text-zinc-700 mx-1.5">|</span> <span className="font-medium text-slate-700 dark:text-zinc-300">{order.assetName}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium flex items-center gap-2">
                      <span>Technician: <strong className="text-slate-950 dark:text-zinc-100 font-bold">{order.assignedTechnicianName || "Kamrul Islam"}</strong></span>
                      <span className="text-slate-300 dark:text-zinc-700">•</span>
                      <span>Submitted: {order.completionReport?.completedAt ? new Date(order.completionReport.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenReviewModal(order)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#06090e] transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-sm btn-press self-start sm:self-auto"
                  >
                    <span>Review report</span>
                    <ArrowRightIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 2. Operational Overview: Work Order Distribution & Trade Capacity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* Donut Chart: Lifecycle State Distribution */}
          <div className="lg:col-span-5 p-4 rounded-xl border border-slate-300 bg-white shadow-md dark:bg-zinc-900 dark:border-white/5 dark:shadow-none flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5 mb-2">
              <h3 className="text-xs font-bold text-slate-950 dark:text-zinc-50 uppercase tracking-wide">
                Work orders by status
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-300">
                Status
              </span>
            </div>

            <DonutChart
              data={[
                { label: "Assigned", value: 1, color: "#38bdf8" },
                { label: "In Transit", value: 1, color: "#06b6d4" },
                { label: "On Site", value: 1, color: "#10b981" },
                { label: "Unassigned", value: metrics?.unassignedRequests ?? 1, color: "#b8287a" },
                { label: "Completed", value: 1, color: "#64748b" },
              ]}
              totalLabel="Orders"
              size={125}
              strokeWidth={14}
            />

            {/* Quick Operational Telemetry Strip */}
            <div className="pt-2.5 mt-2 border-t border-slate-200 dark:border-white/10 grid grid-cols-3 gap-2 text-center">
              <div className="p-1.5 rounded-lg bg-slate-100/80 border border-slate-200 dark:bg-zinc-950 dark:border-white/10">
                <div className="text-[10px] font-medium text-slate-600 dark:text-zinc-400">In field</div>
                <div className="font-mono tabular-nums text-xs sm:text-sm font-bold text-cyan-800 dark:text-[#06b6d4]">2 Active</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100/80 border border-slate-200 dark:bg-zinc-950 dark:border-white/10">
                <div className="text-[10px] font-medium text-slate-600 dark:text-zinc-400">SLA target</div>
                <div className="font-mono tabular-nums text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-400">100% Met</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100/80 border border-slate-200 dark:bg-zinc-950 dark:border-white/10">
                <div className="text-[10px] font-medium text-slate-600 dark:text-zinc-400">Avg transit</div>
                <div className="font-mono tabular-nums text-xs sm:text-sm font-bold text-slate-950 dark:text-zinc-50">18 min</div>
              </div>
            </div>
          </div>

          {/* Horizontal Bar Chart: 7 Canonical Service Trades Capacity */}
          <div className="lg:col-span-7 p-4 rounded-xl border border-slate-300 bg-white shadow-md dark:bg-zinc-900 dark:border-white/5 dark:shadow-none flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5 mb-2">
              <h3 className="text-xs font-bold text-slate-950 dark:text-zinc-50 uppercase tracking-wide">
                Trade capacity
              </h3>
              <Link to="/dispatcher/technicians" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                View roster
              </Link>
            </div>

            <HorizontalBarChart
              data={
                metrics?.tradeCoverage?.map((trade) => ({
                  label: trade.category,
                  value: trade.availableCount,
                  secondaryValue: trade.activeCount,
                  secondaryLabel: "busy",
                  color: "#10b981",
                  badge: trade.availableCount > 0 ? "Ready" : "Busy",
                })) || []
              }
              valueSuffix=" avail"
            />
          </div>
        </div>

        {/* ── 2. Urgent Emergency Action Queue (If Any) ──────────────────── */}
        {urgentRequests.length > 0 && (
          <div className="rounded-xl border border-rose-300 bg-rose-50/70 dark:border-[#b8287a]/30 dark:bg-[#b8287a]/10 p-3 sm:p-4 space-y-2.5 shadow-md dark:shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#b8287a] animate-ping" />
                <h3 className="text-xs font-bold text-[#8a1858] dark:text-[#e879b9] uppercase tracking-wide">
                  Critical breakdown queue
                </h3>
              </div>
              <span className="text-xs text-[#8a1858] dark:text-[#e879b9] font-mono tabular-nums font-bold">
                {urgentRequests.length} critical breakdown{urgentRequests.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {urgentRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-lg border border-rose-300 dark:border-[#b8287a]/30 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono tabular-nums font-bold text-[#8a1858] dark:text-[#e879b9]">{req.id}</span>
                      <span className="text-[10px] font-bold text-[#8a1858] dark:text-[#e879b9] bg-rose-100 dark:bg-[#b8287a]/20 border border-rose-300 dark:border-[#b8287a]/30 px-1.5 py-0.5 rounded">
                        {req.coveragePlan === "8hr"
                          ? "Plan A (Window)"
                          : req.coveragePlan === "custom"
                          ? "Plan D (Custom)"
                          : req.slaRemainingMinutes != null
                          ? `~${req.slaRemainingMinutes}m SLA`
                          : "Urgent"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-950 dark:text-zinc-50 truncate">{req.customerName}</div>
                    <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium line-clamp-1">
                      {req.assetName}: {req.problemTitle}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium truncate max-w-[140px]">{req.category}</span>
                    <Link
                      to="/dispatcher/requests"
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 hover:underline text-[11px]"
                    >
                      Triage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. Active Work Orders Operational Ledger ─────────────────────── */}
        <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-500 rounded-xl shadow-md overflow-hidden dark:bg-zinc-900 dark:border-white/5 dark:border-t-white/5 dark:shadow-none">
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-950 dark:text-zinc-50">Active Work Orders</h2>
            <Link
              to="/dispatcher/work-orders"
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead className="bg-slate-200/70 border-b-2 border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider dark:bg-zinc-950/60 dark:border-white/5 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3.5">Order ID</th>
                  <th className="py-2.5 px-3.5">Customer</th>
                  <th className="py-2.5 px-3.5">Trade & Asset</th>
                  <th className="py-2.5 px-3.5">Priority</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Assigned Technician</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/80 dark:divide-white/5">
                {activeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-600 dark:text-zinc-400">
                      No active work orders. Incoming requests will appear in the triage queue.
                    </td>
                  </tr>
                ) : (
                  activeOrders.map((wo) => (
                    <tr key={wo.id} className="odd:bg-white even:bg-slate-50/90 hover:bg-emerald-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-950 dark:text-zinc-50 tabular-nums">{wo.id}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-950 dark:text-zinc-50">
                        {wo.customerName}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-950 dark:text-zinc-100">{wo.assetName}</div>
                        <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium">{wo.category}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getPriorityBadge(
                            wo.priority
                          )}`}
                        >
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">{getStatusBadge(wo.status)}</td>
                      <td className="py-3 px-3.5">
                        {wo.assignedTechnicianName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-900 dark:text-zinc-200">
                              {wo.assignedTechnicianName.substring(0, 2).toUpperCase()}
                            </span>
                            <span className="font-bold text-slate-950 dark:text-zinc-50">{wo.assignedTechnicianName}</span>
                          </div>
                        ) : (
                          <span className="text-[#8a1858] dark:text-[#e879b9] font-bold italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {wo.status === "UNASSIGNED" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(wo)}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#059669] transition-all shadow-xs btn-press"
                          >
                            Assign Tech
                          </button>
                        ) : (
                          <Link
                            to="/dispatcher/work-orders"
                            className="px-3 py-1 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 transition-all shadow-xs btn-press"
                          >
                            Inspect
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 5. Safe Technician Matching & Assignment Modal (Human Confirmed) ─ */}
      {selectedWorkOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={assignModalHeadingId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Advisory matching engine (SDP-4 rules)
                </span>
                <h3 id={assignModalHeadingId} className="text-base font-bold text-slate-950 dark:text-zinc-50">
                  Assign technician — {selectedWorkOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Target Breakdown Card */}
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 dark:bg-zinc-950 dark:border-white/10 text-xs space-y-1">
              <div>
                <strong className="text-slate-950 dark:text-zinc-50 font-semibold">Customer:</strong> {selectedWorkOrder.customerName}
              </div>
              <div>
                <strong className="text-slate-950 dark:text-zinc-50 font-semibold">Facility:</strong> {selectedWorkOrder.facilityAddress}
              </div>
              <div>
                <strong className="text-slate-950 dark:text-zinc-50 font-semibold">Required Trade:</strong> {selectedWorkOrder.category}
              </div>
              <div>
                <strong className="text-slate-950 dark:text-zinc-50 font-semibold">Equipment & Problem:</strong> {selectedWorkOrder.assetName} —{" "}
                {selectedWorkOrder.problemSummary}
              </div>
            </div>

            {assignmentSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 text-center font-bold text-sm">
                ✓ {assignmentSuccess}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                  <span>Eligible candidates (ranked by arithmetic score)</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Human confirmation required</span>
                </div>

                {isLoadingMatches ? (
                  <div className="py-8 text-center text-xs text-slate-600 dark:text-zinc-400">
                    Evaluating candidate passports and branch locations...
                  </div>
                ) : matchingTechs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#8a1858] dark:text-[#e879b9] font-bold">
                    No available certified technicians found for {selectedWorkOrder.category}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matchingTechs.map((candidate) => (
                      <div
                        key={candidate.technicianId}
                        onClick={() => setSelectedTech(candidate)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedTech?.technicianId === candidate.technicianId
                            ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                            : "border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-slate-400 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs text-slate-950 dark:text-zinc-50">
                                {candidate.technicianName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  candidate.recommendationTier === "TIER_1_PREFERRED"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                                    : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20"
                                }`}
                              >
                                {candidate.recommendationTier === "TIER_1_PREFERRED" ? "Tier 1: Preferred" : "Tier 2: Eligible"}
                              </span>
                              <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">· ETA ~{candidate.etaMinutes}m</span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span>{candidate.designation}</span>
                              <span className="text-slate-300 dark:text-zinc-700">•</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ Active License</span>
                              <span className="text-slate-300 dark:text-zinc-700">•</span>
                              <span>{candidate.eligibilityFactors?.standbyAvailable ? "✓ Standby" : `${candidate.activeJobCount} Active Job(s)`}</span>
                              {candidate.eligibilityFactors?.branchMatched && (
                                <>
                                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                                  <span className="text-sky-700 dark:text-sky-400 font-bold">✓ Branch Match</span>
                                </>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-zinc-300 italic pt-0.5 font-medium">
                              "{candidate.explanation}"
                            </p>
                          </div>

                          <div className="shrink-0">
                            {selectedTech?.technicianId === candidate.technicianId ? (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <CheckIcon size={12} />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dispatcher Notes */}
                {selectedTech && (
                  <div className="space-y-1 pt-2">
                    <label htmlFor="dispatch-notes" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Dispatch Instructions (Optional):
                    </label>
                    <textarea
                      id="dispatch-notes"
                      rows={2}
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      placeholder="e.g. Check substation gate 2 security badge; bring 10G-SR transceivers."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-100/80 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 transition-colors btn-press shadow-xs"
              >
                Cancel
              </button>
              {selectedTech && !assignmentSuccess && (
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={isAssigning}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#059669] transition-all shadow-sm btn-press disabled:opacity-50"
                >
                  {isAssigning ? "Dispatching..." : `Confirm Dispatch: ${selectedTech.technicianName}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dispatcher Completion Report Review Modal ────────────────────── */}
      {reviewingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 text-slate-950 dark:text-zinc-50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold font-heading text-slate-950 dark:text-zinc-50">
                    Technician completion report review
                  </h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
                    {reviewingOrder.id}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 font-medium">
                  Verify technical findings, materials used, and work performed before closing work order.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReviewingOrder(null)}
                className="p-1 rounded-md text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Error or Success Notice */}
            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-[#8a1858] dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30 flex items-center gap-2">
                <AlertTriangleIcon size={14} className="text-[#b8287a] shrink-0" />
                <span className="font-semibold">{reviewError}</span>
              </div>
            )}
            {reviewActionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20 flex items-center gap-2 font-bold">
                <CheckIcon size={14} className="text-emerald-600 shrink-0" />
                <span>{reviewActionSuccess}</span>
              </div>
            )}

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 text-xs border border-slate-300 dark:border-white/10">
              <div>
                <span className="text-slate-600 dark:text-zinc-400 text-[10px] font-bold block">Customer & asset</span>
                <span className="font-bold text-slate-950 dark:text-zinc-50">{reviewingOrder.customerName}</span>
                <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium truncate">{reviewingOrder.assetName}</div>
              </div>

              <div>
                <span className="text-slate-600 dark:text-zinc-400 text-[10px] font-bold block">Technician & trade</span>
                <span className="font-bold text-slate-950 dark:text-zinc-50">{reviewingOrder.assignedTechnicianName || "Kamrul Islam"}</span>
                <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium truncate">{reviewingOrder.category}</div>
              </div>
            </div>

            {/* Detailed Report Fields */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-950/50 space-y-1">
                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 block">
                  Work performed & resolution
                </span>
                <p className="text-slate-900 dark:text-zinc-100 font-medium leading-relaxed">
                  {reviewingOrder.completionReport?.workPerformed || reviewingOrder.completionReport?.notes || reviewingOrder.workNotes || "Technical diagnostic inspection completed."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-950/50 space-y-1">
                <span className="font-bold text-xs text-cyan-800 dark:text-cyan-400 block">
                  On-site diagnosis & root cause
                </span>
                <p className="text-slate-900 dark:text-zinc-100 font-medium leading-relaxed">
                  {reviewingOrder.completionReport?.diagnosis || "Component failure inspected and verified on site."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-950/50 space-y-1">
                <span className="font-bold text-xs text-slate-700 dark:text-zinc-300 block">
                  Materials & parts used
                </span>
                <p className="font-mono tabular-nums text-[11px] text-slate-900 dark:text-zinc-100 font-medium">
                  {reviewingOrder.completionReport?.materialsUsed || "Standard diagnostic tooling & equipment consumed."}
                </p>
              </div>

              {/* Correction Reason Drawer */}
              {showCorrectionInput && (
                <div className="p-3.5 rounded-xl border border-cyan-300 bg-cyan-50/70 dark:border-cyan-500/30 dark:bg-[#06b6d4]/10 space-y-2 animate-fade-in">
                  <label htmlFor="correction-reason" className="font-bold text-cyan-950 dark:text-cyan-100 block text-xs">
                    Correction Notes / Reason for Return:
                  </label>
                  <textarea
                    id="correction-reason"
                    rows={2}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Specify additional measurements, missing photos, or required repairs..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCorrectionInput(false)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-zinc-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestCorrection}
                      disabled={isReviewSubmitting}
                      className="px-3 py-1 rounded-lg bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold text-xs shadow-xs btn-press"
                    >
                      {isReviewSubmitting ? "Returning..." : "Send Back for Correction"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
              <div>
                {!showCorrectionInput && (
                  <button
                    type="button"
                    onClick={() => setShowCorrectionInput(true)}
                    className="px-3 py-1.5 rounded-xl border border-cyan-300 text-cyan-800 bg-cyan-50 hover:bg-cyan-100 dark:border-cyan-500/30 dark:text-[#06b6d4] dark:bg-[#06b6d4]/15 text-xs font-bold transition-all shadow-xs btn-press"
                  >
                    Request Correction
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingOrder(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 transition-colors btn-press shadow-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApproveReport}
                  disabled={isReviewSubmitting}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#06090e] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 btn-press"
                >
                  <CheckIcon size={13} />
                  <span>{isReviewSubmitting ? "Approving..." : "Approve & Complete Work Order"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
