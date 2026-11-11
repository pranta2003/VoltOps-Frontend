// Field Technician Availability & Trade Dispatch Board
// Strictly adheres to VoltOps design contract: "Show information, not explanations."
// Real-time roster: 7 canonical trades, verified certifications, current active jobs, and status.

import { FC, useState, useEffect, useCallback, useId, useRef } from "react";
import { Layout } from "../../components/Layout";
import { TechnicianProfile, ServiceCategory, TechnicianStatus } from "../../types";
import { CANONICAL_SERVICE_CATEGORIES } from "../../types";
import { dispatcherService } from "../../services/dispatcherService";
import {
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  BadgeCheckIcon,
} from "../../components/Icons";

export const TechnicianRoster: FC = () => {
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Passport Modal State
  const [inspectTech, setInspectTech] = useState<TechnicianProfile | null>(null);

  const modalHeadingId = useId();
  const lastFocusedTriggerRef = useRef<HTMLButtonElement | null>(null);

  const fetchTechs = useCallback(async () => {
    try {
      const res = await dispatcherService.getTechnicians(
        selectedCategory !== "ALL" ? (selectedCategory as ServiceCategory) : undefined,
        selectedBranch !== "ALL" ? selectedBranch : undefined
      );

      let results = res.data;

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        results = results.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.employeeId.toLowerCase().includes(q) ||
            t.designation.toLowerCase().includes(q) ||
            t.branch.toLowerCase().includes(q) ||
            t.skills.some((s) => s.name.toLowerCase().includes(q))
        );
      }

      if (selectedStatus !== "ALL") {
        results = results.filter((t) => t.status === selectedStatus);
      }

      setTechnicians(results);
      setIsOffline(res.isOffline);
    } catch {
      setIsOffline(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedCategory, selectedBranch, selectedStatus]);

  useEffect(() => {
    fetchTechs();
  }, [fetchTechs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTechs();
  };

  const handleOpenInspect = (tech: TechnicianProfile, e: React.MouseEvent<HTMLButtonElement>) => {
    lastFocusedTriggerRef.current = e.currentTarget;
    setInspectTech(tech);
  };

  const handleCloseModal = () => {
    setInspectTech(null);
    if (lastFocusedTriggerRef.current) {
      lastFocusedTriggerRef.current.focus();
    }
  };

  const getStatusBadge = (status: TechnicianStatus) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        );
      case "ON_JOB":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            On Job
          </span>
        );
      case "TRAVELLING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Transit
          </span>
        );
      case "OFF_DUTY":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Off Duty
          </span>
        );
    }
  };

  return (
    <Layout
      title="Field Technicians"
      action={
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOffline
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? "bg-amber-500" : "bg-emerald-500"}`} />
            {isOffline ? "Offline data" : "Live API"}
          </span>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh technicians"
            title="Refresh technicians"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCwIcon size={15} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Subheader */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-1 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">{technicians.length} Field Technicians</span>
            <span>•</span>
            <span>7-Trade Verified Passports</span>
          </div>
        </div>

        {/* ── Compact Filter Toolbar (Single Row) ─────────────────────────── */}
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
              placeholder="Search by name, ID, branch, or skill..."
              aria-label="Search technicians"
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

          {/* Trade Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by primary trade"
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

          {/* Branch Filter */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              aria-label="Filter by branch hub"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Hubs</option>
              <option value="EPZ">EPZ Industrial Core</option>
              <option value="Gazipur">Gazipur Zone</option>
              <option value="Tejgaon">Tejgaon Hub</option>
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
              { id: "AVAILABLE", label: "Available" },
              { id: "ON_JOB", label: "On Job" },
              { id: "TRAVELLING", label: "In Transit" },
              { id: "OFF_DUTY", label: "Off Duty" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  selectedStatus === tab.id
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── High-Density Technicians Table ──────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3.5">Technician</th>
                  <th className="py-2.5 px-3.5">Trade Skills</th>
                  <th className="py-2.5 px-3.5">Verified Licenses</th>
                  <th className="py-2.5 px-3.5">Branch Hub & Current Area</th>
                  <th className="py-2.5 px-3.5">Active Jobs</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      Loading technician roster...
                    </td>
                  </tr>
                ) : technicians.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      No technicians match the selected filters.
                    </td>
                  </tr>
                ) : (
                  technicians.map((tech) => (
                    <tr key={tech.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {tech.name.substring(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className="font-semibold text-[var(--text-primary)]">{tech.name}</div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono">{tech.employeeId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Trade Skills */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-[var(--text-primary)]">{tech.designation}</div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">
                          {tech.skills.map((s) => s.name).join(", ")}
                        </div>
                      </td>

                      {/* Verified Certifications */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {tech.certifications.map((c) => (
                            <span
                              key={c.id || c.name}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                            >
                              <BadgeCheckIcon size={11} className="text-emerald-500" />
                              {c.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Branch & Location */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-[var(--text-primary)]">{tech.branch}</div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">
                          {tech.currentArea || "At Depot"}
                        </div>
                      </td>

                      {/* Active Jobs */}
                      <td className="py-3 px-3.5">
                        {tech.activeJobCount === 0 ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            0 (Ready)
                          </span>
                        ) : (
                          <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold">
                            {tech.activeJobCount} active
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5">{getStatusBadge(tech.status)}</td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleOpenInspect(tech, e)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                        >
                          Passport
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

      {/* ── Skill Passport Inspection Modal ──────────────────────────────── */}
      {inspectTech && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalHeadingId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon size={20} className="text-emerald-500" />
                <div>
                  <h3 id={modalHeadingId} className="text-base font-bold text-[var(--text-primary)]">
                    {inspectTech.name} — Skill Passport
                  </h3>
                  <span className="text-xs text-[var(--text-muted)] font-mono">{inspectTech.employeeId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Profile Summary */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Designation</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectTech.designation}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Primary Branch Hub</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectTech.branch}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border)]">
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Contact Phone</span>
                  <span className="font-mono text-[var(--text-primary)]">{inspectTech.phone}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[11px]">Official Email</span>
                  <span className="font-mono text-[var(--text-primary)]">{inspectTech.email}</span>
                </div>
              </div>
            </div>

            {/* Verified Certifications */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Verified Credentials & Government Licenses
              </div>
              <div className="space-y-1.5">
                {inspectTech.certifications.map((cert) => (
                  <div
                    key={cert.id || cert.name}
                    className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <BadgeCheckIcon size={13} className="text-emerald-500" />
                        {cert.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">Issued by: {cert.issuedBy}</div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                      Valid to {cert.expiryDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade Skills */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Authorized Service Competencies
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inspectTech.skills.map((s) => (
                  <span
                    key={s.id || s.name}
                    className="px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close Passport
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
