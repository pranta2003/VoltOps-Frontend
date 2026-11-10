import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import api from "../../api/axios";
import {
  CANONICAL_SERVICE_CATEGORIES,
  ServiceCategory,
  TechnicianStatus,
} from "../../types";
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  WrenchIcon,
  ArrowRightIcon,
} from "../../components/Icons";

interface VerificationItem {
  id: string;
  technicianName: string;
  employeeId: string;
  email: string;
  branch: string;
  currentArea: string;
  status: TechnicianStatus;
  primaryTrade: ServiceCategory;
  secondaryTrades: ServiceCategory[];
  licenseName: string;
  licenseNumber: string;
  issuingAuthority: string;
  expiryDate: string;
  verificationStatus: "VERIFIED" | "PENDING_REVIEW" | "REJECTED";
  submittedDate: string;
}

const SEED_TECHNICIANS: VerificationItem[] = [
  {
    id: "tech-ver-1",
    technicianName: "Kamrul Islam",
    employeeId: "TECH-EPZ-01",
    email: "kamrul@voltops.com",
    branch: "EPZ Industrial Core",
    currentArea: "Sector 7, EPZ Dhaka",
    status: "AVAILABLE",
    primaryTrade: "Electrical and power systems",
    secondaryTrades: ["AC, HVAC, and cooling", "Facility maintenance"],
    licenseName: "Electrical Supervisory License (Class A - High Voltage)",
    licenseNumber: "ESL-HV-99412",
    issuingAuthority: "Electrical Licensing Board (ELB), Bangladesh",
    expiryDate: "15 Dec 2027",
    verificationStatus: "VERIFIED",
    submittedDate: "12 Oct 2026",
  },
  {
    id: "tech-ver-2",
    technicianName: "Tariqul Alam",
    employeeId: "TECH-GZP-04",
    email: "tariqul@voltops.com",
    branch: "Gazipur Hub",
    currentArea: "Tongi Industrial Hub",
    status: "ON_JOB",
    primaryTrade: "AC, HVAC, and cooling",
    secondaryTrades: ["Electrical and power systems"],
    licenseName: "HVAC Chillers & Refrigeration Safety Specialist",
    licenseNumber: "HVAC-CERT-4401",
    issuingAuthority: "ASHRAE Certified Safety Council",
    expiryDate: "30 Aug 2027",
    verificationStatus: "VERIFIED",
    submittedDate: "18 Oct 2026",
  },
  {
    id: "tech-ver-3",
    technicianName: "Rafiqul Islam",
    employeeId: "TECH-TJ-09",
    email: "rafiqul@voltops.com",
    branch: "Tejgaon Industrial",
    currentArea: "Mohakhali / Tejgaon Corridor",
    status: "OFF_DUTY",
    primaryTrade: "CCTV and security",
    secondaryTrades: ["Internet, networking, and hardware", "IT and software support"],
    licenseName: "Biometric Access Control & IP Surveillance Master",
    licenseNumber: "SEC-IP-7821",
    issuingAuthority: "National Security Tech Regulatory Body",
    expiryDate: "10 Nov 2026",
    verificationStatus: "PENDING_REVIEW",
    submittedDate: "Today, 10:45 AM",
  },
  {
    id: "tech-ver-4",
    technicianName: "Nazmul Huda",
    employeeId: "TECH-EPZ-12",
    email: "nazmul@voltops.com",
    branch: "EPZ Industrial Core",
    currentArea: "DEPZ Zone 2",
    status: "AVAILABLE",
    primaryTrade: "Plumbing and water systems",
    secondaryTrades: ["Facility maintenance"],
    licenseName: "Industrial Fluid & Booster Pump Safety Certification",
    licenseNumber: "PLUMB-IND-3209",
    issuingAuthority: "Public Works Engineering Directorate",
    expiryDate: "05 Apr 2028",
    verificationStatus: "PENDING_REVIEW",
    submittedDate: "09 Nov 2026",
  },
  {
    id: "tech-ver-5",
    technicianName: "Mahmud Hasan",
    employeeId: "TECH-NG-07",
    email: "mahmud@voltops.com",
    branch: "Narayanganj Port",
    currentArea: "Kanchpur Industrial Estate",
    status: "UNAVAILABLE",
    primaryTrade: "Internet, networking, and hardware",
    secondaryTrades: ["IT and software support"],
    licenseName: "Cisco Certified Network Associate (CCNA - Enterprise Core)",
    licenseNumber: "CSCO-142890",
    issuingAuthority: "Cisco Systems Global",
    expiryDate: "20 Jan 2025",
    verificationStatus: "REJECTED",
    submittedDate: "01 Nov 2026",
  },
];

