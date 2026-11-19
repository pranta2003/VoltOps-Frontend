import { useState, useEffect, useMemo, useRef } from "react";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { notificationService } from "../../services/notificationService";
import { getLocalAuditLogs, saveLocalAuditLogs } from "../../services/adminService";
import { SystemAuditEvent } from "../../types/admin";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  SearchIcon,
  XIcon,
  EyeIcon,
  UserIcon,
  RadioIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "../../components/Icons";

export interface DispatcherRecord {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  branch: string;
  designation: string;
  department: string;
  shiftStatus: "ON_DUTY" | "STANDBY" | "OFF_DUTY";
  isActive: boolean;
  assignedRegions: string[];
  activeQueuesCount: number;
  completedReviewsCount: number;
  joinedDate: string;
  lastActive: string;
}

const STORAGE_DISPATCHERS_KEY = "voltops_admin_dispatchers_v1";

const INITIAL_DISPATCHERS: DispatcherRecord[] = [
  {
    id: "demo-usr-disp-1",
    name: "Tania Akter",
    employeeId: "DSP-EPZ-01",
    email: "dispatcher@voltops.com",
    phone: "+880 1711 000002",
    branch: "EPZ Industrial Core",
    designation: "Senior Dispatcher & Shift Lead",
    department: "Dispatch Operations",
    shiftStatus: "ON_DUTY",
    isActive: true,
    assignedRegions: ["EPZ Industrial Core", "Savar Central", "DEPZ Industrial Bay"],
    activeQueuesCount: 4,
    completedReviewsCount: 28,
    joinedDate: "05 Sep 2026",
    lastActive: "Active now",
  },
  {
    id: "demo-usr-disp-2",
    name: "Bani",
    employeeId: "DSP-GZP-02",
    email: "bani@voltops.com",
    phone: "+880 1711 000003",
    branch: "Gazipur Hub",
    designation: "Regional Dispatch Coordinator",
    department: "Dispatch Operations",
    shiftStatus: "ON_DUTY",
    isActive: true,
    assignedRegions: ["Gazipur Hub", "Tongi Industrial Corridor", "Joydebpur"],
    activeQueuesCount: 2,
    completedReviewsCount: 19,
    joinedDate: "12 Sep 2026",
    lastActive: "Active now",
  },
  {
    id: "demo-usr-disp-3",
    name: "Farhana Yasmin",
    employeeId: "DSP-TJ-03",
    email: "farhana.disp@voltops.com",
    phone: "+880 1711 000004",
    branch: "Tejgaon Industrial",
    designation: "Junior Operations Dispatcher",
    department: "Dispatch Operations",
    shiftStatus: "STANDBY",
    isActive: true,
    assignedRegions: ["Tejgaon Industrial Area", "Mohakhali Corridor", "Gulshan Link"],
    activeQueuesCount: 1,
    completedReviewsCount: 12,
    joinedDate: "01 Oct 2026",
    lastActive: "Today, 08:30 AM",
  },
];

function loadDispatchers(): DispatcherRecord[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_DISPATCHERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
  }
  return JSON.parse(JSON.stringify(INITIAL_DISPATCHERS));
}

function saveDispatchers(dispatchers: DispatcherRecord[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_DISPATCHERS_KEY, JSON.stringify(dispatchers));
    } catch {
      // fallback
    }
  }
}

