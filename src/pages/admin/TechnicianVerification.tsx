import { useState, useEffect, useMemo, useCallback } from "react";
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
  ClockIcon,
  FileTextIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  BuildingIcon,
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
  const pageSize = 5;

  // Audit modal state
  const [selectedTech, setSelectedTech] = useState<TechnicianVerificationProfile | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

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

  // Keyboard accessibility: Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTech) {
        setSelectedTech(null);
        setModalError(null);
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

  // Handle Verification Decision Submission
  const handleDecision = async (status: "VERIFIED" | "REJECTED") => {
    if (!selectedTech) return;

    setIsSubmitting(true);
    setModalError(null);

    const res = await AdminService.submitVerificationDecision(selectedTech.id, {
      status,
      notes: reviewNote.trim() || `Administrative ${status.toLowerCase()} decision recorded.`,
    });

    if (res.success && res.data) {
      // Real backend persisted the decision
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === selectedTech.id
            ? {
                ...t,
                verificationStatus: status,
                verifiedAt: new Date().toISOString(),
                verifiedBy: "Lead Administrator",
                verificationNotes: reviewNote.trim(),
              }
            : t
        )
      );

      setActionSuccessNotice(
        `Verification successfully ${
          status === "VERIFIED" ? "approved" : "rejected"
        } for ${selectedTech.technicianName}. Skill passport updated.`
      );
      setSelectedTech(null);
      setReviewNote("");
      setTimeout(() => setActionSuccessNotice(null), 5000);
    } else {
      // Backend rejected or endpoint 404: display honest error inside modal
      setModalError(
        res.error ||
          `Backend endpoint PATCH /api/technicians/${selectedTech.id}/verify is unavailable. Decision was NOT saved.`
      );
    }

    setIsSubmitting(false);
  };

  const getVerificationBadge = (st: VerificationDecision) => {
    switch (st) {
      case "VERIFIED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "PENDING_REVIEW":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "REJECTED":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    }
  };

  return (
    <Layout
      title="Technician Skill Passports & Verification"
      subtitle="Strict credential auditing across all 7 canonical trades before dispatch matching eligibility"
    >
      <div className="space-y-6">
        {/* ── Backend Status & Policy Banner ─────────────────────────────── */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheckIcon size={18} className="text-[#10b981] shrink-0" />
            <span className="text-[var(--text-primary)]">
              <strong>7-Trade Standard:</strong> Only technicians with verified licenses and valid expiry dates are eligible for automated dispatch scoring.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLiveConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Backend API (GET /api/technicians)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Offline Verification Baseline
              </span>
            )}

            <button
              type="button"
              onClick={loadTechnicians}
              disabled={isLoading}
              title="Refresh directory"
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
            >
              🔄
            </button>
          </div>
        </div>

        {/* ── Global Notices ────────────────────────────────────────────── */}
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
              onClick={loadTechnicians}
              className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/20 font-bold hover:bg-amber-500/30 transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {actionSuccessNotice && (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircleIcon size={16} className="text-[#10b981] shrink-0" />
            <span>{actionSuccessNotice}</span>
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by technician name, license name, license #, or employee ID..."
                className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Verification Status Filter */}
            <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium overflow-x-auto pb-1 md:pb-0">
              <span className="text-[var(--text-muted)] shrink-0">Verification:</span>
              {(["ALL", "PENDING_REVIEW", "VERIFIED", "REJECTED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setVerStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
                    verStatusFilter === st
                      ? "bg-[#10b981] text-[#06090e] border-[#10b981]"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {st === "PENDING_REVIEW" ? "Pending" : st}
                </button>
              ))}
            </div>
          </div>

          {/* 7 Canonical Service Trades Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)] text-xs">
            <span className="font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
              Trade:
            </span>
            <button
              type="button"
              onClick={() => setTradeFilter("ALL")}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                tradeFilter === "ALL"
                  ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-transparent"
                  : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              All 7 Trades
            </button>
            {CANONICAL_SERVICE_CATEGORIES.map((trade) => {
              const isSelected = tradeFilter === trade;
              return (
                <button
                  key={trade}
                  type="button"
                  onClick={() => setTradeFilter(trade)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-[#10b981] text-[#06090e] border-[#10b981] font-bold"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {trade}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Technicians Directory Table ────────────────────────────────── */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-2)] text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Technician</th>
                  <th className="py-3.5 px-4 font-semibold">Primary & Secondary Trades</th>
                  <th className="py-3.5 px-4 font-semibold">Audited License / Credential</th>
                  <th className="py-3.5 px-4 font-semibold">Branch & Area</th>
                  <th className="py-3.5 px-4 font-semibold">Verification Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={`skel-${idx}`} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="h-4 w-32 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-44 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-28 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-20 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-40 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-28 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-24 bg-[var(--border)] rounded mb-1" />
                        <div className="h-3 w-20 bg-[var(--border)] rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-5 w-20 bg-[var(--border)] rounded-full" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="h-7 w-24 bg-[var(--border)] rounded-xl inline-block" />
                      </td>
                    </tr>
                  ))
                ) : paginatedTechs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-semibold text-[var(--text-primary)]">No technicians match your criteria</p>
                        <p className="text-xs">Try clearing search filters or selecting All 7 Trades.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setTradeFilter("ALL");
                            setVerStatusFilter("ALL");
                          }}
                          className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs font-bold text-[var(--text-primary)] hover:border-[#10b981]"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTechs.map((t) => (
                    <tr key={t.id} className="hover:bg-[var(--bg-surface-2)]/50 transition-colors">
                      {/* Tech Name & Employee ID */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-sm text-[var(--text-primary)]">
                          {t.technicianName}
                        </div>
                        <div className="text-[var(--text-muted)] font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {t.employeeId}
                          </span>
                          <span>•</span>
                          <span>{t.email}</span>
                        </div>
                      </td>

                      {/* Primary Trade */}
                      <td className="py-4 px-4">
                        <span className="font-semibold text-[var(--text-primary)] block">
                          {t.primaryTrade}
                        </span>
                        {t.secondaryTrades.length > 0 && (
                          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                            + {t.secondaryTrades.join(", ")}
                          </span>
                        )}
                      </td>

                      {/* License Name & Expiry */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-[var(--text-primary)] max-w-xs truncate" title={t.licenseName}>
                          {t.licenseName}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 flex items-center gap-1.5">
                          <span>Lic #{t.licenseNumber}</span>
                          <span>·</span>
                          <span>Expires {t.expiryDate}</span>
                        </div>
                        <div className="mt-1">
                          {t.hasLicenseDocument ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <FileTextIcon size={12} />
                              Document attached
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              <AlertTriangleIcon size={12} />
                              No document file
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Branch & Area */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-[var(--text-primary)]">{t.branch}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{t.currentArea}</div>
                      </td>

                      {/* Verification Status Pill */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getVerificationBadge(
                            t.verificationStatus
                          )}`}
                        >
                          {t.verificationStatus === "VERIFIED" && "✓ "}
                          {t.verificationStatus === "PENDING_REVIEW" && "⏳ "}
                          {t.verificationStatus === "REJECTED" && "✕ "}
                          <span>{t.verificationStatus.replace("_", " ")}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTech(t);
                            setModalError(null);
                            setReviewNote(t.verificationNotes || "");
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                            t.verificationStatus === "PENDING_REVIEW"
                              ? "bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400"
                              : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:border-[#10b981]"
                          }`}
                        >
                          {t.verificationStatus === "PENDING_REVIEW" ? "Audit & Verify" : "View Passport"}
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
                {filteredTechs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-[var(--text-primary)]">
                {Math.min(currentPage * pageSize, filteredTechs.length)}
              </strong>{" "}
              of <strong className="text-[var(--text-primary)]">{filteredTechs.length}</strong> certified technicians
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

        {/* ── Modal: Technician Verification & Document Audit ────────────── */}
        {selectedTech && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="passport-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <h3 id="passport-modal-title" className="font-heading font-bold text-lg text-[var(--text-primary)]">
                    Audit Technician Skill Passport
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Employee ID:{" "}
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {selectedTech.employeeId}
                    </strong>{" "}
                    · {selectedTech.branch}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTech(null);
                    setModalError(null);
                  }}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>

              {/* Modal Error Notice (Honest backend reporting) */}
              {modalError && (
                <div className="p-3.5 rounded-2xl border border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
                  <AlertTriangleIcon size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Action Not Persisted:</strong>
                    <span>{modalError}</span>
                  </div>
                </div>
              )}

              {/* Profile Overview */}
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] block">Candidate Name:</span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">
                    {selectedTech.technicianName}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Current Operational Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTech.status}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Primary Trade:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedTech.primaryTrade}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Secondary Trades:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {selectedTech.secondaryTrades.length > 0
                      ? selectedTech.secondaryTrades.join(", ")
                      : "None registered"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Assigned Operating Area:</span>
                  <span className="font-medium text-[var(--text-primary)]">{selectedTech.currentArea}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Contact Details:</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {selectedTech.phone || selectedTech.email}
                  </span>
                </div>
              </div>

              {/* Audited License Details */}
              <div className="space-y-3 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Submitted Trade Credential Document
                </h4>
                <div className="p-4 rounded-2xl border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      {selectedTech.licenseName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getVerificationBadge(
                        selectedTech.verificationStatus
                      )}`}
                    >
                      {selectedTech.verificationStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                    <div>
                      Issuing Authority:{" "}
                      <strong className="text-[var(--text-primary)]">{selectedTech.issuingAuthority}</strong>
                    </div>
                    <div>
                      License / Reg #:{" "}
                      <strong className="font-mono text-[var(--text-primary)]">
                        {selectedTech.licenseNumber}
                      </strong>
                    </div>
                    <div>
                      Expiry Date:{" "}
                      <strong className="text-[var(--text-primary)]">{selectedTech.expiryDate}</strong>
                    </div>
                    <div>
                      Submitted Date:{" "}
                      <strong className="text-[var(--text-primary)]">{selectedTech.submittedDate}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileTextIcon size={16} className="text-[var(--text-muted)]" />
                      <span className="font-medium text-[var(--text-primary)]">
                        {selectedTech.hasLicenseDocument
                          ? "Government Regulatory Document Copy (PDF/Image)"
                          : "No document attached with submission"}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        selectedTech.hasLicenseDocument
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {selectedTech.hasLicenseDocument ? "On Record" : "Missing File"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Note */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Administrative Audit Note (Optional)
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Document checked with licensing authority. Verified for commercial callouts..."
                  rows={2}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSelectedTech(null);
                    setModalError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDecision("REJECTED")}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "Reject Credential"}
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDecision("VERIFIED")}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : "✓ Approve & Verify Skill Passport"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}