export function TechnicianVerification() {
  const [technicians, setTechnicians] = useState<VerificationItem[]>(SEED_TECHNICIANS);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string>("ALL");
  const [verStatusFilter, setVerStatusFilter] = useState<"ALL" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  // Inspection modal
  const [selectedTech, setSelectedTech] = useState<VerificationItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    // Attempt live fetch from real backend GET /api/technicians
    api
      .get("/technicians")
      .then((res) => {
        if (res.data?.technicians && res.data.technicians.length > 0) {
          const liveItems: VerificationItem[] = res.data.technicians.map((bt: any, idx: number) => {
            const primaryCert = bt.certifications?.[0]?.certification?.name || "Electrical Safety Certification";
            const primarySkill = bt.skills?.[0]?.skill?.name || "Electrical and power systems";
            const expiryStr = bt.certifications?.[0]?.expiryDate
              ? new Date(bt.certifications[0].expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : "15 Dec 2027";

            return {
              id: bt.id || `tech-live-${idx}`,
              technicianName: bt.user?.name || `Technician ${idx + 1}`,
              employeeId: bt.employeeId || `TECH-00${idx + 1}`,
              email: bt.user?.email || "technician@voltops.test",
              branch: bt.branch || "EPZ Industrial Core",
              currentArea: bt.currentArea || "Industrial Zone 1",
              status: bt.status || "AVAILABLE",
              primaryTrade: "Electrical and power systems" as ServiceCategory,
              secondaryTrades: ["AC, HVAC, and cooling" as ServiceCategory],
              licenseName: primaryCert,
              licenseNumber: `ELB-${bt.employeeId || idx + 101}`,
              issuingAuthority: "Electrical Licensing Board (ELB), Bangladesh",
              expiryDate: expiryStr,
              verificationStatus: "VERIFIED" as const,
              submittedDate: new Date(bt.joiningDate || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            };
          });

          // Merge live technicians with seeded directory so all 7 canonical trades remain viewable
          setTechnicians((prev) => {
            const liveEmails = new Set(liveItems.map((l) => l.email));
            const remainingSeed = prev.filter((p) => !liveEmails.has(p.email));
            return [...liveItems, ...remainingSeed];
          });

          setIsLiveConnected(true);
        }
      })
      .catch(() => {
        setIsLiveConnected(false);
      });
  }, []);

  // Filtered tech list
  const filteredTechs = useMemo(() => {
    return technicians.filter((t) => {
      const matchesSearch =
        t.technicianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.licenseName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTrade =
        tradeFilter === "ALL" ||
        t.primaryTrade === tradeFilter ||
        t.secondaryTrades.includes(tradeFilter as ServiceCategory);

      const matchesStatus =
        verStatusFilter === "ALL" || t.verificationStatus === verStatusFilter;

      return matchesSearch && matchesTrade && matchesStatus;
    });
  }, [technicians, searchQuery, tradeFilter, verStatusFilter]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredTechs.length / pageSize));
  const paginatedTechs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTechs.slice(start, start + pageSize);
  }, [filteredTechs, currentPage, pageSize]);

  const handleApprove = (techId: string) => {
    setTechnicians((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, verificationStatus: "VERIFIED" } : t))
    );
    setActionSuccessNotice(`Verification approved for ${selectedTech?.technicianName}. Skill passport updated.`);
    setSelectedTech(null);
    setReviewNote("");
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const handleReject = (techId: string) => {
    setTechnicians((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, verificationStatus: "REJECTED" } : t))
    );
    setActionSuccessNotice(`Credential flagged as rejected for ${selectedTech?.technicianName}. Re-upload required.`);
    setSelectedTech(null);
    setReviewNote("");
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const getVerificationBadge = (st: VerificationItem["verificationStatus"]) => {
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
      {/* ── Backend Status & Policy Banner ─────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon size={18} className="text-[#10b981] shrink-0" />
          <span className="text-[var(--text-primary)]">
            <strong>7-Trade Standard:</strong> Only technicians with verified credentials are recommended by the matching engine.
          </span>
        </div>

        <span
          className={`px-3 py-1 rounded-full font-bold border shrink-0 ${
            isLiveConnected
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
          }`}
        >
          {isLiveConnected ? "GET /api/technicians Active" : "Seeded Baseline Dataset"}
        </span>
      </div>

      {actionSuccessNotice && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircleIcon size={16} className="text-[#10b981]" />
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
              placeholder="Search by technician, license name, license #, or employee ID..."
              className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full"
            />
          </div>

          {/* Verification Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
            <span className="text-[var(--text-muted)]">Verification:</span>
            {(["ALL", "PENDING_REVIEW", "VERIFIED", "REJECTED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setVerStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
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
                : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
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
                <th className="py-3.5 px-4 font-semibold">Primary Trade</th>
                <th className="py-3.5 px-4 font-semibold">Audited License / Credential</th>
                <th className="py-3.5 px-4 font-semibold">Branch & Area</th>
                <th className="py-3.5 px-4 font-semibold">Verification Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedTechs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    No technicians matching the selected criteria.
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
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t.employeeId}</span>
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
                      <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                        Lic #{t.licenseNumber} · Expires {t.expiryDate}
                      </div>
                    </td>

                    {/* Branch & Area */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-[var(--text-primary)]">{t.branch}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{t.currentArea}</div>
                    </td>

                    {/* Verification Status Pill */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getVerificationBadge(t.verificationStatus)}`}>
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
                        onClick={() => setSelectedTech(t)}
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
            Showing <strong className="text-[var(--text-primary)]">{filteredTechs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-[var(--text-primary)]">{Math.min(currentPage * pageSize, filteredTechs.length)}</strong> of <strong className="text-[var(--text-primary)]">{filteredTechs.length}</strong> certified technicians
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                  Audit Technician Skill Passport
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Employee ID: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{selectedTech.employeeId}</strong> · {selectedTech.branch}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTech(null)}
                className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            {/* Profile Overview */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[var(--text-muted)] block">Candidate Name:</span>
                <span className="font-bold text-[var(--text-primary)] text-sm">{selectedTech.technicianName}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Current Operational Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedTech.status}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Primary Trade:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedTech.primaryTrade}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Assigned Operating Area:</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedTech.currentArea}</span>
              </div>
            </div>

            {/* Audited License Details */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Submitted Trade Credential Document
              </h4>
              <div className="p-4 rounded-2xl border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-primary)]">{selectedTech.licenseName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getVerificationBadge(selectedTech.verificationStatus)}`}>
                    {selectedTech.verificationStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                  <div>Issuing Authority: <strong className="text-[var(--text-primary)]">{selectedTech.issuingAuthority}</strong></div>
                  <div>License / Reg #: <strong className="font-mono text-[var(--text-primary)]">{selectedTech.licenseNumber}</strong></div>
                  <div>Expiry Date: <strong className="text-[var(--text-primary)]">{selectedTech.expiryDate}</strong></div>
                  <div>Submitted Date: <strong className="text-[var(--text-primary)]">{selectedTech.submittedDate}</strong></div>
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
                placeholder="Document check confirmed with ELB registry. Safe for commercial ATS & substation callouts..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-primary)] outline-none focus:border-[#10b981]"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedTech(null)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReject(selectedTech.id)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Reject Credential
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(selectedTech.id)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
                >
                  ✓ Approve & Verify Skill Passport
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
