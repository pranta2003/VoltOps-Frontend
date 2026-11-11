// Dispatcher Operations Console
// Strictly follows VoltOps Design Contract: "Show information, not explanations."
// High-density operational view: incoming breakdowns, live job roster, trade matrix, and dispatch logs.

import { FC, useState, useEffect, useCallback, useId } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { WorkOrder, ServiceRequest } from "../../types";
import { DispatcherMetrics, TechnicianRecommendation, DispatchEventLog } from "../../types/dispatcher";
import { dispatcherService } from "../../services/dispatcherService";
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

        {/* ── 1. Truthful Telemetry Strip (4 Compact Cards) ──────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1 */}
          <Link
            to="/dispatcher/requests"
            className="group p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Unassigned Requests</span>
              <AlertTriangleIcon size={15} className="text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-[var(--text-primary)]">
              {isLoading ? "—" : metrics?.unassignedRequests ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
              <span>Awaiting Triage</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                Triage →
              </span>
            </div>
          </Link>

          {/* Card 2 */}
          <Link
            to="/dispatcher/work-orders"
            className="group p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Active Work Orders</span>
              <WrenchIcon size={15} className="text-sky-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-[var(--text-primary)]">
              {isLoading ? "—" : metrics?.activeWorkOrders ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
              <span>Transit & On-site</span>
              <span className="text-sky-600 dark:text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                Ledger →
              </span>
            </div>
          </Link>

          {/* Card 3 */}
          <Link
            to="/dispatcher/technicians"
            className="group p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-slate-400 dark:hover:border-slate-600 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Technicians on Duty</span>
              <ShieldCheckIcon size={15} className="text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-[var(--text-primary)] text-emerald-600 dark:text-emerald-400">
              {isLoading ? "—" : metrics?.techniciansOnDuty ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
              <span>Verified Licenses</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                Roster →
              </span>
            </div>
          </Link>

          {/* Card 4 */}
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              <span>SLA Watch (Urgent)</span>
              <ClockIcon size={15} className="text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-rose-700 dark:text-rose-400">
              {isLoading ? "—" : metrics?.urgentSlaWatch ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-rose-700/80 dark:text-rose-400/80">
              20–40m Physical Target (24/7 Plans)
            </div>
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
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
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
                        <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">{wo.facilityAddress}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-[var(--text-primary)]">{wo.assetName}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{wo.category}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(
                            wo.priority
                          )}`}
                        >
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">{getStatusBadge(wo.status)}</td>
                      <td className="py-3 px-3.5">
                        {wo.assignedTechnicianName ? (
                          <span className="font-medium text-[var(--text-primary)]">{wo.assignedTechnicianName}</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {wo.status === "UNASSIGNED" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(wo)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                          >
                            Assign Tech
                          </button>
                        ) : (
                          <Link
                            to="/dispatcher/work-orders"
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
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

        {/* ── 4. Two-Column Grid: Dispatch Coverage Matrix & Recent Activity ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Trade Matrix */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Dispatch Coverage Matrix
              </h3>
              <Link to="/dispatcher/technicians" className="text-xs font-semibold text-emerald-600 hover:underline">
                View Roster →
              </Link>
            </div>

            <div className="space-y-2">
              {metrics?.tradeCoverage?.map((trade) => (
                <div
                  key={trade.category}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface-2)] text-xs"
                >
                  <span className="font-medium text-[var(--text-primary)] truncate max-w-[240px]">
                    {trade.category}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {trade.availableCount} Available
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      {trade.activeCount} On Job
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Dispatch Ledger */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Recent Operational Log
              </h3>
              <span className="text-xs text-[var(--text-muted)]">Shift Telemetry</span>
            </div>

            <div className="space-y-2.5">
              {recentEvents.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-muted)]">No recent dispatch activity.</div>
              ) : (
                recentEvents.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-lg border border-[var(--border)] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--text-primary)]">{evt.actorName}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{evt.summary}</p>
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
    </Layout>
  );
};
