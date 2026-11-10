import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import {
  ClockIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BuildingIcon,
  RadioIcon,
  SettingsIcon,
  ArrowRightIcon,
} from "../../components/Icons";

export type AuditCategory = "AUTH" | "ROLE_CHANGE" | "DISPATCH" | "VERIFICATION" | "SECURITY" | "ACCOUNT";

interface AuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  actorIp: string;
  category: AuditCategory;
  action: string;
  targetEntity: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  details: string;
}

const SEED_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "aud-901",
    timestamp: "10 Nov 2026, 11:20:14 AM",
    actorName: "Pranta",
    actorRole: "ADMIN",
    actorIp: "192.168.1.103",
    category: "ROLE_CHANGE",
    action: "Assigned EPZ Branch supervisor role to Dispatcher Tania Akter",
    targetEntity: "User usr-disp-1",
    severity: "INFO",
    details: "Promoted to branch coordinator with dispatch queue approval override permissions.",
  },
  {
    id: "aud-902",
    timestamp: "10 Nov 2026, 10:48:02 AM",
    actorName: "System Sentinel",
    actorRole: "SYSTEM",
    actorIp: "127.0.0.1",
    category: "VERIFICATION",
    action: "New license upload: Biometric Access Control & IP Surveillance Master",
    targetEntity: "Technician Rafiqul Islam (TECH-TJ-09)",
    severity: "INFO",
    details: "Document queued for human admin review. Matching eligibility suspended pending approval.",
  },
  {
    id: "aud-903",
    timestamp: "10 Nov 2026, 10:18:45 AM",
    actorName: "Tania Akter",
    actorRole: "DISPATCHER",
    actorIp: "192.168.1.112",
    category: "DISPATCH",
    action: "Confirmed assignment for emergency Work Order WO-2048 to Kamrul Islam",
    targetEntity: "WorkOrder WO-2048",
    severity: "INFO",
    details: "Matching Engine arithmetic score: 96%. Customer arrival SLA deadline: 40 minutes.",
  },
  {
    id: "aud-904",
    timestamp: "10 Nov 2026, 09:15:30 AM",
    actorName: "Pranta",
    actorRole: "ADMIN",
    actorIp: "192.168.1.103",
    category: "ACCOUNT",
    action: "Activated new corporate facility customer: Rahimafrooz Facility Hub",
    targetEntity: "Customer usr-cust-3",
    severity: "INFO",
    details: "Verified facility address and commercial 24/7 Standard subscription tier.",
  },
  {
    id: "aud-905",
    timestamp: "09 Nov 2026, 11:42:10 PM",
    actorName: "Auth Guard",
    actorRole: "SECURITY",
    actorIp: "203.112.44.18",
    category: "SECURITY",
    action: "Blocked repeated failed login attempts against staff email admin@voltops.com",
    targetEntity: "Auth Service",
    severity: "CRITICAL",
    details: "5 consecutive invalid password submissions within 60 seconds. IP temporarily rate-limited.",
  },
  {
    id: "aud-906",
    timestamp: "09 Nov 2026, 04:30:18 PM",
    actorName: "Tania Akter",
    actorRole: "DISPATCHER",
    actorIp: "192.168.1.112",
    category: "DISPATCH",
    action: "Approved emergency work order dispatch window manual override",
    targetEntity: "WorkOrder WO-2042",
    severity: "WARNING",
    details: "Manual dispatcher override applied: Technician travel buffer adjusted for highway roadworks.",
  },
  {
    id: "aud-907",
    timestamp: "09 Nov 2026, 02:15:00 PM",
    actorName: "Pranta",
    actorRole: "ADMIN",
    actorIp: "192.168.1.103",
    category: "VERIFICATION",
    action: "Verified Class A High Voltage electrical supervisory license for Kamrul Islam",
    targetEntity: "Technician Kamrul Islam",
    severity: "INFO",
    details: "Checked against ELB National Registry database. License verified through Dec 2027.",
  },
  {
    id: "aud-908",
    timestamp: "08 Nov 2026, 05:00:22 PM",
    actorName: "System Sentinel",
    actorRole: "SYSTEM",
    actorIp: "127.0.0.1",
    category: "AUTH",
    action: "Completed automated daily session cleanup and expired token purging",
    targetEntity: "Token Registry",
    severity: "INFO",
    details: "0 active session anomalies detected.",
  },
];

