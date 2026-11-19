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
  XIcon,
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
      badge: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      items: filteredRoster.filter((r) => r.shift.startsWith("Morning")),
    },
    {
      id: "Evening",
      label: "Evening Shift",
      window: "16:00 - 00:00",
      accent: "border-l-4 border-l-cyan-500",
      badge: "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30",
      items: filteredRoster.filter((r) => r.shift.startsWith("Evening")),
    },
    {
      id: "Night",
      label: "Night Standby",
      window: "00:00 - 08:00",
      accent: "border-l-4 border-l-indigo-500",
      badge: "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40",
      items: filteredRoster.filter((r) => r.shift.startsWith("Night")),
    },
  ];

  const getStatusBadge = (status: ShiftRosterItem["status"]) => {
    switch (status) {
      case "ON_DUTY":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30";
      case "STANDBY":
        return "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30";
      case "ON_LEAVE":
        return "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/40";
    }
  };

  return (
    <Layout
      title="Schedule"
      action={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDayOffset((prev) => prev - 1)}
            aria-label="Previous Day"
            className="p-1 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50"
          >
            <ChevronRightIcon size={14} className="rotate-180" />
          </button>
          <span className="text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 text-slate-950 dark:text-zinc-50 shadow-xs">
            {currentDateDisplay.weekday}, {currentDateDisplay.date} {currentDateDisplay.isToday ? "(Today)" : ""}
          </span>
          <button
            type="button"
            onClick={() => setDayOffset((prev) => prev + 1)}
            aria-label="Next Day"
            className="p-1 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50"
          >
            <ChevronRightIcon size={14} />
          </button>
          {dayOffset !== 0 && (
            <button
              type="button"
              onClick={() => setDayOffset(0)}
              className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold underline px-1"
            >
              Today
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 pb-24">
        {/* ── Elevated Filter Toolbar ─────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-l-4 border-l-emerald-500 rounded-xl p-4 shadow-md dark:bg-zinc-900 dark:border-white/5 dark:border-l-white/5 dark:shadow-none">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schedule"
                aria-label="Search schedule"
                className="w-full text-xs pl-9 pr-8 py-2 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-100 p-0.5"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            {/* Hub Filter */}
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                aria-label="Filter by branch hub"
                className="text-xs py-2 pl-3 pr-8 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 appearance-none"
              >
                <option value="ALL">All hubs</option>
                <option value="EPZ">EPZ Hub</option>
                <option value="Gazipur">Gazipur Hub</option>
                <option value="Tejgaon">Tejgaon Hub</option>
              </select>
              <ChevronDownIcon
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
            </div>

            {/* Shift Filter */}
            <div className="relative">
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                aria-label="Filter by shift window"
                className="text-xs py-2 pl-3 pr-8 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-950 font-medium focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 appearance-none"
              >
                <option value="ALL">All shifts</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
              <ChevronDownIcon
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* ── Shift Sections ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {shiftLanes.map((lane) => {
            if (selectedShift !== "ALL" && !lane.id.includes(selectedShift)) {
              return null;
            }

            return (
              <div
                key={lane.id}
                className={`rounded-xl border border-slate-300 bg-white shadow-md dark:border-white/5 dark:bg-zinc-900 dark:shadow-none overflow-hidden ${lane.accent}`}
              >
                {/* Lane Header */}
                <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-950 dark:text-zinc-50">{lane.label}</span>
                    <span className="text-[11px] text-slate-600 dark:text-zinc-400 tabular-nums">({lane.window})</span>
                  </div>
                  <span className="text-[10px] tabular-nums font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-white/10 shadow-xs">
                    {lane.items.length} {lane.items.length === 1 ? "technician" : "technicians"}
                  </span>
                </div>

                {/* Technician Shift Rows */}
                {lane.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-600 dark:text-zinc-400">
                    No technicians scheduled.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-white/5">
                    {lane.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 odd:bg-white even:bg-slate-50/70 hover:bg-emerald-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                      >
                        {/* Technician */}
                        <div className="flex items-center gap-2.5 min-w-[180px]">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 dark:bg-zinc-800 dark:border-white/10 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-900 dark:text-zinc-100">
                            {item.technicianName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-950 dark:text-zinc-50 block">
                              {item.technicianName}
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-zinc-400">
                              {item.branch}
                            </span>
                          </div>
                        </div>

                        {/* Trade */}
                        <div className="min-w-[160px] text-slate-700 dark:text-zinc-300 font-medium">
                          {item.primaryTrade}
                        </div>

                        {/* Status */}
                        <div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status === "ON_DUTY" ? "On duty" : item.status === "STANDBY" ? "Standby" : "On leave"}
                          </span>
                        </div>

                        {/* Current Assignment */}
                        <div className="min-w-[180px] text-right font-mono text-xs">
                          {item.activeJob ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate block" title={item.activeJob}>
                              {item.activeJob}
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-zinc-500">None</span>
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
