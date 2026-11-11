import { useState, useEffect, useCallback, useId } from "react";
import { Layout } from "../../components/Layout";
import { dispatcherService } from "../../services/dispatcherService";
import { DispatchEventLog } from "../../types/dispatcher";
import {
  ClockIcon,
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  DownloadIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  RadioIcon,
  ShieldCheckIcon,
} from "../../components/Icons";

export function DispatchAuditLog() {
  const [events, setEvents] = useState<DispatchEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [inspectEvent, setInspectEvent] = useState<DispatchEventLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inspectModalHeadingId = useId();

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await dispatcherService.getDispatchEvents();
      setEvents(res.data);
      setIsOffline(res.isOffline);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retrieve dispatch audit events");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      source: "VoltOps Dispatcher Operations Audit Trail",
      recordCount: filteredEvents.length,
      records: filteredEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voltops-dispatch-audit-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter((ev) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        ev.id.toLowerCase().includes(q) ||
        ev.actorName.toLowerCase().includes(q) ||
        ev.targetId.toLowerCase().includes(q) ||
        ev.summary.toLowerCase().includes(q) ||
        ev.action.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedAction !== "ALL" && ev.action !== selectedAction) {
      return false;
    }

    if (selectedSeverity !== "ALL" && ev.severity !== selectedSeverity) {
      return false;
    }

    return true;
  });

  const getSeverityBadge = (severity: DispatchEventLog["severity"]) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900";
      case "WARNING":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900";
      case "INFO":
      default:
        return "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-900";
    }
  };

  const getActionBadge = (action: DispatchEventLog["action"]) => {
    switch (action) {
      case "ORDER_CREATED":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
      case "TECH_DISPATCHED":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "STATUS_CHANGED":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "REQUEST_REVIEWED":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <Layout
      title="Dispatcher Audit Trail"
      subtitle="Historical Operations Ledger & Technician Dispatch Events"
      action={
        <div className="flex items-center gap-2">
          {/* Real-time status indicator */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isOffline
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOffline ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
              }`}
            />
            <span>{isOffline ? "Local preview" : "Live API"}</span>
          </span>

          {/* Export JSON Compliance Button */}
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] active:scale-95 transition-all shadow-xs"
          >
            <DownloadIcon size={13} />
            <span>Export JSON</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh audit events"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCwIcon size={15} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
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

        {/* Subheader */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-1 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">{filteredEvents.length} Dispatch Events</span>
            <span>•</span>
            <span>Immutable Administrative Chronology</span>
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
              placeholder="Search by event ID, actor, order ID, or summary..."
              aria-label="Search audit events"
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

          {/* Action Category Filter */}
          <div className="relative">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              aria-label="Filter by event action"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Actions</option>
              <option value="ORDER_CREATED">Order Created</option>
              <option value="TECH_DISPATCHED">Technician Dispatched</option>
              <option value="STATUS_CHANGED">Status Changed</option>
              <option value="REQUEST_REVIEWED">Request Reviewed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDownIcon
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>

          {/* Severity Filter */}
          <div className="relative">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              aria-label="Filter by severity"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
            <ChevronDownIcon
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>
        </div>

        {/* ── High-Density Audit Ledger Table ────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[960px] text-left text-xs sm:text-[13px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[110px]" />
                <col className="w-[125px]" />
                <col className="w-[130px]" />
                <col className="w-[140px]" />
                <col className="w-[100px]" />
                <col className="w-[260px]" />
                <col className="w-[85px]" />
                <col className="w-[80px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-xs">
                  <th className="py-2.5 px-3">Event ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Target ID</th>
                  <th className="py-2.5 px-3">Summary</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      Loading audit events...
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No dispatch audit events match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-xs text-[var(--text-primary)] whitespace-nowrap truncate">
                        {ev.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        <span className="block text-[10px] text-[var(--text-muted)]">{new Date(ev.timestamp).toLocaleDateString()}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getActionBadge(ev.action)}`}>
                          {ev.action.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap truncate font-medium text-[var(--text-primary)]" title={ev.actorName}>
                        {ev.actorName}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {ev.targetId}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-xs sm:text-[13px] text-[var(--text-secondary)] truncate" title={ev.summary}>
                          {ev.summary}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getSeverityBadge(ev.severity)}`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectEvent(ev)}
                          className="px-2 py-0.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                        >
                          View
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

      {/* ── Event Detail Inspection Modal ───────────────────────────────── */}
      {inspectEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={inspectModalHeadingId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{inspectEvent.id}</span>
                <h3 id={inspectModalHeadingId} className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Audit Event Record
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectEvent(null)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Action Type</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectEvent.action}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Responsible Actor</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectEvent.actorName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Target Entity</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{inspectEvent.targetId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Timestamp</span>
                  <span className="font-mono text-[var(--text-secondary)]">{new Date(inspectEvent.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Severity</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getSeverityBadge(inspectEvent.severity)}`}>
                    {inspectEvent.severity}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1">Event Summary</h4>
                <p className="p-2.5 rounded-lg bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                  {inspectEvent.summary}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => handleCopyId(inspectEvent.id)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
              >
                {copiedId === inspectEvent.id ? "Copied ID!" : "Copy Event ID"}
              </button>
              <button
                type="button"
                onClick={() => setInspectEvent(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand text-white hover:bg-brand-dark"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
