import { useState, useEffect, useCallback, useId, useMemo } from "react";
import { Layout } from "../../components/Layout";
import { dispatcherService } from "../../services/dispatcherService";
import { DispatchEventLog } from "../../types/dispatcher";
import {
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  DownloadIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  EyeIcon,
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
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
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

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
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
  }, [events, searchQuery, selectedAction, selectedSeverity]);

  const getSeverityBadge = (severity: DispatchEventLog["severity"]) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
      case "WARNING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
      case "INFO":
      default:
        return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
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
      title="Dispatch Audit"
      subtitle="Chronological Operations Ledger & Field Event Log"
      action={
        <div className="flex items-center gap-2">
          {/* Status indicator */}
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

        {/* ── Subheader Bar ──────────────────────────────────────────────── */}
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {filteredEvents.length} Recorded Operational Events
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">· Event Ledger</span>
          </div>

          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            {isOffline ? "Simulated local store records" : "Connected backend audit log"}
          </span>
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
              placeholder="Search by event ID, actor, target ID, or action..."
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

          {/* Action Filter */}
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

        {/* ── Chronological Event Timeline & Ledger ───────────────────────── */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
            Loading dispatch audit events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
            No dispatch audit events match current filters.
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-xs divide-y divide-[var(--border)]">
            {filteredEvents.map((ev) => {
              const isExpanded = expandedEventId === ev.id;
              return (
                <div key={ev.id} className="p-3.5 hover:bg-[var(--bg-surface-2)] transition-colors text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left: Time and Action badge */}
                    <div className="flex items-center gap-2.5 min-w-[240px]">
                      <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getActionBadge(ev.action)}`}>
                        {ev.action.replace("_", " ")}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getSeverityBadge(ev.severity)}`}>
                        {ev.severity}
                      </span>
                    </div>

                    {/* Middle: Actor & Target */}
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <span className="font-semibold text-[var(--text-primary)]">{ev.actorName}</span>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono">
                        → target: <span className="text-[var(--text-primary)] font-bold">{ev.targetId}</span>
                      </span>
                    </div>

                    {/* Right: Expand / Inspect affordance */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                        className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline flex items-center gap-1"
                      >
                        <span>{isExpanded ? "Hide" : "Details"}</span>
                        <ChevronDownIcon size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectEvent(ev)}
                        title="View Full Record"
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
                      >
                        <EyeIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Summary preview */}
                  <div className="mt-1.5 text-xs text-[var(--text-secondary)] pl-0 sm:pl-[75px]">
                    {ev.summary}
                  </div>

                  {/* Expandable Details Pane */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] pl-0 sm:pl-[75px] space-y-2 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[var(--text-muted)] block">Event ID</span>
                          <span className="font-mono text-[var(--text-primary)] font-semibold">{ev.id}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Full Timestamp</span>
                          <span className="font-mono text-[var(--text-primary)]">{ev.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Slide-Over Event Detail Drawer ──────────────────────────────── */}
      {inspectEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={inspectModalHeadingId}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border)] shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Audit Event Record
                </span>
                <h3 id={inspectModalHeadingId} className="text-sm font-bold text-[var(--text-primary)]">
                  {inspectEvent.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectEvent(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3.5 flex-1 text-xs">
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getActionBadge(inspectEvent.action)}`}>
                    {inspectEvent.action}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(inspectEvent.severity)}`}>
                    {inspectEvent.severity}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono">
                  Timestamp: {inspectEvent.timestamp}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                    Responsible Actor
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectEvent.actorName}</span>
                </div>

                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                    Target Resource
                  </span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{inspectEvent.targetId}</span>
                </div>

                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                    Event Summary
                  </span>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{inspectEvent.summary}</p>
                </div>
              </div>

              {/* Raw Payload View */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Raw Event JSON
                </span>
                <pre className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[10px] font-mono text-[var(--text-primary)] overflow-x-auto">
                  {JSON.stringify(inspectEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyId(inspectEvent.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors"
              >
                {copiedId === inspectEvent.id ? "✓ Copied ID" : "Copy Event ID"}
              </button>
              <button
                type="button"
                onClick={() => setInspectEvent(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
