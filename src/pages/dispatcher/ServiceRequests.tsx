// Service Requests Management Ledger
// Strictly adheres to VoltOps design contract: "Show information, not explanations."
// Fast triage and conversion of inbound commercial breakdowns into dispatched Work Orders.

import { FC, useState, useEffect, useCallback, useMemo, useId, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { ServiceRequest, ServiceCategory, PriorityLevel, RequestStatus } from "../../types";
import { CANONICAL_SERVICE_CATEGORIES } from "../../types";
import { dispatcherService } from "../../services/dispatcherService";
import {
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  CheckIcon,
  EyeIcon,
} from "../../components/Icons";

export const ServiceRequests: FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Slide-over Detail Drawer State
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<ServiceRequest | null>(null);

  // Triage / Convert Modal State
  const [triageRequest, setTriageRequest] = useState<ServiceRequest | null>(null);
  const [targetPriority, setTargetPriority] = useState<PriorityLevel>("HIGH");
  const [slaTargetMinutes, setSlaTargetMinutes] = useState<number | null>(40);
  const [triageNotes, setTriageNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const modalHeadingId = useId();
  const drawerHeadingId = useId();
  const lastFocusedTriggerRef = useRef<HTMLButtonElement | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await dispatcherService.getServiceRequests({
        search: searchQuery || undefined,
        category: selectedCategory !== "ALL" ? (selectedCategory as ServiceCategory) : undefined,
        priority: selectedPriority !== "ALL" ? (selectedPriority as PriorityLevel) : undefined,
        status: selectedStatus !== "ALL" ? (selectedStatus as RequestStatus) : undefined,
      });

      setRequests(res.data);
      setIsOffline(res.isOffline);
      setErrorMessage(null);
      setIsStale(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retrieve service requests from server");
      setIsStale(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedCategory, selectedPriority, selectedStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRequests();
  };

  const handleOpenTriage = (req: ServiceRequest, e: React.MouseEvent<HTMLButtonElement>) => {
    lastFocusedTriggerRef.current = e.currentTarget;
    setTriageRequest(req);
    setTargetPriority(req.priority);

    // Enforce canonical SLA rules based on contract coverage plan
    if (req.coveragePlan === "8hr" || req.coveragePlan === "custom") {
      setSlaTargetMinutes(null); // No physical arrival SLA
    } else if (req.coveragePlan === "247-priority") {
      setSlaTargetMinutes(20);
    } else {
      setSlaTargetMinutes(40);
    }

    setTriageNotes("");
    setConversionSuccess(null);
  };

  const handleCloseModal = () => {
    setTriageRequest(null);
    setConversionSuccess(null);
    if (lastFocusedTriggerRef.current) {
      lastFocusedTriggerRef.current.focus();
    }
  };

  const handleExecuteConversion = async () => {
    if (!triageRequest) return;
    setIsSubmitting(true);

    try {
      const deadline =
        slaTargetMinutes !== null
          ? new Date(Date.now() + slaTargetMinutes * 60 * 1000).toISOString()
          : null;

      const res = await dispatcherService.convertRequestToWorkOrder({
        requestId: triageRequest.id,
        priority: targetPriority,
        coveragePlan: triageRequest.coveragePlan,
        slaDeadline: deadline,
        notes: triageNotes.trim() || undefined,
      });

      if (res.success) {
        setConversionSuccess(
          `[Local Demo] Created Work Order ${res.data.id} (Simulated locally; will not persist to server).`
        );
        setTimeout(() => {
          handleCloseModal();
          fetchRequests();
          navigate("/dispatcher/work-orders");
        }, 1200);
      }
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
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
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-[#8a1858] border border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8287a] animate-pulse" />
            New
          </span>
        );
      case "REVIEWING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
            Reviewing
          </span>
        );
      case "CONVERTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Converted
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

  const getPlanLabel = (plan?: string) => {
    switch (plan) {
      case "8hr":
        return "Plan A (8-Hr Window)";
      case "247-standard":
        return "Plan B (24/7 Standard)";
      case "247-priority":
        return "Plan C (24/7 Priority)";
      case "custom":
        return "Plan D (Custom)";
      default:
        return "Commercial Plan";
    }
  };

  const priorityCounts = useMemo(() => {
    return {
      URGENT: requests.filter((r) => r.priority === "URGENT").length,
      HIGH: requests.filter((r) => r.priority === "HIGH").length,
      MEDIUM: requests.filter((r) => r.priority === "MEDIUM").length,
      LOW: requests.filter((r) => r.priority === "LOW").length,
    };
  }, [requests]);

  return (
    <Layout
      title="Service Requests"
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
            aria-label="Refresh requests"
            title="Refresh requests"
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

        {/* ── Elevated Filter Toolbar ────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-md dark:bg-zinc-900 dark:border-white/5 dark:border-l-white/5 dark:shadow-none space-y-3">
          {/* Row 1: Priority Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mr-1">Priority:</span>
            <button
              type="button"
              onClick={() => setSelectedPriority("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedPriority === "ALL"
                  ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 border border-slate-200 dark:border-white/5"
              }`}
            >
              All <span className="tabular-nums ml-1 opacity-80">({requests.length})</span>
            </button>
            {[
              { key: "URGENT", label: "Urgent", count: priorityCounts.URGENT, dot: "bg-[#b8287a]" },
              { key: "HIGH", label: "High", count: priorityCounts.HIGH, dot: "bg-[#b8287a]" },
              { key: "MEDIUM", label: "Medium", count: priorityCounts.MEDIUM, dot: "bg-[#06b6d4]" },
              { key: "LOW", label: "Low", count: priorityCounts.LOW, dot: "bg-slate-400" },
            ].map((p) => {
              const isSelected = selectedPriority === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPriority(selectedPriority === p.key ? "ALL" : (p.key as PriorityLevel))}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    isSelected
                      ? "border border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 font-semibold shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-950 hover:border-slate-300 dark:border-white/5 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-white/15"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                  <span>{p.label}</span>
                  <span className="tabular-nums opacity-80">({p.count})</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Search, Category & Status Tabs */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-white/5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requests"
                aria-label="Search service requests"
                className="w-full text-xs pl-9 pr-8 py-2 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-0.5"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            {/* Trade Category Filter */}
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

            {/* Status Tabs */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-zinc-950 p-0.5 text-xs">
              {[
                { id: "ALL", label: "All" },
                { id: "NEW", label: "New" },
                { id: "REVIEWING", label: "Reviewing" },
                { id: "CONVERTED", label: "Converted" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    selectedStatus === tab.id
                      ? "bg-white text-slate-950 dark:bg-zinc-800 dark:text-zinc-50 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Clean Request List Table ───────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-500 rounded-xl shadow-md overflow-hidden dark:bg-zinc-900 dark:border-white/5 dark:border-t-white/5 dark:shadow-none">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[780px] text-left text-xs border-collapse table-fixed">
              <colgroup>
                <col className="w-[85px]" />
                <col className="w-[180px]" />
                <col className="w-[230px]" />
                <col className="w-[90px]" />
                <col className="w-[95px]" />
                <col className="w-[75px]" />
                <col className="w-[85px]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-200/70 border-b-2 border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider dark:bg-zinc-950/60 dark:border-white/5 dark:text-zinc-400">
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Asset / Trade</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/80 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-600 dark:text-zinc-400">
                      Loading service requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-600 dark:text-zinc-400">
                      No service requests match filters.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedDetailRequest(req)}
                      className="odd:bg-white even:bg-slate-50/90 hover:bg-emerald-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-xs text-slate-950 dark:text-zinc-100 whitespace-nowrap truncate">
                        {req.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-950 dark:text-zinc-100 truncate text-xs" title={req.customerName}>
                          {req.customerName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-950 dark:text-zinc-100 truncate text-xs" title={req.assetName}>
                          {req.assetName}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-zinc-400 truncate" title={req.category}>
                          {req.category}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getPriorityBadge(
                            req.priority
                          )}`}
                        >
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                        {new Date(req.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {req.status === "CONVERTED" ? (
                          <Link
                            to="/dispatcher/work-orders"
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
                          >
                            Order
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenTriage(req, e)}
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
                          >
                            Triage
                          </button>
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

      {/* ── Slide-Over Request Detail Drawer ────────────────────────────── */}
      {selectedDetailRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={drawerHeadingId}
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-md h-full bg-white dark:bg-zinc-900 border-l border-slate-300 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Request details
                </span>
                <h3 id={drawerHeadingId} className="text-sm font-bold text-slate-950 dark:text-zinc-50">
                  {selectedDetailRequest.id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedDetailRequest.status)}
                <button
                  type="button"
                  onClick={() => setSelectedDetailRequest(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-4 space-y-4 flex-1 text-xs">
              {/* Facility & Customer */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Facility & contract
                </span>
                <div className="font-bold text-sm text-slate-950 dark:text-zinc-50">
                  {selectedDetailRequest.customerName}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-zinc-400">
                  {selectedDetailRequest.facilityAddress}
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-200 dark:border-white/5">
                  <span className="text-slate-600 dark:text-zinc-400">Coverage Plan:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {getPlanLabel(selectedDetailRequest.coveragePlan)}
                  </span>
                </div>
              </div>

              {/* Asset & Trade */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Equipment inventory
                </span>
                <div className="font-bold text-slate-950 dark:text-zinc-50">
                  {selectedDetailRequest.assetName}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-zinc-400">
                  Category: {selectedDetailRequest.category}
                </div>
              </div>

              {/* Reported Problem */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Reported incident
                </span>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 space-y-2">
                  <div className="font-bold text-slate-950 dark:text-zinc-50">
                    {selectedDetailRequest.problemTitle}
                  </div>
                  <p className="text-[12px] text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedDetailRequest.problemDescription}
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400">
                    <span>Priority: <strong className="text-slate-950 dark:text-zinc-100">{selectedDetailRequest.priority}</strong></span>
                    <span>Received: {new Date(selectedDetailRequest.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedDetailRequest(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50"
              >
                Close
              </button>
              {selectedDetailRequest.status === "CONVERTED" ? (
                <Link
                  to="/dispatcher/work-orders"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  View Work Order
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    const req = selectedDetailRequest;
                    setSelectedDetailRequest(null);
                    handleOpenTriage(req, e as any);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
                >
                  Open Triage & Dispatch
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Triage & Conversion Modal ────────────────────────────────────── */}
      {triageRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalHeadingId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Dispatcher intake & work order generation
                </span>
                <h3 id={modalHeadingId} className="text-base font-bold text-slate-950 dark:text-zinc-50">
                  Triage breakdown: {triageRequest.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Breakdown Snapshot Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-950 dark:text-zinc-50">{triageRequest.customerName}</span>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {getPlanLabel(triageRequest.coveragePlan)}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-zinc-400">{triageRequest.facilityAddress}</div>
              <div className="pt-1.5 border-t border-slate-200 dark:border-white/5">
                <strong className="text-slate-950 dark:text-zinc-100">Asset:</strong> {triageRequest.assetName} (
                {triageRequest.category})
              </div>
              <div>
                <strong className="text-slate-950 dark:text-zinc-100">Problem:</strong> {triageRequest.problemTitle}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 italic pt-0.5">
                "{triageRequest.problemDescription}"
              </p>
            </div>

            {conversionSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-center font-bold text-sm">
                ✓ {conversionSuccess}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Form row: Priority & Arrival SLA target */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="triage-priority" className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                      Assigned Priority:
                    </label>
                    <select
                      id="triage-priority"
                      value={targetPriority}
                      onChange={(e) => setTargetPriority(e.target.value as PriorityLevel)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 focus:bg-white focus:border-emerald-600 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50"
                    >
                      <option value="URGENT">Urgent (Plan C 20m SLA)</option>
                      <option value="HIGH">High (Plan B 40m SLA)</option>
                      <option value="MEDIUM">Medium (Standard)</option>
                      <option value="LOW">Low (Routine)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="triage-sla" className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                      Arrival SLA Target:
                    </label>
                    {triageRequest.coveragePlan === "8hr" ? (
                      <div className="text-xs p-2 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400">
                        No Arrival SLA (Window: 08:00–17:00)
                      </div>
                    ) : triageRequest.coveragePlan === "custom" ? (
                      <div className="text-xs p-2 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400">
                        Custom Terms (Negotiated)
                      </div>
                    ) : (
                      <select
                        id="triage-sla"
                        value={slaTargetMinutes ?? 40}
                        onChange={(e) => setSlaTargetMinutes(Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 focus:bg-white focus:border-emerald-600 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50"
                      >
                        <option value={20}>20 Minutes (24/7 Priority Plan C)</option>
                        <option value={40}>40 Minutes (24/7 Standard Plan B)</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Dispatcher Notes */}
                <div>
                  <label htmlFor="triage-notes" className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 mb-1">
                    Work Order Dispatch Notes (Optional):
                  </label>
                  <textarea
                    id="triage-notes"
                    rows={2}
                    value={triageNotes}
                    onChange={(e) => setTriageNotes(e.target.value)}
                    placeholder="e.g. Advised customer to shut off main isolator; emergency crew authorized."
                    className="w-full text-xs p-2.5 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50"
              >
                Cancel
              </button>
              {!conversionSuccess && (
                <button
                  type="button"
                  onClick={handleExecuteConversion}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Converting..." : "Generate Work Order & Dispatch"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
