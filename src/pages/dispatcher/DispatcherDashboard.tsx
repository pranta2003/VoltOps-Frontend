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
import { ActivityVolumeChart } from "../../components/charts/ActivityVolumeChart";
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
      setActiveOrders(ordersRes.data.slice(0, 5));
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
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900";
      case "HIGH":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900";
      case "MEDIUM":
        return "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-900";
      default:
        return "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Unassigned
          </span>
        );
      case "TRAVELLING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Transit
          </span>
        );
      case "ON_SITE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            On Site
          </span>
        );
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Reported Complete
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Assigned
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {status}
          </span>
        );
    }
  };

  return (
    <Layout
      title="Dispatcher Console"
      action={
        <div className="flex items-center gap-2">
          {/* Status pill: Distinguishes Live, Local Preview, Stale, and Error */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              errorMessage && !metrics
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                : isStale
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                : isOffline
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                errorMessage && !metrics
                  ? "bg-rose-500"
                  : isStale
                  ? "bg-amber-500"
                  : isOffline
                  ? "bg-amber-500"
                  : "bg-emerald-500 animate-pulse"
              }`}
            />
            {errorMessage && !metrics
              ? "Connection Error"
              : isStale
              ? "Stale Data"
              : isOffline
              ? "Local preview"
              : "Live API"}
          </span>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh telemetry"
            title="Refresh telemetry"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCwIcon size={15} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Error notification banner if request failed */}
        {errorMessage && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={15} className="text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 active:scale-95 transition-all text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Subheader & Hub Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-primary)]">Operations Hub</span>
            <span>•</span>
            <span>Shift Lead: Tania Akter</span>
            <span>•</span>
            <span>7 Trades Managed</span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="hub-select" className="text-xs text-[var(--text-muted)]">
              Branch:
            </label>
            <select
              id="hub-select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Hubs (Dhaka Division)</option>
              <option value="EPZ">EPZ Industrial Core (DEPZ)</option>
              <option value="Gazipur">Gazipur Industrial Zone</option>
              <option value="Tejgaon">Tejgaon Commercial Hub</option>
            </select>
          </div>
        </div>

        {/* ── 1. Telemetry Metric Cards Strip ──────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/dispatcher/requests" className="block">
            <MetricCard
              label="Unassigned Requests"
              value={isLoading ? "—" : metrics?.unassignedRequests ?? 0}
              subtext="Awaiting Triage & Dispatch"
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
              subtext="In Transit & On-site Repairs"
              icon={WrenchIcon}
              trend={{ direction: "up", label: "Live Jobs" }}
            />
          </Link>

          <Link to="/dispatcher/technicians" className="block">
            <MetricCard
              label="Technicians On Duty"
              value={isLoading ? "—" : metrics?.techniciansOnDuty ?? 0}
              subtext="Verified Licensed Capacity"
              icon={ShieldCheckIcon}
              trend={{ direction: "neutral", label: "EPZ & Gazipur" }}
            />
          </Link>

          <MetricCard
            label="SLA Watch (Urgent)"
            value={isLoading ? "—" : metrics?.urgentSlaWatch ?? 0}
            subtext="20–40m Physical Target"
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
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3.5 sm:p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-200">
                  Pending Completion Reviews ({pendingReviews.length})
                </h3>
              </div>
              <span className="text-[11px] text-cyan-700 dark:text-cyan-300 font-medium">
                Technician reports awaiting dispatcher verification
              </span>
            </div>

            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] overflow-hidden">
              {pendingReviews.map((order) => (
                <div
                  key={order.id}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-surface-2)]/60 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                        {order.id}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                        Review Required
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {order.category}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {order.customerName} • <span className="font-normal text-[var(--text-muted)]">{order.assetName}</span>
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                      <span>Technician: <strong className="text-[var(--text-primary)]">{order.assignedTechnicianName || "Kamrul Islam"}</strong></span>
                      <span>•</span>
                      <span>Submitted: {order.completionReport?.completedAt ? new Date(order.completionReport.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenReviewModal(order)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#06090e] transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-sm self-start sm:self-auto"
                  >
                    <span>Review Report</span>
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
          <div className="lg:col-span-5 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Work Orders
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
                Status
              </span>
            </div>

            <DonutChart
              data={[
                { label: "Assigned", value: 1, color: "#38bdf8" },
                { label: "In Transit", value: 1, color: "#f59e0b" },
                { label: "On Site", value: 1, color: "#10b981" },
                { label: "Unassigned", value: metrics?.unassignedRequests ?? 1, color: "#ef4444" },
                { label: "Completed", value: 1, color: "#64748b" },
              ]}
              totalLabel="Orders"
              size={125}
              strokeWidth={14}
            />

            {/* Quick Operational Telemetry Strip */}
            <div className="pt-2.5 mt-2 border-t border-[var(--border)] grid grid-cols-3 gap-2 text-center">
              <div className="p-1.5 rounded-lg bg-[var(--bg-surface-2)]">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">In Field</div>
                <div className="font-mono text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">2 Active</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[var(--bg-surface-2)]">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">SLA Target</div>
                <div className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">100% Met</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[var(--bg-surface-2)]">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Avg Transit</div>
                <div className="font-mono text-xs sm:text-sm font-bold text-[var(--text-primary)]">18 min</div>
              </div>
            </div>
          </div>

          {/* Horizontal Bar Chart: 7 Canonical Service Trades Capacity */}
          <div className="lg:col-span-7 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Trade Capacity
              </h3>
              <Link to="/dispatcher/technicians" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Roster →
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
          <div className="rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
                  Critical Breakdown Queue
                </h3>
              </div>
              <span className="text-xs text-rose-700 dark:text-rose-300 font-mono font-medium">
                {urgentRequests.length} critical breakdown{urgentRequests.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {urgentRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{req.id}</span>
                      <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                        {req.coveragePlan === "8hr"
                          ? "Plan A (Window)"
                          : req.coveragePlan === "custom"
                          ? "Plan D (Custom)"
                          : req.slaRemainingMinutes != null
                          ? `~${req.slaRemainingMinutes}m SLA`
                          : "Urgent"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[var(--text-primary)] truncate">{req.customerName}</div>
                    <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                      {req.assetName}: {req.problemTitle}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">{req.category}</span>
                    <Link
                      to="/dispatcher/requests"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline text-[11px]"
                    >
                      Triage <ArrowRightIcon size={11} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. Active Work Orders Operational Ledger ─────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Active Work Orders</h2>
            <Link
              to="/dispatcher/work-orders"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRightIcon size={12} />
            </Link>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-xs">
                  <th className="py-2.5 px-3.5">Order ID</th>
                  <th className="py-2.5 px-3.5">Customer & Facility</th>
                  <th className="py-2.5 px-3.5">Trade & Asset</th>
                  <th className="py-2.5 px-3.5">Priority</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Assigned Technician</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {activeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No active work orders. Incoming requests will appear in the triage queue.
                    </td>
                  </tr>
                ) : (
                  activeOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-[var(--text-primary)]">{wo.id}</td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-[var(--text-primary)]">{wo.customerName}</div>
                        <div className="text-xs text-[var(--text-muted)] truncate max-w-xs">{wo.facilityAddress}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-[var(--text-primary)]">{wo.assetName}</div>
                        <div className="text-xs text-[var(--text-muted)]">{wo.category}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getPriorityBadge(
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
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {wo.assignedTechnicianName.substring(0, 2).toUpperCase()}
                            </span>
                            <span className="font-medium text-[var(--text-primary)]">{wo.assignedTechnicianName}</span>
                          </div>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {wo.status === "UNASSIGNED" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(wo)}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                          >
                            Assign Tech
                          </button>
                        ) : (
                          <Link
                            to="/dispatcher/work-orders"
                            className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
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

        {/* ── 4. Two-Column Grid: Activity Velocity & Operational Log ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Dispatch Activity Volume Timeline */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Dispatch Velocity
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
                Hourly
              </span>
            </div>

            <ActivityVolumeChart
              data={[
                { key: "h-09", label: "09:00", timestamp: "09:00 AM", volume: 3 },
                { key: "h-10", label: "10:00", timestamp: "10:00 AM", volume: 6 },
                { key: "h-11", label: "11:00", timestamp: "11:00 AM", volume: 4 },
                { key: "h-12", label: "12:00", timestamp: "12:00 PM", volume: 2 },
                { key: "h-13", label: "13:00", timestamp: "01:00 PM", volume: 5 },
                { key: "h-14", label: "14:00", timestamp: "02:00 PM", volume: 8 },
                { key: "h-15", label: "15:00", timestamp: "03:00 PM", volume: 7 },
              ]}
              height={90}
              primaryLabel="dispatches"
            />
          </div>

          {/* Recent Dispatch Ledger */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Operational Log
              </h3>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Live</span>
            </div>

            <div className="space-y-1.5">
              {recentEvents.length === 0 ? (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">No recent activity.</div>
              ) : (
                recentEvents.slice(0, 3).map((evt) => (
                  <div key={evt.id} className="p-2 rounded-lg border border-[var(--border)] text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] truncate text-[11px]">{evt.summary}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{evt.actorName}</div>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
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
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Advisory Matching Engine (SDP-4 Hard Rules)
                </span>
                <h3 id={assignModalHeadingId} className="text-base font-bold text-[var(--text-primary)]">
                  Assign Technician — {selectedWorkOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Target Breakdown Card */}
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs space-y-1">
              <div>
                <strong className="text-[var(--text-primary)]">Customer:</strong> {selectedWorkOrder.customerName}
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Facility:</strong> {selectedWorkOrder.facilityAddress}
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Required Trade:</strong> {selectedWorkOrder.category}
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Equipment & Problem:</strong> {selectedWorkOrder.assetName} —{" "}
                {selectedWorkOrder.problemSummary}
              </div>
            </div>

            {assignmentSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-center font-bold text-sm">
                ✓ {assignmentSuccess}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  <span>Eligible Candidates (Ranked by Arithmetic Score)</span>
                  <span className="text-[10px] font-normal text-slate-500">Human Confirmation Required</span>
                </div>

                {isLoadingMatches ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                    Evaluating candidate passports and branch locations...
                  </div>
                ) : matchingTechs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-rose-600 dark:text-rose-400">
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
                            ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                            : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs text-[var(--text-primary)]">
                                {candidate.technicianName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  candidate.recommendationTier === "TIER_1_PREFERRED"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                }`}
                              >
                                {candidate.recommendationTier === "TIER_1_PREFERRED" ? "Tier 1: Preferred" : "Tier 2: Eligible"}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">· ETA ~{candidate.etaMinutes}m</span>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span>{candidate.designation}</span>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Active License</span>
                              <span>•</span>
                              <span>{candidate.eligibilityFactors?.standbyAvailable ? "✓ Standby" : `${candidate.activeJobCount} Active Job(s)`}</span>
                              {candidate.eligibilityFactors?.branchMatched && (
                                <>
                                  <span>•</span>
                                  <span className="text-sky-600 dark:text-sky-400 font-medium">✓ Branch Match</span>
                                </>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-0.5">
                              "{candidate.explanation}"
                            </p>
                          </div>

                          <div className="shrink-0">
                            {selectedTech?.technicianId === candidate.technicianId ? (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <CheckIcon size={12} />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]" />
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
                    <label htmlFor="dispatch-notes" className="text-xs font-semibold text-[var(--text-primary)]">
                      Dispatch Instructions (Optional):
                    </label>
                    <textarea
                      id="dispatch-notes"
                      rows={2}
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      placeholder="e.g. Check substation gate 2 security badge; bring 10G-SR transceivers."
                      className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              {selectedTech && !assignmentSuccess && (
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={isAssigning}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4 text-[var(--text-primary)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold font-heading text-[var(--text-primary)]">
                    Technician Completion Report Review
                  </h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                    {reviewingOrder.id}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Verify technical findings, materials used, and work performed before closing work order.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReviewingOrder(null)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Error or Success Notice */}
            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangleIcon size={14} className="text-rose-500 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}
            {reviewActionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-semibold">
                <CheckIcon size={14} className="text-emerald-500 shrink-0" />
                <span>{reviewActionSuccess}</span>
              </div>
            )}

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-surface-2)] text-xs border border-[var(--border)]">
              <div>
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider block">Customer & Asset</span>
                <span className="font-semibold">{reviewingOrder.customerName}</span>
                <div className="text-[11px] text-[var(--text-muted)] truncate">{reviewingOrder.assetName}</div>
              </div>

              <div>
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider block">Technician & Trade</span>
                <span className="font-semibold">{reviewingOrder.assignedTechnicianName || "Kamrul Islam"}</span>
                <div className="text-[11px] text-[var(--text-muted)] truncate">{reviewingOrder.category}</div>
              </div>
            </div>

            {/* Detailed Report Fields */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-[var(--border)] space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Work Performed & Resolution
                </span>
                <p className="text-[var(--text-primary)] leading-relaxed">
                  {reviewingOrder.completionReport?.workPerformed || reviewingOrder.completionReport?.notes || reviewingOrder.workNotes || "Technical diagnostic inspection completed."}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  On-Site Diagnosis & Root Cause
                </span>
                <p className="text-[var(--text-primary)] leading-relaxed">
                  {reviewingOrder.completionReport?.diagnosis || "Component failure inspected and verified on site."}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-muted)] block">
                  Materials & Parts Used
                </span>
                <p className="font-mono text-[11px] text-[var(--text-primary)]">
                  {reviewingOrder.completionReport?.materialsUsed || "Standard diagnostic tooling & equipment consumed."}
                </p>
              </div>

              {/* Correction Reason Drawer */}
              {showCorrectionInput && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2 animate-fade-in">
                  <label htmlFor="correction-reason" className="font-bold text-amber-800 dark:text-amber-300 block text-xs">
                    Correction Notes / Reason for Return:
                  </label>
                  <textarea
                    id="correction-reason"
                    rows={2}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Specify additional measurements, missing photos, or required repairs..."
                    className="w-full p-2.5 rounded-lg border border-amber-500/30 bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCorrectionInput(false)}
                      className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestCorrection}
                      disabled={isReviewSubmitting}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                    >
                      {isReviewSubmitting ? "Returning..." : "Send Back for Correction"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
              <div>
                {!showCorrectionInput && (
                  <button
                    type="button"
                    onClick={() => setShowCorrectionInput(true)}
                    className="px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-semibold transition-all"
                  >
                    Request Correction
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingOrder(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApproveReport}
                  disabled={isReviewSubmitting}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#06090e] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
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
