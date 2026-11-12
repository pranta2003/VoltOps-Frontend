import { useState, useMemo } from "react";
import { Layout } from "../../components/Layout";
import {
  ClockIcon,
  SearchIcon,
  ChevronDownIcon,
  CalendarIcon,
  CheckCircleIcon,
  MapPinIcon,
  RadioIcon,
  ChevronRightIcon,
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
  const [dayOffset, setDayOffset] = useState(0);

  const currentDateDisplay = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return {
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      isToday: dayOffset === 0,
    };
  }, [dayOffset]);

  const filteredRoster = useMemo(() => {
    return ROSTER_SCHEDULE.filter((item) => {
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
  }, [searchQuery, selectedBranch, selectedShift]);

  const shiftLanes = [
    {
      id: "Morning",
      label: "Morning Shift",
      window: "08:00 - 16:00",
      accent: "border-l-4 border-l-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
      items: filteredRoster.filter((r) => r.shift.startsWith("Morning")),
    },
    {
      id: "Evening",
      label: "Evening Shift",
      window: "16:00 - 00:00",
      accent: "border-l-4 border-l-amber-500",
      badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      items: filteredRoster.filter((r) => r.shift.startsWith("Evening")),
    },
    {
      id: "Night",
      label: "Night Standby",
      window: "00:00 - 08:00",
      accent: "border-l-4 border-l-indigo-500",
      badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
      items: filteredRoster.filter((r) => r.shift.startsWith("Night")),
    },
  ];

  const getStatusBadge = (status: ShiftRosterItem["status"]) => {
    switch (status) {
      case "ON_DUTY":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
      case "STANDBY":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
      case "ON_LEAVE":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
    }
  };

  return (
    <Layout
      title="Technician Schedule"
      action={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDayOffset((prev) => prev - 1)}
            aria-label="Previous Day"
            className="p-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ChevronRightIcon size={14} className="rotate-180" />
          </button>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border)] text-[var(--text-primary)] font-semibold">
            {currentDateDisplay.weekday}, {currentDateDisplay.date} {currentDateDisplay.isToday ? "(Today)" : ""}
          </span>
          <button
            type="button"
            onClick={() => setDayOffset((prev) => prev + 1)}
            aria-label="Next Day"
            className="p-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ChevronRightIcon size={14} />
          </button>
          {dayOffset !== 0 && (
            <button
              type="button"
              onClick={() => setDayOffset(0)}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold underline px-1"
            >
              Today
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* ── Operational Summary & Hub Strip ────────────────────────────── */}
        <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Shift Roster: 9 Technicians Assigned
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">·</span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              3 On Duty
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">·</span>
            <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
              5 Standby
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">·</span>
            <span className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
              1 On Leave
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              EPZ Core (3)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Gazipur Zone (3)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Tejgaon Hub (3)
            </span>
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
              placeholder="Search by technician name, ID, trade or hub..."
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
              <option value="ALL">All Shifts (3)</option>
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

        {/* ── Shift Lanes Timeline View ──────────────────────────────────── */}
        <div className="space-y-3.5">
          {shiftLanes.map((lane) => {
            if (selectedShift !== "ALL" && !lane.id.includes(selectedShift)) {
              return null;
            }

            return (
              <div
                key={lane.id}
                className={`rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-xs ${lane.accent}`}
              >
                {/* Lane Header */}
                <div className="px-4 py-2.5 bg-[var(--bg-surface-2)] border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[var(--text-primary)]">{lane.label}</span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">({lane.window})</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${lane.badge}`}>
                    {lane.items.length} Techs
                  </span>
                </div>

                {/* Technician Shift Rows */}
                {lane.items.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                    No technicians scheduled in this shift matching filters.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {lane.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--bg-surface-2)] transition-colors text-xs"
                      >
                        {/* Technician ID & Name */}
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center justify-center shrink-0 text-[var(--text-primary)]">
                            {item.technicianName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-[var(--text-primary)] block">
                              {item.technicianName}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {item.technicianId} · {item.branch}
                            </span>
                          </div>
                        </div>

                        {/* Trade Competencies */}
                        <div className="min-w-[180px]">
                          <span className="font-medium text-xs text-[var(--text-primary)] block truncate" title={item.primaryTrade}>
                            {item.primaryTrade}
                          </span>
                          {item.secondaryTrade && (
                            <span className="text-[10px] text-[var(--text-muted)] block truncate">
                              + {item.secondaryTrade}
                            </span>
                          )}
                        </div>

                        {/* Status */}
                        <div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Current Assignment / Dispatch Task */}
                        <div className="min-w-[190px] text-right">
                          {item.activeJob ? (
                            <span
                              className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 block truncate"
                              title={item.activeJob}
                            >
                              {item.activeJob}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                              {item.status === "ON_LEAVE" ? "Off Duty (Leave)" : "Ready / Standby"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
