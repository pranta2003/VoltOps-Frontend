import { useState, useEffect, useId } from "react";
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
  PhoneIcon,
  XIcon,
} from "../components/Icons";

interface TechnicianJobItem {
  id: string;
  requestId: string;
  customerName: string;
  customerPhone?: string;
  facilityAddress: string;
  category: string;
  assetName: string;
  assetSerial?: string;
  problemSummary: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  status: "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "WORK_COMPLETED_AWAITING_CONFIRMATION" | "COMPLETED";
  arrivalSlaRemainingMinutes?: number;
  isSlaBreached?: boolean;
  scheduledTime: string;
  workNotes?: string;
  completionReport?: any;
}

export function TechnicianDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<TechnicianJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<TechnicianJobItem | null>(null);
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

  function loadTechJobs() {
    setIsLoading(true);
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
            workNotes: w.workNotes,
            completionReport: w.completionReport,
          };
        });
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
  const enRouteJob = jobs.find(
    (j) =>
      j.status === "TRAVELLING" ||
      j.status === "ON_SITE" ||
      (j.status === "ASSIGNED" && j.priority === "URGENT")
  );
  const completedCount = jobs.filter((j) => j.status === "COMPLETED").length;

  const handleDirectTransition = async (job: TechnicianJobItem, nextStatus: "TRAVELLING" | "ON_SITE") => {
    setIsUpdatingStatus(true);
    try {
      await technicianService.updateJobStatus(
        job.id,
        nextStatus,
        nextStatus === "TRAVELLING" ? "En route to facility site" : "Technician arrived on site at facility",
        user?.name || "Kamrul Islam (Technician)"
      );
      setActionSuccess(
        `Job ${job.id} marked as ${nextStatus === "TRAVELLING" ? "En Route (TRAVELLING)" : "Arrived On Site (ON_SITE)"}`
      );
      if (selectedJob && selectedJob.id === job.id) {
        setSelectedJob({ ...selectedJob, status: nextStatus });
      }
      loadTechJobs();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update job status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveInterimProgress = async () => {
    if (!selectedJob || !interimNote.trim()) return;
    setIsSavingInterim(true);
    try {
      await technicianService.recordWorkProgress(
        selectedJob.id,
        interimNote.trim(),
        user?.name || "Kamrul Islam (Technician)"
      );
      setActionSuccess(`Interim progress note recorded for ${selectedJob.id}.`);
      setInterimNote("");
      loadTechJobs();
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

      setActionSuccess(
        `Completion report submitted for ${completionModalJob.id}. Work order moved to 'Pending Confirmation'.`
      );
      setCompletionModalJob(null);
      if (selectedJob && selectedJob.id === completionModalJob.id) {
        setSelectedJob(null);
      }
      setCompletionNotes("");
      setMaterialsUsed("");
      setLaborHours("1.0 hour");
      loadTechJobs();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setCompletionError(err.message || "Failed to submit job completion report.");
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const getStatusBadge = (status: TechnicianJobItem["status"]) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "TRAVELLING":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "ON_SITE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "WORK_COMPLETED_AWAITING_CONFIRMATION":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <Layout
      title="My Jobs"
      subtitle={`${user?.name || "Kamrul Islam"} · Active Shift`}
      action={
        <Link
          to="/technician/jobs"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
        >
          <span>Open My Jobs</span>
          <ArrowRightIcon size={12} />
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Action success alert */}
        {actionSuccess && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircleIcon size={15} />
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800 p-0.5"
            >
              <XIcon size={13} />
            </button>
          </div>
        )}

        {/* ── Status Metric Cards (Restrained Operational Typography) ────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            label="Transit SLA"
            value={
              enRouteJob
                ? enRouteJob.isSlaBreached
                  ? "Expired"
                  : `${enRouteJob.arrivalSlaRemainingMinutes}m left`
                : "Standby"
            }
            subtext={
              enRouteJob
                ? `Target: 20m · ${enRouteJob.assetName}`
                : "No Active Transit Alarm"
            }
            icon={ClockIcon}
            alert={!!enRouteJob && (enRouteJob.isSlaBreached || (enRouteJob.arrivalSlaRemainingMinutes ?? 0) <= 5)}
            trend={{
              direction: enRouteJob ? (enRouteJob.isSlaBreached ? "down" : "neutral") : "neutral",
              label: enRouteJob ? (enRouteJob.isSlaBreached ? "SLA Breached" : "Arrival Active") : "Standby",
            }}
          />

          <MetricCard
            label="Passport Status"
            value="Certified"
            subtext="DOE Master Electrician · Active"
            icon={ShieldCheckIcon}
            trend={{ direction: "neutral", label: "Tier 1 Active" }}
          />
        </div>

        {/* ── Active Priority Spotlight Card (Clean, Concise, with Working Action) ─ */}
        {enRouteJob ? (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangleIcon size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-rose-700 dark:text-rose-400">{enRouteJob.id}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                    {enRouteJob.priority} Priority
                  </span>
                  {enRouteJob.arrivalSlaRemainingMinutes !== undefined && (
                    <span
                      className={`text-xs font-mono ${
                        enRouteJob.isSlaBreached
                          ? "text-rose-600 dark:text-rose-400 font-bold"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {enRouteJob.isSlaBreached ? "SLA Expired (0m)" : `${enRouteJob.arrivalSlaRemainingMinutes}m remaining`}
                    </span>
                  )}
                </div>
                <div className="font-heading font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate mt-0.5">
                  {enRouteJob.assetName}
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {enRouteJob.problemSummary} · {enRouteJob.customerName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {enRouteJob.status === "ASSIGNED" && (
                <button
                  type="button"
                  onClick={() => handleDirectTransition(enRouteJob, "TRAVELLING")}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm disabled:opacity-50"
                >
                  Start Travel
                </button>
              )}
              {enRouteJob.status === "TRAVELLING" && (
                <button
                  type="button"
                  onClick={() => handleDirectTransition(enRouteJob, "ON_SITE")}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                >
                  Confirm Arrival
                </button>
              )}
              {enRouteJob.status === "ON_SITE" && (
                <button
                  type="button"
                  onClick={() => {
                    setCompletionModalJob(enRouteJob);
                    setCompletionNotes("");
                    setMaterialsUsed("");
                    setCompletionError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                >
                  Submit Report
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedJob(enRouteJob)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
              >
                Details
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircleIcon size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">All Emergency Transits Clear</span>
                <p className="text-xs text-[var(--text-muted)]">Completed {completedCount} work orders today. Standby for next dispatch assignment.</p>
              </div>
            </div>
            <Link
              to="/technician/jobs"
              className="text-xs font-semibold text-[#10b981] hover:underline"
            >
              Jobs Roster →
            </Link>
          </div>
        )}

        {/* ── Visual Schedule Route & Competency ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* Today's Shift Route Progression */}
          <div className="lg:col-span-7 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Today's Dispatch Route
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-medium">
                  08:00 - 18:00
                </span>
              </div>

              <div className="space-y-2 pt-0.5">
                {isLoading ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading schedule...</div>
                ) : jobs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">No jobs assigned yet.</div>
                ) : (
                  jobs.slice(0, 4).map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)]/50 hover:bg-[var(--bg-surface-2)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                            job.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : job.status === "TRAVELLING"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {job.status === "COMPLETED" ? "✓" : job.id.slice(-2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                              {job.customerName}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">({job.id})</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] truncate">
                            {job.assetName} · {job.facilityAddress}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(
                            job.status
                          )}`}
                        >
                          {job.status.replace(/_/g, " ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedJob(job)}
                          className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Skill Passport Competency Overview */}
          <div className="lg:col-span-5 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Trade Competency
                </h3>
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                  Tier 1
                </span>
              </div>
              <HorizontalBarChart
                data={[
                  { label: "High-Voltage Switchgear & Transformers", value: 96, color: "emerald", secondaryLabel: "Class A Master License (DOE-BD)" },
                  { label: "Automatic Transfer Switches (ATS)", value: 92, color: "emerald", secondaryLabel: "Cummins & Perkins Certified" },
                  { label: "Three-Phase Motors & Star-Delta Starters", value: 88, color: "blue", secondaryLabel: "Siemens Level 2 Upkeep" },
                  { label: "Infrared Thermal Busbar Diagnostics", value: 85, color: "blue", secondaryLabel: "FLIR Level 1 Certified" },
                ]}
                valueSuffix="%"
              />
            </div>
          </div>
        </div>

        {/* ── Job Details & Direct Action Modal ─────────────────────────────── */}
        {selectedJob && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={inspectModalHeadingId}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedJob.id} · Ref: {selectedJob.requestId}
                  </span>
                  <h3 id={inspectModalHeadingId} className="font-heading font-bold text-base text-[var(--text-primary)]">
                    {selectedJob.customerName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  aria-label="Close details"
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={16} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Current Status</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(selectedJob.status)}`}>
                      {selectedJob.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Target Equipment</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedJob.assetName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Trade Category</span>
                    <span className="font-medium text-[var(--text-secondary)]">{selectedJob.category}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Facility Address</span>
                    <span className="font-medium text-[var(--text-primary)] text-right max-w-[260px] truncate">
                      {selectedJob.facilityAddress}
                    </span>
                  </div>
                  {selectedJob.customerPhone && (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Site Contact</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <PhoneIcon size={11} />
                        <span>{selectedJob.customerPhone}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">Problem Description</h4>
                  <p className="p-2.5 rounded-lg bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {selectedJob.problemSummary}
                  </p>
                </div>

                {selectedJob.workNotes && (
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Work & Triage Notes</h4>
                    <p className="p-2.5 rounded-lg bg-blue-500/5 text-blue-900 dark:text-blue-300 border border-blue-500/20">
                      {selectedJob.workNotes}
                    </p>
                  </div>
                )}

                {/* On-Site Interim Note Input */}
                {selectedJob.status === "ON_SITE" && (
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

                {selectedJob.status === "WORK_COMPLETED_AWAITING_CONFIRMATION" && (
                  <div className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300">
                    <span className="font-bold block">Completion Report Submitted</span>
                    <span>Awaiting dispatcher verification and customer sign-off.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons inside Modal */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {selectedJob.status === "ASSIGNED" && (
                    <button
                      type="button"
                      onClick={() => handleDirectTransition(selectedJob, "TRAVELLING")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isUpdatingStatus ? "Updating..." : "Start Travel"}
                    </button>
                  )}
                  {selectedJob.status === "TRAVELLING" && (
                    <button
                      type="button"
                      onClick={() => handleDirectTransition(selectedJob, "ON_SITE")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isUpdatingStatus ? "Updating..." : "Confirm Arrival"}
                    </button>
                  )}
                  {selectedJob.status === "ON_SITE" && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompletionModalJob(selectedJob);
                        setCompletionNotes("");
                        setMaterialsUsed("");
                        setCompletionError(null);
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

        {/* ── Completion Report Modal ───────────────────────────────────────── */}
        {completionModalJob && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={completionModalHeadingId}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div>
                  <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    REPORT JOB COMPLETION
                  </div>
                  <h3 id={completionModalHeadingId} className="font-heading font-bold text-sm sm:text-base text-[var(--text-primary)]">
                    {completionModalJob.id} · {completionModalJob.assetName}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {completionModalJob.customerName} ({completionModalJob.facilityAddress})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompletionModalJob(null)}
                  disabled={isSubmittingCompletion}
                  aria-label="Close completion form"
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={16} />
                </button>
              </div>

              {completionError && (
                <div className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangleIcon size={14} className="shrink-0 text-red-500" />
                  <span>{completionError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitCompletion} className="space-y-3 text-xs">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Replacement Materials / Parts
                    </label>
                    <input
                      type="text"
                      value={materialsUsed}
                      onChange={(e) => setMaterialsUsed(e.target.value)}
                      placeholder="e.g. 250A Fuse Link, Seal kit"
                      className="w-full text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Labor Duration Spent
                    </label>
                    <select
                      value={laborHours}
                      onChange={(e) => setLaborHours(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="0.5 hour">0.5 hour (30 min)</option>
                      <option value="1.0 hour">1.0 hour (Standard)</option>
                      <option value="1.5 hours">1.5 hours</option>
                      <option value="2.0 hours">2.0 hours (Major Repair)</option>
                      <option value="3.0+ hours">3.0+ hours (Overtime)</option>
                    </select>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                  Submitting this completion report records physical on-site restoration and advances this work order to <strong>Completion Pending Confirmation</strong>.
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setCompletionModalJob(null)}
                    disabled={isSubmittingCompletion}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}