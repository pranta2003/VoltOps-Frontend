import { useState, useId } from "react";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { ServiceCategory } from "../../types";
import { CANONICAL_SERVICE_CATEGORIES } from "../../types";
import {
  WrenchIcon,
  ClockIcon,
  SearchIcon,
  XIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  PhoneIcon,
  MapPinIcon,
} from "../../components/Icons";

export interface TechnicianJobItem {
  id: string;
  requestId: string;
  customerName: string;
  customerPhone: string;
  facilityAddress: string;
  category: ServiceCategory;
  assetName: string;
  assetSerial: string;
  problemSummary: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  status: "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "COMPLETED";
  arrivalSlaRemainingMinutes?: number;
  scheduledTime: string;
  triageNotes?: string;
  completionNotes?: string;
}

export const INITIAL_TECHNICIAN_JOBS: TechnicianJobItem[] = [
  {
    id: "WO-2048",
    requestId: "SR-1024",
    customerName: "ABC Manufacturing Ltd",
    customerPhone: "+880 1711-234567",
    facilityAddress: "Plot 42, Sector 7, Export Processing Zone, Dhaka",
    category: "Electrical and power systems",
    assetName: "Standby Generator G-01 (Cummins 250kVA)",
    assetSerial: "CUM-2024-8842",
    problemSummary: "Automatic Transfer Switch (ATS) Failure during weekly exercise cycle",
    priority: "URGENT",
    status: "TRAVELLING",
    arrivalSlaRemainingMinutes: 18,
    scheduledTime: "Immediate / Emergency Dispatch",
    triageNotes: "ATS coil overheated; technician dispatched with replacement contacts and diagnostic multimeter.",
  },
  {
    id: "WO-2047",
    requestId: "SR-1021",
    customerName: "Apex Logistics Hub",
    customerPhone: "+880 1819-345678",
    facilityAddress: "Building 3, Central Distribution Center, Gazipur",
    category: "AC, HVAC, and cooling",
    assetName: "Central Chiller Unit #2",
    assetSerial: "TRN-CH-5509",
    problemSummary: "Compressor low refrigerant pressure interlock tripped",
    priority: "HIGH",
    status: "ASSIGNED",
    arrivalSlaRemainingMinutes: 75,
    scheduledTime: "Today at 02:00 PM",
    triageNotes: "Pressure sensor calibration required; verify R-410A charge and expansion valve.",
  },
  {
    id: "WO-2045",
    requestId: "SR-1019",
    customerName: "Standard Security Facility",
    customerPhone: "+880 1912-456789",
    facilityAddress: "Gulshan Corporate Avenue, Block C, Dhaka",
    category: "CCTV and security",
    assetName: "Perimeter NVR System 32-Channel",
    assetSerial: "HIK-NVR-9912",
    problemSummary: "PoE Switch port flapping causing intermittent camera feed dropouts",
    priority: "MEDIUM",
    status: "ASSIGNED",
    scheduledTime: "Today at 04:30 PM",
    triageNotes: "Bring replacement 24-port PoE switch and Cat6 patch cables.",
  },
  {
    id: "WO-2042",
    requestId: "SR-1018",
    customerName: "Rahimafrooz Facility Hub",
    customerPhone: "+880 1713-987654",
    facilityAddress: "Tejgaon Industrial Area, Dhaka",
    category: "Plumbing and water systems",
    assetName: "Booster Water Pump P-03",
    assetSerial: "GRN-PMP-1104",
    problemSummary: "Main pressure seal replacement and flow validation",
    priority: "MEDIUM",
    status: "COMPLETED",
    scheduledTime: "Yesterday",
    completionNotes: "Mechanical seal replaced; pressure test validated at 6.2 bar. Sign-off completed.",
  },
];

