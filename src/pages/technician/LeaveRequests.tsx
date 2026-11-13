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
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "PENDING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "REJECTED":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
      case "CANCELLED":
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
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
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
        >
          <span>Request Leave</span>
          <ArrowRightIcon size={12} />
        </button>
      }
    >
      <div className="space-y-4">
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
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface-2)] flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider">
                My Leave History & Status
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Approval requires Dispatcher or Admin review before shift rosters update.
              </p>
            </div>
            <span className="text-[11px] font-mono font-medium text-[var(--text-muted)]">
              {requests.length} requests
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Request ID</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Dates</th>
                  <th className="py-2.5 px-4">Reason / Notes</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      Loading leave records...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No leave requests recorded. Click "Request Leave" above to apply.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {r.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {r.leaveType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[var(--text-primary)]">
                        {r.startDate} <span className="text-[var(--text-muted)]">to</span> {r.endDate}
                      </td>
                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="truncate text-[var(--text-primary)]">{r.reason}</p>
                        {r.reviewerNotes && (
                          <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
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
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
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
            <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                  Submit Leave Request
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={16} />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Leave Type
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                  >
                    <option value="ANNUAL">Annual Planned Leave</option>
                    <option value="MEDICAL">Medical / Health Leave</option>
                    <option value="CASUAL">Casual Absence</option>
                    <option value="EMERGENCY">Emergency Family Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--text-primary)] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Reason & Handover Notes
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly state reason for leave and any pending tool or job handover details..."
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                  Notice: All leave requests require Dispatcher or Admin approval before shift assignments change.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all"
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
