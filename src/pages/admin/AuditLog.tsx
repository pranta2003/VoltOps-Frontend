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
          container: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
          dot: "bg-red-500",
        };
      case "WARNING":
        return {
          container: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
          dot: "bg-amber-500",
        };
      case "INFO":
      default:
        return {
          container: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
          dot: "bg-blue-500",
        };
    }
  };

  const getCategoryBadge = (cat: AuditEventCategory) => {
    switch (cat) {
      case "SECURITY":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "ROLE_CHANGE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
      case "DISPATCH":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "VERIFICATION":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "ACCOUNT":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20";
      case "AUTH":
      default:
        return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20";
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all shadow-sm disabled:opacity-40 btn-press"
          title="Download compliance audit trail in JSON format"
        >
          <FileTextIcon size={14} className="text-[var(--text-muted)]" />
          <span>Export JSON</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* ── Sub-header / Status Toolbar ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">
              {totalCount} events recorded
            </span>
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">•</span>
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
              Immutable ledger
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLiveConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Local preview
              </span>
            )}

            <button
              type="button"
              onClick={loadAuditLogs}
              disabled={isLoading}
              title="Refresh audit ledger"
              aria-label="Refresh audit ledger"
              className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-40 transition-colors btn-press"
            >
              <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Integration Error / Offline Notice (Compact) ─────────────── */}
        {apiError && (
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              type="button"
              onClick={loadAuditLogs}
              className="text-xs font-semibold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Compact Filter Bar ────────────────────────────────────────── */}
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              aria-label="Search audit records"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by actor, action, target entity, or event ID..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
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
              className="w-full md:w-auto px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#10b981] transition-all cursor-pointer font-medium"
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
          <div className="flex items-center gap-1 shrink-0 p-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]">
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Audit Ledger Table ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-2)] text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skel-audit-${idx}`} className="animate-pulse">
                      <td className="py-3 px-4">
                        <div className="h-4 w-28 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-16 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-20 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-44 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-24 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-5 w-20 bg-[var(--border)] rounded-full" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-5 w-16 bg-[var(--border)] rounded-full" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-6 w-14 bg-[var(--border)] rounded-md inline-block" />
                      </td>
                    </tr>
                  ))
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-semibold text-sm text-[var(--text-primary)]">
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
                          className="px-3 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs font-medium text-[var(--text-primary)] hover:border-[#10b981] transition-colors"
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
                        className="hover:bg-[var(--bg-surface-2)]/60 transition-colors"
                      >
                        {/* Timestamp & ID */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--text-primary)] whitespace-nowrap">
                            {evt.timestamp}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono">
                            {evt.id}
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--text-primary)]">
                            {evt.actorName}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono">
                            {evt.actorRole} · {evt.actorIp}
                          </div>
                        </td>

                        {/* Action Description & Target */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--text-primary)] max-w-sm truncate" title={evt.action}>
                            {evt.action}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            <span>Target:</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                              {evt.targetEntity}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadge(
                              evt.category
                            )}`}
                          >
                            {evt.category.replace("_", " ")}
                          </span>
                        </td>

                        {/* Severity */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${sevStyle.container}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`} />
                            {evt.severity}
                          </span>
                        </td>

                        {/* Details Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              lastFocusedTriggerRef.current = e.currentTarget;
                              setSelectedEvent(evt);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all btn-press"
                          >
                            <EyeIcon size={12} className="text-[var(--text-muted)]" />
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
          <div className="py-2.5 px-4 border-t border-[var(--border)] bg-[var(--bg-surface-2)] flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <div>
              {totalCount > 0 ? (
                <>
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
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
                className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 hover:border-[#10b981] transition-all font-medium text-xs btn-press"
              >
                Previous
              </button>

              <span className="px-2 text-[var(--text-muted)]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 hover:border-[#10b981] transition-all font-medium text-xs btn-press"
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
            <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h3
                    id="audit-modal-title"
                    className="font-heading font-semibold text-base text-[var(--text-primary)]"
                  >
                    Audit Event Details
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      {selectedEvent.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(selectedEvent.id)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[#10b981] transition-colors"
                    >
                      {copiedEventId ? "Copied" : "Copy ID"}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  aria-label="Close dialog"
                  className="p-1 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {/* Metadata Grid */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Timestamp</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {selectedEvent.timestamp}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Severity</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border mt-0.5 ${
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

                <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-2">
                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Actor</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {selectedEvent.actorName}
                    </span>
                    <span className="text-[var(--text-muted)] font-mono text-[11px] ml-1.5">
                      ({selectedEvent.actorRole} · IP {selectedEvent.actorIp})
                    </span>
                  </div>

                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Action</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {selectedEvent.action}
                    </span>
                  </div>

                  <div>
                    <span className="text-[var(--text-muted)] text-[11px] block">Target Entity</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {selectedEvent.targetEntity}
                    </span>
                    {selectedEvent.targetId && (
                      <span className="text-[var(--text-muted)] font-mono text-[11px] ml-1.5">
                        (ID: {selectedEvent.targetId})
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-1">
                  <span className="text-[var(--text-muted)] font-semibold text-[11px] block">
                    Context Details
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {selectedEvent.details}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-[var(--border)] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all btn-press"
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