export function MyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<TechnicianJobItem[]>(INITIAL_TECHNICIAN_JOBS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "TODAY" | "UPCOMING" | "COMPLETED">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [inspectJob, setInspectJob] = useState<TechnicianJobItem | null>(null);
  const [statusModalJob, setStatusModalJob] = useState<TechnicianJobItem | null>(null);
  const [workNotes, setWorkNotes] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const statusModalHeadingId = useId();
  const inspectModalHeadingId = useId();

  const handleUpdateStatus = (newStatus: TechnicianJobItem["status"]) => {
    if (!statusModalJob) return;

    setJobs((prev) =>
      prev.map((j) =>
        j.id === statusModalJob.id
          ? {
              ...j,
              status: newStatus,
              arrivalSlaRemainingMinutes: newStatus === "ON_SITE" || newStatus === "COMPLETED" ? undefined : j.arrivalSlaRemainingMinutes,
              completionNotes: newStatus === "COMPLETED" ? workNotes || "Job completed successfully." : j.completionNotes,
            }
          : j
      )
    );

    setActionSuccess(`Status for ${statusModalJob.id} updated to ${newStatus.replace("_", " ")}`);
    setStatusModalJob(null);
    setWorkNotes("");
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const filteredJobs = jobs.filter((j) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        j.id.toLowerCase().includes(q) ||
        j.customerName.toLowerCase().includes(q) ||
        j.assetName.toLowerCase().includes(q) ||
        j.problemSummary.toLowerCase().includes(q) ||
        j.facilityAddress.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category
    if (selectedCategory !== "ALL" && j.category !== selectedCategory) {
      return false;
    }

    // Priority
    if (selectedPriority !== "ALL" && j.priority !== selectedPriority) {
      return false;
    }

    // Tab
    if (activeTab === "TODAY") return j.status === "TRAVELLING" || j.status === "ON_SITE";
    if (activeTab === "UPCOMING") return j.status === "ASSIGNED";
    if (activeTab === "COMPLETED") return j.status === "COMPLETED";

    return true;
  });

  const getPriorityBadge = (p: TechnicianJobItem["priority"]) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900";
      case "HIGH":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900";
      case "LOW":
        return "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getStatusBadge = (s: TechnicianJobItem["status"]) => {
    switch (s) {
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
      title="My Assigned Jobs"
      subtitle={`Active Field Work Orders · ${user?.name || "Technician"}`}
      action={
        <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-secondary)] font-semibold">
          {jobs.filter((j) => j.status !== "COMPLETED").length} Active Jobs
        </span>
      }
    >
      <div className="space-y-4">
        {/* Success Feedback Notification */}
        {actionSuccess && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-fade-in">
            <CheckCircleIcon size={15} className="text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Job ID, customer, asset, problem..."
              aria-label="Search assigned jobs"
              className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
              >
                <XIcon size={13} />
              </button>
            )}
          </div>

          {/* Trade Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by trade category"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Trades</option>
              {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              aria-label="Filter by priority"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent (Arrival SLA)</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
            <ChevronDownIcon
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] p-0.5 text-xs">
            {[
              { id: "ALL", label: "All" },
              { id: "TODAY", label: "Active Today" },
              { id: "UPCOMING", label: "Upcoming" },
              { id: "COMPLETED", label: "Completed" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── High-Density Assigned Jobs Table ───────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[920px] text-left text-xs sm:text-[13px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[85px]" />
                <col className="w-[180px]" />
                <col className="w-[170px]" />
                <col className="w-[190px]" />
                <col className="w-[85px]" />
                <col className="w-[105px]" />
                <col className="w-[105px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-xs">
                  <th className="py-2.5 px-3">Job ID</th>
                  <th className="py-2.5 px-3">Customer & Location</th>
                  <th className="py-2.5 px-3">Trade & Asset</th>
                  <th className="py-2.5 px-3">Problem Summary</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No jobs match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-xs text-[var(--text-primary)] whitespace-nowrap truncate">
                        {job.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[var(--text-primary)] truncate" title={job.customerName}>
                          {job.customerName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate flex items-center gap-1" title={job.facilityAddress}>
                          <MapPinIcon size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate">{job.facilityAddress}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-xs sm:text-[13px] text-[var(--text-primary)] truncate" title={job.assetName}>
                          {job.assetName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate" title={job.category}>
                          {job.category}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[var(--text-secondary)] truncate" title={job.problemSummary}>
                          {job.problemSummary}
                        </div>
                        {job.arrivalSlaRemainingMinutes && (
                          <div className="text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
                            <ClockIcon size={11} />
                            <span>Arrival Target: {job.arrivalSlaRemainingMinutes}m</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getPriorityBadge(job.priority)}`}>
                          {job.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusBadge(job.status)}`}>
                          {job.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                        {job.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalJob(job);
                              setWorkNotes("");
                            }}
                            className="px-2 py-0.5 rounded-md text-xs font-bold bg-brand text-white hover:bg-brand-dark active:scale-95 transition-all shadow-sm"
                          >
                            Update
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setInspectJob(job)}
                          className="px-2 py-0.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Status Transition Modal ─────────────────────────────────────── */}
      {statusModalJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={statusModalHeadingId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 id={statusModalHeadingId} className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Update Job Status
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">{statusModalJob.id} · {statusModalJob.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalJob(null)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">Select Current Operational State</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("TRAVELLING")}
                    disabled={statusModalJob.status === "TRAVELLING" || statusModalJob.status === "ON_SITE"}
                    className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-500/20 disabled:opacity-40 transition-all text-center"
                  >
                    En Route
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("ON_SITE")}
                    disabled={statusModalJob.status === "ON_SITE"}
                    className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-500/20 disabled:opacity-40 transition-all text-center"
                  >
                    On Site
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus("COMPLETED")}
                    className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/20 transition-all text-center"
                  >
                    Complete
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Field Work Notes / Sign-off Details
                </label>
                <textarea
                  rows={3}
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="Enter diagnostic observations, parts replaced, or completion notes..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setStatusModalJob(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Job Inspection Drawer / Modal ───────────────────────────────── */}
      {inspectJob && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={inspectModalHeadingId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{inspectJob.id}</span>
                <h3 id={inspectModalHeadingId} className="font-heading font-bold text-base text-[var(--text-primary)]">
                  {inspectJob.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectJob(null)}
                aria-label="Close inspection"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Category & Trade</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectJob.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Target Asset</span>
                  <span className="font-semibold text-[var(--text-primary)]">{inspectJob.assetName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Serial / Tag</span>
                  <span className="font-mono text-[var(--text-secondary)]">{inspectJob.assetSerial}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Phone</span>
                  <a href={`tel:${inspectJob.customerPhone}`} className="text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                    <PhoneIcon size={11} />
                    <span>{inspectJob.customerPhone}</span>
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Location</span>
                  <span className="font-medium text-[var(--text-primary)] text-right max-w-[260px]">{inspectJob.facilityAddress}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1">Problem Description</h4>
                <p className="p-2.5 rounded-lg bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                  {inspectJob.problemSummary}
                </p>
              </div>

              {inspectJob.triageNotes && (
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] mb-1">Dispatcher Triage Notes</h4>
                  <p className="p-2.5 rounded-lg bg-blue-500/5 text-blue-900 dark:text-blue-300 border border-blue-500/20">
                    {inspectJob.triageNotes}
                  </p>
                </div>
              )}

              {inspectJob.completionNotes && (
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] mb-1">Completion Summary</h4>
                  <p className="p-2.5 rounded-lg bg-emerald-500/5 text-emerald-900 dark:text-emerald-300 border border-emerald-500/20">
                    {inspectJob.completionNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setInspectJob(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand text-white hover:bg-brand-dark"
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
