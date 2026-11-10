import { useState, useEffect, useMemo, FormEvent, useCallback } from "react";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { AdminService } from "../../services/adminService";
import { Role } from "../../types";
import { ManagedUserAccount } from "../../types/admin";
import {
  BuildingIcon,
  ShieldCheckIcon,
  RadioIcon,
  SettingsIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "../../components/Icons";

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [actionErrorNotice, setActionErrorNotice] = useState<string | null>(null);
  const pageSize = 6;

  // Create Staff Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"DISPATCHER" | "TECHNICIAN" | "ADMIN">("DISPATCHER");
  const [newStaffBranch, setNewStaffBranch] = useState("EPZ Industrial Core");
  const [newStaffDept, setNewStaffDept] = useState("");
  const [newStaffDesig, setNewStaffDesig] = useState("");
  const [submittingStaff, setSubmittingStaff] = useState(false);
  const [createErrorNotice, setCreateErrorNotice] = useState<string | null>(null);

  // User Details Modal State
  const [selectedUser, setSelectedUser] = useState<ManagedUserAccount | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Status Change Confirmation State
  const [confirmTargetUser, setConfirmTargetUser] = useState<{
    user: ManagedUserAccount;
    targetStatus: boolean;
  } | null>(null);
  const [submittingStatusChange, setSubmittingStatusChange] = useState(false);

  // Keyboard accessibility: Escape closes any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCreateModalOpen(false);
        setSelectedUser(null);
        setConfirmTargetUser(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch users through AdminService
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setApiErrorMessage(null);

    const res = await AdminService.getUsers({
      page: currentPage,
      limit: pageSize,
      search: searchQuery.trim(),
      role: roleFilter,
      status: statusFilter,
    });

    if (res.data?.data) {
      setUsers(res.data.data);
      setTotalCount(res.data.meta.total);
      setTotalPages(res.data.meta.totalPages);
    }

    setIsLiveConnected(res.isLive);
    if (!res.endpointConnected) {
      setApiErrorMessage(
        "Backend endpoint GET /api/admin/users is not yet mounted in backend routes. Operating in offline development baseline mode with zero simulated server persistence."
      );
    }
    setLoading(false);
  }, [currentPage, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Request status toggle (checks self-deactivation protection first)
  const handleInitiateStatusToggle = (targetUser: ManagedUserAccount) => {
    setActionErrorNotice(null);
    setActionSuccessNotice(null);

    if (targetUser.isActive && currentUser?.email && targetUser.email.toLowerCase() === currentUser.email.toLowerCase()) {
      setActionErrorNotice("Self-deactivation is strictly prohibited. You cannot deactivate your own active administrator account.");
      setTimeout(() => setActionErrorNotice(null), 5000);
      return;
    }

    setConfirmTargetUser({
      user: targetUser,
      targetStatus: !targetUser.isActive,
    });
  };

  // Submit status change to backend
  const handleConfirmStatusChange = async () => {
    if (!confirmTargetUser) return;
    setSubmittingStatusChange(true);
    setActionErrorNotice(null);

    const { user: target, targetStatus } = confirmTargetUser;
    const res = await AdminService.updateUserStatus(
      target.id,
      targetStatus,
      targetStatus ? "Administrative reactivation" : "Administrative deactivation"
    );

    setSubmittingStatusChange(false);
    setConfirmTargetUser(null);

    if (res.success && res.data) {
      setActionSuccessNotice(
        `Account status for ${target.name} (${target.email}) successfully updated to ${targetStatus ? "ACTIVE" : "INACTIVE"}.`
      );
      loadUsers();
      setTimeout(() => setActionSuccessNotice(null), 4500);
    } else {
      // RULE: Never pretend success if backend returned error or 404
      setActionErrorNotice(
        res.error || "Status update could not be persisted. Backend endpoint PATCH /api/admin/users/:id/status is required."
      );
      setTimeout(() => setActionErrorNotice(null), 6000);
    }
  };

  // Submit staff account creation
  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    setCreateErrorNotice(null);

    const emailTrimmed = newStaffEmail.trim().toLowerCase();
    const nameTrimmed = newStaffName.trim();

    // 1. Name validation
    if (nameTrimmed.length < 2) {
      setCreateErrorNotice("Full name must be at least 2 characters.");
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setCreateErrorNotice("Please provide a valid corporate email address.");
      return;
    }

    // 3. Password strength check
    if (newStaffPassword.length < 8) {
      setCreateErrorNotice("Password must be at least 8 characters long for staff credentials.");
      return;
    }

    setSubmittingStaff(true);

    const res = await AdminService.createStaffUser({
      name: nameTrimmed,
      email: emailTrimmed,
      password: newStaffPassword,
      role: newStaffRole,
      branch: newStaffBranch,
      department: newStaffDept.trim() || undefined,
      designation: newStaffDesig.trim() || undefined,
    });

    setSubmittingStaff(false);

    if (res.success && res.data) {
      setActionSuccessNotice(
        `Staff account for ${nameTrimmed} (${newStaffRole}) successfully created in backend.`
      );
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffPassword("");
      setNewStaffDept("");
      setNewStaffDesig("");
      setCreateModalOpen(false);
      loadUsers();
      setTimeout(() => setActionSuccessNotice(null), 4500);
    } else {
      // RULE: Do not pretend success or add fake user to local list
      setCreateErrorNotice(
        res.error || "Account could not be created. Backend endpoint POST /api/admin/users is required."
      );
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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
      subtitle="Administrative governance over staff credentials, customer accounts, and role permissions"
      action={
        <button
          type="button"
          onClick={() => {
            setCreateErrorNotice(null);
            setCreateModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+ Create Staff Account</span>
        </button>
      }
    >
      {/* ── Backend Architecture & Telemetry Status Notice ──────────────── */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <SettingsIcon size={16} className="text-[#10b981] shrink-0" />
          <span>
            <strong>Access Governance:</strong> Staff accounts (<code className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-2)] font-mono">ADMIN</code>, <code className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-2)] font-mono">DISPATCHER</code>, <code className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-2)] font-mono">TECHNICIAN</code>) require human administrator creation. Public registration is restricted strictly to customers.
          </span>
        </div>

        <span
          className={`px-3 py-1 rounded-full font-bold border shrink-0 flex items-center gap-1.5 ${
            isLiveConnected
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span>{isLiveConnected ? "Live API Connected (/api/admin/users)" : "Offline Baseline Mode"}</span>
        </span>
      </div>

      {/* ── Offline Notice ─────────────────────────────────────────────── */}
      {apiErrorMessage && (
        <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs text-amber-900 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{apiErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="underline font-bold hover:text-amber-700 shrink-0 ml-2"
          >
            Retry API
          </button>
        </div>
      )}

      {/* ── Action Success Notice ──────────────────────────────────────── */}
      {actionSuccessNotice && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircleIcon size={16} className="text-[#10b981] shrink-0" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* ── Action Error Notice ────────────────────────────────────────── */}
      {actionErrorNotice && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangleIcon size={16} className="text-red-600 shrink-0" />
          <span>{actionErrorNotice}</span>
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, or facility branch..."
              className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
            <span className="text-[var(--text-muted)]">Status:</span>
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
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

        {/* Role Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
            Role:
          </span>
          {(["ALL", "ADMIN", "DISPATCHER", "TECHNICIAN", "CUSTOMER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRoleFilter(r);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                roleFilter === r
                  ? "bg-[#10b981] text-[#06090e] border-[#10b981]"
                  : "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── User Accounts Table ────────────────────────────────────────── */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] uppercase tracking-wider font-bold text-[10px]">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Operating Branch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <ClockIcon size={16} className="animate-spin text-[#10b981]" />
                      <span>Loading workforce accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    No accounts match the selected criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-surface-2)]/60 transition-colors">
                    {/* User Identity */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {currentUser?.email && u.email.toLowerCase() === currentUser.email.toLowerCase() && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 font-semibold border border-purple-500/20">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[var(--text-muted)] font-mono text-[11px]">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Branch */}
                    <td className="py-4 px-4 text-[var(--text-primary)] font-medium">
                      {u.branch}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
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
                          onClick={() => handleInitiateStatusToggle(u)}
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

        {/* ── Table Pagination Controls ─────────────────────────────────── */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-surface-2)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <div>
            Showing <strong className="text-[var(--text-primary)]">{totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-[var(--text-primary)]">{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong className="text-[var(--text-primary)]">{totalCount}</strong> accounts
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 hover:border-[#10b981] transition-all font-semibold"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${
                  currentPage === pg
                    ? "bg-[#10b981] text-[#06090e] border-[#10b981]"
                    : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#10b981]"
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 hover:border-[#10b981] transition-all font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Create Staff Account (Admin Only) ────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-staff-title"
            className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h3 id="modal-staff-title" className="font-heading font-bold text-lg text-[var(--text-primary)]">
                  Provision Internal Staff Account
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Privileged admin operation · Dispatches to <code className="font-mono">POST /api/admin/users</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close dialog"
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
                  Initial Password (Min 8 Characters) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    value={newStaffDept}
                    onChange={(e) => setNewStaffDept(e.target.value)}
                    placeholder="e.g. Field Operations"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Designation (Optional)
                  </label>
                  <input
                    type="text"
                    value={newStaffDesig}
                    onChange={(e) => setNewStaffDesig(e.target.value)}
                    placeholder="e.g. Senior Specialist"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              {createErrorNotice && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-700 dark:text-red-400">
                  {createErrorNotice}
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  disabled={submittingStaff}
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingStaff && <ClockIcon size={12} className="animate-spin" />}
                  <span>{submittingStaff ? "Provisioning..." : "Provision Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: User Inspection Details ─────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-details-title"
            className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 id="modal-details-title" className="font-heading font-bold text-base text-[var(--text-primary)]">
                Account Inspection
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-2)] flex items-center justify-between">
                <div>
                  <div className="text-[var(--text-muted)]">User ID:</div>
                  <div className="font-mono text-[var(--text-primary)] font-bold">{selectedUser.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyId(selectedUser.id)}
                  className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-semibold text-[var(--text-muted)] hover:text-[#10b981] hover:border-[#10b981] transition-all"
                >
                  {copiedId ? "Copied!" : "Copy"}
                </button>
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

              {(selectedUser.department || selectedUser.designation) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[var(--text-muted)] block">Department:</span>
                    <span className="text-[var(--text-primary)]">{selectedUser.department || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Designation:</span>
                    <span className="text-[var(--text-primary)]">{selectedUser.designation || "—"}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
                <div>
                  <span className="text-[var(--text-muted)] block">Member Since:</span>
                  <span className="text-[var(--text-primary)]">{selectedUser.createdAt}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Last Activity:</span>
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

      {/* ── Modal: Status Change Confirmation Prompt ────────────────────── */}
      {confirmTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-status-title"
            className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold ${
                confirmTargetUser.targetStatus
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              {confirmTargetUser.targetStatus ? "✓" : "⚠️"}
            </div>
            <div className="text-center space-y-1">
              <h3 id="modal-status-title" className="font-heading font-bold text-base text-[var(--text-primary)]">
                {confirmTargetUser.targetStatus ? "Activate Account" : "Deactivate Account"}
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {confirmTargetUser.targetStatus ? (
                  <>
                    Restore portal access for <strong className="text-[var(--text-primary)]">{confirmTargetUser.user.name}</strong> ({confirmTargetUser.user.email})?
                  </>
                ) : (
                  <>
                    Are you sure you want to deactivate <strong className="text-[var(--text-primary)]">{confirmTargetUser.user.name}</strong> ({confirmTargetUser.user.email})? They will be blocked from logging in.
                  </>
                )}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                disabled={submittingStatusChange}
                onClick={() => setConfirmTargetUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingStatusChange}
                onClick={handleConfirmStatusChange}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 ${
                  confirmTargetUser.targetStatus
                    ? "bg-[#10b981] text-[#06090e] hover:bg-[#34d399]"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {submittingStatusChange && <ClockIcon size={12} className="animate-spin" />}
                <span>
                  {submittingStatusChange
                    ? "Updating..."
                    : confirmTargetUser.targetStatus
                    ? "Activate User"
                    : "Deactivate User"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
