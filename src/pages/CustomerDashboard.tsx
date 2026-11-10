import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { CANONICAL_SERVICE_CATEGORIES, ServiceCategory, PriorityLevel } from "../types";
import {
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  WrenchIcon,
  ArrowRightIcon,
} from "../components/Icons";

interface CustomerRequestItem {
  id: string;
  category: ServiceCategory;
  asset: string;
  problem: string;
  priority: PriorityLevel;
  status: "IN_REVIEW" | "DISPATCHED" | "IN_PROGRESS" | "COMPLETED";
  submittedDate: string;
  arrivalSlaWindow?: string;
  assignedTech?: string;
}

const INITIAL_CUSTOMER_REQUESTS: CustomerRequestItem[] = [
  {
    id: "SR-1024",
    category: "Electrical and power systems",
    asset: "Standby Generator G-01",
    problem: "Automatic Transfer Switch (ATS) Failure during power test",
    priority: "URGENT",
    status: "DISPATCHED",
    submittedDate: "10 Nov 2026, 10:15 AM",
    arrivalSlaWindow: "Within 20–40 min",
    assignedTech: "Kamrul Islam (Certified Master Electrician)",
  },
  {
    id: "SR-1021",
    category: "AC, HVAC, and cooling",
    asset: "Central Chiller Unit #2",
    problem: "Compressor pressure differential trip",
    priority: "HIGH",
    status: "IN_REVIEW",
    submittedDate: "10 Nov 2026, 09:30 AM",
    arrivalSlaWindow: "Pending Dispatcher Confirmation",
  },
  {
    id: "SR-1018",
    category: "Internet, networking, and hardware",
    asset: "Server Room Core Switch SW-01",
    problem: "Uplink packet drops and optical port degraded",
    priority: "LOW",
    status: "COMPLETED",
    submittedDate: "08 Nov 2026, 02:45 PM",
  },
];

export function CustomerDashboard() {
  const { user } = useAuth();
  const [requests] = useState<CustomerRequestItem[]>(INITIAL_CUSTOMER_REQUESTS);

  // Quick stats
  const activeCount = requests.filter((r) => r.status !== "COMPLETED").length;
  const inProgressCount = requests.filter((r) => r.status === "DISPATCHED" || r.status === "IN_PROGRESS").length;

  const getStatusBadge = (status: CustomerRequestItem["status"]) => {
    switch (status) {
      case "IN_REVIEW":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "DISPATCHED":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "IN_PROGRESS":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
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
      subtitle={`Logged in as ${user?.name || "Facility Customer"} · ABC Manufacturing Ltd`}
      action={
        <Link
          to="/customer/new-request"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+ New Service Request</span>
        </Link>
      }
    >
      {/* ── Summary Stats Row (Figma: Embedded 27:658 layout) ────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Active Breakdown Requests</span>
            <AlertTriangleIcon size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-bold font-heading text-[var(--text-primary)]">
            {activeCount}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Awaiting inspection or repair</div>
        </div>

        <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <span>Technicians On Route</span>
            <ClockIcon size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-3xl font-bold font-heading text-blue-600 dark:text-blue-400">
            {inProgressCount}
          </div>
          <div className="mt-1 text-xs text-blue-600/80 font-medium">Physical arrival SLA active</div>
        </div>

        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Active Coverage Plan</span>
            <CheckCircleIcon size={16} className="text-[#10b981]" />
          </div>
          <div className="mt-2 text-xl font-bold font-heading text-[#10b981]">
            24/7 Standard (Plan B)
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">40-minute arrival SLA guaranteed</div>
        </div>
      </div>

      {/* ── Request History Table (Figma Embedded 27:658) ─────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-base text-[var(--text-primary)]">
              Facility Breakdown Requests
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Real-time dispatch milestones, assigned staff, and on-site repair progress
            </p>
          </div>
          <Link
            to="/customer/new-request"
            className="text-xs font-bold text-[#10b981] hover:underline flex items-center gap-1"
          >
            <span>Submit new issue</span>
            <ArrowRightIcon size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Service Category & Asset</th>
                <th className="py-3 px-4">Problem Description</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Arrival SLA Window</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                    {r.id}
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
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                        r.status
                      )}`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {r.arrivalSlaWindow ? (
                      <div>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {r.arrivalSlaWindow}
                        </span>
                        {r.assignedTech && (
                          <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">
                            {r.assignedTech}
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
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
