import { useState } from "react";
import { Layout } from "../../components/Layout";
import { MetricCard } from "../../components/MetricCard";
import {
  ClockIcon,
  ShieldCheckIcon,
  BuildingIcon,
  RadioIcon,
  SearchIcon,
  ChevronDownIcon,
  CalendarIcon,
  CheckCircleIcon,
  MapPinIcon,
} from "../../components/Icons";

interface ShiftRosterItem {
  id: string;
  technicianName: string;
  technicianId: string;
  branch: "EPZ Industrial Core" | "Gazipur Industrial Zone" | "Tejgaon Commercial Core";
  shift: "Morning (08:00 - 16:00)" | "Evening (16:00 - 00:00)" | "Night Standby (00:00 - 08:00)";
  primaryTrade: string;
  secondaryTrade?: string;
  status: "ON_DUTY" | "STANDBY" | "ON_LEAVE";
  activeJob?: string;
}

const ROSTER_SCHEDULE: ShiftRosterItem[] = [
  {
    id: "SCH-01",
    technicianName: "Karim Uddin",
    technicianId: "TECH-001",
    branch: "EPZ Industrial Core",
    shift: "Morning (08:00 - 16:00)",
    primaryTrade: "Electrical and power systems",
    secondaryTrade: "AC, HVAC, and cooling",
    status: "ON_DUTY",
    activeJob: "WO-2048 (Generator G-01)",
  },
  {
    id: "SCH-02",
    technicianName: "Nasir Hossain",
    technicianId: "TECH-002",
    branch: "Gazipur Industrial Zone",
    shift: "Morning (08:00 - 16:00)",
    primaryTrade: "AC, HVAC, and cooling",
    status: "ON_DUTY",
    activeJob: "WO-2047 (Central Chiller)",
  },
  {
    id: "SCH-03",
    technicianName: "Rafiqul Islam",
    technicianId: "TECH-003",
    branch: "Tejgaon Commercial Core",
    shift: "Morning (08:00 - 16:00)",
    primaryTrade: "CCTV and security",
    secondaryTrade: "Internet, networking, and hardware",
    status: "ON_DUTY",
    activeJob: "WO-2045 (PoE NVR System)",
  },
  {
    id: "SCH-04",
    technicianName: "Zahid Hasan",
    technicianId: "TECH-004",
    branch: "EPZ Industrial Core",
    shift: "Evening (16:00 - 00:00)",
    primaryTrade: "Electrical and power systems",
    status: "STANDBY",
  },
  {
    id: "SCH-05",
    technicianName: "Farhan Ahmed",
    technicianId: "TECH-005",
    branch: "Gazipur Industrial Zone",
    shift: "Evening (16:00 - 00:00)",
    primaryTrade: "Plumbing and water systems",
    status: "STANDBY",
  },
  {
    id: "SCH-06",
    technicianName: "Mehedi Hasan",
    technicianId: "TECH-006",
    branch: "Tejgaon Commercial Core",
    shift: "Evening (16:00 - 00:00)",
    primaryTrade: "IT and software support",
    status: "STANDBY",
  },
  {
    id: "SCH-07",
    technicianName: "Shafiqul Alam",
    technicianId: "TECH-007",
    branch: "EPZ Industrial Core",
    shift: "Night Standby (00:00 - 08:00)",
    primaryTrade: "Facility maintenance",
    secondaryTrade: "Electrical and power systems",
    status: "STANDBY",
  },
  {
    id: "SCH-08",
    technicianName: "Anisur Rahman",
    technicianId: "TECH-008",
    branch: "Gazipur Industrial Zone",
    shift: "Night Standby (00:00 - 08:00)",
    primaryTrade: "AC, HVAC, and cooling",
    status: "STANDBY",
  },
  {
    id: "SCH-09",
    technicianName: "Kamrul Islam",
    technicianId: "TECH-009",
    branch: "Tejgaon Commercial Core",
    shift: "Morning (08:00 - 16:00)",
    primaryTrade: "Plumbing and water systems",
    status: "ON_LEAVE",
  },
];

