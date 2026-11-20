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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        );
      case "ON_JOB":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            On Job
          </span>
        );
      case "TRAVELLING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
            In Transit
          </span>
        );
      case "ON_LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            On Leave
          </span>
        );
      case "UNAVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8287a]" />
            Unavailable
          </span>
        );
      case "OFF_DUTY":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10">
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
          {!isOffline && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live API
            </span>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh technicians"
            title="Refresh technicians"
            className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 dark:hover:border-white/20 active:scale-95 transition-all duration-150 disabled:opacity-50"
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

        {/* ── Elevated Filter Toolbar ────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-md dark:bg-zinc-900 dark:border-white/5 dark:border-l-white/5 dark:shadow-none space-y-3">
          {/* Row 1: Status Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mr-1">Status:</span>
            {[
              { id: "ALL", label: "All", count: technicians.length, dot: "" },
              { id: "AVAILABLE", label: "Available", count: statusCounts.AVAILABLE, dot: "bg-emerald-500" },
              { id: "ON_JOB", label: "On job", count: statusCounts.ON_JOB, dot: "bg-blue-500" },
              { id: "TRAVELLING", label: "In transit", count: statusCounts.TRAVELLING, dot: "bg-[#06b6d4]" },
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
                      ? "border border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 font-semibold shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-950 hover:border-slate-300 dark:border-white/5 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-white/15"
                  }`}
                >
                  {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                  <span>{tab.label}</span>
                  <span className="tabular-nums opacity-80">({tab.count})</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Search, Category & Branch Selects */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-white/5">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search technicians"
                aria-label="Search technicians"
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

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by primary trade"
                className="text-xs py-2 pl-3 pr-8 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 appearance-none"
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
            </div>

            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                aria-label="Filter by branch hub"
                className="text-xs py-2 pl-3 pr-8 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 appearance-none"
              >
                <option value="ALL">All hubs</option>
                <option value="EPZ">EPZ Hub</option>
                <option value="Gazipur">Gazipur Hub</option>
                <option value="Tejgaon">Tejgaon Hub</option>
              </select>
              <ChevronDownIcon
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* ── Technician Clean Capacity Grid (3-Columns for ample room) ──── */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-300 dark:border-white/10 shadow-md">
            Loading technicians...
          </div>
        ) : technicians.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-300 dark:border-white/10 shadow-md">
            No technicians match the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technicians.map((tech) => {
              const primaryTrade = tech.skills[0]?.category || tech.designation;

              return (
                <div
                  key={tech.id}
                  className="p-4 rounded-xl bg-white border border-slate-300 shadow-md dark:bg-zinc-900 dark:border-white/5 dark:shadow-none hover:border-slate-400 dark:hover:border-white/15 transition-all flex flex-col justify-between space-y-3"
                >
                  {/* Top: Avatar, Name & Availability */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 dark:bg-zinc-800 dark:border-white/10 text-xs font-bold flex items-center justify-center shrink-0 text-slate-900 dark:text-zinc-100">
                        {tech.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-950 dark:text-zinc-50 truncate" title={tech.name}>
                          {tech.name}
                        </h4>
                        <span className="text-xs text-slate-600 dark:text-zinc-400 truncate block" title={tech.branch}>
                          {tech.branch}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(tech.status)}</div>
                  </div>

                  {/* Middle: Primary Trade */}
                  <div className="text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-medium block truncate" title={primaryTrade}>
                      {primaryTrade}
                    </span>
                  </div>

                  {/* Bottom: Active Job Count & Passport Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5 text-xs">
                    <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 tabular-nums">
                      {tech.activeJobCount === 0
                        ? "0 active jobs"
                        : `${tech.activeJobCount} active job${tech.activeJobCount > 1 ? "s" : ""}`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenInspect(tech, e)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all shadow-xs"
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
          <div className="w-full max-w-lg rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 dark:bg-zinc-800 dark:border-white/10 text-xs font-bold flex items-center justify-center shrink-0 text-slate-900 dark:text-zinc-100">
                  {inspectTech.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id={modalHeadingId} className="text-base font-bold text-slate-950 dark:text-zinc-50">
                      {inspectTech.name}
                    </h3>
                    {inspectTech.certifications.some((c) => c.verified && (!c.expiryDate || new Date(c.expiryDate) >= new Date())) ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">
                        <BadgeCheckIcon size={12} />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-800 dark:text-[#06b6d4] bg-cyan-50 dark:bg-[#06b6d4]/15 px-2 py-0.5 rounded border border-cyan-300 dark:border-[#06b6d4]/30">
                        Pending
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-zinc-400">{inspectTech.designation} · {inspectTech.branch}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Contact Information */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 dark:text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">Phone</span>
                <span className="font-mono text-slate-950 dark:text-zinc-100 text-xs font-semibold">{inspectTech.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">Email</span>
                <span className="font-mono text-slate-950 dark:text-zinc-100 text-xs font-semibold">{inspectTech.email}</span>
              </div>
            </div>

            {/* Credentials & Expiry */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-950 dark:text-zinc-50 uppercase tracking-wider">
                Credentials & Passports
              </h4>
              <div className="space-y-1.5">
                {inspectTech.certifications.map((cert) => {
                  const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
                  const isPending = !cert.verified;

                  return (
                    <div
                      key={cert.id || cert.name}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-950 dark:text-zinc-50">
                          {cert.name}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-zinc-400">{cert.issuedBy}</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold block ${
                            isExpired
                              ? "text-rose-600 dark:text-rose-400"
                              : isPending
                              ? "text-cyan-700 dark:text-cyan-400"
                              : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {isExpired ? "Expired" : isPending ? "Pending" : "Active"}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 tabular-nums">
                          {cert.expiryDate ? `Expires: ${cert.expiryDate}` : "Indefinite"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competencies */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-950 dark:text-zinc-50 uppercase tracking-wider">
                Competencies & Trades
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {inspectTech.skills.map((s) => (
                  <span
                    key={s.id || s.name}
                    className="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50"
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
