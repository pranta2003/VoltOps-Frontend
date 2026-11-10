import { useState, useMemo, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { Role } from "../../types";
import {
  BuildingIcon,
  ShieldCheckIcon,
  RadioIcon,
  SettingsIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "../../components/Icons";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const SEED_USERS: ManagedUser[] = [
  {
    id: "usr-admin-1",
    name: "Pranta",
    email: "admin@voltops.com",
    role: "ADMIN",
    branch: "EPZ Industrial Core",
    isActive: true,
    createdAt: "01 Sep 2026",
    lastLogin: "Today, 11:20 AM",
  },
  {
    id: "usr-disp-1",
    name: "Tania Akter",
    email: "dispatcher@voltops.com",
    role: "DISPATCHER",
    branch: "EPZ Industrial Core",
    isActive: true,
    createdAt: "05 Sep 2026",
    lastLogin: "Today, 10:15 AM",
  },
  {
    id: "usr-disp-2",
    name: "Bani",
    email: "bani@voltops.com",
    role: "DISPATCHER",
    branch: "Gazipur Hub",
    isActive: true,
    createdAt: "12 Sep 2026",
    lastLogin: "Yesterday",
  },
  {
    id: "usr-tech-1",
    name: "Kamrul Islam",
    email: "kamrul@voltops.com",
    role: "TECHNICIAN",
    branch: "EPZ Industrial Core",
    isActive: true,
    createdAt: "10 Sep 2026",
    lastLogin: "Today, 09:40 AM",
  },
  {
    id: "usr-tech-2",
    name: "Tariqul Alam",
    email: "tariqul@voltops.com",
    role: "TECHNICIAN",
    branch: "Gazipur Hub",
    isActive: true,
    createdAt: "15 Sep 2026",
    lastLogin: "08 Nov 2026",
  },
  {
    id: "usr-tech-3",
    name: "Rafiqul Islam",
    email: "rafiqul@voltops.com",
    role: "TECHNICIAN",
    branch: "Tejgaon Industrial",
    isActive: false,
    createdAt: "20 Sep 2026",
    lastLogin: "04 Nov 2026",
  },
  {
    id: "usr-cust-1",
    name: "ABC Manufacturing Ltd",
    email: "facility@abcmfg.com",
    role: "CUSTOMER",
    branch: "EPZ Sector 7",
    isActive: true,
    createdAt: "01 Oct 2026",
    lastLogin: "Today, 10:12 AM",
  },
  {
    id: "usr-cust-2",
    name: "Apex Logistics Hub",
    email: "operations@apexlogistics.com",
    role: "CUSTOMER",
    branch: "Gazipur Central",
    isActive: true,
    createdAt: "08 Oct 2026",
    lastLogin: "Yesterday",
  },
  {
    id: "usr-cust-3",
    name: "Rahimafrooz Facility Hub",
    email: "maintenance@rahimafrooz.com",
    role: "CUSTOMER",
    branch: "Tejgaon Industrial Area",
    isActive: true,
    createdAt: "15 Oct 2026",
    lastLogin: "08 Nov 2026",
  },
];

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>(SEED_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Create Staff Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"DISPATCHER" | "TECHNICIAN" | "ADMIN">("DISPATCHER");
  const [newStaffBranch, setNewStaffBranch] = useState("EPZ Industrial Core");
  const [createSuccessNotice, setCreateSuccessNotice] = useState<string | null>(null);

  // User Details Modal State
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Toggle user active status
  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextState = !u.isActive;
          return { ...u, isActive: nextState };
        }
        return u;
      })
    );
  };

  // Submit new staff account
  const handleCreateStaff = (e: FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail || !newStaffPassword) return;

    const newAccount: ManagedUser = {
      id: `usr-staff-${Date.now()}`,
      name: newStaffName,
      email: newStaffEmail,
      role: newStaffRole,
      branch: newStaffBranch,
      isActive: true,
      createdAt: "Just now",
      lastLogin: "Never",
    };

    setUsers((prev) => [newAccount, ...prev]);
    setCreateSuccessNotice(`Staff account for ${newStaffName} (${newStaffRole}) created in local session.`);
    setNewStaffName("");
    setNewStaffEmail("");
    setNewStaffPassword("");
    setCreateModalOpen(false);

    setTimeout(() => {
      setCreateSuccessNotice(null);
    }, 4500);
  };

  // Filtered directory
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.branch.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.isActive) ||
        (statusFilter === "INACTIVE" && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
      case "DISPATCHER":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
      case "TECHNICIAN":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20";
      case "CUSTOMER":
      default:
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
    }
  };

  return (
    <Layout
      title="User Management & Workforce Directory"
      subtitle="Administrative control over staff credentials, customer accounts, and role permissions"
      action={
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+ Create Staff Account</span>
        </button>
      }
    >
      {/* ── Backend Integration Transparency Notice ───────────────────── */}
      <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-3 text-xs leading-relaxed">
        <AlertTriangleIcon size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-slate-800 dark:text-slate-200">
          <strong className="text-slate-900 dark:text-white">Backend Architecture Note:</strong> The backend API currently exposes public registration strictly for <code className="px-1.5 py-0.5 rounded bg-blue-500/20 font-mono">CUSTOMER</code> accounts (<code className="px-1.5 py-0.5 rounded bg-blue-500/20 font-mono">POST /api/auth/register</code>). An authorized administrative staff endpoint (<code className="px-1.5 py-0.5 rounded bg-blue-500/20 font-mono">POST /api/admin/users</code>) is pending in backend routes. Staff accounts created here are managed in client session state until backend route expansion is committed.
        </div>
      </div>

      {createSuccessNotice && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircleIcon size={16} className="text-[#10b981]" />
          <span>{createSuccessNotice}</span>
        </div>
      )}

      {/* ── Filter & Search Toolbar ────────────────────────────────────── */}
      <div className="p-5 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-muted)] focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981]">
            <span>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or facility branch..."
              className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
            <span className="text-[var(--text-muted)]">Status:</span>
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  statusFilter === st
                    ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-transparent"
                    : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Role Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
            Role:
          </span>
          {(["ALL", "ADMIN", "DISPATCHER", "TECHNICIAN", "CUSTOMER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                roleFilter === r
                  ? "bg-[#10b981] text-[#06090e] border-[#10b981] font-bold shadow-sm"
                  : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {r} ({r === "ALL" ? users.length : users.filter((u) => u.role === r).length})
            </button>
          ))}
        </div>
      </div>

      {/* ── User Directory Table ───────────────────────────────────────── */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-surface-2)] text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">User / Contact</th>
                <th className="py-3.5 px-4 font-semibold">Role</th>
                <th className="py-3.5 px-4 font-semibold">Assigned Branch / Facility</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold">Created</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    No users matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-surface-2)]/50 transition-colors">
                    {/* Name & Email */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-sm text-[var(--text-primary)]">
                        {u.name}
                      </div>
                      <div className="text-[var(--text-muted)] font-mono text-[11px]">
                        {u.email}
                      </div>
                    </td>

                    {/* Role Pill */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Branch */}
                    <td className="py-4 px-4 text-[var(--text-secondary)] font-medium">
                      {u.branch}
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        <span>{u.isActive ? "Active" : "Deactivated"}</span>
                      </span>
                    </td>

                    {/* Created */}
                    <td className="py-4 px-4 text-[var(--text-muted)]">
                      {u.createdAt}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:border-[#10b981] hover:text-[#10b981] transition-all font-semibold text-[11px]"
                        >
                          Details
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u.id)}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all border ${
                            u.isActive
                              ? "border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                              : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
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

      {/* ── Modal: Create Staff Account (Admin Only) ────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                  Provision Internal Staff Account
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Admin authorization required · Public signups cannot create staff accounts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Engr. Shafiqur Rahman"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Corporate Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="name@voltops.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Staff Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                  >
                    <option value="DISPATCHER">DISPATCHER</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Operating Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStaffBranch}
                    onChange={(e) => setNewStaffBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                  >
                    <option value="EPZ Industrial Core">EPZ Industrial Core</option>
                    <option value="Gazipur Hub">Gazipur Hub</option>
                    <option value="Tejgaon Industrial">Tejgaon Industrial Area</option>
                    <option value="Narayanganj Port">Narayanganj Port</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: User Inspection Details ─────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                Account Inspection
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-2)] space-y-1">
                <div className="text-[var(--text-muted)]">User ID:</div>
                <div className="font-mono text-[var(--text-primary)] font-bold">{selectedUser.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[var(--text-muted)] block">Name:</span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">{selectedUser.name}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Role:</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getRoleBadge(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block">Email:</span>
                <span className="font-mono text-[var(--text-primary)]">{selectedUser.email}</span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block">Facility Branch:</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedUser.branch}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
                <div>
                  <span className="text-[var(--text-muted)] block">Member Since:</span>
                  <span className="text-[var(--text-primary)]">{selectedUser.createdAt}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Last Login:</span>
                  <span className="text-[var(--text-primary)]">{selectedUser.lastLogin || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[#10b981]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
