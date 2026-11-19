import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "../../components/Layout";
import {
  SystemAuditEvent,
  AuditEventCategory,
  AuditSeverity,
} from "../../types/admin";
import { AdminService } from "../../services/adminService";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  FileTextIcon,
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  EyeIcon,
} from "../../components/Icons";

export function AuditLog() {
  const [events, setEvents] = useState<SystemAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | AuditEventCategory>("ALL");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | AuditSeverity>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 6;

  // Detail Modal & Interaction State
  const [selectedEvent, setSelectedEvent] = useState<SystemAuditEvent | null>(null);
  const [copiedEventId, setCopiedEventId] = useState(false);
  const lastFocusedTriggerRef = useRef<HTMLElement | null>(null);

  // Restore focus when inspection drawer closes
  useEffect(() => {
    if (!selectedEvent) {
      lastFocusedTriggerRef.current?.focus();
    }
  }, [selectedEvent]);

  // Fetch audit events via AdminService
  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    const result = await AdminService.getAuditLogs({
      page: currentPage,
      limit: pageSize,
      search: searchQuery.trim() || undefined,
      category: categoryFilter,
      severity: severityFilter,
    });

    if (result.success && result.data) {
      setEvents(result.data.data);
      setTotalPages(result.data.meta?.totalPages || 1);
      setTotalCount(result.data.meta?.total || result.data.data.length);
      setIsLiveConnected(result.isLive);
      if (result.error) {
        setApiError(result.error);
      }
    } else {
      setApiError(result.error || "Failed to load system audit logs.");
      setIsLiveConnected(false);
    }
    setIsLoading(false);
  }, [currentPage, searchQuery, categoryFilter, severityFilter]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Keyboard accessibility: Close inspection drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedEvent) {
        setSelectedEvent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEvent]);

  // Reset page to 1 when filters change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: "ALL" | AuditEventCategory) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  const handleSeverityChange = (sev: "ALL" | AuditSeverity) => {
    setSeverityFilter(sev);
    setCurrentPage(1);
  };

  // Export audit logs as downloadable JSON compliance package
  const handleExportJSON = () => {
    const exportPayload = {
      exportMetadata: {
        system: "VoltOps Field Service & Security Engine",
        exportTimestamp: new Date().toISOString(),
        totalExportedRecords: events.length,
        filterCriteria: {
          searchQuery: searchQuery || null,
          category: categoryFilter,
          severity: severityFilter,
        },
        complianceStandard: "VoltOps Immutable Audit Specification v2.1",
      },
      auditRecords: events,
    };

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `voltops-audit-ledger-${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedEventId(true);
    setTimeout(() => setCopiedEventId(false), 2000);
  };

  const getSeverityBadge = (sev: AuditSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return {
          container: "bg-rose-50 text-[#8a1858] border border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30 font-bold",
          dot: "bg-[#b8287a]",
        };
      case "WARNING":
        return {
          container: "bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30 font-bold",
          dot: "bg-[#06b6d4]",
        };
      case "INFO":
      default:
        return {
          container: "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold",
          dot: "bg-emerald-500",
        };
    }
  };

  const getCategoryBadge = (cat: AuditEventCategory) => {
    switch (cat) {
      case "SECURITY":
        return "bg-rose-50 text-[#8a1858] border border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30 font-bold";
      case "ROLE_CHANGE":
        return "bg-purple-50 text-purple-800 border border-purple-300 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20 font-bold";
      case "DISPATCH":
        return "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold";
      case "VERIFICATION":
        return "bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30 font-bold";
      case "ACCOUNT":
        return "bg-indigo-50 text-indigo-800 border border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20 font-bold";
      case "AUTH":
      default:
        return "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 font-bold";
    }
  };

  return (
    <Layout
      title="Audit Log"
      action={
        <button
          type="button"
          onClick={handleExportJSON}
          disabled={events.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all shadow-xs disabled:opacity-40 btn-press"
          title="Download compliance audit trail in JSON format"
        >
          <FileTextIcon size={14} className="text-slate-500 dark:text-zinc-400" />
          <span>Export JSON</span>
        </button>
      }
    >
      <div className="space-y-4 pb-24">
        {/* ── Sub-header / Status Toolbar ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 dark:text-zinc-400 font-medium tabular-nums">
              {totalCount} events recorded
            </span>
            <span className="text-xs text-slate-400 dark:text-zinc-600 hidden sm:inline">•</span>
            <span className="text-xs text-slate-700 dark:text-zinc-400 font-medium hidden sm:inline">
              Immutable ledger
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            )}

            <button
              type="button"
              onClick={loadAuditLogs}
              disabled={isLoading}
              title="Refresh audit ledger"
              aria-label="Refresh audit ledger"
              className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 disabled:opacity-40 transition-colors btn-press shadow-xs"
            >
              <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Integration Error / Offline Notice (Compact) ─────────────── */}
        {apiError && (
          <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-xs text-[#8a1858] dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-[#b8287a] shrink-0" />
              <span className="font-medium">{apiError}</span>
            </div>
            <button
              type="button"
              onClick={loadAuditLogs}
              className="text-xs font-bold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Compact Filter Bar ────────────────────────────────────────── */}
        <div className="p-3 rounded-xl border border-slate-300 border-l-4 border-l-emerald-500 bg-white shadow-md dark:bg-zinc-900 dark:border-white/5 dark:border-l-white/5 dark:shadow-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              aria-label="Search audit records"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by actor, action, target entity, or event ID..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 bg-slate-100/80 text-xs text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-100 p-0.5"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value as any)}
              aria-label="Filter by category"
              className="w-full md:w-auto px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100/80 text-xs text-slate-950 font-bold focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:focus:border-emerald-500 transition-all cursor-pointer outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="ROLE_CHANGE">Role Changes</option>
              <option value="VERIFICATION">Verifications</option>
              <option value="DISPATCH">Dispatch Events</option>
              <option value="SECURITY">Security</option>
              <option value="ACCOUNT">Account Provisioning</option>
              <option value="AUTH">Authentication</option>
            </select>
          </div>

          {/* Severity Segmented Tabs */}
          <div className="flex items-center gap-1 shrink-0 p-0.5 rounded-lg border border-slate-300 bg-slate-100/80 dark:border-white/10 dark:bg-zinc-950">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "INFO", label: "Info" },
                { id: "WARNING", label: "Warning" },
                { id: "CRITICAL", label: "Critical" },
              ] as const
            ).map(({ id, label }) => {
              const isActive = severityFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSeverityChange(id)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                    isActive
                      ? "bg-white border border-slate-300 text-slate-950 font-bold shadow-xs dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-50"
                      : "text-slate-700 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Audit Ledger Table ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-500 rounded-xl shadow-md overflow-hidden dark:bg-zinc-900 dark:border-white/5 dark:border-t-white/5 dark:shadow-none">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead className="bg-slate-200/70 border-b-2 border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider dark:bg-zinc-950/60 dark:border-white/5 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/80 dark:divide-white/5">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skel-audit-${idx}`} className="animate-pulse">
                      <td className="py-3 px-4">
                        <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded mb-1" />
                        <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded mb-1" />
                        <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-44 bg-slate-200 dark:bg-zinc-800 rounded mb-1" />
                        <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-5 w-16 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-6 w-14 bg-slate-200 dark:bg-zinc-800 rounded-md inline-block" />
                      </td>
                    </tr>
                  ))
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-600 dark:text-zinc-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-bold text-sm text-slate-950 dark:text-zinc-100">
                          No audit records found
                        </p>
                        <p className="text-xs">
                          Try adjusting search queries or category filters.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setCategoryFilter("ALL");
                            setSeverityFilter("ALL");
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1 rounded-lg border border-slate-300 bg-slate-100 text-xs font-bold text-slate-800 hover:text-slate-950 hover:bg-slate-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 transition-colors"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => {
                    const sevStyle = getSeverityBadge(evt.severity);

                    return (
                      <tr
                        key={evt.id}
                        className="odd:bg-white even:bg-slate-50/90 hover:bg-emerald-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        {/* Timestamp & ID */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50 whitespace-nowrap tabular-nums">
                            {evt.timestamp}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono font-medium">
                            {evt.id}
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50">
                            {evt.actorName}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono font-medium">
                            {evt.actorRole} · {evt.actorIp}
                          </div>
                        </td>

                        {/* Action Description & Target */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-100 max-w-sm truncate" title={evt.action}>
                            {evt.action}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-zinc-400 flex items-center gap-1 mt-0.5 font-medium">
                            <span>Target:</span>
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                              {evt.targetEntity}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${getCategoryBadge(
                              evt.category
                            )}`}
                          >
                            {evt.category.replace("_", " ")}
                          </span>
                        </td>

                        {/* Severity */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${sevStyle.container}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`} />
                            {evt.severity}
                          </span>
                        </td>

                        {/* Details Action */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              lastFocusedTriggerRef.current = e.currentTarget;
                              setSelectedEvent(evt);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-xs btn-press"
                          >
                            <EyeIcon size={13} className="text-slate-500 dark:text-zinc-400" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Compact Pagination Controls ───────────────────────────────── */}
          <div className="py-2.5 px-4 border-t border-slate-300 bg-slate-100/90 dark:border-white/5 dark:bg-zinc-950 flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-zinc-400 font-medium">
            <div>
              {totalCount > 0 ? (
                <>
                  Showing <span className="font-bold text-slate-950 dark:text-zinc-100 tabular-nums">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-bold text-slate-950 dark:text-zinc-100 tabular-nums">{totalCount}</span>
                </>
              ) : (
                "0 events"
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 disabled:opacity-40 hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 transition-all font-bold text-xs shadow-xs btn-press"
              >
                Previous
              </button>

              <span className="px-2 text-slate-700 dark:text-zinc-400 font-bold tabular-nums">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 disabled:opacity-40 hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 transition-all font-bold text-xs shadow-xs btn-press"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal: Event Inspection Drawer ─────────────────────────────── */}
        {selectedEvent && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-lg rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div>
                  <h3
                    id="audit-modal-title"
                    className="font-heading font-bold text-base text-slate-950 dark:text-zinc-50"
                  >
                    Audit Event Details
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-600 dark:text-zinc-400 font-mono font-medium">
                      {selectedEvent.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(selectedEvent.id)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-950 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
                    >
                      {copiedEventId ? "Copied" : "Copy ID"}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  aria-label="Close dialog"
                  className="p-1 rounded-md border border-slate-300 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {/* Metadata Grid */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-300 dark:bg-zinc-950 dark:border-white/10">
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Timestamp</span>
                    <span className="font-bold text-slate-950 dark:text-zinc-50 tabular-nums">
                      {selectedEvent.timestamp}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Severity</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border mt-0.5 ${
                        getSeverityBadge(selectedEvent.severity).container
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          getSeverityBadge(selectedEvent.severity).dot
                        }`}
                      />
                      {selectedEvent.severity}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 dark:bg-zinc-950 dark:border-white/10 space-y-2">
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Actor</span>
                    <span className="font-bold text-slate-950 dark:text-zinc-50">
                      {selectedEvent.actorName}
                    </span>
                    <span className="text-slate-600 dark:text-zinc-400 font-mono text-[11px] ml-1.5 font-medium">
                      ({selectedEvent.actorRole} · IP {selectedEvent.actorIp})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Action</span>
                    <span className="font-semibold text-slate-950 dark:text-zinc-100">
                      {selectedEvent.action}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Target Entity</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      {selectedEvent.targetEntity}
                    </span>
                    {selectedEvent.targetId && (
                      <span className="text-slate-600 dark:text-zinc-400 font-mono text-[11px] ml-1.5 font-medium">
                        (ID: {selectedEvent.targetId})
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 dark:bg-zinc-950 dark:border-white/10 space-y-1">
                  <span className="text-slate-600 dark:text-zinc-400 font-bold text-[11px] block">
                    Context Details
                  </span>
                  <p className="text-slate-800 dark:text-zinc-200 leading-relaxed font-medium">
                    {selectedEvent.details}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 transition-all btn-press shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
