import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { MetricCard } from "../components/MetricCard";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { technicianService } from "../services/technicianService";
import { operationalStore } from "../services/operationalStore";
import { WorkOrder } from "../types";
import {
  WrenchIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  MapPinIcon,
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

export function TechnicianDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<TechnicianJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function loadTechJobs() {
    setIsLoading(true);
    technicianService
      .getJobs(user?.id)
      .then((res) => {
        const mapped: TechnicianJobItem[] = res.data.map((w: WorkOrder) => ({
          id: w.id,
          customerName: w.customerName,
          facilityAddress: w.facilityAddress,
          category: w.category,
          assetName: w.assetName,
          problemSummary: w.problemSummary,
          priority: w.priority,
          status: (w.status === "UNASSIGNED" ? "ASSIGNED" : w.status) as any,
          arrivalSlaRemainingMinutes: w.status === "TRAVELLING" || w.status === "ASSIGNED" ? (w.priority === "URGENT" ? 18 : 35) : undefined,
          scheduledTime: w.status === "COMPLETED" ? "Completed Today" : "Immediate Dispatch",
        }));
        setJobs(mapped);
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    loadTechJobs();
    const unsubscribe = operationalStore.subscribe(() => {
      loadTechJobs();
    });
    return unsubscribe;
  }, [user?.id]);

  const activeJobs = jobs.filter((j) => j.status !== "COMPLETED");
  const enRouteJob = jobs.find((j) => j.status === "TRAVELLING" || (j.status === "ASSIGNED" && j.priority === "URGENT"));
  const completedCount = jobs.filter((j) => j.status === "COMPLETED").length;

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
      subtitle={`Welcome back, ${user?.name || "Kamrul Islam"} · Electrical & Power Systems Specialist`}
      action={
        <Link
          to="/technician/jobs"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
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
              value={`${activeJobs.length} Active`}
              subtext={`${jobs.filter((j) => j.status === "TRAVELLING").length} En Route · ${jobs.filter((j) => j.status === "ASSIGNED").length} Dispatched`}
              icon={WrenchIcon}
              trend={{ direction: "up", label: "Today's Schedule" }}
            />
          </Link>

          <MetricCard
            label="Current Transit SLA"
            value={enRouteJob ? `${enRouteJob.arrivalSlaRemainingMinutes || 20} min` : "On Standby"}
            subtext={enRouteJob ? `EN ROUTE: ${enRouteJob.assetName} (${enRouteJob.id})` : "No Active Transit Alarm"}
            icon={ClockIcon}
            alert={!!enRouteJob}
            trend={{ direction: enRouteJob ? "down" : "neutral", label: enRouteJob ? "Arrival Target Active" : "Standby" }}
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
        {enRouteJob ? (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangleIcon size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-rose-700 dark:text-rose-400">{enRouteJob.id}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                    {enRouteJob.priority} SLA
                  </span>
                  {enRouteJob.arrivalSlaRemainingMinutes && (
                    <span className="text-xs text-[var(--text-muted)] font-mono">{enRouteJob.arrivalSlaRemainingMinutes}m remaining</span>
                  )}
                </div>
                <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)] truncate mt-0.5">
                  {enRouteJob.assetName} — {enRouteJob.problemSummary}
                </h3>
                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5 truncate">
                  <MapPinIcon size={12} className="shrink-0 text-slate-400" />
                  <span>{enRouteJob.facilityAddress} · {enRouteJob.customerName}</span>
                </p>
              </div>
            </div>
            <Link
              to="/technician/jobs"
              className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shrink-0"
            >
              <span>Update Progress</span>
              <ArrowRightIcon size={12} />
            </Link>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircleIcon size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">All Emergency Transits Clear</span>
                <p className="text-xs text-[var(--text-muted)]">Completed {completedCount} work orders today. Standby for next dispatch assignment.</p>
              </div>
            </div>
            <Link
              to="/technician/jobs"
              className="text-xs font-bold text-[#10b981] hover:underline"
            >
              View Jobs History →
            </Link>
          </div>
        )}

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
                {isLoading ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading schedule...</div>
                ) : jobs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">No jobs assigned yet.</div>
                ) : (
                  jobs.slice(0, 4).map((job) => (
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
                  ))
                )}
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
                  Verified Tier 1
                </span>
              </div>
              <HorizontalBarChart
                data={[
                  { label: "High-Voltage Switchgear & Transformers", value: 96, color: "emerald", secondaryLabel: "Class A Master License (DOE-BD)" },
                  { label: "Automatic Transfer Switches (ATS)", value: 92, color: "emerald", secondaryLabel: "Cummins & Perkins Certified" },
                  { label: "Three-Phase Motors & Star-Delta Starters", value: 88, color: "blue", secondaryLabel: "Siemens Level 2 Industrial Upkeep" },
                  { label: "Infrared Thermal Busbar Diagnostics", value: 85, color: "blue", secondaryLabel: "FLIR Level 1 Thermographer" },
                ]}
                valueSuffix="%"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