export function AuditLog() {
  const [events] = useState<AuditEvent[]>(SEED_AUDIT_EVENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | AuditCategory>("ALL");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "INFO" | "WARNING" | "CRITICAL">("ALL");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedEventId, setCopiedEventId] = useState(false);
  const pageSize = 5;

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesSearch =
        evt.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.targetEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = categoryFilter === "ALL" || evt.category === categoryFilter;
      const matchesSev = severityFilter === "ALL" || evt.severity === severityFilter;

      return matchesSearch && matchesCat && matchesSev;
    });
  }, [events, searchQuery, categoryFilter, severityFilter]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  // Export audit logs as downloadable JSON file
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `voltops-audit-log-${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedEventId(true);
    setTimeout(() => setCopiedEventId(false), 2000);
  };

  const getSeverityBadge = (sev: AuditEvent["severity"]) => {
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

  const getCategoryBadge = (cat: AuditCategory) => {
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
          className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#10b981] hover:text-[#10b981] transition-all shadow-sm flex items-center gap-1.5"
          title="Download compliance audit trail in JSON format"
        >
          <span>📥 Export Ledger (JSON)</span>
        </button>
      }
    >
      {/* ── Security & Integrity Policy Notice ─────────────────────────── */}
      <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 flex items-start gap-3 text-xs leading-relaxed">
        <ShieldCheckIcon size={18} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="text-slate-800 dark:text-slate-200">
          <strong className="text-slate-900 dark:text-white">Audit Log Integrity Standard:</strong> In compliance with VoltOps system integrity policies, audit events must represent deterministic records with cryptographic non-repudiation. The records shown below represent the baseline prototype ledger. A dedicated PostgreSQL <code className="px-1.5 py-0.5 rounded bg-purple-500/20 font-mono">audit_events</code> table and append-only trigger service are documented in Milestone 2 specifications for upcoming database migrations.
        </div>
      </div>

      {/* ── Filters & Search ───────────────────────────────────────────── */}
      <div className="p-5 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-muted)] focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981]">
            <span>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit records by actor, action description, target entity, or event ID..."
              className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
            <span className="text-[var(--text-muted)]">Severity:</span>
            {(["ALL", "INFO", "WARNING", "CRITICAL"] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
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
          {(["ALL", "ROLE_CHANGE", "VERIFICATION", "DISPATCH", "SECURITY", "ACCOUNT", "AUTH"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
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
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((evt) => (
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
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadge(evt.category)}`}>
                        {evt.category.replace("_", " ")}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[var(--text-primary)] max-w-md">
                        {evt.action}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Target: <span className="font-mono text-emerald-600 dark:text-emerald-400">{evt.targetEntity}</span>
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(evt.severity)}`}>
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
            Showing <strong className="text-[var(--text-primary)]">{filteredEvents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-[var(--text-primary)]">{Math.min(currentPage * pageSize, filteredEvents.length)}</strong> of <strong className="text-[var(--text-primary)]">{filteredEvents.length}</strong> events
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
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
              disabled={currentPage >= totalPages}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Audit Event Details
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[var(--text-muted)] font-mono">{selectedEvent.id}</span>
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
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[var(--bg-surface-2)]">
                <div>
                  <span className="text-[var(--text-muted)] block">Timestamp:</span>
                  <span className="font-medium text-[var(--text-primary)]">{selectedEvent.timestamp}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Severity Level:</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getSeverityBadge(selectedEvent.severity)}`}>
                    {selectedEvent.severity}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block">Actor:</span>
                <span className="font-bold text-[var(--text-primary)] text-sm">{selectedEvent.actorName}</span>
                <span className="text-[var(--text-muted)] font-mono ml-2">({selectedEvent.actorRole} · IP {selectedEvent.actorIp})</span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block">Action:</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedEvent.action}</span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block">Target Entity:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{selectedEvent.targetEntity}</span>
              </div>

              <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] space-y-1">
                <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] block">Extended Audit Context:</span>
                <p className="text-[var(--text-secondary)] leading-relaxed">{selectedEvent.details}</p>
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
    </Layout>
  );
}
