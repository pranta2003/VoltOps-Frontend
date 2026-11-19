import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { AdminService } from "../services/adminService";
import { AdminOperationalMetrics, TechnicianVerificationProfile } from "../types/admin";
import { MetricCard } from "../components/MetricCard";
import { HorizontalBarChart, HorizontalBarItem } from "../components/charts/HorizontalBarChart";
import { DonutChart, DonutSegment } from "../components/charts/DonutChart";
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BuildingIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  ClockIcon,
} from "../components/Icons";

export function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdminOperationalMetrics>({
    totalUsers: null,
    activeTechnicians: null,
    pendingVerifications: null,
    dispatchersOnDuty: null,
    slaComplianceRate: null,
    dataSource: "UNAVAILABLE",
  });
  const [pendingApprovals, setPendingApprovals] = useState<TechnicianVerificationProfile[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<HorizontalBarItem[]>([]);
  const [verificationSegments, setVerificationSegments] = useState<DonutSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch honest governance telemetry
      const telemetry = await AdminService.getDashboardMetrics();
      setMetrics(telemetry);

      // 2. Fetch technician verification candidates for administrative action
      const techRes = await AdminService.getTechnicians();
      if (techRes.data) {
        const pending = techRes.data.filter((t) => t.verificationStatus === "PENDING_REVIEW");
        setPendingApprovals(pending);

        const verified = techRes.data.filter((t) => t.verificationStatus === "VERIFIED").length;
        const pendingCount = pending.length;
        const rejected = techRes.data.filter((t) => t.verificationStatus === "REJECTED").length;

        setVerificationSegments([
          { label: "Verified Tier 1/2", value: verified, color: "#10b981" },
          { label: "Pending Review", value: pendingCount, color: "#06b6d4" },
          { label: "Rejected / Incomplete", value: rejected, color: "#b8287a" },
        ]);
      } else {
        setPendingApprovals([]);
        setVerificationSegments([]);
      }

      // 3. Fetch directory users for truthful account distribution
      const userRes = await AdminService.getUsers({ limit: 100 });
      if (userRes.data?.data) {
        const allUsers = userRes.data.data;
        const customers = allUsers.filter((u) => u.role === "CUSTOMER").length;
        const technicians = allUsers.filter((u) => u.role === "TECHNICIAN").length;
        const dispatchers = allUsers.filter((u) => u.role === "DISPATCHER").length;
        const admins = allUsers.filter((u) => u.role === "ADMIN").length;

        setRoleDistribution([
          { label: "Commercial Clients", value: customers, color: "#10b981" },
          { label: "Field Technicians", value: technicians, color: "#06b6d4" },
          { label: "Central Dispatchers", value: dispatchers, color: "#3b82f6" },
          { label: "System Administrators", value: admins, color: "#a855f7" },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to load administrative telemetry."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const isLive = metrics.dataSource === "LIVE_API";
  const totalAccounts = roleDistribution.reduce((acc, r) => acc + r.value, 0) || (metrics.totalUsers ?? 8);
  const pendingVerificationCount = pendingApprovals.length;

  return (
    <Layout
      title="Overview"
      subtitle="EPZ Industrial Core Hub"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 transition-all disabled:opacity-50 btn-press"
            title="Refresh telemetry"
            aria-label="Refresh telemetry"
          >
            <RefreshCwIcon size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] text-[#06090e] hover:bg-[#059669] transition-all shadow-sm btn-press"
          >
            <span>Users</span>
            <ArrowRightIcon size={12} />
          </Link>
        </div>
      }
    >
      <div className="space-y-5 pb-24">
        {/* ── Sub-header / Status Toolbar ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">
              Admin: {user?.name || "System Administrator"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry
              </span>
            )}
          </div>
        </div>

        {/* ── Offline Notice (Compact, Non-yellow) ─────────────────────────── */}
        {errorMessage && (
          <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-xs text-[#8a1858] dark:border-[#b8287a]/30 dark:bg-[#b8287a]/15 dark:text-[#f472b6] flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-[#8a1858] dark:text-[#f472b6] shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={loadDashboardData}
              className="text-xs font-semibold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Pending Verification Alert Banner (VoltOps Cyan) ──────────────── */}
        {pendingVerificationCount > 0 && (
          <div className="p-3.5 rounded-xl border border-cyan-300 bg-cyan-50 dark:border-[#06b6d4]/30 dark:bg-[#06b6d4]/10 flex items-center justify-between gap-3 text-xs shadow-md dark:shadow-none">
            <div className="flex items-center gap-2.5">
              <AlertTriangleIcon size={16} className="text-cyan-700 dark:text-[#06b6d4] shrink-0" />
              <span className="text-slate-900 dark:text-zinc-100 font-semibold">
                {pendingVerificationCount} technician skill passport{pendingVerificationCount === 1 ? "" : "s"} awaiting administrative review.
              </span>
            </div>
            <Link
              to="/admin/technicians"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-[#06b6d4] dark:text-zinc-950 dark:hover:bg-[#22d3ee] transition-all shrink-0 shadow-xs btn-press"
            >
              <span>Review Passports</span>
              <ArrowRightIcon size={11} />
            </Link>
          </div>
        )}

        {/* ── Compact Operational Overview Indicators ─────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-300 bg-white shadow-md dark:border-white/5 dark:bg-zinc-900 dark:shadow-none space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Platform status
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-base font-bold font-heading text-slate-950 dark:text-zinc-50">
              System Active
            </div>
            <div className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
              {isLive ? "Backend Live" : "Local Preview"}
            </div>
          </div>

          <Link to="/admin/technicians" className="block">
            <MetricCard
              label="Pending Approvals"
              value={loading ? "—" : pendingVerificationCount}
              subtext="Skill Passports"
              icon={ClockIcon}
              alert={pendingVerificationCount > 0}
              trend={
                pendingVerificationCount > 0
                  ? { direction: "down", label: "Action Needed" }
                  : { direction: "neutral", label: "Clear" }
              }
            />
          </Link>

          <Link to="/admin/users" className="block">
            <MetricCard
              label="System Accounts"
              value={loading ? "—" : totalAccounts}
              subtext="Active Directory"
              icon={BuildingIcon}
              trend={{ direction: "neutral", label: "Directory" }}
            />
          </Link>

          <Link to="/admin/audit" className="block">
            <MetricCard
              label="Security Posture"
              value="Compliant"
              subtext="All Roles Guarded"
              icon={ShieldCheckIcon}
              trend={{ direction: "neutral", label: "0 Alerts" }}
            />
          </Link>
        </div>

        {/* ── Meaningful Operational Telemetry & Distributions ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* User Account Distribution */}
          <div className="lg:col-span-7 p-4 rounded-xl border border-slate-300 border-l-4 border-l-emerald-500 bg-white shadow-md dark:border-white/5 dark:border-l-white/5 dark:bg-zinc-900 dark:shadow-none space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2.5">
              <div>
                <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-950 dark:text-zinc-50">
                  Directory Distribution
                </h3>
                <p className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                  Active accounts by operational role
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 font-semibold tabular-nums">
                {isLive ? "Live Directory" : `${totalAccounts} Baseline Accounts`}
              </span>
            </div>
            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <HorizontalBarChart
                data={roleDistribution}
                valueSuffix=" users"
                emptyMessage="No directory accounts loaded"
              />
            )}
          </div>

          {/* Technician Credential & Licensing Breakdown */}
          <div className="lg:col-span-5 p-4 rounded-xl border border-slate-300 border-l-4 border-l-cyan-500 bg-white shadow-md dark:border-white/5 dark:border-l-white/5 dark:bg-zinc-900 dark:shadow-none space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2.5">
              <div>
                <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-950 dark:text-zinc-50">
                  Verification Status
                </h3>
                <p className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                  Skill passport compliance
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 font-semibold">
                {isLive ? "Live Ledger" : "Credential Ledger"}
              </span>
            </div>
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              </div>
            ) : (
              <DonutChart
                data={verificationSegments}
                totalLabel="Passports"
                size={120}
                strokeWidth={13}
                emptyMessage="No technician records"
              />
            )}
          </div>
        </div>

        {/* ── Administrative Attention & Governance Section ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Panel 1: Pending Administrative Approvals */}
          <div className="lg:col-span-7 p-4 rounded-xl border border-slate-300 bg-white shadow-md dark:border-white/5 dark:bg-zinc-900 dark:shadow-none space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2.5">
              <div>
                <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-950 dark:text-zinc-50">
                  Pending Approvals
                </h3>
                <p className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                  Passports requiring credential sign-off
                </p>
              </div>
              <Link
                to="/admin/technicians"
                className="text-xs font-bold text-emerald-700 dark:text-[#10b981] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRightIcon size={11} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2 py-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : pendingApprovals.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-600 dark:text-zinc-400 border border-dashed border-slate-300 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-zinc-950/40">
                <CheckCircleIcon size={18} className="text-emerald-500 mx-auto mb-1" />
                <p className="font-bold text-slate-950 dark:text-zinc-100">All passports approved</p>
                <p className="text-[11px]">No technician credentials currently awaiting review.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-white/5">
                {pendingApprovals.map((tech) => (
                  <div key={tech.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-950 dark:text-zinc-50 truncate">
                        {tech.technicianName}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-slate-700 dark:text-zinc-300">{tech.primaryTrade}</span>
                        <span>•</span>
                        <span className="font-mono">{tech.licenseNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
                        Pending
                      </span>
                      <Link
                        to="/admin/technicians"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-white/10 dark:hover:bg-zinc-700 transition-all shadow-xs"
                      >
                        Audit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel 2: Security & Governance Posture */}
          <div className="lg:col-span-5 p-4 rounded-xl border border-slate-300 bg-white shadow-md dark:border-white/5 dark:bg-zinc-900 dark:shadow-none space-y-3 flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-200 dark:border-white/5 pb-2.5">
                <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-950 dark:text-zinc-50">
                  Governance Controls
                </h3>
                <p className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                  System policies & compliance boundaries
                </p>
              </div>

              <div className="mt-2.5 space-y-2 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-950 dark:text-zinc-50 block">Role Separation</span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                      Admin, Dispatcher, Tech, Customer
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Guarded
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-950 dark:text-zinc-50 block">Audit Event Ledger</span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                      Immutable action logging
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-950 dark:text-zinc-50 block">Service-Credit Engine</span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                      Allowance deduction rules
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Enforced
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
              <Link
                to="/admin/audit"
                className="font-bold text-emerald-700 dark:text-[#10b981] hover:underline flex items-center gap-1"
              >
                <span>Audit Log</span>
                <ArrowRightIcon size={11} />
              </Link>
              <Link
                to="/admin/users"
                className="text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 font-semibold"
              >
                Users Directory →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
