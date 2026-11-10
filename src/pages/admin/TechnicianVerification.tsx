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

  // Initiate decision workflow with review note validation
  const handleInitiateDecision = (status: "VERIFIED" | "REJECTED") => {
    setModalError(null);
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
                verifiedAt: new Date().toISOString(),
                verifiedBy: "Lead Administrator",
                verificationNotes: reviewNote.trim(),
              }
            : t
        )
      );

      setActionSuccessNotice(
        `Verification updated: ${selectedTech.technicianName} marked as ${
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
      <div className="space-y-4">
        {/* ── Sub-header / Status Toolbar ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">
              {technicians.length} total registered
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                {pendingCount} pending review
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLiveConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Offline data
              </span>
            )}

            <button
              type="button"
              onClick={loadTechnicians}
              disabled={isLoading}
              title="Refresh"
              aria-label="Refresh list"
              className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-40 transition-colors btn-press"
            >
              <RefreshCwIcon size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Alerts (Compact) ──────────────────────────────────────────── */}
        {apiError && (
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
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
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircleIcon size={14} className="text-emerald-500 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {/* ── Compact Filter Bar ────────────────────────────────────────── */}
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, license, or branch..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
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
              className="w-full md:w-auto px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#10b981] transition-all cursor-pointer font-medium"
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
          <div className="flex items-center gap-1 shrink-0 p-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]">
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

        {/* ── Technicians Table ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-2)] text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 px-4">Technician</th>
                  <th className="py-2.5 px-4">Primary Trade</th>
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
                    const initials = t.technicianName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-[var(--bg-surface-2)]/60 transition-colors"
                      >
                        {/* Technician: Avatar, Name, Employee ID */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border)] flex items-center justify-center font-bold text-[11px] text-[var(--text-secondary)] shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[var(--text-primary)] truncate">
                                {t.technicianName}
                              </div>
                              <div className="font-mono text-[11px] text-[var(--text-muted)]">
                                {t.employeeId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Trade: Primary + Secondary badge */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--text-primary)] truncate max-w-[160px]">
                            {t.primaryTrade}
                          </div>
                          {t.secondaryTrades.length > 0 && (
                            <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[160px]">
                              +{t.secondaryTrades.length} additional
                            </div>
                          )}
                        </td>

                        {/* License / Credential */}
                        <td className="py-3 px-4">
                          <div
                            className="font-mono text-[11px] text-[var(--text-primary)] truncate max-w-[180px]"
                            title={t.licenseName}
                          >
                            {t.licenseNumber}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {t.hasLicenseDocument ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <FileTextIcon size={11} />
                                Document
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                <AlertTriangleIcon size={11} />
                                Missing
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)]">
                              · Exp {t.expiryDate}
                            </span>
                          </div>
                        </td>

                        {/* Branch / Area */}
                        <td className="py-3 px-4">
                          <div className="text-[var(--text-primary)] font-medium">
                            {t.branch}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {t.currentArea}
                          </div>
                        </td>

                        {/* Status (Compact dot badge) */}
                        <td className="py-3 px-4">
                          {t.verificationStatus === "VERIFIED" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Verified
                            </span>
                          )}
                          {t.verificationStatus === "PENDING_REVIEW" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending
                            </span>
                          )}
                          {t.verificationStatus === "REJECTED" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Action: Single clean button */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => openAuditModal(t, e.currentTarget)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all btn-press ${
                              t.verificationStatus === "PENDING_REVIEW"
                                ? "bg-[#10b981] text-[#06090e] hover:bg-[#059669] font-semibold shadow-sm"
                                : "border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
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
          <div className="py-2.5 px-4 border-t border-[var(--border)] bg-[var(--bg-surface-2)] flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
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
                className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 hover:border-[#10b981] transition-all font-medium text-xs btn-press"
              >
                Previous
              </button>

              <span className="px-2 text-[var(--text-muted)]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 hover:border-[#10b981] transition-all font-medium text-xs btn-press"
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
            <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h3
                    id="passport-modal-title"
                    className="font-heading font-semibold text-base text-[var(--text-primary)]"
                  >
                    Technician Credential Audit
                  </h3>
                  <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
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
                  className="p-1 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {/* Modal Error Notice (Honest backend reporting) */}
              {modalError && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
                  <AlertTriangleIcon size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Action Not Persisted</strong>
                    <span>{modalError}</span>
                  </div>
                </div>
              )}

              {/* Technician Identity Summary */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] text-[11px] block">Name</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedTech.technicianName}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-[11px] block">Contact</span>
                  <span className="font-mono text-[var(--text-primary)] truncate block">
                    {selectedTech.phone || selectedTech.email}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-[11px] block">Primary Trade</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {selectedTech.primaryTrade}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-[11px] block">Secondary Trades</span>
                  <span className="text-[var(--text-primary)]">
                    {selectedTech.secondaryTrades.length > 0
                      ? selectedTech.secondaryTrades.join(", ")
                      : "None"}
                  </span>
                </div>
              </div>

              {/* Credential & Document Card */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                    {selectedTech.licenseName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      selectedTech.verificationStatus === "VERIFIED"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : selectedTech.verificationStatus === "PENDING_REVIEW"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                    }`}
                  >
                    {selectedTech.verificationStatus.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                  <div>
                    Issuing Authority:{" "}
                    <strong className="text-[var(--text-primary)] block">
                      {selectedTech.issuingAuthority}
                    </strong>
                  </div>
                  <div>
                    License Number:{" "}
                    <strong className="font-mono text-[var(--text-primary)] block">
                      {selectedTech.licenseNumber}
                    </strong>
                  </div>
                  <div>
                    Expiry Date:{" "}
                    <strong className="text-[var(--text-primary)] block">
                      {selectedTech.expiryDate}
                    </strong>
                  </div>
                  <div>
                    Submitted:{" "}
                    <strong className="text-[var(--text-primary)] block">
                      {selectedTech.submittedDate}
                    </strong>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileTextIcon size={14} className="text-[var(--text-muted)]" />
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">
                      {selectedTech.hasLicenseDocument
                        ? "Regulatory License Document (PDF/Scan)"
                        : "No document attached"}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      selectedTech.hasLicenseDocument
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
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
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
                >
                  Audit Note{" "}
                  {pendingDecision === "REJECTED" ? (
                    <span className="text-red-500 font-normal">
                      *(Required for rejection)
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)] font-normal">
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
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[#10b981] transition-all"
                />
              </div>

              {/* Confirmation Prompt when decision is initiated */}
              {pendingDecision && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2.5 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <AlertTriangleIcon
                      size={14}
                      className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                    />
                    <div className="text-xs">
                      <h4 className="font-semibold text-[var(--text-primary)]">
                        Confirm{" "}
                        {pendingDecision === "VERIFIED"
                          ? "Credential Verification"
                          : "Credential Rejection"}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {pendingDecision === "VERIFIED"
                          ? `Verify ${selectedTech.technicianName}'s skill passport for dispatch eligibility?`
                          : `Reject ${selectedTech.technicianName}'s credential? The technician will remain ineligible.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setPendingDecision(null)}
                      className="px-3 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 btn-press"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={executeDecision}
                      className={`px-3.5 py-1 rounded-md text-xs font-semibold transition-all shadow-sm btn-press ${
                        pendingDecision === "VERIFIED"
                          ? "bg-[#10b981] text-[#06090e] hover:bg-[#059669]"
                          : "bg-red-600 text-white hover:bg-red-700"
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
                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setSelectedTech(null);
                      setModalError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors btn-press"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleInitiateDecision("REJECTED")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 btn-press"
                    >
                      Reject Credential
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleInitiateDecision("VERIFIED")}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] text-[#06090e] hover:bg-[#059669] transition-all shadow-sm disabled:opacity-50 btn-press"
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
