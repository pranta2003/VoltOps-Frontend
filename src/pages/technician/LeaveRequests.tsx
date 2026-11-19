import { useState, useEffect, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { operationalStore, TechnicianLeaveRequest } from "../../services/operationalStore";
import {
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  RefreshCwIcon,
  ArrowRightIcon,
} from "../../components/Icons";

export function LeaveRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TechnicianLeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState<"ANNUAL" | "MEDICAL" | "CASUAL" | "EMERGENCY">("ANNUAL");
  const [startDate, setStartDate] = useState("2026-11-25");
  const [endDate, setEndDate] = useState("2026-11-27");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadRequests = () => {
    setIsLoading(true);
    const techId = user?.id || "tech-01";
    const userLeaves = operationalStore.getLeaveRequests(techId);
    setRequests(userLeaves);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRequests();
    const unsub = operationalStore.subscribe(() => {
      loadRequests();
    });
    return unsub;
  }, [user?.id]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setFormError("Please provide an operational justification or reason for leave.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setFormError("End date must be after or equal to start date.");
      return;
    }

    const techId = user?.id || "tech-01";
    const techName = user?.name || "Kamrul Islam";
    operationalStore.submitLeaveRequest(techId, techName, {
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
    });

    setModalOpen(false);
    setReason("");
    setFormError(null);
    setActionSuccess("Leave request submitted successfully. Awaiting dispatch manager review.");
    loadRequests();
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleCancel = (id: string) => {
    const ok = operationalStore.cancelLeaveRequest(id);
    if (ok) {
      setActionSuccess(`Leave request ${id} cancelled.`);
      loadRequests();
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const getStatusBadge = (status: TechnicianLeaveRequest["status"]) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold";
      case "PENDING":
        return "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30 font-semibold";
      case "REJECTED":
        return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-[#b8287a]/20 dark:text-[#f472b6] dark:border-[#b8287a]/30 font-bold";
      case "CANCELLED":
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 font-medium";
    }
  };

  return (
    <Layout
      title="Leave Requests"
      action={
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
        >
          <span>Request Leave</span>
          <ArrowRightIcon size={12} />
        </button>
      }
    >
      <div className="space-y-4 pb-24">
        {/* Success Notice */}
        {actionSuccess && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className="rounded-xl border border-slate-300 border-t-4 border-t-emerald-500 bg-white shadow-md overflow-hidden dark:border-white/5 dark:border-t-white/5 dark:bg-zinc-900 dark:shadow-none">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between dark:border-white/5 dark:bg-zinc-950">
            <div>
              <h3 className="font-heading font-bold text-xs text-slate-950 dark:text-zinc-50">
                My leave history & status
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
                Approval requires dispatcher or admin review before shift rosters update.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 border border-slate-300 dark:bg-zinc-900 dark:border-white/10 px-2 py-0.5 rounded tabular-nums">
              {requests.length} requests
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-200/70 text-slate-800 font-bold text-xs uppercase tracking-wider dark:border-white/5 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <th className="py-2.5 px-4">Request ID</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Dates</th>
                  <th className="py-2.5 px-4">Reason / Notes</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/80 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-600 dark:text-zinc-400 font-medium">
                      Loading leave records...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-600 dark:text-zinc-400 font-medium">
                      No leave requests recorded. Click "Request Leave" above to apply.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="odd:bg-white even:bg-slate-50/90 hover:bg-emerald-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-950 dark:text-zinc-50 whitespace-nowrap">
                        {r.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-950 dark:text-zinc-50">
                          {r.leaveType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-zinc-300 font-medium tabular-nums whitespace-nowrap">
                        {r.startDate} <span className="text-slate-500 dark:text-zinc-400">to</span> {r.endDate}
                      </td>
                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="truncate text-slate-900 dark:text-zinc-100 font-medium">{r.reason}</p>
                        {r.reviewerNotes && (
                          <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium truncate mt-0.5">
                            Note: {r.reviewerNotes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            r.status
                          )}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(r.id)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20 transition-all"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Submit Leave Request */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl space-y-4 dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                <h3 className="font-heading font-bold text-sm text-slate-950 dark:text-zinc-50">
                  Submit Leave Request
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <XIcon size={16} />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-xs text-rose-800 dark:text-rose-300 font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-zinc-200 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-950 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="ANNUAL">Annual Planned Leave</option>
                    <option value="MEDICAL">Medical / Health Leave</option>
                    <option value="CASUAL">Casual Absence</option>
                    <option value="EMERGENCY">Emergency Family Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-zinc-200 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-950 font-mono focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-zinc-200 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-950 font-mono focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-zinc-200 mb-1">
                    Reason & Handover Notes
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly state reason for leave and any pending tool or job handover details..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-950 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-cyan-50 border border-cyan-200 text-[11px] text-cyan-900 dark:bg-cyan-500/10 dark:border-cyan-500/20 dark:text-cyan-300 font-medium">
                  Notice: All leave requests require Dispatcher or Admin approval before shift assignments change.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
                  >
                    Submit Request
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
