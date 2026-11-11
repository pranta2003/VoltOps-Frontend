// Work Orders Operational Management Ledger
// Strictly adheres to VoltOps design contract: "Show information, not explanations."
// High-density operational view: lifecycle status, arithmetic technician matching, and inspection drawer.

import { FC, useState, useEffect, useCallback, useId, useRef } from "react";
import { Layout } from "../../components/Layout";
import { WorkOrder, ServiceCategory, PriorityLevel, WorkOrderStatus } from "../../types";
import { CANONICAL_SERVICE_CATEGORIES } from "../../types";
import { TechnicianRecommendation } from "../../types/dispatcher";
import { dispatcherService } from "../../services/dispatcherService";
import {
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  WrenchIcon,
  CheckIcon,
} from "../../components/Icons";

export const WorkOrders: FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Inspect Drawer / Modal State
  const [inspectOrder, setInspectOrder] = useState<WorkOrder | null>(null);
  const [lifecycleNotes, setLifecycleNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Assignment Modal State
  const [assignOrder, setAssignOrder] = useState<WorkOrder | null>(null);
  const [matchingTechs, setMatchingTechs] = useState<TechnicianRecommendation[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [selectedTech, setSelectedTech] = useState<TechnicianRecommendation | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const inspectModalHeadingId = useId();
  const assignModalHeadingId = useId();
  const lastFocusedTriggerRef = useRef<HTMLButtonElement | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await dispatcherService.getWorkOrders({
        search: searchQuery || undefined,
        category: selectedCategory !== "ALL" ? (selectedCategory as ServiceCategory) : undefined,
        priority: selectedPriority !== "ALL" ? (selectedPriority as PriorityLevel) : undefined,
        status: selectedStatus !== "ALL" ? (selectedStatus as WorkOrderStatus) : undefined,
      });

      setWorkOrders(res.data);
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedCategory, selectedPriority, selectedStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
  };

  const handleOpenInspect = (wo: WorkOrder, e: React.MouseEvent<HTMLButtonElement>) => {
    lastFocusedTriggerRef.current = e.currentTarget;
    setInspectOrder(wo);
    setLifecycleNotes("");
  };

  const handleOpenAssign = async (wo: WorkOrder, e: React.MouseEvent<HTMLButtonElement>) => {
    lastFocusedTriggerRef.current = e.currentTarget;
    setAssignOrder(wo);
    setSelectedTech(null);
    setDispatchNotes("");
    setAssignSuccess(null);
    setIsLoadingMatches(true);

    try {
      const matchRes = await dispatcherService.getMatchingTechnicians(wo.id);
      setMatchingTechs(matchRes.data);
    } catch {
      setMatchingTechs([]);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleCloseModals = () => {
    setInspectOrder(null);
    setAssignOrder(null);
    setSelectedTech(null);
    setAssignSuccess(null);
    if (lastFocusedTriggerRef.current) {
      lastFocusedTriggerRef.current.focus();
    }
  };

  const handleExecuteAssignment = async () => {
    if (!assignOrder || !selectedTech) return;
    setIsAssigning(true);

    try {
      const res = await dispatcherService.assignTechnician({
        workOrderId: assignOrder.id,
        technicianId: selectedTech.technicianId,
        dispatcherNotes: dispatchNotes.trim() || undefined,
      });

      if (res.success) {
        setAssignSuccess(`Assigned ${selectedTech.technicianName} to ${assignOrder.id}`);
        setTimeout(() => {
          handleCloseModals();
          fetchOrders();
        }, 1200);
      }
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleTransitionStatus = async (nextStatus: WorkOrderStatus) => {
    if (!inspectOrder) return;
    setIsUpdatingStatus(true);

    try {
      const res = await dispatcherService.updateWorkOrderStatus(
        inspectOrder.id,
        nextStatus,
        lifecycleNotes.trim() || undefined
      );

      if (res.success) {
        setInspectOrder(res.data);
        fetchOrders();
      }
    } catch (err: any) {
      alert(`Status transition failed: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
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
      title="Work Orders"
      action={
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOffline
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? "bg-amber-500" : "bg-emerald-500"}`} />
            {isOffline ? "Offline data" : "Live API"}
          </span>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh work orders"
            title="Refresh work orders"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCwIcon size={15} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Subheader */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-1 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">{workOrders.length} Orders Active</span>
            <span>•</span>
            <span>Field Service Dispatch Ledger</span>
          </div>
        </div>

        {/* ── Compact Filter Toolbar (Single Row) ─────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, customer, asset, technician..."
              aria-label="Search work orders"
              className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
              >
                <XIcon size={13} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by trade category"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Trades (7 Canonical)</option>
              {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              aria-label="Filter by priority"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent (20–40m Arrival)</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
            <ChevronDownIcon
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] p-0.5 text-xs">
            {[
              { id: "ALL", label: "All" },
              { id: "UNASSIGNED", label: "Unassigned" },
              { id: "TRAVELLING", label: "In Transit" },
              { id: "ON_SITE", label: "On Site" },
              { id: "COMPLETED", label: "Completed" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  selectedStatus === tab.id
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── High-Density Work Orders Table ──────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
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
                  <th className="py-2.5 px-3.5">Arrival SLA</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      Loading work orders...
                    </td>
                  </tr>
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      No work orders match the selected filters.
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo) => (
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
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center">
                              {wo.assignedTechnicianName.substring(0, 2).toUpperCase()}
                            </span>
                            <span className="font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                              {wo.assignedTechnicianName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold italic text-[11px]">
                            Unassigned · Needs Tech
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-[11px] text-[var(--text-muted)] font-mono whitespace-nowrap">
                        {new Date(wo.slaDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1.5">
                        {wo.status === "UNASSIGNED" && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenAssign(wo, e)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                          >
                            Assign Tech
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenInspect(wo, e)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Slide-Over / Inspect Detail Modal ────────────────────────────── */}
      {inspectOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={inspectModalHeadingId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Work Order Inspection
                </span>
                <h3 id={inspectModalHeadingId} className="text-base font-bold text-[var(--text-primary)]">
                  {inspectOrder.id} — {inspectOrder.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModals}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Lifecycle Stepper */}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Operational Lifecycle
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div
                  className={`p-1.5 rounded-lg border ${
                    inspectOrder.status === "UNASSIGNED"
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 font-bold"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  1. Unassigned
                </div>
                <div
                  className={`p-1.5 rounded-lg border ${
                    inspectOrder.status === "ASSIGNED"
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 font-bold"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  2. Assigned
                </div>
                <div
                  className={`p-1.5 rounded-lg border ${
                    inspectOrder.status === "TRAVELLING" || inspectOrder.status === "ON_SITE"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 font-bold"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  3. Field Work
                </div>
                <div
                  className={`p-1.5 rounded-lg border ${
                    inspectOrder.status === "COMPLETED"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 font-bold"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  4. Completed
                </div>
              </div>
            </div>

            {/* Breakdown Details */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Facility Address</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectOrder.facilityAddress}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Required Trade</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectOrder.category}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[var(--border)]">
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Equipment / Asset</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectOrder.assetName}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Physical Arrival SLA</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {new Date(inspectOrder.slaDeadline).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-[var(--border)]">
                <span className="text-[var(--text-muted)] block text-[11px]">Problem Summary</span>
                <p className="font-medium text-[var(--text-primary)]">{inspectOrder.problemSummary}</p>
              </div>

              {inspectOrder.workNotes && (
                <div className="pt-1 border-t border-[var(--border)] bg-[var(--bg-surface-2)] p-2 rounded">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Dispatch Notes</span>
                  <p className="text-[11px] text-[var(--text-primary)]">{inspectOrder.workNotes}</p>
                </div>
              )}
            </div>

            {/* Lifecycle Status Transition Controls */}
            {inspectOrder.status !== "COMPLETED" && (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-2">
                <div className="text-xs font-semibold text-[var(--text-primary)]">Update Field Status:</div>
                <div className="flex flex-wrap gap-2">
                  {inspectOrder.status === "ASSIGNED" && (
                    <button
                      type="button"
                      onClick={() => handleTransitionStatus("TRAVELLING")}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 active:scale-95 transition-all"
                    >
                      Mark In Transit (TRAVELLING)
                    </button>
                  )}
                  {inspectOrder.status === "TRAVELLING" && (
                    <button
                      type="button"
                      onClick={() => handleTransitionStatus("ON_SITE")}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      Mark Arrived (ON_SITE)
                    </button>
                  )}
                  {inspectOrder.status === "ON_SITE" && (
                    <button
                      type="button"
                      onClick={() => handleTransitionStatus("COMPLETED")}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      Mark Sign-off Complete (COMPLETED)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <div>
                {inspectOrder.status === "UNASSIGNED" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const wo = inspectOrder;
                      handleCloseModals();
                      handleOpenAssign(wo, e);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                  >
                    Match & Assign Technician
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseModals}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Technician Matching & Assignment Modal (Phase 5) ─────────────── */}
      {assignOrder && (
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
                  Assign Technician to {assignOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModals}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Target Breakdown Card */}
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs space-y-1">
              <div>
                <strong className="text-[var(--text-primary)]">Customer:</strong> {assignOrder.customerName}
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Facility:</strong> {assignOrder.facilityAddress}
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Required Trade:</strong> {assignOrder.category}
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Equipment & Problem:</strong> {assignOrder.assetName} —{" "}
                {assignOrder.problemSummary}
              </div>
            </div>

            {assignSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-center font-bold text-sm">
                ✓ {assignSuccess}
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
                    No available certified technicians found for {assignOrder.category}.
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
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[var(--text-primary)]">
                                {candidate.technicianName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                {candidate.matchScore}% Match
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">· ETA ~{candidate.etaMinutes}m</span>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">{candidate.designation}</div>
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
                    <label htmlFor="assign-dispatch-notes" className="text-xs font-semibold text-[var(--text-primary)]">
                      Dispatch Instructions (Optional):
                    </label>
                    <textarea
                      id="assign-dispatch-notes"
                      rows={2}
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      placeholder="e.g. Bring diagnostic fiber loopback tester and OTDR equipment."
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
                onClick={handleCloseModals}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              {selectedTech && !assignSuccess && (
                <button
                  type="button"
                  onClick={handleExecuteAssignment}
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
