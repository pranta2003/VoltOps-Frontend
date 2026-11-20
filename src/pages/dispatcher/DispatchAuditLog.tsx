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
        return "bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30";
      case "WARNING":
        return "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30";
      case "INFO":
      default:
        return "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40";
    }
  };

  const getActionBadge = (action: DispatchEventLog["action"]) => {
    switch (action) {
      case "ORDER_CREATED":
        return "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40";
      case "TECH_DISPATCHED":
        return "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40";
      case "STATUS_CHANGED":
        return "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/40";
      case "REQUEST_REVIEWED":
        return "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30";
      case "CANCELLED":
        return "bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30";
      default:
        return "bg-slate-50 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10";
    }
  };

  return (
    <Layout
      title="Audit Log"
      action={
        <div className="flex items-center gap-2">
          {!isOffline && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live API
            </span>
          )}

          {/* Export JSON Compliance Button */}
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 dark:hover:border-white/20 active:scale-95 transition-all shadow-xs"
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
            className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 dark:hover:border-white/20 active:scale-95 transition-all disabled:opacity-50"
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

        {/* ── Elevated Filter Toolbar ─────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-md dark:bg-zinc-900 dark:border-white/5 dark:border-l-white/5 dark:shadow-none">
          <div className="flex flex-wrap items-center gap-3">
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
                placeholder="Search audit log"
                aria-label="Search audit events"
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

            {/* Action Filter */}
            <div className="relative">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                aria-label="Filter by event action"
                className="text-xs py-2 pl-3 pr-8 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 appearance-none"
              >
                <option value="ALL">All actions</option>
                <option value="ORDER_CREATED">Order created</option>
                <option value="TECH_DISPATCHED">Technician dispatched</option>
                <option value="STATUS_CHANGED">Status changed</option>
                <option value="REQUEST_REVIEWED">Request reviewed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDownIcon
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
            </div>

            {/* Severity Filter */}
            <div className="relative">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                aria-label="Filter by severity"
                className="text-xs py-2 pl-3 pr-8 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 appearance-none"
              >
                <option value="ALL">All severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
              <ChevronDownIcon
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* ── Chronological Event Timeline & Ledger ───────────────────────── */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-300 dark:border-white/10 shadow-md">
            Loading audit events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-300 dark:border-white/10 shadow-md">
            No audit events match current filters.
          </div>
        ) : (
          <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-500 rounded-xl shadow-md overflow-hidden dark:bg-zinc-900 dark:border-white/5 dark:border-t-white/5 dark:shadow-none divide-y divide-slate-200 dark:divide-white/5">
            {filteredEvents.map((ev) => {
              const isExpanded = expandedEventId === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                  className="p-3.5 odd:bg-white even:bg-slate-50/70 hover:bg-emerald-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Time, Action, Severity */}
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono tabular-nums text-[11px] text-slate-600 dark:text-zinc-400 shrink-0 font-medium">
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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950 dark:text-zinc-50">{ev.actorName}</span>
                      <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
                        → target: <span className="text-slate-950 dark:text-zinc-50 font-bold">{ev.targetId}</span>
                      </span>
                    </div>

                    {/* Right: Expand / Inspect affordance */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                        className="text-[11px] font-semibold text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-zinc-100 flex items-center gap-1"
                      >
                        <span>{isExpanded ? "Hide" : "Details"}</span>
                        <ChevronDownIcon size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectEvent(ev)}
                        title="View Record"
                        className="p-1 rounded-md text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-all"
                      >
                        <EyeIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Details Pane */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 text-xs space-y-2 animate-fade-in">
                      <p className="text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">{ev.summary}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-mono tabular-nums">
                        <span>Event ID: {ev.id}</span>
                        <span>{ev.timestamp}</span>
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
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-md h-full bg-white dark:bg-zinc-900 border-l border-slate-300 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Audit Event Record
                </span>
                <h3 id={inspectModalHeadingId} className="text-sm font-bold text-slate-950 dark:text-zinc-50">
                  {inspectEvent.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectEvent(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3.5 flex-1 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getActionBadge(inspectEvent.action)}`}>
                    {inspectEvent.action}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(inspectEvent.severity)}`}>
                    {inspectEvent.severity}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono tabular-nums">
                  Timestamp: {inspectEvent.timestamp}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                    Responsible Actor
                  </span>
                  <span className="font-bold text-slate-950 dark:text-zinc-50">{inspectEvent.actorName}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                    Target Resource
                  </span>
                  <span className="font-mono font-bold text-slate-950 dark:text-zinc-50">{inspectEvent.targetId}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                    Event Summary
                  </span>
                  <p className="text-[12px] text-slate-700 dark:text-zinc-300 mt-0.5 font-medium">{inspectEvent.summary}</p>
                </div>
              </div>

              {/* Raw Payload View */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1">
                  Raw Event JSON
                </span>
                <pre className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-zinc-950 text-[10px] font-mono text-slate-950 dark:text-zinc-50 overflow-x-auto">
                  {JSON.stringify(inspectEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyId(inspectEvent.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/10 text-slate-800 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-zinc-50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {copiedId === inspectEvent.id ? "✓ Copied ID" : "Copy Event ID"}
              </button>
              <button
                type="button"
                onClick={() => setInspectEvent(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50"
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
