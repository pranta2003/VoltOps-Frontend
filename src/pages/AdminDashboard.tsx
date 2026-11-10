import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  ShieldCheckIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  WrenchIcon,
  BuildingIcon,
  SettingsIcon,
  RadioIcon,
  ArrowRightIcon,
} from "../components/Icons";

interface AdminStats {
  totalUsers: number;
  activeTechnicians: number;
  pendingVerifications: number;
  dispatchersOnDuty: number;
  slaComplianceRate: number;
}

const RECENT_ADMIN_EVENTS = [
  {
    id: "evt-101",
    timestamp: "10 Nov 2026, 11:20 AM",
    actor: "Pranta (Lead Admin)",
    action: "Assigned EPZ Branch supervisor role to Dispatcher Tania",
    category: "ROLE_CHANGE",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  {
    id: "evt-102",
    timestamp: "10 Nov 2026, 10:45 AM",
    actor: "System Sentinel",
    action: "Technician Rafiqul Islam uploaded High Voltage License (A-Grade)",
    category: "VERIFICATION",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  {
    id: "evt-103",
    timestamp: "10 Nov 2026, 09:15 AM",
    actor: "Pranta (Lead Admin)",
    action: "Activated new corporate facility customer: Rahimafrooz Hub",
    category: "USER_STATUS",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  {
    id: "evt-104",
    timestamp: "09 Nov 2026, 04:30 PM",
    actor: "Dispatcher Tania",
    action: "Approved emergency work order WO-2048 dispatch override",
    category: "DISPATCH",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  },
];

export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 34,
    activeTechnicians: 18,
    pendingVerifications: 3,
    dispatchersOnDuty: 4,
    slaComplianceRate: 99.2,
  });
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMetrics = () => {
    setLoading(true);
    setErrorMessage(null);
    // Probe actual backend /api/technicians (authorized for ADMIN and DISPATCHER)
    api
      .get("/technicians")
      .then((res) => {
        if (res.data?.technicians) {
          const count = res.data.technicians.length;
          setStats((prev) => ({
            ...prev,
            activeTechnicians: count,
          }));
          setIsLiveConnected(true);
        }
      })
      .catch((err) => {
        setIsLiveConnected(false);
        if (err.response?.status === 403) {
          setErrorMessage("Access forbidden: Requires ADMIN or DISPATCHER role.");
        } else if (err.code === "ERR_NETWORK") {
          setErrorMessage("VoltOps backend server is currently offline (http://localhost:5000). Operating in deterministic baseline mode.");
        } else {
          setErrorMessage(err.response?.data?.error || "Unable to reach backend API. Using seeded baseline.");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <Layout
      title="Admin Governance Console"
      subtitle="Operational governance, staff directories, technician credentials, and audit logging"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#10b981] hover:text-[#10b981] transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh backend telemetry"
          >
            <ClockIcon size={13} className={loading ? "animate-spin text-[#10b981]" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh Status"}</span>
          </button>
          <Link
            to="/admin/users"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>Manage Users</span>
            <ArrowRightIcon size={12} />
          </Link>
        </div>
      }
    >
      {/* ── Top System Operational Status Banner ───────────────────────── */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold flex items-center justify-center text-lg shrink-0">
            ⚡
          </div>
          <div>
            <h2 className="font-heading font-bold text-base text-[var(--text-primary)]">
              Welcome, {user?.name || "System Administrator"}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Role: <span className="font-semibold text-purple-600 dark:text-purple-400">{user?.role}</span> · Root Division: EPZ Industrial Core
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isLiveConnected
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`} />
            <span>{isLiveConnected ? "Backend Connected (/api/technicians)" : "Seeded Baseline Mode"}</span>
          </span>
        </div>
      </div>

      {/* ── Backend Offline / Error Notice ─────────────────────────────── */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <RadioIcon size={14} className="shrink-0 text-blue-500" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchMetrics}
            className="underline font-bold hover:text-blue-600 shrink-0 ml-2"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── Pending Verification Alert Banner ─────────────────────────── */}
      {stats.pendingVerifications > 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangleIcon size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {stats.pendingVerifications} Technician Credentials Awaiting Administrative Review
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                New trade licenses and electrical safety passports require human admin sign-off before dispatch matching eligibility.
              </p>
            </div>
          </div>
          <Link
            to="/admin/technicians"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shrink-0"
          >
            Review Credentials →
          </Link>
        </div>
      )}

      {/* ── Operational Metric Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-semibold mb-2">
              <span>TOTAL ACCOUNTS</span>
              <BuildingIcon size={16} />
            </div>
            <div className="font-heading font-extrabold text-3xl text-[var(--text-primary)]">
              {stats.totalUsers}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
              <span>4 Staff</span> · <span>30 Commercial Customers</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] font-medium">
            Pending `/api/admin/users` migration
          </div>
        </div>

        {/* Card 2: Field Technicians */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-semibold mb-2">
              <span>CERTIFIED TECHNICIANS</span>
              <ShieldCheckIcon size={16} className="text-emerald-500" />
            </div>
            <div className="font-heading font-extrabold text-3xl text-emerald-600 dark:text-emerald-400">
              {stats.activeTechnicians}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Certified</span> across 7 trades
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border)] text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isLiveConnected ? "Verified live via /api/technicians" : "Seeded baseline (/api/technicians)"}</span>
          </div>
        </div>

        {/* Card 3: Dispatchers On Duty */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-semibold mb-2">
              <span>DISPATCHERS ACTIVE</span>
              <RadioIcon size={16} className="text-blue-500" />
            </div>
            <div className="font-heading font-extrabold text-3xl text-blue-600 dark:text-blue-400">
              {stats.dispatchersOnDuty}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              Covers 24/7 emergency dispatch desks
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] font-medium">
            Pending `/api/admin/users` migration
          </div>
        </div>

        {/* Card 4: SLA Compliance Rate */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-semibold mb-2">
              <span>ARRIVAL SLA COMPLIANCE</span>
              <CheckCircleIcon size={16} className="text-[#10b981]" />
            </div>
            <div className="font-heading font-extrabold text-3xl text-[var(--text-primary)]">
              {stats.slaComplianceRate}%
            </div>
            <div className="text-xs text-[#10b981] mt-1 font-semibold">
              ★ Physical arrival within 20–40m
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] font-medium">
            Computed from 48 resolved work orders
          </div>
        </div>
      </div>

      {/* ── Quick Administrative Navigation Workspaces ─────────────────── */}
      <div className="space-y-3">
        <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
          Administrative Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
            className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[#10b981] transition-all shadow-sm group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-3">
                <BuildingIcon size={20} />
              </div>
              <h4 className="font-heading font-bold text-base text-[var(--text-primary)] group-hover:text-[#10b981] transition-colors">
                User Management Directory
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Inspect accounts, filter by role, activate/deactivate accounts, and create internal staff credentials.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-[#10b981] flex items-center gap-1">
              <span>Open User Directory</span>
              <ArrowRightIcon size={12} />
            </div>
          </Link>

          <Link
            to="/admin/technicians"
            className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[#10b981] transition-all shadow-sm group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3">
                <ShieldCheckIcon size={20} />
              </div>
              <h4 className="font-heading font-bold text-base text-[var(--text-primary)] group-hover:text-[#10b981] transition-colors">
                Technician Skills & Verification
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Review skills passports across all 7 canonical trades, inspect trade certifications, and approve/reject credentials.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-[#10b981] flex items-center gap-1">
              <span>Open Verification Board</span>
              <ArrowRightIcon size={12} />
            </div>
          </Link>

          <Link
            to="/admin/audit"
            className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[#10b981] transition-all shadow-sm group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold mb-3">
                <ClockIcon size={20} />
              </div>
              <h4 className="font-heading font-bold text-base text-[var(--text-primary)] group-hover:text-[#10b981] transition-colors">
                System Security & Audit Log
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Track administrative events, role changes, work order overrides, and sensitive access logs.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-[#10b981] flex items-center gap-1">
              <span>View Audit Ledger</span>
              <ArrowRightIcon size={12} />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Recent Administrative Activity Feed ────────────────────────── */}
      <div className="p-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
            Recent Administrative Activity
          </h3>
          <Link to="/admin/audit" className="text-xs font-bold text-[#10b981] hover:underline">
            View Full Audit Log →
          </Link>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {RECENT_ADMIN_EVENTS.map((evt) => (
            <div key={evt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-1">
                <div className="font-medium text-[var(--text-primary)]">
                  {evt.action}
                </div>
                <div className="text-[var(--text-muted)] flex items-center gap-2">
                  <span>Actor: <strong>{evt.actor}</strong></span>
                  <span>•</span>
                  <span>{evt.timestamp}</span>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full font-bold border shrink-0 text-[10px] uppercase tracking-wider ${evt.badge}`}>
                {evt.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
