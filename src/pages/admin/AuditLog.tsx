import { useState, useEffect, useMemo, useCallback } from "react";
import { Layout } from "../../components/Layout";
import {
  SystemAuditEvent,
  AuditEventCategory,
  AuditSeverity,
} from "../../types/admin";
import { AdminService } from "../../services/adminService";
import {
  ClockIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BuildingIcon,
  RadioIcon,
  SettingsIcon,
  FileTextIcon,
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
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
      case "WARNING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "INFO":
      default:
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
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
      title="System Audit & Security Event Ledger"
      subtitle="Immutable chronological audit trail recording administrative decisions, role adjustments, and dispatch overrides"
      action={
        <button
          type="button"
          onClick={handleExportJSON}
          disabled={events.length === 0}
          className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#10b981] hover:text-[#10b981] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40"
          title="Download compliance audit trail in JSON format"
        >
          <span>📥 Export Ledger (JSON)</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* ── Security Policy & Source Notice ─────────────────────────── */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheckIcon size={18} className="text-[#10b981] shrink-0" />
            <span className="text-[var(--text-primary)]">
              <strong>Non-Repudiation Standard:</strong> Administrative decisions and security events are logged with actor identity, IP, and timestamp.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLiveConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Endpoint Active (GET /api/admin/audit)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Offline Audit Baseline
              </span>
            )}

            <button
              type="button"
              onClick={loadAuditLogs}
              disabled={isLoading}
              title="Refresh audit ledger"
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
            >
              🔄
            </button>
          </div>
        </div>

        {/* ── Integration Error / Offline Notice ─────────────────────────── */}
        {apiError && (
          <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Integration Notice:</strong> {apiError}
              </span>
            </div>
            <button
              type="button"
              onClick={loadAuditLogs}
              className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/20 font-bold hover:bg-amber-500/30 transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Filters & Search ───────────────────────────────────────────── */}
        <div className="p-5 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-muted)] focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981]">
              <span>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search audit records by actor, action description, target entity, or event ID..."
                className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
              <span className="text-[var(--text-muted)]">Severity:</span>
              {(["ALL", "INFO", "WARNING", "CRITICAL"] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => handleSeverityChange(sev)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    severityFilter === sev
                      ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-transparent"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)] text-xs">
            <span className="font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
              Category:
            </span>
            {(
              [
                "ALL",
                "ROLE_CHANGE",
                "VERIFICATION",
                "DISPATCH",
                "SECURITY",
                "ACCOUNT",
                "AUTH",
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                  categoryFilter === cat
                    ? "bg-[#10b981] text-[#06090e] border-[#10b981] font-bold shadow-sm"
                    : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* ── Audit Ledger Table ─────────────────────────────────────────── */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-2)] text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Timestamp / Event ID</th>
                  <th className="py-3.5 px-4 font-semibold">Actor / IP</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Action Description</th>
                  <th className="py-3.5 px-4 font-semibold">Severity</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skel-audit-${idx}`} className="animate-pulse">
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-32 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-20 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-28 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-36 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-5 w-24 bg-[var(--border)] rounded-full" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-64 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-32 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-5 w-16 bg-[var(--border)] rounded-full" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="h-6 w-16 bg-[var(--border)] rounded-lg inline-block" />
                      </td>
                    </tr>
                  ))
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-semibold text-[var(--text-primary)]">
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
                          className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs font-bold text-[var(--text-primary)] hover:border-[#10b981]"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-[var(--bg-surface-2)]/50 transition-colors">
                      {/* Timestamp & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[var(--text-primary)]">
                          {evt.timestamp}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          {evt.id}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[var(--text-primary)]">
                          {evt.actorName}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          {evt.actorRole} · {evt.actorIp}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadge(
                            evt.category
                          )}`}
                        >
                          {evt.category.replace("_", " ")}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[var(--text-primary)] max-w-md">
                          {evt.action}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          Target:{" "}
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {evt.targetEntity}
                          </span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(
                            evt.severity
                          )}`}
                        >
                          {evt.severity}
                        </span>
                      </td>

                      {/* Details Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(evt)}
                          className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:border-[#10b981] hover:text-[#10b981] transition-all font-semibold text-[11px]"
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

          {/* ── Table Pagination Controls ─────────────────────────────────── */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-surface-2)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <div>
              Showing{" "}
              <strong className="text-[var(--text-primary)]">
                {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-[var(--text-primary)]">
                {Math.min(currentPage * pageSize, totalCount)}
              </strong>{" "}
              of <strong className="text-[var(--text-primary)]">{totalCount}</strong> recorded events
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 hover:border-[#10b981] transition-all font-semibold"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${
                    currentPage === pg
                      ? "bg-[#10b981] text-[#06090e] border-[#10b981]"
                      : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#10b981]"
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 hover:border-[#10b981] transition-all font-semibold"
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
            <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h3 id="audit-modal-title" className="font-heading font-bold text-base text-[var(--text-primary)]">
                    Audit Event Details
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      {selectedEvent.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(selectedEvent.id)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[#10b981]"
                    >
                      {copiedEventId ? "Copied!" : "Copy ID"}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                  <div>
                    <span className="text-[var(--text-muted)] block">Timestamp:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {selectedEvent.timestamp}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Severity Level:</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getSeverityBadge(
                        selectedEvent.severity
                      )}`}
                    >
                      {selectedEvent.severity}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[var(--text-muted)] block">Actor:</span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">
                    {selectedEvent.actorName}
                  </span>
                  <span className="text-[var(--text-muted)] font-mono ml-2">
                    ({selectedEvent.actorRole} · IP {selectedEvent.actorIp})
                  </span>
                </div>

                <div>
                  <span className="text-[var(--text-muted)] block">Action:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {selectedEvent.action}
                  </span>
                </div>

                <div>
                  <span className="text-[var(--text-muted)] block">Target Entity:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedEvent.targetEntity}
                  </span>
                  {selectedEvent.targetId && (
                    <span className="text-[var(--text-muted)] font-mono text-[11px] ml-2">
                      (ID: {selectedEvent.targetId})
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-1">
                  <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] block">
                    Extended Audit Context:
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {selectedEvent.details}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[#10b981]"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}