export function DispatcherSchedule() {
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedShift, setSelectedShift] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoster = ROSTER_SCHEDULE.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.technicianName.toLowerCase().includes(q) ||
        item.technicianId.toLowerCase().includes(q) ||
        item.primaryTrade.toLowerCase().includes(q) ||
        item.branch.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedBranch !== "ALL" && !item.branch.includes(selectedBranch)) {
      return false;
    }

    if (selectedShift !== "ALL" && !item.shift.includes(selectedShift)) {
      return false;
    }

    return true;
  });

  const getStatusBadge = (status: ShiftRosterItem["status"]) => {
    switch (status) {
      case "ON_DUTY":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
      case "STANDBY":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
      case "ON_LEAVE":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
    }
  };

  return (
    <Layout
      title="Dispatcher Shift Schedule"
      subtitle="Workforce Shift Roster & 24/7 Regional Hub Coverage Matrix"
      action={
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-secondary)] font-semibold">
            Today: {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ── Shift Coverage Metric Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <MetricCard
            label="Active On Duty"
            value="3 Shift Leads"
            subtext="Morning Operations (08:00 - 16:00)"
            icon={RadioIcon}
            trend={{ direction: "up", label: "Full Coverage" }}
          />

          <MetricCard
            label="Standby Coverage"
            value="5 Ready"
            subtext="Evening & Night SLA Responders"
            icon={ClockIcon}
            trend={{ direction: "neutral", label: "24/7 Active" }}
          />

          <MetricCard
            label="Regional Hub Health"
            value="3 / 3 Hubs"
            subtext="EPZ · Gazipur · Tejgaon Active"
            icon={BuildingIcon}
            trend={{ direction: "neutral", label: "100% Hub Uptime" }}
          />
        </div>

        {/* ── Regional Hub Coverage Strip ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Hub 1</span>
              <h4 className="font-heading font-semibold text-xs sm:text-sm text-[var(--text-primary)]">EPZ Industrial Core</h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">3 Technicians · Electrical & Facility</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Active Hub" />
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Hub 2</span>
              <h4 className="font-heading font-semibold text-xs sm:text-sm text-[var(--text-primary)]">Gazipur Industrial Zone</h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">3 Technicians · HVAC & Plumbing</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Active Hub" />
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Hub 3</span>
              <h4 className="font-heading font-semibold text-xs sm:text-sm text-[var(--text-primary)]">Tejgaon Commercial Core</h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">3 Technicians · CCTV & IT Systems</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Active Hub" />
          </div>
        </div>

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
              placeholder="Search by technician name, ID, or trade..."
              aria-label="Search schedule"
              className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              aria-label="Filter by branch hub"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Hubs (3)</option>
              <option value="EPZ">EPZ Industrial Core</option>
              <option value="Gazipur">Gazipur Zone</option>
              <option value="Tejgaon">Tejgaon Core</option>
            </select>
            <ChevronDownIcon
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>

          {/* Shift Filter */}
          <div className="relative">
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              aria-label="Filter by shift window"
              className="text-xs py-2 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Shift Windows</option>
              <option value="Morning">Morning (08:00 - 16:00)</option>
              <option value="Evening">Evening (16:00 - 00:00)</option>
              <option value="Night">Night Standby (00:00 - 08:00)</option>
            </select>
            <ChevronDownIcon
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>
        </div>

        {/* ── Shift Roster Table ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[900px] text-left text-xs sm:text-[13px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[180px]" />
                <col className="w-[170px]" />
                <col className="w-[170px]" />
                <col className="w-[180px]" />
                <col className="w-[100px]" />
                <col className="w-[160px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-xs">
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3">Branch Hub</th>
                  <th className="py-2.5 px-3">Shift Window</th>
                  <th className="py-2.5 px-3">Trade Coverage</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Current Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredRoster.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {item.technicianName.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-[var(--text-primary)] text-xs sm:text-[13px] block truncate">
                            {item.technicianName}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-mono">{item.technicianId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 truncate" title={item.branch}>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{item.branch}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-[var(--text-secondary)]">
                      {item.shift}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-xs text-[var(--text-primary)] block truncate" title={item.primaryTrade}>
                        {item.primaryTrade}
                      </span>
                      {item.secondaryTrade && (
                        <span className="text-[11px] text-[var(--text-muted)] block truncate" title={`Secondary: ${item.secondaryTrade}`}>
                          + {item.secondaryTrade}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusBadge(item.status)}`}>
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {item.activeJob ? (
                        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 block truncate" title={item.activeJob}>
                          {item.activeJob}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] font-mono">Standby / Unallocated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
