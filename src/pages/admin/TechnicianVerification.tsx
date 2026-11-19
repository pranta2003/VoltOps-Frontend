import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Layout } from "../../components/Layout";
import {
  CANONICAL_SERVICE_CATEGORIES,
  ServiceCategory,
} from "../../types";
import {
  TechnicianVerificationProfile,
  VerificationDecision,
} from "../../types/admin";
import { AdminService } from "../../services/adminService";
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  FileTextIcon,
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  ChevronRightIcon,
  UserIcon,
} from "../../components/Icons";

export function TechnicianVerification() {
  const [technicians, setTechnicians] = useState<TechnicianVerificationProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string>("ALL");
  const [verStatusFilter, setVerStatusFilter] = useState<"ALL" | VerificationDecision>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Audit modal state
  const [selectedTech, setSelectedTech] = useState<TechnicianVerificationProfile | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [pendingDecision, setPendingDecision] = useState<"VERIFIED" | "REJECTED" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const lastFocusedTriggerRef = useRef<HTMLElement | null>(null);

  // Load technician directory via AdminService
  const loadTechnicians = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    const result = await AdminService.getTechnicians();
    if (result.success && result.data) {
      setTechnicians(result.data);
      setIsLiveConnected(result.isLive);
      if (result.error) {
        setApiError(result.error);
      }
    } else {
      setApiError(result.error || "Failed to load technician passports.");
      setIsLiveConnected(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  // Focus restoration when modal closes
  useEffect(() => {
    if (!selectedTech) {
      lastFocusedTriggerRef.current?.focus();
    }
  }, [selectedTech]);

  // Keyboard accessibility: Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTech) {
        setSelectedTech(null);
        setModalError(null);
        setPendingDecision(null);
        setReviewNote("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTech]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tradeFilter, verStatusFilter]);

  // Filter logic
  const filteredTechs = useMemo(() => {
    return technicians.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.technicianName.toLowerCase().includes(q) ||
        t.employeeId.toLowerCase().includes(q) ||
        t.branch.toLowerCase().includes(q) ||
        t.licenseName.toLowerCase().includes(q) ||
        t.licenseNumber.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q);

      const matchesTrade =
        tradeFilter === "ALL" ||
        t.primaryTrade === tradeFilter ||
        t.secondaryTrades.includes(tradeFilter as ServiceCategory);

      const matchesStatus =
        verStatusFilter === "ALL" || t.verificationStatus === verStatusFilter;

      return matchesSearch && matchesTrade && matchesStatus;
    });
  }, [technicians, searchQuery, tradeFilter, verStatusFilter]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredTechs.length / pageSize));
  const paginatedTechs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTechs.slice(start, start + pageSize);
  }, [filteredTechs, currentPage, pageSize]);

  // Counts for status tabs
  const pendingCount = useMemo(
    () => technicians.filter((t) => t.verificationStatus === "PENDING_REVIEW").length,
    [technicians]
  );

  // Initiate decision workflow with review note and expiration validation
  const handleInitiateDecision = (status: "VERIFIED" | "REJECTED") => {
    setModalError(null);
    if (status === "VERIFIED" && selectedTech?.expiryDate) {
      const expDate = new Date(selectedTech.expiryDate);
      if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
        setModalError(
          `Cannot approve expired credential (${selectedTech.expiryDate}). Formal certificate renewal or supervisor exception is required.`
        );
        return;
      }
    }
    if (status === "REJECTED" && !reviewNote.trim()) {
      setModalError(
        "Please provide an administrative audit note explaining the rejection reason before proceeding."
      );
      return;
    }
    setPendingDecision(status);
  };

  // Execute confirmed decision
  const executeDecision = async () => {
    if (!selectedTech || !pendingDecision) return;

    setIsSubmitting(true);
    setModalError(null);

    const res = await AdminService.submitVerificationDecision(selectedTech.id, {
      status: pendingDecision,
      notes: reviewNote.trim() || `Administrative ${pendingDecision.toLowerCase()} decision recorded.`,
    });

    if (res.success && res.data) {
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === selectedTech.id
            ? {
                ...t,
                verificationStatus: pendingDecision,
                verifiedAt: new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
                verifiedBy: "Pranta (Lead Admin)",
                verificationNotes: reviewNote.trim(),
              }
            : t
        )
      );

      const noticePrefix = res.isLive ? "Verification updated:" : "Saved in Local Preview:";
      setActionSuccessNotice(
        `${noticePrefix} ${selectedTech.technicianName} marked as ${
          pendingDecision === "VERIFIED" ? "verified" : "rejected"
        }.`
      );
      setSelectedTech(null);
      setPendingDecision(null);
      setReviewNote("");
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } else {
      setPendingDecision(null);
      setModalError(
        res.error ||
          `Backend endpoint PATCH /api/technicians/${selectedTech.id}/verify is unavailable. Decision not saved.`
      );
    }

    setIsSubmitting(false);
  };

  const openAuditModal = (tech: TechnicianVerificationProfile, trigger: HTMLElement) => {
    lastFocusedTriggerRef.current = trigger;
    setSelectedTech(tech);
    setPendingDecision(null);
    setModalError(null);
    setReviewNote(tech.verificationNotes || "");
  };

  return (
    <Layout title="Technicians">
      <div className="space-y-4 pb-24">
        {/* ── Sub-header / Status Toolbar ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">
              {technicians.length} total registered
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
                {pendingCount} pending review
              </span>
            )}
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
              onClick={loadTechnicians}
              disabled={isLoading}
              title="Refresh"
              aria-label="Refresh list"
              className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 disabled:opacity-40 transition-colors btn-press"
            >
              <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Alerts ──────────────────────────────────────────── */}
        {apiError && isLiveConnected && (
          <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-xs text-[#8a1858] dark:border-[#b8287a]/30 dark:bg-[#b8287a]/15 dark:text-[#f472b6] flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-[#8a1858] dark:text-[#f472b6] shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              type="button"
              onClick={loadTechnicians}
              className="text-xs font-semibold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {actionSuccessNotice && (
          <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-center gap-2 shadow-xs animate-fade-in">
            <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {/* ── Filter Bar ────────────────────────────────────────── */}
        <div className="p-3.5 rounded-xl border border-slate-300 border-l-4 border-l-emerald-500 bg-white shadow-md dark:border-white/5 dark:border-l-white/5 dark:bg-zinc-900 dark:shadow-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, license, or branch..."
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-0.5"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>

          {/* Center: Trade dropdown */}
          <div className="shrink-0">
            <select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
              aria-label="Filter by trade"
              className="w-full md:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 transition-all cursor-pointer font-bold shadow-xs"
            >
              <option value="ALL">All 7 Trades</option>
              {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Verification Status pills */}
          <div className="flex items-center gap-1 shrink-0 p-1 rounded-xl border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-zinc-950 shadow-xs">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "PENDING_REVIEW", label: "Pending" },
                { id: "VERIFIED", label: "Verified" },
                { id: "REJECTED", label: "Rejected" },
              ] as const
            ).map(({ id, label }) => {
              const isActive = verStatusFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVerStatusFilter(id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-slate-950 shadow-xs border border-slate-300 dark:bg-zinc-800 dark:text-zinc-50 dark:border-white/10 font-bold"
                      : "text-slate-700 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-100 font-semibold"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Technicians Table ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-500 rounded-xl shadow-md overflow-hidden dark:bg-zinc-900 dark:border-white/5 dark:border-t-white/5 dark:shadow-none w-full max-w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead className="bg-slate-200/70 border-b-2 border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider dark:bg-zinc-950/60 dark:border-white/5 dark:text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Primary Trade</th>
                  <th className="py-2.5 px-4">Credential</th>
                  <th className="py-2.5 px-4">Branch</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={`skel-${idx}`} className="animate-pulse">
                      <td className="py-3 px-4">
                        <div className="h-4 w-28 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-16 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-32 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-36 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-20 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-5 w-16 bg-[var(--border)] rounded-full" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-7 w-16 bg-[var(--border)] rounded-lg inline-block" />
                      </td>
                    </tr>
                  ))
                ) : paginatedTechs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-semibold text-sm text-[var(--text-primary)]">
                          No technicians found
                        </p>
                        <p className="text-xs">Try adjusting your search or filters.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setTradeFilter("ALL");
                            setVerStatusFilter("ALL");
                          }}
                          className="px-3 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs font-medium text-[var(--text-primary)] hover:border-[#10b981] transition-colors"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTechs.map((t) => {
                    const cleanWords = t.technicianName.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).filter(Boolean);
                    const initials = cleanWords.map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "T";

                    return (
                      <tr
                        key={t.id}
                        className="odd:bg-white even:bg-slate-50/90 hover:bg-emerald-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        {/* Technician: Avatar, Name, Employee ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-white/10 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-zinc-200 shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50 truncate">
                                {t.technicianName}
                              </div>
                              <div className="font-mono text-xs text-slate-600 dark:text-zinc-400">
                                {t.employeeId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Trade: Primary + Secondary badge */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50 truncate max-w-[160px]">
                            {t.primaryTrade}
                          </div>
                          {t.secondaryTrades.length > 0 && (
                            <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium truncate max-w-[160px]">
                              +{t.secondaryTrades.length} additional
                            </div>
                          )}
                        </td>

                        {/* License / Credential */}
                        <td className="py-3.5 px-4">
                          <div
                            className="font-mono text-xs font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[180px]"
                            title={t.licenseName}
                          >
                            {t.licenseNumber}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {t.hasLicenseDocument ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                <FileTextIcon size={11} />
                                Document
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-600 dark:text-zinc-400 font-semibold">
                                <AlertTriangleIcon size={11} />
                                Missing
                              </span>
                            )}
                            <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium tabular-nums">
                              · Exp {t.expiryDate}
                            </span>
                          </div>
                        </td>

                        {/* Branch / Area */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-950 dark:text-zinc-50 font-bold text-xs sm:text-[13px]">
                            {t.branch}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
                            {t.currentArea}
                          </div>
                        </td>

                        {/* Status (Dual-Theme Badge) */}
                        <td className="py-3.5 px-4">
                          {t.verificationStatus === "VERIFIED" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Verified
                            </span>
                          )}
                          {t.verificationStatus === "PENDING_REVIEW" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse" />
                              Pending
                            </span>
                          )}
                          {t.verificationStatus === "REJECTED" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-[#8a1858] border border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#b8287a]" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Action: Single clean button */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => openAuditModal(t, e.currentTarget)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs btn-press ${
                              t.verificationStatus === "PENDING_REVIEW"
                                ? "bg-[#10b981] text-[#06090e] hover:bg-[#059669]"
                                : "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            }`}
                          >
                            <span>{t.verificationStatus === "PENDING_REVIEW" ? "Review" : "View"}</span>
                            <ChevronRightIcon size={12} />
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
          <div className="py-2.5 px-4 border-t border-slate-300 bg-slate-100 dark:border-white/5 dark:bg-zinc-950/60 flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-zinc-400 font-medium">
            <div>
              {filteredTechs.length > 0 ? (
                <>
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, filteredTechs.length)} of{" "}
                  {filteredTechs.length}
                </>
              ) : (
                "0 results"
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
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
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 disabled:opacity-40 hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 transition-all font-bold text-xs shadow-xs btn-press"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal: Technician Verification & Document Audit ────────────── */}
        {selectedTech && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="passport-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-lg rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div>
                  <h3
                    id="passport-modal-title"
                    className="font-heading font-bold text-base text-slate-950 dark:text-zinc-50"
                  >
                    Technician Credential Audit
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono mt-0.5 font-medium">
                    {selectedTech.employeeId} · {selectedTech.branch}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTech(null);
                    setModalError(null);
                  }}
                  aria-label="Close dialog"
                  className="p-1 rounded-md border border-slate-300 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {/* Modal Error Notice (Honest backend reporting) */}
              {modalError && (
                <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-xs text-[#8a1858] dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30 flex items-start gap-2">
                  <AlertTriangleIcon size={14} className="text-[#b8287a] shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Action Not Persisted</strong>
                    <span>{modalError}</span>
                  </div>
                </div>
              )}

              {/* Technician Identity Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 dark:bg-zinc-950 dark:border-white/10 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Name</span>
                  <span className="font-semibold text-slate-950 dark:text-zinc-50">
                    {selectedTech.technicianName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Contact</span>
                  <span className="font-mono text-slate-950 dark:text-zinc-50 truncate block font-medium">
                    {selectedTech.phone || selectedTech.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Primary Trade</span>
                  <span className="font-semibold text-slate-950 dark:text-zinc-50">
                    {selectedTech.primaryTrade}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-zinc-400 text-[11px] block font-medium">Secondary Trades</span>
                  <span className="text-slate-950 dark:text-zinc-50 font-medium">
                    {selectedTech.secondaryTrades.length > 0
                      ? selectedTech.secondaryTrades.join(", ")
                      : "None"}
                  </span>
                </div>
              </div>

              {/* Credential & Document Card */}
              <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-300 dark:bg-zinc-950/50 dark:border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-950 dark:text-zinc-50 truncate">
                    {selectedTech.licenseName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedTech.verificationStatus === "VERIFIED"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        : selectedTech.verificationStatus === "PENDING_REVIEW"
                        ? "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30"
                        : "bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30"
                    }`}
                  >
                    {selectedTech.verificationStatus.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-zinc-400 pt-2 border-t border-slate-200 dark:border-white/10 font-medium">
                  <div>
                    Issuing Authority:{" "}
                    <strong className="text-slate-950 dark:text-zinc-100 block font-semibold">
                      {selectedTech.issuingAuthority}
                    </strong>
                  </div>
                  <div>
                    License Number:{" "}
                    <strong className="font-mono text-slate-950 dark:text-zinc-100 block font-semibold">
                      {selectedTech.licenseNumber}
                    </strong>
                  </div>
                  <div>
                    Expiry Date:{" "}
                    <strong className="text-slate-950 dark:text-zinc-100 block font-semibold">
                      {selectedTech.expiryDate}
                    </strong>
                  </div>
                  <div>
                    Submitted:{" "}
                    <strong className="text-slate-950 dark:text-zinc-100 block font-semibold">
                      {selectedTech.submittedDate}
                    </strong>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300 dark:bg-zinc-900 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileTextIcon size={14} className="text-slate-500 dark:text-zinc-400" />
                    <span className="text-[11px] font-semibold text-slate-950 dark:text-zinc-100">
                      {selectedTech.hasLicenseDocument
                        ? "Regulatory License Document (PDF/Scan)"
                        : "No document attached"}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      selectedTech.hasLicenseDocument
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        : "bg-rose-50 text-[#8a1858] border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30"
                    }`}
                  >
                    {selectedTech.hasLicenseDocument ? "On Record" : "Missing File"}
                  </span>
                </div>
              </div>

              {/* Administrative Review Note */}
              <div>
                <label
                  htmlFor="tech-review-notes"
                  className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1"
                >
                  Audit Note{" "}
                  {pendingDecision === "REJECTED" ? (
                    <span className="text-[#8a1858] dark:text-[#e879b9] font-normal">
                      *(Required for rejection)
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-zinc-400 font-normal">
                      (Optional)
                    </span>
                  )}
                </label>
                <textarea
                  id="tech-review-notes"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Notes regarding credential verification or reason for rejection..."
                  rows={2}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-100/80 text-xs text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 transition-all outline-none"
                />
              </div>

              {/* Confirmation Prompt when decision is initiated */}
              {pendingDecision && (
                <div className={`p-3.5 rounded-xl border space-y-2.5 animate-fade-in ${
                  pendingDecision === "VERIFIED"
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : "border-rose-300 bg-rose-50 dark:border-[#b8287a]/30 dark:bg-[#b8287a]/15"
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangleIcon
                      size={14}
                      className={`shrink-0 mt-0.5 ${
                        pendingDecision === "VERIFIED"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-[#b8287a] dark:text-[#e879b9]"
                      }`}
                    />
                    <div className="text-xs">
                      <h4 className="font-bold text-slate-950 dark:text-zinc-50">
                        Confirm{" "}
                        {pendingDecision === "VERIFIED"
                          ? "Credential Verification"
                          : "Credential Rejection"}
                      </h4>
                      <p className="text-[11px] text-slate-700 dark:text-zinc-300 mt-0.5 font-medium">
                        {pendingDecision === "VERIFIED"
                          ? `Verify ${selectedTech.technicianName}'s skill passport for dispatch eligibility?`
                          : `Reject ${selectedTech.technicianName}'s credential? The technician will remain ineligible.`}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                    pendingDecision === "VERIFIED"
                      ? "border-emerald-200 dark:border-emerald-500/20"
                      : "border-rose-200 dark:border-[#b8287a]/20"
                  }`}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setPendingDecision(null)}
                      className="px-3 py-1 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 btn-press"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={executeDecision}
                      className={`px-3.5 py-1 rounded-md text-xs font-bold transition-all shadow-sm btn-press ${
                        pendingDecision === "VERIFIED"
                          ? "bg-[#10b981] text-[#06090e] hover:bg-[#059669]"
                          : "bg-[#b8287a] text-white hover:bg-[#961c60]"
                      } disabled:opacity-50`}
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : pendingDecision === "VERIFIED"
                        ? "Confirm & Verify"
                        : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!pendingDecision && (
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setSelectedTech(null);
                      setModalError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:border-white/10 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors btn-press"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleInitiateDecision("REJECTED")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-300 text-[#8a1858] bg-rose-50 hover:bg-rose-100 dark:border-[#b8287a]/30 dark:text-[#e879b9] dark:bg-[#b8287a]/15 dark:hover:bg-[#b8287a]/25 transition-colors disabled:opacity-50 btn-press"
                    >
                      Reject Credential
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleInitiateDecision("VERIFIED")}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#059669] transition-all shadow-sm disabled:opacity-50 btn-press"
                    >
                      ✓ Approve & Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}