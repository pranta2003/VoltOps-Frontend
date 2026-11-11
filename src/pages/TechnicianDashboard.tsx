import { useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { WorkOrder, ServiceCategory } from "../types";
import { MetricCard } from "../components/MetricCard";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import {
  WrenchIcon,
  ClockIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "../components/Icons";

interface TechnicianJobItem {
  id: string;
  requestId: string;
  customerName: string;
  facilityAddress: string;
  category: ServiceCategory;
  assetName: string;
  problemSummary: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  status: "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "COMPLETED";
  arrivalSlaRemainingMinutes?: number;
  scheduledTime: string;
}

const MOCK_TECH_JOBS: TechnicianJobItem[] = [
  {
    id: "WO-2048",
    requestId: "SR-1024",
    customerName: "ABC Manufacturing Ltd",
    facilityAddress: "Plot 42, Sector 7, Export Processing Zone, Dhaka",
    category: "Electrical and power systems",
    assetName: "Standby Generator G-01 (Cummins 250kVA)",
    problemSummary: "Automatic Transfer Switch (ATS) Failure during weekly exercise cycle",
    priority: "URGENT",
    status: "TRAVELLING",
    arrivalSlaRemainingMinutes: 18,
    scheduledTime: "Immediate / Emergency Dispatch",
  },
  {
    id: "WO-2047",
    requestId: "SR-1021",
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
    requestId: "SR-1018",
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
  const [jobs, setJobs] = useState<TechnicianJobItem[]>(MOCK_TECH_JOBS);
  const [activeTab, setActiveTab] = useState<"ALL" | "TODAY" | "UPCOMING" | "COMPLETED">("ALL");
  const [selectedJob, setSelectedJob] = useState<TechnicianJobItem | null>(null);
  const [workNotes, setWorkNotes] = useState("");

  const handleUpdateStatus = (newStatus: TechnicianJobItem["status"]) => {
    if (!selectedJob) return;
    setJobs((prev) =>
      prev.map((j) => (j.id === selectedJob.id ? { ...j, status: newStatus } : j))
    );
    setSelectedJob(null);
  };

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

  const filteredJobs = jobs.filter((j) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "COMPLETED") return j.status === "COMPLETED";
    if (activeTab === "TODAY") return j.status === "TRAVELLING" || j.status === "ON_SITE";
    if (activeTab === "UPCOMING") return j.status === "ASSIGNED";
    return true;
  });

  return (
    <Layout
      title="Field Technician Job Roster"
      subtitle={`Welcome, ${user?.name || "Technician"} · Electrical & Power Systems Specialist`}
    >
      {/* ── Status Metric Cards ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <MetricCard
          label="Today's Assigned Jobs"
          value={jobs.filter((j) => j.status !== "COMPLETED").length}
          subtext="Active Dispatched Work Orders"
          icon={WrenchIcon}
          trend={{ direction: "up", label: "2 In Progress" }}
        />

        <MetricCard
          label="Current Transit SLA"
          value="18 min"
          subtext="EN ROUTE: Generator G-01 (WO-2048)"
          icon={ClockIcon}
          alert={true}
          trend={{ direction: "down", label: "Countdown Active" }}
        />

        <MetricCard
          label="Verified Passport Status"
          value="Certified"
          subtext="HV Substation & Industrial Motors"
          icon={ShieldCheckIcon}
          trend={{ direction: "neutral", label: "Active & Compliant" }}
        />
      </div>

      {/* ── Visual Schedule Timeline & Progress Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Today's Shift Timeline Progress */}
        <div className="lg:col-span-7 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] space-y-3 flex flex-col justify-between">
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
              {jobs.map((job) => (
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

      {/* ── Tabs & Jobs List (Figma Frame 11: All / Today / Upcoming / Completed) ─ */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
        <div className="p-3.5 sm:p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="font-heading font-bold text-sm sm:text-base text-[var(--text-primary)]">
            Assigned Field Jobs
          </h2>

          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] text-xs">
            {(["ALL", "TODAY", "UPCOMING", "COMPLETED"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md font-medium transition-all text-xs ${
                  activeTab === tab
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-xs">
                <th className="py-2.5 px-3.5 sm:px-4">Job ID</th>
                <th className="py-2.5 px-3.5 sm:px-4">Customer & Location</th>
                <th className="py-2.5 px-3.5 sm:px-4">Trade & Asset</th>
                <th className="py-2.5 px-3.5 sm:px-4">Problem Summary</th>
                <th className="py-2.5 px-3.5 sm:px-4">Status</th>
                <th className="py-2.5 px-3.5 sm:px-4">Arrival SLA</th>
                <th className="py-2.5 px-3.5 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                  <td className="py-2.5 px-3.5 sm:px-4 font-mono font-bold text-xs text-[var(--text-primary)] whitespace-nowrap">
                    {job.id}
                  </td>
                  <td className="py-2.5 px-3.5 sm:px-4">
                    <div className="font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] truncate max-w-[180px]" title={job.customerName}>{job.customerName}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate max-w-[180px]" title={job.facilityAddress}>
                      {job.facilityAddress}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 sm:px-4">
                    <div className="font-medium text-xs sm:text-[13px] text-[var(--text-primary)] truncate max-w-[160px]" title={job.assetName}>{job.assetName}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate max-w-[160px]">{job.category}</div>
                  </td>
                  <td className="py-2.5 px-3.5 sm:px-4 max-w-xs">
                    <div className="truncate font-medium text-xs sm:text-[13px] text-[var(--text-secondary)]" title={job.problemSummary}>{job.problemSummary}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{job.scheduledTime}</div>
                  </td>
                  <td className="py-2.5 px-3.5 sm:px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusBadge(
                        job.status
                      )}`}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 sm:px-4 text-xs font-semibold whitespace-nowrap">
                    {job.arrivalSlaRemainingMinutes ? (
                      <span className="text-red-600 dark:text-red-400 font-mono">
                        {job.arrivalSlaRemainingMinutes}m remaining
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 sm:px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-brand text-white hover:bg-brand-dark transition-all shadow-sm"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Progress Update Modal (Figma affordance: Update Status) ───────── */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#10b981]">
                  Job Progress Updater
                </span>
                <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                  {selectedJob.id} · {selectedJob.assetName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs space-y-1">
              <div>
                <strong>Facility:</strong> {selectedJob.customerName}
              </div>
              <div>
                <strong>Address:</strong> {selectedJob.facilityAddress}
              </div>
              <div>
                <strong>Current Status:</strong>{" "}
                <span className="font-bold text-[#10b981]">{selectedJob.status}</span>
              </div>
            </div>

            {/* Transition milestones */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Transition Operational State
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("TRAVELLING")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedJob.status === "TRAVELLING"
                      ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  🚗 Travelling
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("ON_SITE")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedJob.status === "ON_SITE"
                      ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  📍 On Site
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("COMPLETED")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedJob.status === "COMPLETED"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                      : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  ✓ Completed
                </button>
              </div>
            </div>

            {/* Work Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Diagnosis & On-Site Work Notes
              </label>
              <textarea
                rows={3}
                placeholder="Inspected ATS contactors, replaced coil assembly, verified phase voltages under test load..."
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] text-xs focus:border-[#10b981] outline-none"
              />
            </div>

            <div className="pt-2 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
