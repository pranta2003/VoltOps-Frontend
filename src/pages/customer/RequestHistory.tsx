import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import {
  ServiceRequest,
  PriorityLevel,
  ServiceCategory,
  CoveragePlanId,
  CANONICAL_SERVICE_CATEGORIES,
  getCoveragePlanSlaLabel,
} from "../../types";
import { customerService } from "../../services/customerService";
import { operationalStore } from "../../services/operationalStore";
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SearchIcon,
  ArrowRightIcon,
  XIcon,
  RefreshCwIcon,
  WrenchIcon,
  EyeIcon,
} from "../../components/Icons";

interface CustomerHistoryRequest {
  id: string;
  category: ServiceCategory;
  asset: string;
  problem: string;
  description: string;
  priority: PriorityLevel;
  coveragePlan?: CoveragePlanId;
  displayStatus: "NEW" | "REVIEWING" | "ASSIGNED" | "TRAVELLING" | "ON_SITE" | "COMPLETED" | "CANCELLED";
  submittedDate: string;
  rawSubmittedAt: string;
  arrivalSlaWindow?: string;
  assignedTech?: string;
  workOrderId?: string;
  workNotes?: string;
}

export function RequestHistory() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CustomerHistoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CustomerHistoryRequest | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  function loadCustomerData() {
    setIsLoading(true);
    setError(null);

    customerService
      .getRequests(user?.id)
      .then((res) => {
        const rawRequests: ServiceRequest[] = res.data;
        const workOrders = operationalStore.getWorkOrders();

        const mapped: CustomerHistoryRequest[] = rawRequests.map((r) => {
          const linkedOrder = workOrders.find((w) => w.id === r.workOrderId || w.requestId === r.id);

          let displayStatus: CustomerHistoryRequest["displayStatus"] = "NEW";
          let arrivalSlaWindow = "Pending Dispatcher Review";
          let assignedTech = undefined;
          let workNotes = undefined;

          if (linkedOrder) {
            displayStatus = linkedOrder.status as CustomerHistoryRequest["displayStatus"];
            assignedTech = linkedOrder.assignedTechnicianName;
            workNotes = linkedOrder.workNotes;

            switch (linkedOrder.status) {
              case "UNASSIGNED":
                arrivalSlaWindow = "Work Order Created · Dispatcher Assigning Tech";
                displayStatus = "REVIEWING";
                break;
              case "ASSIGNED":
                arrivalSlaWindow = "Technician Assigned · Standby Departure";
                break;
              case "TRAVELLING":
                if (r.coveragePlan === "247-priority") {
                  arrivalSlaWindow = "En Route (20-Min Physical Arrival SLA)";
                } else if (r.coveragePlan === "247-standard") {
                  arrivalSlaWindow = "En Route (40-Min Physical Arrival SLA)";
                } else if (r.coveragePlan === "8hr") {
                  arrivalSlaWindow = "En Route (Scheduled Business Hours 08:00–16:00)";
                } else if (r.coveragePlan === "custom") {
                  arrivalSlaWindow = "En Route (Custom Negotiated Terms)";
                } else {
                  arrivalSlaWindow = "En Route";
                }
                break;
              case "ON_SITE":
                arrivalSlaWindow = "Technician Present On-Site";
                break;
              case "COMPLETED":
                arrivalSlaWindow = "Service Completed & Signed Off";
                break;
              case "CANCELLED":
                arrivalSlaWindow = "Service Cancelled";
                break;
            }
          } else {
            if (r.status === "REVIEWING") {
              displayStatus = "REVIEWING";
              arrivalSlaWindow = "Dispatcher Evaluating Candidates";
            } else if (r.status === "NEW") {
              displayStatus = "NEW";
              if (r.coveragePlan === "247-priority") {
                arrivalSlaWindow = "20-Min Arrival SLA (Pending Review)";
              } else if (r.coveragePlan === "247-standard") {
                arrivalSlaWindow = "40-Min Arrival SLA (Pending Review)";
              } else if (r.coveragePlan === "8hr") {
                arrivalSlaWindow = "Business Hours Schedule (No Arrival SLA)";
              } else if (r.coveragePlan === "custom") {
                arrivalSlaWindow = "Custom Terms (Pending Review)";
              } else {
                arrivalSlaWindow = "Pending Dispatcher Review";
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
            rawSubmittedAt: r.submittedAt,
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

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          r.id.toLowerCase().includes(q) ||
          r.asset.toLowerCase().includes(q) ||
          r.problem.toLowerCase().includes(q) ||
          (r.assignedTech && r.assignedTech.toLowerCase().includes(q)) ||
          (r.workOrderId && r.workOrderId.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE") {
          if (r.displayStatus === "COMPLETED" || r.displayStatus === "CANCELLED") return false;
        } else if (statusFilter === "IN_PROGRESS") {
          if (!["ASSIGNED", "TRAVELLING", "ON_SITE"].includes(r.displayStatus)) return false;
        } else if (r.displayStatus !== statusFilter) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== "ALL" && r.priority !== priorityFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const getStatusBadge = (status: CustomerHistoryRequest["displayStatus"]) => {
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

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setCategoryFilter("ALL");
  };

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "ALL" || priorityFilter !== "ALL" || categoryFilter !== "ALL";

  return (
    <Layout
      title="Request History"
      subtitle={`Service log and lifecycle history for ${user?.company || "Apex Spinning & Weaving Mills"}`}
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCustomerData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5"
            title="Refresh requests"
          >
            <RefreshCwIcon size={13} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/customer/new-request"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+ New Service Request</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Filter & Search Toolbar ─────────────────────────────────────── */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Box */}
            <div className="relative">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="history-search"
                name="search"
                type="text"
                placeholder="Search ID, asset, problem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <select
                id="history-status-filter"
                name="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                aria-label="Filter by lifecycle status"
              >
                <option value="ALL">All Lifecycle Statuses</option>
                <option value="ACTIVE">Active (Unresolved)</option>
                <option value="IN_PROGRESS">In Progress (Field Dispatched)</option>
                <option value="NEW">New (Awaiting Review)</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="TRAVELLING">Travelling</option>
                <option value="ON_SITE">On Site</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                id="history-priority-filter"
                name="priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                aria-label="Filter by priority urgency"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent (Immediate Impact)</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                id="history-category-filter"
                name="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                aria-label="Filter by trade category"
              >
                <option value="ALL">All Service Trades</option>
                {CANONICAL_SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Indicators & Count */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1 flex-wrap gap-2">
            <div>
              Showing <span className="font-bold text-[var(--text-primary)]">{filteredRequests.length}</span> of{" "}
              <span className="font-bold text-[var(--text-primary)]">{requests.length}</span> recorded requests
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-[#10b981] hover:underline flex items-center gap-1"
              >
                <span>Reset all filters</span>
                <XIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={16} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadCustomerData}
              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 font-bold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Request Log Table ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Target Asset & Trade</th>
                  <th className="py-3 px-4">Problem Scope</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4">Arrival SLA & Staff</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-xs text-[var(--text-muted)] space-y-2">
                      <div className="inline-block animate-spin mb-2">
                        <RefreshCwIcon size={20} className="text-[#10b981]" />
                      </div>
                      <p>Loading service request history...</p>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-xs text-[var(--text-muted)] space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] mx-auto flex items-center justify-center text-[var(--text-muted)]">
                        <ClockIcon size={24} />
                      </div>
                      {hasActiveFilters ? (
                        <>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">No matching requests found</p>
                          <p>Try adjusting your search query, priority filter, or category selection.</p>
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-block px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                          >
                            Clear All Filters
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm text-[var(--text-primary)]">No service requests logged yet</p>
                          <p>Submit your first breakdown request to dispatch a certified technician.</p>
                          <Link
                            to="/customer/new-request"
                            className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all"
                          >
                            + Submit First Request
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
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
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <EyeIcon size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Inspection Modal ────────────────────────────────────────────── */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Service Request Record
                  </span>
                  <h3 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                    {selectedRequest.id} — {selectedRequest.asset}
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
                  <div className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">Problem Title & Scope</div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">{selectedRequest.problem}</div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">{selectedRequest.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Trade Category</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedRequest.category}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Urgency / Severity</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{selectedRequest.priority}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Coverage Plan SLA</span>
                    <span className="font-bold text-[#10b981]">{getCoveragePlanSlaLabel(selectedRequest.coveragePlan)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Current Lifecycle</span>
                    <span className="font-bold text-[#10b981]">{selectedRequest.displayStatus.replace("_", " ")}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Linked Work Order</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{selectedRequest.workOrderId || "Pending Triage"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Submitted Timestamp</span>
                    <span className="font-semibold text-[var(--text-primary)]">{selectedRequest.submittedDate}</span>
                  </div>
                </div>

                {selectedRequest.assignedTech && (
                  <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-1">
                    <div className="font-bold text-blue-700 dark:text-blue-300">Assigned Field Technician:</div>
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
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
