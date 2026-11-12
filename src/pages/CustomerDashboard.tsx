import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import {
  ServiceRequest,
  PriorityLevel,
  ServiceCategory,
  CoveragePlanId,
  APPROVED_COVERAGE_PLANS,
  getCoveragePlanSlaLabel,
} from "../types";
import { customerService } from "../services/customerService";
import { operationalStore } from "../services/operationalStore";
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XIcon,
} from "../components/Icons";

interface CustomerViewRequest {
  id: string;
  category: ServiceCategory;
  asset: string;
  problem: string;
  description: string;
  priority: PriorityLevel;
  coveragePlan?: CoveragePlanId;
  displayStatus: "NEW" | "REVIEWING" | "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "COMPLETED" | "CANCELLED";
  submittedDate: string;
  arrivalSlaWindow?: string;
  assignedTech?: string;
  workOrderId?: string;
  workNotes?: string;
}

export function CustomerDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CustomerViewRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CustomerViewRequest | null>(null);

  function loadCustomerData() {
    setIsLoading(true);
    setError(null);

    customerService
      .getRequests(user?.id)
      .then((res) => {
        const rawRequests: ServiceRequest[] = res.data;
        const workOrders = operationalStore.getWorkOrders();

        const mapped: CustomerViewRequest[] = rawRequests.map((r) => {
          const linkedOrder = workOrders.find((w) => w.id === r.workOrderId || w.requestId === r.id);

          let displayStatus: CustomerViewRequest["displayStatus"] = "NEW";
          let arrivalSlaWindow = "Pending Dispatcher Review";
          let assignedTech = undefined;
          let workNotes = undefined;

          if (linkedOrder) {
            displayStatus = linkedOrder.status as CustomerViewRequest["displayStatus"];
            assignedTech = linkedOrder.assignedTechnicianName;
            workNotes = linkedOrder.workNotes;

            switch (linkedOrder.status) {
              case "UNASSIGNED":
                arrivalSlaWindow = "Assigning technician";
                displayStatus = "REVIEWING";
                break;
              case "ASSIGNED":
                arrivalSlaWindow = "Assigned · Standby departure";
                break;
              case "TRAVELLING":
                if (r.coveragePlan === "247-priority") {
                  arrivalSlaWindow = "En route · 20m SLA";
                } else if (r.coveragePlan === "247-standard") {
                  arrivalSlaWindow = "En route · 40m SLA";
                } else if (r.coveragePlan === "8hr") {
                  arrivalSlaWindow = "En route · Business hours";
                } else if (r.coveragePlan === "custom") {
                  arrivalSlaWindow = "En route · Custom terms";
                } else {
                  arrivalSlaWindow = "En route";
                }
                break;
              case "ON_SITE":
                arrivalSlaWindow = "Technician on site";
                break;
              case "COMPLETED":
                arrivalSlaWindow = "Completed & signed off";
                break;
              case "CANCELLED":
                arrivalSlaWindow = "Cancelled";
                break;
            }
          } else {
            if (r.status === "REVIEWING") {
              displayStatus = "REVIEWING";
              arrivalSlaWindow = "Dispatcher reviewing";
            } else if (r.status === "NEW") {
              displayStatus = "NEW";
              if (r.coveragePlan === "247-priority") {
                arrivalSlaWindow = "20m SLA (Pending review)";
              } else if (r.coveragePlan === "247-standard") {
                arrivalSlaWindow = "40m SLA (Pending review)";
              } else if (r.coveragePlan === "8hr") {
                arrivalSlaWindow = "Business hours (No SLA)";
              } else if (r.coveragePlan === "custom") {
                arrivalSlaWindow = "Custom terms (Pending review)";
              } else {
                arrivalSlaWindow = "Pending review";
              }
            }
          }

          let formattedDate = r.submittedAt;
          try {
            formattedDate = new Date(r.submittedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            // Keep raw string
          }

          return {
            id: r.id,
            category: r.category,
            asset: r.assetName,
            problem: r.problemTitle,
            description: r.problemDescription,
            priority: r.priority,
            coveragePlan: r.coveragePlan,
            displayStatus,
            submittedDate: formattedDate,
            arrivalSlaWindow,
            assignedTech,
            workOrderId: linkedOrder?.id || r.workOrderId,
            workNotes,
          };
        });

        setRequests(mapped);
      })
      .catch((err) => {
        setError(err.message || "Failed to load service requests.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    loadCustomerData();
    const unsubscribe = operationalStore.subscribe(() => {
      loadCustomerData();
    });
    return unsubscribe;
  }, [user?.id]);

  // Quick stats
  const activeCount = requests.filter((r) => r.displayStatus !== "COMPLETED" && r.displayStatus !== "CANCELLED").length;
  const inProgressCount = requests.filter(
    (r) => r.displayStatus === "ASSIGNED" || r.displayStatus === "TRAVELLING" || r.displayStatus === "ON_SITE"
  ).length;

  const getStatusBadge = (status: CustomerViewRequest["displayStatus"]) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "REVIEWING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "ASSIGNED":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
      case "TRAVELLING":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20 font-bold animate-pulse";
      case "ON_SITE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 font-bold";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold";
      case "CANCELLED":
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
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
      title="Commercial Facility Portal"
      subtitle={`${user?.company || "Apex Spinning & Weaving Mills"} · Savar Facility`}
      action={
        <Link
          to="/customer/new-request"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+ New Service Request</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* ── Summary Stats Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>Active Requests</span>
              <AlertTriangleIcon size={16} className="text-amber-500" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-[var(--text-primary)]">
              {isLoading ? "—" : activeCount}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">Awaiting inspection or repair</div>
          </div>

          <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>Field Dispatched</span>
              <ClockIcon size={16} className="text-blue-500" />
            </div>
            <div className="mt-2 text-3xl font-bold font-heading text-blue-600 dark:text-blue-400">
              {isLoading ? "—" : inProgressCount}
            </div>
            <div className="mt-1 text-xs text-blue-600/80 font-medium">Technician en route or on site</div>
          </div>

          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
              <span>Coverage Plan</span>
              <CheckCircleIcon size={16} className="text-[#10b981]" />
            </div>
            <div className="mt-2 text-xl font-bold font-heading text-[#10b981]">
              24/7 Standard
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">40-minute arrival SLA guaranteed</div>
          </div>
        </div>

        {/* ── Request Table ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-heading font-bold text-base text-[var(--text-primary)]">
                Recent Service Requests
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Real-time dispatch status and on-site repair progress
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadCustomerData}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                to="/customer/new-request"
                className="text-xs font-bold text-[#10b981] hover:underline flex items-center gap-1"
              >
                <span>Report issue</span>
                <ArrowRightIcon size={12} />
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadCustomerData}
                className="font-bold underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Asset & Category</th>
                  <th className="py-3 px-4">Problem Summary</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA & Technician</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      Loading service requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
                      <p>No breakdown requests logged for your facility yet.</p>
                      <Link
                        to="/customer/new-request"
                        className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e]"
                      >
                        Submit Your First Request
                      </Link>
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {r.id}
                        {r.workOrderId && (
                          <div className="text-[10px] font-mono text-[var(--text-muted)]">
                            WO: {r.workOrderId}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">{r.asset}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{r.category}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-[var(--text-primary)] font-medium truncate">{r.problem}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{r.submittedDate}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${getPriorityBadge(
                            r.priority
                          )}`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${getStatusBadge(
                            r.displayStatus
                          )}`}
                        >
                          {r.displayStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {r.arrivalSlaWindow ? (
                          <div>
                            <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                              {r.arrivalSlaWindow}
                            </span>
                            {r.assignedTech && (
                              <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs mt-0.5">
                                Tech: {r.assignedTech}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Inspection Detail Modal ────────────────────────────────────── */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <span className="text-[11px] font-mono font-bold text-[var(--text-muted)]">
                    Service Request Details
                  </span>
                  <h3 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                    {selectedRequest.id} · {selectedRequest.asset}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={14} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] space-y-1">
                  <div className="text-[var(--text-muted)] font-semibold text-[10px]">Problem Summary</div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">{selectedRequest.problem}</div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">{selectedRequest.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Trade Category</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedRequest.category}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Urgency</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{selectedRequest.priority}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Coverage SLA</span>
                    <span className="font-bold text-[#10b981]">{getCoveragePlanSlaLabel(selectedRequest.coveragePlan)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Status</span>
                    <span className="font-bold text-[#10b981]">{selectedRequest.displayStatus.replace("_", " ")}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Work Order</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{selectedRequest.workOrderId || "Pending"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Submitted</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedRequest.submittedDate}</span>
                  </div>
                </div>

                {selectedRequest.assignedTech && (
                  <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-1">
                    <div className="font-bold text-blue-700 dark:text-blue-300">Assigned Technician:</div>
                    <div className="font-semibold text-[var(--text-primary)]">{selectedRequest.assignedTech}</div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400">{selectedRequest.arrivalSlaWindow}</div>
                  </div>
                )}

                {selectedRequest.workNotes && (
                  <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                    <div className="font-bold text-emerald-800 dark:text-emerald-300">Technician Sign-Off Notes:</div>
                    <p className="text-slate-800 dark:text-slate-200">{selectedRequest.workNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
