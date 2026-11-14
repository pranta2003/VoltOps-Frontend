import { useState, useEffect, useId } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { ServiceCategory, WorkOrder } from "../../types";
import { CANONICAL_SERVICE_CATEGORIES } from "../../types";
import { technicianService } from "../../services/technicianService";
import { operationalStore } from "../../services/operationalStore";
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
  status: "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "WORK_COMPLETED_AWAITING_CONFIRMATION" | "COMPLETED";
  arrivalSlaRemainingMinutes?: number;
  isSlaBreached?: boolean;
  scheduledTime: string;
  triageNotes?: string;
  completionNotes?: string;
}

export function MyJobs() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlJobId = searchParams.get("jobId");

  const [jobs, setJobs] = useState<TechnicianJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "TODAY" | "UPCOMING" | "COMPLETED">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [inspectJob, setInspectJob] = useState<TechnicianJobItem | null>(null);
  const [completionModalJob, setCompletionModalJob] = useState<TechnicianJobItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [laborHours, setLaborHours] = useState("1.0 hour");
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [interimNote, setInterimNote] = useState("");
  const [isSavingInterim, setIsSavingInterim] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const completionModalHeadingId = useId();
  const inspectModalHeadingId = useId();

  function loadJobs() {
    setIsLoading(true);
    setError(null);
    technicianService
      .getJobs(user?.id)
      .then((res) => {
        const mapped: TechnicianJobItem[] = res.data.map((w: WorkOrder) => {
          let arrivalSlaRemainingMinutes: number | undefined = undefined;
          let isSlaBreached = false;
          if ((w.status === "TRAVELLING" || w.status === "ASSIGNED") && w.slaDeadline) {
            const diffMinutes = Math.round((new Date(w.slaDeadline).getTime() - Date.now()) / 60000);
            if (diffMinutes <= 0) {
              isSlaBreached = true;
              arrivalSlaRemainingMinutes = 0;
            } else {
              arrivalSlaRemainingMinutes = diffMinutes;
            }
          }

          return {
            id: w.id,
            requestId: w.requestId,
            customerName: w.customerName,
            customerPhone: "+880 1711-204918",
            facilityAddress: w.facilityAddress,
            category: w.category,
            assetName: w.assetName,
            assetSerial: w.assetName.includes("(") ? w.assetName.split("(")[1]?.replace(")", "") : "SN-2026-VAL",
            problemSummary: w.problemSummary,
            priority: w.priority,
            status: (w.status === "UNASSIGNED" ? "ASSIGNED" : w.status) as any,
            arrivalSlaRemainingMinutes,
            isSlaBreached,
            scheduledTime: w.status === "COMPLETED" ? "Completed Today" : "Immediate Dispatch",
            triageNotes: w.workNotes,
            completionNotes: w.completionReport?.notes || (w.completedAt ? (w.workNotes || "Job completed successfully.") : undefined),
          };
        });
        setJobs(mapped);
      })
      .catch((err) => {
        setError(err.message || "Failed to load technician jobs.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    loadJobs();
    const unsubscribe = operationalStore.subscribe(() => {
      loadJobs();
    });
    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (urlJobId && jobs.length > 0) {
      const match = jobs.find((j) => j.id === urlJobId);
      if (match) setInspectJob(match);
    }
  }, [urlJobId, jobs]);

  const handleDirectTransition = async (job: TechnicianJobItem, nextStatus: "TRAVELLING" | "ON_SITE") => {
    setIsUpdatingStatus(true);
    try {
      await technicianService.updateJobStatus(
        job.id,
        nextStatus,
        nextStatus === "TRAVELLING" ? "En route to facility site" : "Technician arrived on site at facility",
        user?.name || "Kamrul Islam (Technician)"
      );
      setActionSuccess(`Job ${job.id} marked as ${nextStatus === "TRAVELLING" ? "En Route (TRAVELLING)" : "Arrived On Site (ON_SITE)"}`);
      if (inspectJob && inspectJob.id === job.id) {
        setInspectJob({ ...inspectJob, status: nextStatus });
      }
      loadJobs();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update job status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveInterimProgress = async () => {
    if (!inspectJob || !interimNote.trim()) return;
    setIsSavingInterim(true);
    try {
      await technicianService.recordWorkProgress(
        inspectJob.id,
        interimNote.trim(),
        user?.name || "Kamrul Islam (Technician)"
      );
      setActionSuccess(`Interim progress note recorded for ${inspectJob.id}.`);
      setInterimNote("");
      loadJobs();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save progress note.");
    } finally {
      setIsSavingInterim(false);
    }
  };

  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionModalJob || isSubmittingCompletion) return;

    if (!completionNotes.trim()) {
      setCompletionError("Please provide diagnostic observations and resolution notes detailing the completed work.");
      return;
    }

    setIsSubmittingCompletion(true);
    setCompletionError(null);

    try {
      const detailedNotes = `${completionNotes.trim()} [Labor: ${laborHours}]`;
      await technicianService.submitJobCompletion(completionModalJob.id, {
        notes: detailedNotes,
        materialsUsed: materialsUsed.trim() || "No replacement parts required (Diagnostic / Calibration only)",
        technicianName: user?.name || "Kamrul Islam (Technician)",
      });

      setActionSuccess(`Completion report submitted for ${completionModalJob.id}. Work order moved to 'Pending Confirmation'.`);
      setCompletionModalJob(null);
      setCompletionNotes("");
      setMaterialsUsed("");
      setLaborHours("1.0 hour");
      loadJobs();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setCompletionError(err.message || "Failed to submit job completion report.");
    } finally {
      setIsSubmittingCompletion(false);
    }
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
    if (activeTab === "TODAY") {
      return (
        j.status === "ASSIGNED" ||
        j.status === "TRAVELLING" ||
        j.status === "ON_SITE" ||
        j.status === "WORK_COMPLETED_AWAITING_CONFIRMATION"
      );
    }
    if (activeTab === "UPCOMING") {
      return j.status === "ASSIGNED";
    }
    if (activeTab === "COMPLETED") {
      return j.status === "COMPLETED";
    }

    return true;
  });

  const getStatusBadge = (status: TechnicianJobItem["status"]) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "TRAVELLING":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-bold animate-pulse";
      case "ON_SITE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 font-bold";
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20 font-bold";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold";
    }
  };

  const getPriorityBadge = (priority: TechnicianJobItem["priority"]) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-bold";
      case "HIGH":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "LOW":
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <Layout
      title="My Jobs"
    >
      <div className="space-y-4">
        {/* Action success alert */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircleIcon size={16} />
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800"
            >
              <XIcon size={14} />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={loadJobs} className="underline font-bold">
              Retry
            </button>
          </div>
        )}

        {/* ── Filter Toolbar ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job ID, asset, customer or address..."
              aria-label="Search jobs"
              className="w-full text-xs py-2 pl-9 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

        {/* ── Jobs Table ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-4">Customer & Facility</th>
                  <th className="py-3 px-4">Target Asset & Trade</th>
                  <th className="py-3 px-4">Problem Summary</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Operational Status</th>
                  <th className="py-3 px-4">SLA Countdown</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      Loading assigned technician jobs...
                    </td>
                  </tr>
                ) : filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      No matching jobs found in this view.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {job.id}
                        <div className="text-[10px] font-mono text-[var(--text-muted)]">
                          Ref: {job.requestId}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">{job.customerName}</div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                          <MapPinIcon size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate max-w-[200px]">{job.facilityAddress}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">{job.assetName}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{job.category}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="text-[var(--text-primary)] truncate font-medium">
                          {job.problemSummary}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">{job.scheduledTime}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${getPriorityBadge(
                            job.priority
                          )}`}
                        >
                          {job.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(
                            job.status
                          )}`}
                        >
                          {job.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {job.isSlaBreached ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                            <AlertTriangleIcon size={12} className="shrink-0" />
                            <span>SLA Expired (0m)</span>
                          </div>
                        ) : job.arrivalSlaRemainingMinutes !== undefined ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            <ClockIcon size={12} className="animate-spin" />
                            <span>{job.arrivalSlaRemainingMinutes} min left</span>
                          </div>
                        ) : job.status === "COMPLETED" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                            ✓ Completed
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {job.status === "ASSIGNED" && (
                            <button
                              type="button"
                              onClick={() => handleDirectTransition(job, "TRAVELLING")}
                              disabled={isUpdatingStatus}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm disabled:opacity-50"
                            >
                              Start Travel
                            </button>
                          )}
                          {job.status === "TRAVELLING" && (
                            <button
                              type="button"
                              onClick={() => handleDirectTransition(job, "ON_SITE")}
                              disabled={isUpdatingStatus}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                            >
                              Confirm Arrival
                            </button>
                          )}
                          {job.status === "ON_SITE" && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompletionModalJob(job);
                                setCompletionNotes("");
                                setMaterialsUsed("");
                                setCompletionError(null);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                            >
                              Submit Report
                            </button>
                          )}
                          {job.status === "WORK_COMPLETED_AWAITING_CONFIRMATION" && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                              Pending Review
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setInspectJob(job)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Technician Job Completion Modal ────────────────────────────── */}
        {completionModalJob && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={completionModalHeadingId}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    REPORT JOB COMPLETION
                  </div>
                  <h3 id={completionModalHeadingId} className="font-heading font-bold text-base text-[var(--text-primary)]">
                    {completionModalJob.id} · {completionModalJob.assetName}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Facility: {completionModalJob.customerName} ({completionModalJob.facilityAddress})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompletionModalJob(null)}
                  disabled={isSubmittingCompletion}
                  aria-label="Close completion form"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={16} />
                </button>
              </div>

              {completionError && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangleIcon size={14} className="shrink-0 text-red-500" />
                  <span>{completionError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitCompletion} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Diagnostic Findings & Work Performed <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Describe testing performed, corrective repair steps taken, and operational verification..."
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Materials & Replacement Parts
                    </label>
                    <input
                      type="text"
                      value={materialsUsed}
                      onChange={(e) => setMaterialsUsed(e.target.value)}
                      placeholder="e.g. 1x 40A Contactor, terminal lugs"
                      className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Labor Duration on Site
                    </label>
                    <select
                      value={laborHours}
                      onChange={(e) => setLaborHours(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="0.5 hour">30 minutes</option>
                      <option value="1.0 hour">1 hour</option>
                      <option value="1.5 hours">1.5 hours</option>
                      <option value="2.0 hours">2 hours</option>
                      <option value="3.0+ hours">3+ hours</option>
                    </select>
                  </div>
                </div>

                {/* Clear Operational Policy Notice */}
                <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-[11px] text-[var(--text-secondary)] space-y-1">
                  <div className="font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                    <CheckCircleIcon size={13} className="text-cyan-500" />
                    <span>Multi-Party Workflow Guard</span>
                  </div>
                  <p>
                    Submitting this completion report records physical on-site restoration and advances this work order to <strong>Completion Pending Confirmation</strong>. The order will be finalized upon customer confirmation or dispatcher sign-off.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    Lead: {user?.name || "Kamrul Islam"}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCompletionModalJob(null)}
                      disabled={isSubmittingCompletion}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingCompletion}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm disabled:opacity-50"
                    >
                      {isSubmittingCompletion ? "Submitting..." : "Submit Completion Report"}
                    </button>
                  </div>
                </div>
              </form>
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
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {inspectJob.id}
                  </span>
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
                    <span className="text-[var(--text-muted)]">Customer Contact</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <PhoneIcon size={11} />
                      <span>{inspectJob.customerPhone}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Facility Location</span>
                    <span className="font-medium text-[var(--text-primary)] text-right max-w-[260px]">
                      {inspectJob.facilityAddress}
                    </span>
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

                {inspectJob.status === "WORK_COMPLETED_AWAITING_CONFIRMATION" && (
                  <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-300 block">
                      Technician Completion Report (Submitted · Awaiting Confirmation)
                    </span>
                    <p className="text-xs text-[var(--text-primary)] font-medium">
                      {inspectJob.completionNotes || "Resolution notes submitted."}
                    </p>
                  </div>
                )}

                {inspectJob.status === "COMPLETED" && inspectJob.completionNotes && (
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)] mb-1">Completion Summary</h4>
                    <p className="p-2.5 rounded-lg bg-emerald-500/5 text-emerald-900 dark:text-emerald-300 border border-emerald-500/20">
                      {inspectJob.completionNotes}
                    </p>
                  </div>
                )}

                {/* On-Site Interim Note Input */}
                {inspectJob.status === "ON_SITE" && (
                  <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1.5">
                    <label className="block font-semibold text-purple-900 dark:text-purple-300 text-[11px]">
                      Add Interim Progress Note:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={interimNote}
                        onChange={(e) => setInterimNote(e.target.value)}
                        placeholder="e.g. Isolation complete; testing primary feeder..."
                        className="flex-1 text-xs p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveInterimProgress}
                        disabled={isSavingInterim || !interimNote.trim()}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isSavingInterim ? "Saving..." : "Record"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setInspectJob(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {inspectJob.status === "ASSIGNED" && (
                    <button
                      type="button"
                      onClick={() => handleDirectTransition(inspectJob, "TRAVELLING")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isUpdatingStatus ? "Updating..." : "Start Travel"}
                    </button>
                  )}
                  {inspectJob.status === "TRAVELLING" && (
                    <button
                      type="button"
                      onClick={() => handleDirectTransition(inspectJob, "ON_SITE")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isUpdatingStatus ? "Updating..." : "Confirm Arrival"}
                    </button>
                  )}
                  {inspectJob.status === "ON_SITE" && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompletionModalJob(inspectJob);
                        setCompletionNotes("");
                        setMaterialsUsed("");
                        setCompletionError(null);
                        setInspectJob(null);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      Submit Completion Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
