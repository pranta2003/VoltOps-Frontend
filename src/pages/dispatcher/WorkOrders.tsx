// Work Orders Operational Management Ledger
// Strictly adheres to VoltOps design contract: "Show information, not explanations."
// High-density operational view: lifecycle status, arithmetic technician matching, and inspection drawer.

import { FC, useState, useEffect, useCallback, useMemo, useId, useRef } from "react";
import { Layout } from "../../components/Layout";
import { WorkOrder, ServiceCategory, PriorityLevel, WorkOrderStatus } from "../../types";
import { CANONICAL_SERVICE_CATEGORIES } from "../../types";
import { TechnicianRecommendation } from "../../types/dispatcher";
import { dispatcherService, VALID_WORK_ORDER_TRANSITIONS } from "../../services/dispatcherService";
import {
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  WrenchIcon,
  CheckIcon,
  AlertTriangleIcon,
  EyeIcon,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

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
      setErrorMessage(null);
      setIsStale(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retrieve work orders from server");
      setIsStale(true);
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
        setAssignSuccess(
          `[Local Demo] Assigned ${selectedTech.technicianName} to ${assignOrder.id} (Simulated locally; will not persist to server).`
        );
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
      case "HIGH":
        return "bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30";
      case "MEDIUM":
        return "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30";
      default:
        return "bg-slate-50 text-slate-700 border-slate-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-white/10";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8287a] animate-pulse" />
            Unassigned
          </span>
        );
      case "TRAVELLING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
            In Transit
          </span>
        );
      case "ON_SITE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            On Site
          </span>
        );
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse" />
            Reported Complete
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Assigned
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {status}
          </span>
        );
    }
  };

  const renderArrivalSla = (wo: WorkOrder) => {
    if (!wo.slaDeadline) {
      if (wo.coveragePlan === "8hr") {
        return <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium">No SLA (08:00–17:00)</span>;
      }
      if (wo.coveragePlan === "custom") {
        return <span className="text-[10px] text-cyan-700 dark:text-[#06b6d4] font-medium">Custom Terms</span>;
      }
      return <span className="text-[10px] text-slate-500 dark:text-zinc-500">No Arrival SLA</span>;
    }
    return (
      <span className="font-mono tabular-nums text-[11px] text-slate-900 dark:text-zinc-100 font-semibold">
        {new Date(wo.slaDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  };

  const lifecycleCounts = useMemo(() => {
    return {
      UNASSIGNED: workOrders.filter((w) => w.status === "UNASSIGNED").length,
      ASSIGNED: workOrders.filter((w) => w.status === "ASSIGNED" || w.status === "TRAVELLING" || w.status === "ON_SITE").length,
      WORK_COMPLETED_AWAITING_CONFIRMATION: workOrders.filter((w) => w.status === "WORK_COMPLETED_AWAITING_CONFIRMATION").length,
      COMPLETED: workOrders.filter((w) => w.status === "COMPLETED").length,
    };
  }, [workOrders]);

  return (
    <Layout
      title="Work Orders"
      action={
        <div className="flex items-center gap-2">
          {!isOffline && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live API
            </span>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh orders"
            title="Refresh orders"
            className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 dark:hover:border-white/20 active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCwIcon size={15} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-4 pb-24">
        {/* Error notification banner if request failed */}
        {errorMessage && (
          <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 flex items-center justify-between text-xs text-rose-900 dark:text-rose-300">
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

        {/* ── Elevated Filter Toolbar ──────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-md dark:bg-zinc-900 dark:border-white/5 dark:border-l-white/5 dark:shadow-none space-y-3">
          {/* Row 1: Status Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mr-1">Status:</span>
            {[
              { id: "ALL", label: "All", count: workOrders.length, dot: "" },
              ...(lifecycleCounts.UNASSIGNED > 0
                ? [{ id: "UNASSIGNED", label: "Unassigned", count: lifecycleCounts.UNASSIGNED, dot: "bg-[#b8287a]" }]
                : []),
              { id: "ASSIGNED", label: "Assigned", count: lifecycleCounts.ASSIGNED, dot: "bg-indigo-500" },
              ...(lifecycleCounts.WORK_COMPLETED_AWAITING_CONFIRMATION > 0 || selectedStatus === "WORK_COMPLETED_AWAITING_CONFIRMATION"
                ? [{
                    id: "WORK_COMPLETED_AWAITING_CONFIRMATION",
                    label: "Reported Complete",
                    count: lifecycleCounts.WORK_COMPLETED_AWAITING_CONFIRMATION,
                    dot: "bg-[#06b6d4]",
                  }]
                : []),
              { id: "COMPLETED", label: "Completed", count: lifecycleCounts.COMPLETED, dot: "bg-emerald-500" },
            ].map((tab) => {
              const isSelected = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    isSelected
                      ? "border border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 font-semibold shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-950 hover:border-slate-300 dark:border-white/5 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-white/15"
                  }`}
                >
                  {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                  <span>{tab.label}</span>
                  <span className="tabular-nums opacity-80">({tab.count})</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Search, Trade & Priority Filter */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-white/5">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search work orders"
                aria-label="Search work orders"
                className="w-full text-xs pl-9 pr-8 py-2 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-100 p-0.5"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by trade category"
                className="text-xs py-2 pl-3 pr-8 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 appearance-none"
              >
                <option value="ALL">All trades</option>
                {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* ── Grouped Execution Board ──────────────────────────────────────── */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-300 dark:border-white/10 shadow-md">
            Loading work orders...
          </div>
        ) : workOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-300 dark:border-white/10 shadow-md">
            No work orders match the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              ...(selectedStatus === "ALL" || selectedStatus === "UNASSIGNED"
                ? (lifecycleCounts.UNASSIGNED > 0 || selectedStatus === "UNASSIGNED"
                  ? [{
                      statusKey: "UNASSIGNED",
                      title: "Unassigned",
                      dot: "bg-[#b8287a]",
                      badge: "bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30",
                      orders: workOrders.filter((w) => w.status === "UNASSIGNED"),
                    }]
                  : [])
                : []),
              ...(selectedStatus === "ALL" || selectedStatus === "ASSIGNED"
                ? [{
                    statusKey: "ASSIGNED",
                    title: "Assigned",
                    dot: "bg-indigo-500",
                    badge: "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300",
                    orders: workOrders.filter((w) => w.status === "ASSIGNED" || w.status === "TRAVELLING" || w.status === "ON_SITE"),
                  }]
                : []),
              ...(selectedStatus === "ALL" || selectedStatus === "WORK_COMPLETED_AWAITING_CONFIRMATION"
                ? [{
                    statusKey: "WORK_COMPLETED_AWAITING_CONFIRMATION",
                    title: "Reported Complete",
                    dot: "bg-[#06b6d4]",
                    badge: "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4]",
                    orders: workOrders.filter((w) => w.status === "WORK_COMPLETED_AWAITING_CONFIRMATION"),
                  }]
                : []),
              ...(selectedStatus === "ALL" || selectedStatus === "COMPLETED"
                ? [{
                    statusKey: "COMPLETED",
                    title: "Completed",
                    dot: "bg-emerald-500",
                    badge: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300",
                    orders: workOrders.filter((w) => w.status === "COMPLETED"),
                  }]
                : []),
            ].map((column) => (
              <div
                key={column.statusKey}
                className="bg-slate-200/60 border border-slate-300 dark:bg-zinc-900/50 dark:border-white/5 rounded-xl p-3 flex flex-col space-y-3 min-h-[160px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${column.dot}`} />
                    <h3 className="text-xs font-bold text-slate-950 dark:text-zinc-50">
                      {column.title}
                    </h3>
                  </div>
                  <span className="tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-white/10 shadow-xs">
                    {column.orders.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 flex-1">
                  {column.orders.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-[11px] text-slate-500 dark:text-zinc-400 italic">
                      No orders
                    </div>
                  ) : (
                    column.orders.map((wo) => (
                      <div
                        key={wo.id}
                        onClick={(e) => handleOpenInspect(wo, e as any)}
                        className="p-3.5 rounded-xl bg-white border border-slate-300 shadow-sm dark:bg-zinc-900 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 transition-all cursor-pointer space-y-2 group"
                      >
                        {/* Top: ID & Status */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-xs text-slate-950 dark:text-zinc-100">
                              {wo.id}
                            </span>
                            {wo.status === "TRAVELLING" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30 shrink-0">
                                In Transit
                              </span>
                            )}
                            {wo.status === "ON_SITE" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40 shrink-0">
                                On Site
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono shrink-0">
                            {renderArrivalSla(wo)}
                          </span>
                        </div>

                        {/* Customer & Asset */}
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-slate-950 dark:text-zinc-50 truncate" title={wo.customerName}>
                            {wo.customerName}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-zinc-400 truncate" title={wo.assetName}>
                            {wo.assetName}
                          </div>
                        </div>

                        {/* Bottom: Assigned Technician */}
                        <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                          {wo.assignedTechnicianName ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-900 dark:text-zinc-100">
                                {wo.assignedTechnicianName.substring(0, 2).toUpperCase()}
                              </span>
                              <span className="text-[11px] text-slate-700 dark:text-zinc-300 font-medium truncate" title={wo.assignedTechnicianName}>
                                {wo.assignedTechnicianName}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleOpenAssign(wo, e)}
                              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              + Assign technician
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleOpenInspect(wo, e as any)}
                            className="text-[10px] font-semibold text-slate-600 group-hover:text-slate-950 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors whitespace-nowrap"
                          >
                            Details →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Slide-Over Operations Inspection Drawer ─────────────────────── */}
      {inspectOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={inspectModalHeadingId}
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-lg h-full bg-white dark:bg-zinc-900 border-l border-slate-300 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Order Details
                </span>
                <h3 id={inspectModalHeadingId} className="text-sm font-bold text-slate-950 dark:text-zinc-50">
                  {inspectOrder.id} — {inspectOrder.customerName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(inspectOrder.status)}
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-4 space-y-3.5 flex-1 text-xs">
              {/* Operational Lifecycle Stepper */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                  Lifecycle status
                </div>
                <div className="grid grid-cols-5 gap-1 text-center text-[9px]">
                  <div
                    className={`p-1 rounded-lg border ${
                      inspectOrder.status === "UNASSIGNED"
                        ? "border-[#b8287a] bg-rose-50 dark:bg-[#b8287a]/20 text-[#8a1858] dark:text-[#e879b9] font-bold"
                        : "border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-500"
                    }`}
                  >
                    1. Unassigned
                  </div>
                  <div
                    className={`p-1 rounded-lg border ${
                      inspectOrder.status === "ASSIGNED"
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                        : "border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-500"
                    }`}
                  >
                    2. Assigned
                  </div>
                  <div
                    className={`p-1 rounded-lg border ${
                      inspectOrder.status === "TRAVELLING" || inspectOrder.status === "ON_SITE"
                        ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-[#06b6d4] font-bold"
                        : "border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-500"
                    }`}
                  >
                    3. On Site
                  </div>
                  <div
                    className={`p-1 rounded-lg border ${
                      inspectOrder.status === "WORK_COMPLETED_AWAITING_CONFIRMATION"
                        ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-[#06b6d4] font-bold"
                        : "border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-500"
                    }`}
                  >
                    4. Sign-Off
                  </div>
                  <div
                    className={`p-1 rounded-lg border ${
                      inspectOrder.status === "COMPLETED"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold"
                        : "border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-500"
                    }`}
                  >
                    5. Completed
                  </div>
                </div>
              </div>

              {/* Facility & Equipment Information */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Facility</span>
                    <span className="font-semibold text-slate-950 dark:text-zinc-50">{inspectOrder.facilityAddress}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Trade Category</span>
                    <span className="font-semibold text-slate-950 dark:text-zinc-50">{inspectOrder.category}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Equipment Asset</span>
                    <span className="font-semibold text-slate-950 dark:text-zinc-50">{inspectOrder.assetName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Arrival Target SLA</span>
                    <span className="font-semibold text-slate-950 dark:text-zinc-50">
                      {inspectOrder.slaDeadline ? (
                        <span className="tabular-nums">
                          {new Date(inspectOrder.slaDeadline).toLocaleTimeString()} ({inspectOrder.coveragePlan === "247-priority" ? "20m Rapid" : "40m Standard"})
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-zinc-400">
                          {inspectOrder.coveragePlan === "8hr" ? "Plan A (08:00–17:00, No Arrival SLA)" : "Plan D (Negotiated)"}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Problem Summary</span>
                  <p className="font-medium text-slate-950 dark:text-zinc-100 mt-0.5">{inspectOrder.problemSummary}</p>
                </div>

                {inspectOrder.workNotes && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Dispatch Notes</span>
                    <p className="text-[11px] text-slate-800 dark:text-zinc-200 mt-0.5">{inspectOrder.workNotes}</p>
                  </div>
                )}

                {inspectOrder.completionReport && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20">
                    <span className="text-[10px] font-bold text-cyan-800 dark:text-cyan-300 block">
                      Technician Completion Report
                    </span>
                    <p className="text-[11px] text-slate-900 dark:text-zinc-50 mt-0.5 font-medium">
                      {inspectOrder.completionReport.notes}
                    </p>
                    {inspectOrder.completionReport.materialsUsed && (
                      <p className="text-[10px] text-slate-600 dark:text-zinc-400 mt-0.5">
                        Materials: {inspectOrder.completionReport.materialsUsed}
                      </p>
                    )}
                    <div className="text-[10px] tabular-nums text-cyan-700 dark:text-cyan-400 mt-1 font-semibold">
                      Submitted: {new Date(inspectOrder.completionReport.completedAt).toLocaleTimeString()} by {inspectOrder.completionReport.technicianName}
                    </div>
                  </div>
                )}
              </div>

              {/* Assigned Technician Profile Strip */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-950 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                  Dispatched Technician
                </span>
                {inspectOrder.assignedTechnicianName ? (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-300 dark:border-emerald-500/30">
                        {inspectOrder.assignedTechnicianName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-950 dark:text-zinc-50">
                          {inspectOrder.assignedTechnicianName}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-zinc-400">Verified Field Lead</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                      Dispatched
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-rose-600 dark:text-[#e879b9] font-semibold text-xs">
                      No technician currently assigned
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        const wo = inspectOrder;
                        handleCloseModals();
                        handleOpenAssign(wo, e);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs active:scale-95 transition-all"
                    >
                      Assign Now
                    </button>
                  </div>
                )}
              </div>

              {/* Linear Status Transition Controls */}
              {inspectOrder.status !== "COMPLETED" && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 space-y-2">
                  <div className="text-xs font-bold text-slate-950 dark:text-zinc-50">Advance Status:</div>
                  <div className="flex flex-wrap gap-2">
                    {VALID_WORK_ORDER_TRANSITIONS[inspectOrder.status]?.includes("TRAVELLING") && (
                      <button
                        type="button"
                        onClick={() => handleTransitionStatus("TRAVELLING")}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-700 text-white hover:bg-cyan-800 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isUpdatingStatus ? "Updating..." : "Mark In Transit (TRAVELLING)"}
                      </button>
                    )}
                    {VALID_WORK_ORDER_TRANSITIONS[inspectOrder.status]?.includes("ON_SITE") && (
                      <button
                        type="button"
                        onClick={() => handleTransitionStatus("ON_SITE")}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isUpdatingStatus ? "Updating..." : "Mark Arrived (ON_SITE)"}
                      </button>
                    )}
                    {VALID_WORK_ORDER_TRANSITIONS[inspectOrder.status]?.includes("COMPLETED") && (
                      <button
                        type="button"
                        onClick={() => handleTransitionStatus("COMPLETED")}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isUpdatingStatus ? "Updating..." : "Mark Sign-off Complete (COMPLETED)"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
              <div>
                {inspectOrder.status === "UNASSIGNED" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const wo = inspectOrder;
                      handleCloseModals();
                      handleOpenAssign(wo, e);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
                  >
                    Match & Assign Technician
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseModals}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50"
              >
                Close Drawer
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
          <div className="w-full max-w-2xl rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Advisory Matching Engine (SDP-4 Hard Rules)
                </span>
                <h3 id={assignModalHeadingId} className="text-base font-bold text-slate-950 dark:text-zinc-50">
                  Assign Technician to {assignOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModals}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Target Breakdown Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 text-xs space-y-1">
              <div>
                <strong className="text-slate-950 dark:text-zinc-100">Customer:</strong> {assignOrder.customerName}
              </div>
              <div>
                <strong className="text-slate-950 dark:text-zinc-100">Facility:</strong> {assignOrder.facilityAddress}
              </div>
              <div>
                <strong className="text-slate-950 dark:text-zinc-100">Required Trade:</strong> {assignOrder.category}
              </div>
              <div>
                <strong className="text-slate-950 dark:text-zinc-100">Equipment & Problem:</strong> {assignOrder.assetName} —{" "}
                {assignOrder.problemSummary}
              </div>
            </div>

            {assignSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-center font-bold text-sm">
                ✓ {assignSuccess}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  <span>Eligible Candidates (Ranked by Arithmetic Score)</span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400">Human Confirmation Required</span>
                </div>

                {isLoadingMatches ? (
                  <div className="py-8 text-center text-xs text-slate-600 dark:text-zinc-400">
                    Evaluating candidate passports and branch locations...
                  </div>
                ) : matchingTechs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-rose-600 dark:text-rose-400 font-medium">
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
                            ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                            : "border-slate-300 bg-white hover:border-slate-400 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20"
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
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                                    : "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40"
                                }`}
                              >
                                {candidate.recommendationTier === "TIER_1_PREFERRED" ? "Tier 1: Preferred" : "Tier 2: Eligible"}
                              </span>
                              <span className="text-[11px] text-slate-600 dark:text-zinc-400 tabular-nums">· ETA ~{candidate.etaMinutes}m</span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-zinc-400 flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span>{candidate.designation}</span>
                              <span>•</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">✓ Active License</span>
                              <span>•</span>
                              <span>{candidate.eligibilityFactors?.standbyAvailable ? "✓ Standby" : `${candidate.activeJobCount} Active Job(s)`}</span>
                              {candidate.eligibilityFactors?.branchMatched && (
                                <>
                                  <span>•</span>
                                  <span className="text-cyan-700 dark:text-cyan-400 font-semibold">✓ Branch Match</span>
                                </>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-zinc-300 italic pt-0.5">
                              "{candidate.explanation}"
                            </p>
                          </div>

                          <div className="shrink-0">
                            {selectedTech?.technicianId === candidate.technicianId ? (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <CheckIcon size={12} />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400" />
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
                    <label htmlFor="assign-dispatch-notes" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      Dispatch Instructions (Optional):
                    </label>
                    <textarea
                      id="assign-dispatch-notes"
                      rows={2}
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      placeholder="e.g. Bring diagnostic fiber loopback tester and OTDR equipment."
                      className="w-full text-xs p-2.5 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModals}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50"
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
