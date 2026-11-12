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
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            New
          </span>
        );
      case "REVIEWING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Reviewing
          </span>
        );
      case "CONVERTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Converted
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
      subtitle="Inbound Breakdown Intake & Triage Workspace"
      action={
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              errorMessage && requests.length === 0
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
                errorMessage && requests.length === 0
                  ? "bg-rose-500"
                  : isStale
                  ? "bg-amber-500"
                  : isOffline
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
            {errorMessage && requests.length === 0
              ? "Connection Error"
              : isStale
              ? "Stale Data"
              : isOffline
              ? "Local preview"
              : "Live API"}
          </span>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh requests"
            title="Refresh requests"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCwIcon size={15} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
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

        {/* ── Priority Distribution Bar ──────────────────────────────────── */}
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {requests.length} Active Breakdown Inquiries
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">· Intake Triage</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { key: "URGENT", label: "Urgent", count: priorityCounts.URGENT, badgeClass: "bg-rose-500 text-white dark:bg-rose-600" },
              { key: "HIGH", label: "High", count: priorityCounts.HIGH, badgeClass: "bg-amber-500 text-white dark:bg-amber-600" },
              { key: "MEDIUM", label: "Medium", count: priorityCounts.MEDIUM, badgeClass: "bg-sky-500 text-white dark:bg-sky-600" },
              { key: "LOW", label: "Low", count: priorityCounts.LOW, badgeClass: "bg-slate-500 text-white dark:bg-slate-600" },
            ].map((p) => {
              const isSelected = selectedPriority === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPriority(selectedPriority === p.key ? "ALL" : p.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    isSelected
                      ? "border border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                      : "border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${p.badgeClass}`} />
                  <span className="font-medium">{p.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]">
                    {p.count}
                  </span>
                </button>
              );
            })}
            {selectedPriority !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedPriority("ALL")}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline px-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
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
              placeholder="Search by ID, customer, asset, problem..."
              aria-label="Search service requests"
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

          {/* Trade Category Filter */}
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

          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] p-0.5 text-xs">
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
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  selectedStatus === tab.id
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── High-Density Triage Workspace Table ─────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[940px] text-left text-xs border-collapse table-fixed">
              <colgroup>
                <col className="w-[80px]" />
                <col className="w-[190px]" />
                <col className="w-[180px]" />
                <col className="w-[180px]" />
                <col className="w-[85px]" />
                <col className="w-[95px]" />
                <col className="w-[80px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Customer & Facility</th>
                  <th className="py-2.5 px-3">Trade & Asset</th>
                  <th className="py-2.5 px-3">Problem Summary</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      Loading service requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No service requests match filters.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedDetailRequest(req)}
                      className="hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-xs text-[var(--text-primary)] whitespace-nowrap truncate">
                        {req.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[var(--text-primary)] truncate text-xs" title={req.customerName}>
                          {req.customerName}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate" title={req.facilityAddress}>
                          {req.facilityAddress}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[var(--text-primary)] truncate text-xs" title={req.assetName}>
                          {req.assetName}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate" title={req.category}>
                          {req.category}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div
                          className="font-medium text-[var(--text-secondary)] truncate text-xs"
                          title={req.problemTitle}
                        >
                          {req.problemTitle}
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
                      <td className="py-2.5 px-3 text-[11px] text-[var(--text-muted)] font-mono whitespace-nowrap">
                        {new Date(req.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1" onClick={(e) => e.stopPropagation()}>
                        {req.status === "CONVERTED" ? (
                          <Link
                            to="/dispatcher/work-orders"
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                          >
                            Order
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenTriage(req, e)}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
                          >
                            Triage
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedDetailRequest(req)}
                          title="Inspect Request"
                          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all inline-flex items-center"
                        >
                          <EyeIcon size={13} />
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

      {/* ── Slide-Over Request Detail Drawer ────────────────────────────── */}
      {selectedDetailRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={drawerHeadingId}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border)] shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Request Detail Drawer
                </span>
                <h3 id={drawerHeadingId} className="text-sm font-bold text-[var(--text-primary)]">
                  {selectedDetailRequest.id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedDetailRequest.status)}
                <button
                  type="button"
                  onClick={() => setSelectedDetailRequest(null)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-4 space-y-4 flex-1 text-xs">
              {/* Facility & Customer */}
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Facility & Contract
                </span>
                <div className="font-semibold text-sm text-[var(--text-primary)]">
                  {selectedDetailRequest.customerName}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {selectedDetailRequest.facilityAddress}
                </div>
                <div className="pt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-muted)]">Coverage Plan:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {getPlanLabel(selectedDetailRequest.coveragePlan)}
                  </span>
                </div>
              </div>

              {/* Asset & Trade */}
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Equipment Inventory
                </span>
                <div className="font-semibold text-[var(--text-primary)]">
                  {selectedDetailRequest.assetName}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Category: {selectedDetailRequest.category}
                </div>
              </div>

              {/* Reported Problem */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Reported Incident
                </span>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-2">
                  <div className="font-semibold text-[var(--text-primary)]">
                    {selectedDetailRequest.problemTitle}
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {selectedDetailRequest.problemDescription}
                  </p>
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Priority: <strong className="text-[var(--text-primary)]">{selectedDetailRequest.priority}</strong></span>
                    <span>Received: {new Date(selectedDetailRequest.submittedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedDetailRequest(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
              {selectedDetailRequest.status === "CONVERTED" ? (
                <Link
                  to="/dispatcher/work-orders"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  View Dispatched Work Order
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
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Dispatcher Intake & Work Order Generation
                </span>
                <h3 id={modalHeadingId} className="text-base font-bold text-[var(--text-primary)]">
                  Triage Breakdown: {triageRequest.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Breakdown Snapshot Card */}
            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)]">{triageRequest.customerName}</span>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {getPlanLabel(triageRequest.coveragePlan)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">{triageRequest.facilityAddress}</div>
              <div className="pt-1 border-t border-[var(--border)]">
                <strong className="text-[var(--text-primary)]">Asset:</strong> {triageRequest.assetName} (
                {triageRequest.category})
              </div>
              <div>
                <strong className="text-[var(--text-primary)]">Problem:</strong> {triageRequest.problemTitle}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-0.5">
                "{triageRequest.problemDescription}"
              </p>
            </div>

            {conversionSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-center font-bold text-sm">
                ✓ {conversionSuccess}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Form row: Priority & Arrival SLA target */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="triage-priority" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Assigned Priority:
                    </label>
                    <select
                      id="triage-priority"
                      value={targetPriority}
                      onChange={(e) => setTargetPriority(e.target.value as PriorityLevel)}
                      className="w-full text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="URGENT">Urgent (Plan C 20m SLA)</option>
                      <option value="HIGH">High (Plan B 40m SLA)</option>
                      <option value="MEDIUM">Medium (Standard)</option>
                      <option value="LOW">Low (Routine)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="triage-sla" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Arrival SLA Target:
                    </label>
                    {triageRequest.coveragePlan === "8hr" ? (
                      <div className="text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
                        No Arrival SLA (Window: 08:00–17:00)
                      </div>
                    ) : triageRequest.coveragePlan === "custom" ? (
                      <div className="text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
                        Custom Terms (Negotiated)
                      </div>
                    ) : (
                      <select
                        id="triage-sla"
                        value={slaTargetMinutes ?? 40}
                        onChange={(e) => setSlaTargetMinutes(Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value={20}>20 Minutes (24/7 Priority Plan C)</option>
                        <option value={40}>40 Minutes (24/7 Standard Plan B)</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Dispatcher Notes */}
                <div>
                  <label htmlFor="triage-notes" className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Work Order Dispatch Notes (Optional):
                  </label>
                  <textarea
                    id="triage-notes"
                    rows={2}
                    value={triageNotes}
                    onChange={(e) => setTriageNotes(e.target.value)}
                    placeholder="e.g. Advised customer to shut off main isolator; emergency crew authorized."
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
