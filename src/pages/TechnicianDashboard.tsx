import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { MetricCard } from "../components/MetricCard";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import {
  WrenchIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  CheckCircleIcon,
} from "../components/Icons";

interface TechnicianJobItem {
  id: string;
  customerName: string;
  facilityAddress: string;
  category: string;
  assetName: string;
  problemSummary: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  status: "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "COMPLETED";
  arrivalSlaRemainingMinutes?: number;
  scheduledTime: string;
}

const DASHBOARD_TECH_JOBS: TechnicianJobItem[] = [
  {
    id: "WO-2048",
    customerName: "ABC Manufacturing Ltd",
    facilityAddress: "Plot 42, Sector 7, Export Processing Zone, Dhaka",
    category: "Electrical and power systems",
    assetName: "Standby Generator G-01 (Cummins 250kVA)",
    problemSummary: "Automatic Transfer Switch (ATS) Failure during weekly exercise cycle",
    priority: "URGENT",
    status: "TRAVELLING",
    arrivalSlaRemainingMinutes: 18,
    scheduledTime: "Immediate Dispatch",
  },
  {
    id: "WO-2047",
    customerName: "Apex Logistics Hub",
    facilityAddress: "Building 3, Central Distribution Center, Gazipur",
    category: "AC, HVAC, and cooling",
    assetName: "Central Chiller Unit #2",
    problemSummary: "Compressor low refrigerant pressure interlock tripped",
    priority: "HIGH",
    status: "ASSIGNED",
    arrivalSlaRemainingMinutes: 75,
    scheduledTime: "Today at 02:00 PM",
  },
  {
    id: "WO-2042",
    customerName: "Rahimafrooz Facility Hub",
    facilityAddress: "Tejgaon Industrial Area, Dhaka",
    category: "Plumbing and water systems",
    assetName: "Booster Water Pump P-03",
    problemSummary: "Main pressure seal replacement and flow validation",
    priority: "MEDIUM",
    status: "COMPLETED",
    scheduledTime: "Yesterday",
  },
];

export function TechnicianDashboard() {
  const { user } = useAuth();

  const getStatusBadge = (status: TechnicianJobItem["status"]) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "TRAVELLING":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "ON_SITE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <Layout
      title="Technician Work Overview"
      subtitle={`Welcome back, ${user?.name || "Technician"} · Electrical & Power Systems Specialist`}
      action={
        <Link
          to="/technician/jobs"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand text-white hover:bg-brand-dark transition-all shadow-sm"
        >
          <span>Open My Jobs</span>
          <ArrowRightIcon size={12} />
        </Link>
      }
    >
      <div className="space-y-4">
        {/* ── Status Metric Cards ─────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Link to="/technician/jobs" className="block">
            <MetricCard
              label="Assigned Workload"
              value="2 Active"
              subtext="1 En Route · 1 Dispatched"
              icon={WrenchIcon}
              trend={{ direction: "up", label: "Today's Schedule" }}
            />
          </Link>

          <MetricCard
            label="Current Transit SLA"
            value="18 min"
            subtext="EN ROUTE: Generator G-01 (WO-2048)"
            icon={ClockIcon}
            alert={true}
            trend={{ direction: "down", label: "Arrival Target Active" }}
          />

          <MetricCard
            label="Verified Passport Status"
            value="Certified"
            subtext="HV Substation & Industrial Motors"
            icon={ShieldCheckIcon}
            trend={{ direction: "neutral", label: "Active & Compliant" }}
          />
        </div>

        {/* ── Active Priority Spotlight Card ────────────────────────────── */}
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangleIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-rose-700 dark:text-rose-400">WO-2048</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                  URGENT SLA
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">18m remaining</span>
              </div>
              <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)] truncate mt-0.5">
                Standby Generator G-01 — Automatic Transfer Switch Failure
              </h3>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5 truncate">
                <MapPinIcon size={12} className="shrink-0 text-slate-400" />
                <span>Plot 42, Sector 7, Export Processing Zone, Dhaka · ABC Manufacturing Ltd</span>
              </p>
            </div>
          </div>
          <Link
            to="/technician/jobs"
            className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shrink-0"
          >
            <span>Update En Route</span>
            <ArrowRightIcon size={12} />
          </Link>
        </div>

        {/* ── Visual Schedule Timeline & Progress Distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Today's Shift Route Progression */}
          <div className="lg:col-span-7 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Today's Dispatch Route & Progression
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-medium">
                  Shift: 08:00 - 18:00
                </span>
              </div>

              <div className="space-y-2.5 pt-0.5">
                {DASHBOARD_TECH_JOBS.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]/50 hover:bg-[var(--bg-surface-2)] transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        job.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : job.status === "TRAVELLING"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {job.status === "COMPLETED" ? "✓" : job.id.slice(-2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] truncate">
                          {job.customerName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusBadge(
                            job.status
                          )}`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">{job.assetName} · {job.facilityAddress}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skill Passport Competency Overview */}
          <div className="lg:col-span-5 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Passport Trade Competency
                </h3>
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                  PASSED
                </span>
              </div>

              <HorizontalBarChart
                data={[
                  { label: "Electrical and power systems", value: 100, color: "#10b981", badge: "Primary" },
                  { label: "AC, HVAC, and cooling", value: 75, color: "#38bdf8", badge: "Secondary" },
                  { label: "Plumbing and water systems", value: 60, color: "#a855f7" },
                  { label: "CCTV and security", value: 40, color: "#64748b" },
                ]}
                valueSuffix="%"
              />
            </div>
          </div>
        </div>

        {/* ── Assigned Jobs Short Preview ─────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="p-3.5 sm:p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-sm sm:text-base text-[var(--text-primary)]">
                Assigned Jobs Preview
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Recent work orders allocated to your shift schedule</p>
            </div>
            <Link
              to="/technician/jobs"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View Full Roster in My Jobs</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs sm:text-[13px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[85px]" />
                <col className="w-[200px]" />
                <col className="w-[180px]" />
                <col className="w-[110px]" />
                <col className="w-[125px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-xs">
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Customer & Location</th>
                  <th className="py-2.5 px-3">Trade & Asset</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {DASHBOARD_TECH_JOBS.map((job) => (
                  <tr key={job.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-xs text-[var(--text-primary)] whitespace-nowrap">
                      {job.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] truncate" title={job.customerName}>
                        {job.customerName}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate" title={job.facilityAddress}>
                        {job.facilityAddress}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-xs sm:text-[13px] text-[var(--text-primary)] truncate" title={job.assetName}>
                        {job.assetName}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{job.category}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusBadge(job.status)}`}>
                        {job.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <Link
                        to="/technician/jobs"
                        className="px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                      >
                        Manage in My Jobs →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