export function DispatcherManagement() {
  const { user: currentUser } = useAuth();
  const [dispatchers, setDispatchers] = useState<DispatcherRecord[]>(loadDispatchers);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [selectedDispatcher, setSelectedDispatcher] = useState<DispatcherRecord | null>(null);
  const [confirmToggleTarget, setConfirmToggleTarget] = useState<DispatcherRecord | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const lastFocusedTriggerRef = useRef<HTMLElement | null>(null);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedDispatcher(null);
        setConfirmToggleTarget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter dispatchers
  const filteredDispatchers = useMemo(() => {
    return dispatchers.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.employeeId.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.branch.toLowerCase().includes(q) ||
        d.assignedRegions.some((r) => r.toLowerCase().includes(q));

      const matchesBranch = branchFilter === "ALL" || d.branch === branchFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? d.isActive : !d.isActive);

      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [dispatchers, searchQuery, branchFilter, statusFilter]);

  // Telemetry counts
  const totalCount = dispatchers.length;
  const activeCount = dispatchers.filter((d) => d.isActive).length;
  const onDutyCount = dispatchers.filter((d) => d.isActive && d.shiftStatus === "ON_DUTY").length;

  const handleToggleStatus = (dispatcher: DispatcherRecord) => {
    const updatedStatus = !dispatcher.isActive;
    const updated = dispatchers.map((d) =>
      d.id === dispatcher.id
        ? {
            ...d,
            isActive: updatedStatus,
            shiftStatus: (updatedStatus ? "STANDBY" : "OFF_DUTY") as DispatcherRecord["shiftStatus"],
          }
        : d
    );
    setDispatchers(updated);
    saveDispatchers(updated);

    // Record system audit log
    const auditLogs = getLocalAuditLogs();
    const newAudit: SystemAuditEvent = {
      id: `demo-aud-${Date.now()}`,
      timestamp: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      actorName: currentUser?.name || "Pranta (Lead Admin)",
      actorRole: "ADMIN",
      actorIp: "127.0.0.1 (Local Preview)",
      category: "ACCOUNT",
      action: `Dispatcher account ${updatedStatus ? "activated" : "deactivated"}: ${dispatcher.name}`,
      targetEntity: `Dispatcher ${dispatcher.name} (${dispatcher.employeeId})`,
      targetId: dispatcher.id,
      severity: updatedStatus ? "INFO" : "WARNING",
      details: `Account status toggled from ${dispatcher.isActive ? "ACTIVE" : "INACTIVE"} to ${updatedStatus ? "ACTIVE" : "INACTIVE"} by Lead Administrator.`,
    };
    auditLogs.unshift(newAudit);
    saveLocalAuditLogs(auditLogs);

    // In-app notification
    notificationService.addNotification({
      role: "ADMIN",
      title: "Dispatcher Account Status Updated",
      message: `${dispatcher.name} (${dispatcher.employeeId}) is now ${updatedStatus ? "ACTIVE" : "INACTIVE"}.`,
      type: updatedStatus ? "info" : "warning",
      link: "/admin/dispatchers",
    });

    setActionNotice(
      `Saved in Local Preview: ${dispatcher.name} account ${
        updatedStatus ? "activated" : "deactivated"
      }.`
    );
    setTimeout(() => setActionNotice(null), 4000);
    setConfirmToggleTarget(null);
    if (selectedDispatcher?.id === dispatcher.id) {
      setSelectedDispatcher({
        ...selectedDispatcher,
        isActive: updatedStatus,
        shiftStatus: (updatedStatus ? "STANDBY" : "OFF_DUTY") as DispatcherRecord["shiftStatus"],
      });
    }
  };

  return (
    <Layout title="Dispatchers">
      <div className="space-y-4 pb-24">
        {/* ── Sub-header / Status Toolbar ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              {totalCount} registered dispatchers
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              {onDutyCount} currently on duty
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
              {activeCount} active accounts
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Clean toolbar */}
          </div>
        </div>

        {/* ── Action Notice ────────────────────────────────────────────── */}
        {actionNotice && (
          <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 text-xs flex items-center justify-between animate-fade-in shadow-xs">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-emerald-800 dark:text-emerald-400 hover:opacity-80"
            >
              <XIcon size={12} />
            </button>
          </div>
        )}

        {/* ── Search & Filter Controls ─────────────────────────────────── */}
        <div className="p-3.5 rounded-xl border border-slate-300 border-l-4 border-l-emerald-500 bg-white shadow-md dark:border-white/5 dark:border-l-white/5 dark:bg-zinc-900 dark:shadow-none space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <SearchIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dispatcher name, ID, region..."
                className="w-full pl-8 pr-8 py-2 rounded-xl text-xs border border-slate-300 bg-slate-100/80 text-slate-950 placeholder:text-slate-500 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>

            {/* Branch Hub Filter */}
            <div>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 bg-slate-100/80 text-slate-950 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 font-bold shadow-xs cursor-pointer"
              >
                <option value="ALL">All Hubs & Branches</option>
                <option value="EPZ Industrial Core">EPZ Industrial Core</option>
                <option value="Gazipur Hub">Gazipur Hub</option>
                <option value="Tejgaon Industrial">Tejgaon Industrial</option>
              </select>
            </div>

            {/* Account Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 bg-slate-100/80 text-slate-950 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 font-bold shadow-xs cursor-pointer"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="ACTIVE">Active Accounts Only</option>
                <option value="INACTIVE">Deactivated Accounts</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Dispatchers Table ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-500 rounded-xl shadow-md overflow-hidden dark:bg-zinc-900 dark:border-white/5 dark:border-t-white/5 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-200/70 border-b-2 border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider dark:bg-zinc-950/60 dark:border-white/5 dark:text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Dispatcher & ID</th>
                  <th className="py-3 px-4">Branch Hub & Regions</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Shift & Status</th>
                  <th className="py-3 px-4">Handled Queues</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/80 dark:divide-white/5">
                {filteredDispatchers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-600 dark:text-zinc-400 font-medium">
                      No dispatchers matching current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredDispatchers.map((d) => (
                    <tr
                      key={d.id}
                      className="odd:bg-white even:bg-slate-50/90 hover:bg-emerald-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-300 text-cyan-800 dark:bg-[#06b6d4]/15 dark:border-[#06b6d4]/30 dark:text-[#06b6d4] font-bold flex items-center justify-center text-xs shrink-0">
                            {d.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50">
                              {d.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">
                              {d.employeeId} · {d.designation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Branch & Assigned Regions */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50">{d.branch}</div>
                        <div className="text-[11px] text-slate-700 dark:text-zinc-300 flex items-center gap-1 mt-0.5 font-medium">
                          <span>{d.assignedRegions.join(", ")}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 dark:text-zinc-100 font-mono text-xs">{d.email}</div>
                        <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">{d.phone}</div>
                      </td>

                      {/* Shift & Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {d.shiftStatus === "ON_DUTY" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              On Duty
                            </span>
                          ) : d.shiftStatus === "STANDBY" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
                              Standby
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/10">
                              Off Duty
                            </span>
                          )}

                          {!d.isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#8a1858] border border-rose-300 dark:bg-[#b8287a]/15 dark:text-[#e879b9] dark:border-[#b8287a]/30">
                              Deactivated
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-zinc-400 mt-1 font-medium">
                          {d.lastActive}
                        </div>
                      </td>

                      {/* Handled Queues */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50 tabular-nums">
                          {d.activeQueuesCount} active orders
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium tabular-nums">
                          {d.completedReviewsCount} reviews sign-offs
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              lastFocusedTriggerRef.current = e.currentTarget;
                              setSelectedDispatcher(d);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <EyeIcon size={12} />
                            <span>Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmToggleTarget(d)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
                              d.isActive
                                ? "border-rose-300 text-[#8a1858] hover:bg-rose-50 dark:border-[#b8287a]/30 dark:text-[#e879b9] dark:hover:bg-[#b8287a]/15"
                                : "border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                            }`}
                          >
                            {d.isActive ? "Deactivate" : "Activate"}
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

        {/* ── Dispatcher Details Modal ─────────────────────────────────── */}
        {selectedDispatcher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-cyan-50 border border-cyan-300 text-cyan-800 dark:bg-[#06b6d4]/15 dark:border-[#06b6d4]/30 dark:text-[#06b6d4] font-bold flex items-center justify-center text-sm">
                    {selectedDispatcher.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-950 dark:text-zinc-50">
                      {selectedDispatcher.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 font-mono">
                      {selectedDispatcher.employeeId} · {selectedDispatcher.designation}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDispatcher(null)}
                  className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <XIcon size={14} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-100/80 dark:bg-zinc-950 border border-slate-300 dark:border-white/10">
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 block text-[11px] font-semibold">
                      Department
                    </span>
                    <span className="font-bold text-slate-950 dark:text-zinc-50">
                      {selectedDispatcher.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 block text-[11px] font-semibold">
                      Hub Location
                    </span>
                    <span className="font-bold text-slate-950 dark:text-zinc-50">
                      {selectedDispatcher.branch}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 block text-[11px] font-semibold">
                      Email Address
                    </span>
                    <span className="font-mono text-slate-950 dark:text-zinc-50">
                      {selectedDispatcher.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 block text-[11px] font-semibold">
                      Direct Telephone
                    </span>
                    <span className="font-mono text-slate-950 dark:text-zinc-50">
                      {selectedDispatcher.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 block text-[11px] font-semibold">
                      Shift Status
                    </span>
                    <span className="font-bold text-slate-950 dark:text-zinc-50">
                      {selectedDispatcher.shiftStatus.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 block text-[11px] font-semibold">
                      Account Status
                    </span>
                    <span
                      className={`font-bold ${
                        selectedDispatcher.isActive ? "text-emerald-700 dark:text-emerald-400" : "text-[#8a1858] dark:text-[#f472b6]"
                      }`}
                    >
                      {selectedDispatcher.isActive ? "Active (Authorized)" : "Deactivated"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 space-y-1.5">
                  <span className="text-slate-600 dark:text-zinc-400 block text-[11px] font-semibold">
                    Assigned Dispatch Zones & Facilities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDispatcher.assignedRegions.map((region) => (
                      <span
                        key={region}
                        className="px-2 py-0.5 rounded-lg text-[11px] bg-white border border-slate-300 text-slate-800 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 font-semibold"
                      >
                        {region}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-cyan-300 bg-cyan-50 dark:border-[#06b6d4]/30 dark:bg-[#06b6d4]/10 text-[11px] text-cyan-900 dark:text-cyan-300 flex items-center justify-between font-medium">
                  <span>
                    Workload: <strong>{selectedDispatcher.activeQueuesCount} Active Orders</strong> ·{" "}
                    <strong>{selectedDispatcher.completedReviewsCount} Completed Reviews</strong>
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 dark:text-zinc-400">
                    Joined {selectedDispatcher.joinedDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setConfirmToggleTarget(selectedDispatcher)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    selectedDispatcher.isActive
                      ? "border border-rose-300 bg-rose-50 text-[#8a1858] hover:bg-rose-100 dark:border-[#b8287a]/30 dark:bg-[#b8287a]/15 dark:text-[#e879b9]"
                      : "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                  }`}
                >
                  {selectedDispatcher.isActive ? "Deactivate Account" : "Activate Account"}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDispatcher(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-200 shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Status Toggle Confirmation Modal ────────────────────────── */}
        {confirmToggleTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmToggleTarget.isActive
                      ? "bg-rose-100 text-[#8a1858] dark:bg-[#b8287a]/20 dark:text-[#f472b6]"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                  }`}
                >
                  <AlertTriangleIcon size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-950 dark:text-zinc-50">
                    {confirmToggleTarget.isActive ? "Deactivate Dispatcher" : "Activate Dispatcher"}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 mt-1 leading-relaxed font-medium">
                    Are you sure you want to {confirmToggleTarget.isActive ? "deactivate" : "activate"}{" "}
                    <strong>{confirmToggleTarget.name}</strong> ({confirmToggleTarget.employeeId})?{" "}
                    {confirmToggleTarget.isActive
                      ? "This dispatcher will no longer be able to log in or manage active dispatch queues."
                      : "This dispatcher will be restored to standby shift eligibility."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setConfirmToggleTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-200 shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(confirmToggleTarget)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                    confirmToggleTarget.isActive
                      ? "bg-[#b8287a] hover:bg-[#9d1762]"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {confirmToggleTarget.isActive ? "Confirm Deactivation" : "Confirm Activation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
