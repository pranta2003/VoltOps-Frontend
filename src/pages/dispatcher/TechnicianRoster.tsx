// Field Technician Availability & Trade Dispatch Board
// Strictly adheres to VoltOps design contract: "Show information, not explanations."
// Real-time roster: 7 canonical trades, verified certifications, current active jobs, and status.

import { FC, useState, useEffect, useCallback, useMemo, useId, useRef } from "react";
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
  AlertTriangleIcon,
  MapPinIcon,
  BriefcaseIcon,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

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
      setErrorMessage(null);
      setIsStale(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retrieve technician roster from server");
      setIsStale(true);
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

  const statusCounts = useMemo(() => {
    return {
      AVAILABLE: technicians.filter((t) => t.status === "AVAILABLE").length,
      ON_JOB: technicians.filter((t) => t.status === "ON_JOB").length,
      TRAVELLING: technicians.filter((t) => t.status === "TRAVELLING").length,
      ON_LEAVE: technicians.filter((t) => t.status === "ON_LEAVE").length,
      OFF_DUTY: technicians.filter((t) => t.status === "OFF_DUTY").length,
    };
  }, [technicians]);

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
      case "ON_LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            On Leave
          </span>
        );
      case "UNAVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Unavailable
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
      title="Technicians"
      action={
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              errorMessage && technicians.length === 0
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
                errorMessage && technicians.length === 0
                  ? "bg-rose-500"
                  : isStale
                  ? "bg-amber-500"
                  : isOffline
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
            {errorMessage && technicians.length === 0
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
            aria-label="Refresh technicians"
            title="Refresh technicians"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] active:scale-95 transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCwIcon size={15} className={isRefreshing ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>
      }
    >
      <div className="space-y-3">
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

        {/* ── Compact Availability Filter Strip ────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "ALL", label: "All", count: technicians.length },
              { id: "AVAILABLE", label: "Available", count: statusCounts.AVAILABLE, dot: "bg-emerald-500" },
              { id: "ON_JOB", label: "On job", count: statusCounts.ON_JOB, dot: "bg-blue-500" },
              { id: "TRAVELLING", label: "In transit", count: statusCounts.TRAVELLING, dot: "bg-amber-500" },
              { id: "ON_LEAVE", label: "On leave", count: statusCounts.ON_LEAVE, dot: "bg-purple-500" },
              { id: "OFF_DUTY", label: "Off duty", count: statusCounts.OFF_DUTY, dot: "bg-slate-400" },
            ].map((tab) => {
              const isSelected = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                    isSelected
                      ? "border border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                      : "border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono opacity-80">({tab.count})</span>
                </button>
              );
            })}
          </div>

          {/* Right: Search and Dropdowns */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px] justify-end">
            <div className="relative flex-1 max-w-xs">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search technicians"
                aria-label="Search technicians"
                className="w-full text-xs pl-9 pr-8 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by primary trade"
                className="text-xs py-1.5 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
            </div>

            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                aria-label="Filter by branch hub"
                className="text-xs py-1.5 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All hubs</option>
                <option value="EPZ">EPZ Hub</option>
                <option value="Gazipur">Gazipur Hub</option>
                <option value="Tejgaon">Tejgaon Hub</option>
              </select>
              <ChevronDownIcon
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* ── Technician Clean Capacity Grid ─────────────────────────────── */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
            Loading technicians...
          </div>
        ) : technicians.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
            No technicians match the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {technicians.map((tech) => {
              const primaryTrade = tech.skills[0]?.category || tech.designation;

              return (
                <div
                  key={tech.id}
                  className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between shadow-xs space-y-3"
                >
                  {/* Top: Avatar, Name & Availability */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center justify-center shrink-0 text-[var(--text-primary)]">
                        {tech.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-[var(--text-primary)] truncate" title={tech.name}>
                          {tech.name}
                        </h4>
                        <span className="text-[11px] text-[var(--text-muted)] truncate block" title={tech.branch}>
                          {tech.branch}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(tech.status)}</div>
                  </div>

                  {/* Middle: Primary Trade */}
                  <div className="text-xs">
                    <span className="text-[var(--text-secondary)] font-medium block truncate" title={primaryTrade}>
                      {primaryTrade}
                    </span>
                  </div>

                  {/* Bottom: Active Job Count & Passport Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {tech.activeJobCount === 0
                        ? "0 active jobs"
                        : `${tech.activeJobCount} active job${tech.activeJobCount > 1 ? "s" : ""}`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenInspect(tech, e)}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                    >
                      Passport
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Skill Passport Modal ─────────────────────────────────────────── */}
      {inspectTech && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalHeadingId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center justify-center shrink-0 text-[var(--text-primary)]">
                  {inspectTech.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id={modalHeadingId} className="text-sm font-bold text-[var(--text-primary)]">
                      {inspectTech.name}
                    </h3>
                    {inspectTech.certifications.some((c) => c.verified && (!c.expiryDate || new Date(c.expiryDate) >= new Date())) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <BadgeCheckIcon size={11} />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Pending
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">{inspectTech.designation} · {inspectTech.branch}</span>
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

            {/* Contact Information */}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-semibold">Phone</span>
                <span className="font-mono text-[var(--text-primary)] text-xs">{inspectTech.phone}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-semibold">Email</span>
                <span className="font-mono text-[var(--text-primary)] text-xs">{inspectTech.email}</span>
              </div>
            </div>

            {/* Credentials & Expiry */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                Credentials
              </h4>
              <div className="space-y-1.5">
                {inspectTech.certifications.map((cert) => {
                  const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
                  const isPending = !cert.verified;

                  return (
                    <div
                      key={cert.id || cert.name}
                      className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {cert.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">{cert.issuedBy}</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[11px] font-semibold block ${
                            isExpired
                              ? "text-rose-600 dark:text-rose-400"
                              : isPending
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {isExpired ? "Expired" : isPending ? "Pending" : "Active"}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {cert.expiryDate ? `Expires: ${cert.expiryDate}` : "Indefinite"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competencies */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                Competencies
              </h4>
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
            <div className="pt-2 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
