import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { AdminService } from "../../services/adminService";
import { Role } from "../../types";
import { ManagedUserAccount } from "../../types/admin";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  EyeIcon,
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
  const [newStaffConfirmPassword, setNewStaffConfirmPassword] = useState("");
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
  const lastFocusedTriggerRef = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Focus management
  useEffect(() => {
    if (createModalOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    } else if (!createModalOpen && !selectedUser && !confirmTargetUser) {
      lastFocusedTriggerRef.current?.focus();
    }
  }, [createModalOpen, selectedUser, confirmTargetUser]);

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
    if (!res.endpointConnected && res.isLive) {
      setApiErrorMessage(
        "Backend endpoint GET /api/admin/users is unavailable."
      );
    }
    setLoading(false);
  }, [currentPage, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Request status toggle (checks self-deactivation protection first)
  const handleInitiateStatusToggle = (targetUser: ManagedUserAccount, trigger: HTMLElement) => {
    lastFocusedTriggerRef.current = trigger;
    setActionErrorNotice(null);
    setActionSuccessNotice(null);

    if (
      targetUser.isActive &&
      currentUser?.email &&
      targetUser.email.toLowerCase() === currentUser.email.toLowerCase()
    ) {
      setActionErrorNotice("You cannot deactivate your own active administrator account.");
      setTimeout(() => setActionErrorNotice(null), 4000);
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
        `Account status for ${target.name} updated to ${targetStatus ? "Active" : "Inactive"}.`
      );
      loadUsers();
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } else {
      setActionErrorNotice(
        res.error || "Status update failed. Backend endpoint PATCH /api/admin/users/:id/status is required."
      );
      setTimeout(() => setActionErrorNotice(null), 5000);
    }
  };

  // Submit staff account creation
  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    setCreateErrorNotice(null);

    const emailTrimmed = newStaffEmail.trim().toLowerCase();
    const nameTrimmed = newStaffName.trim();

    if (nameTrimmed.length < 2) {
      setCreateErrorNotice("Full name must be at least 2 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setCreateErrorNotice("Please provide a valid corporate email address.");
      return;
    }

    if (newStaffPassword.length < 8) {
      setCreateErrorNotice("Password must be at least 8 characters long.");
      return;
    }

    if (newStaffPassword !== newStaffConfirmPassword) {
      setCreateErrorNotice("Passwords do not match.");
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
        `Staff account for ${nameTrimmed} (${newStaffRole}) successfully created.`
      );
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffPassword("");
      setNewStaffConfirmPassword("");
      setNewStaffDept("");
      setNewStaffDesig("");
      setCreateModalOpen(false);
      loadUsers();
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } else {
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
        return "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20";
      case "DISPATCHER":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
      case "TECHNICIAN":
        return "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-[#06b6d4]/15 dark:text-[#06b6d4] dark:border-[#06b6d4]/30";
      case "CUSTOMER":
      default:
        return "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20";
    }
  };

  return (
    <Layout
      title="Users"
      action={
        <button
          type="button"
          onClick={(e) => {
            lastFocusedTriggerRef.current = e.currentTarget;
            setCreateErrorNotice(null);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10b981] text-[#06090e] hover:bg-[#059669] transition-all shadow-sm btn-press"
        >
          <span>+ Create Staff</span>
        </button>
      }
    >
      <div className="space-y-4 pb-24">
        {/* ── Sub-header / Status Toolbar ───────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              {totalCount} accounts registered
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            )}

            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              title="Refresh users"
              aria-label="Refresh users"
              className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-50 hover:border-slate-400 disabled:opacity-40 transition-colors btn-press"
            >
              <RefreshCwIcon size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Compact Alerts ────────────────────────────────────────────── */}
        {apiErrorMessage && (
          <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-xs text-[#8a1858] dark:border-[#b8287a]/30 dark:bg-[#b8287a]/15 dark:text-[#f472b6] flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-[#8a1858] dark:text-[#f472b6] shrink-0" />
              <span>{apiErrorMessage}</span>
            </div>
            <button
              type="button"
              onClick={loadUsers}
              className="text-xs font-semibold underline hover:no-underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {actionSuccessNotice && (
          <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-center gap-2 shadow-xs animate-fade-in">
            <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {actionErrorNotice && (
          <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-xs font-bold text-[#8a1858] dark:border-[#b8287a]/30 dark:bg-[#b8287a]/15 dark:text-[#f472b6] flex items-center gap-2 shadow-xs animate-fade-in">
            <AlertTriangleIcon size={14} className="text-[#8a1858] dark:text-[#f472b6] shrink-0" />
            <span>{actionErrorNotice}</span>
          </div>
        )}

        {/* ── Filter Bar ────────────────────────────────────────── */}
        <div className="p-3.5 rounded-xl border border-slate-300 border-l-4 border-l-emerald-500 bg-white shadow-md dark:border-white/5 dark:border-l-white/5 dark:bg-zinc-900 dark:shadow-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              aria-label="Search users"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, or facility branch..."
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-0.5"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>

          {/* Role select dropdown */}
          <div className="shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="Filter by role"
              className="w-full md:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 transition-all cursor-pointer font-bold shadow-xs"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Administrators</option>
              <option value="DISPATCHER">Dispatchers</option>
              <option value="TECHNICIAN">Technicians</option>
              <option value="CUSTOMER">Customers</option>
            </select>
          </div>

          {/* Status Segmented Tabs */}
          <div className="flex items-center gap-1 shrink-0 p-1 rounded-xl border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-zinc-950 shadow-xs">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "ACTIVE", label: "Active" },
                { id: "INACTIVE", label: "Inactive" },
              ] as const
            ).map(({ id, label }) => {
              const isActive = statusFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-slate-950 shadow-xs border border-slate-300 dark:bg-zinc-800 dark:text-zinc-50 dark:border-white/10"
                      : "text-slate-700 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Users Table ───────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-300 border-t-4 border-t-emerald-500 rounded-xl shadow-md overflow-hidden dark:bg-zinc-900 dark:border-white/5 dark:border-t-white/5 dark:shadow-none">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs sm:text-[13px]">
              <thead className="bg-slate-200/70 border-b-2 border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider dark:bg-zinc-950/60 dark:border-white/5 dark:text-zinc-400">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Branch / Dept</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/80 dark:divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skel-user-${idx}`} className="animate-pulse">
                      <td className="py-3 px-4">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded mb-1" />
                        <div className="h-3 w-40 bg-slate-200 dark:bg-zinc-800 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded mb-1" />
                        <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-5 w-16 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-6 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md inline-block" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-600 dark:text-zinc-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-bold text-sm text-slate-950 dark:text-zinc-100">
                          No users match your criteria
                        </p>
                        <p className="text-xs">Try clearing search filters or selecting All Roles.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setRoleFilter("ALL");
                            setStatusFilter("ALL");
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1 rounded-lg border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 transition-colors shadow-xs"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const cleanWords = u.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).filter(Boolean);
                    const initials = cleanWords.map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "U";

                    const isSelf = Boolean(
                      currentUser?.email &&
                      u.email.toLowerCase() === currentUser.email.toLowerCase()
                    );

                    return (
                      <tr
                        key={u.id}
                        className="odd:bg-white even:bg-slate-50/90 hover:bg-emerald-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        {/* User Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-white/10 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-zinc-200 shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50 flex items-center gap-1.5 truncate">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-500/20">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-zinc-400 font-mono truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(
                              u.role
                            )}`}
                          >
                            {u.role}
                          </span>
                        </td>

                        {/* Branch / Dept */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-xs sm:text-[13px] text-slate-950 dark:text-zinc-50">
                            {u.branch || "—"}
                          </div>
                          {u.department && (
                            <div className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                              {u.department} {u.designation && `· ${u.designation}`}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-zinc-400 font-mono whitespace-nowrap tabular-nums">
                          {u.createdAt}
                        </td>

                        {/* Contextual Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                lastFocusedTriggerRef.current = e.currentTarget;
                                setSelectedUser(u);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-xs btn-press"
                            >
                              <EyeIcon size={12} className="text-slate-500 dark:text-zinc-400" />
                              <span>Inspect</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleInitiateStatusToggle(u, e.currentTarget)}
                              disabled={isSelf && u.isActive}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border shadow-xs btn-press ${
                                isSelf && u.isActive
                                  ? "border-slate-300 text-slate-400 dark:border-white/10 dark:text-zinc-600 opacity-40 cursor-not-allowed"
                                  : u.isActive
                                  ? "border-rose-300 text-[#8a1858] hover:bg-rose-50 dark:border-[#b8287a]/30 dark:text-[#e879b9] dark:hover:bg-[#b8287a]/15"
                                  : "border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
                              }`}
                              title={
                                isSelf && u.isActive
                                  ? "You cannot deactivate your own account"
                                  : u.isActive
                                  ? "Deactivate user"
                                  : "Activate user"
                              }
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Compact Pagination Controls ───────────────────────────────── */}
          <div className="py-2.5 px-4 border-t border-slate-300 bg-slate-100 dark:border-white/5 dark:bg-zinc-950/60 flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-zinc-400 font-medium">
            <div>
              {totalCount > 0 ? (
                <>
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                </>
              ) : (
                "0 accounts"
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 disabled:opacity-40 hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 transition-all font-bold text-xs shadow-xs btn-press"
              >
                Previous
              </button>

              <span className="px-2 text-slate-700 dark:text-zinc-400 font-bold tabular-nums">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 disabled:opacity-40 hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 transition-all font-bold text-xs shadow-xs btn-press"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal: Create Staff Account ───────────────────────────────── */}
        {createModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-staff-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-lg rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                <div>
                  <h3
                    id="create-staff-title"
                    className="font-heading font-bold text-base text-slate-950 dark:text-zinc-50"
                  >
                    Create Staff Account
                  </h3>
                  <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-0.5">
                    Provision internal operational credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  aria-label="Close dialog"
                  className="p-1 rounded-md border border-slate-300 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>

              {createErrorNotice && (
                <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-xs text-[#8a1858] dark:border-[#b8287a]/30 dark:bg-[#b8287a]/15 dark:text-[#f472b6] flex items-start gap-2 shadow-xs">
                  <AlertTriangleIcon size={14} className="text-[#8a1858] dark:text-[#f472b6] shrink-0 mt-0.5" />
                  <span>{createErrorNotice}</span>
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
                <div>
                  <label htmlFor="staff-name" className="block text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                    Full Name *
                  </label>
                  <input
                    ref={firstInputRef}
                    id="staff-name"
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Sajeeb Ahmed"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 placeholder:text-slate-500 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label htmlFor="staff-email" className="block text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                    Corporate Email *
                  </label>
                  <input
                    id="staff-email"
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="sajeeb@voltops.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 placeholder:text-slate-500 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 dark:placeholder:text-zinc-500 transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="staff-password" className="block text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                      Initial Password *
                    </label>
                    <input
                      id="staff-password"
                      type="password"
                      required
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="staff-confirm-password" className="block text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      id="staff-confirm-password"
                      type="password"
                      required
                      value={newStaffConfirmPassword}
                      onChange={(e) => setNewStaffConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="staff-role" className="block text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                      Staff Role *
                    </label>
                    <select
                      id="staff-role"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 cursor-pointer font-bold transition-all shadow-xs"
                    >
                      <option value="DISPATCHER">DISPATCHER</option>
                      <option value="TECHNICIAN">TECHNICIAN</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="staff-branch" className="block text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                      Primary Branch
                    </label>
                    <select
                      id="staff-branch"
                      value={newStaffBranch}
                      onChange={(e) => setNewStaffBranch(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 cursor-pointer font-bold transition-all shadow-xs"
                    >
                      <option value="EPZ Industrial Core">EPZ Industrial Core</option>
                      <option value="Gazipur Hub">Gazipur Hub</option>
                      <option value="Tejgaon Industrial">Tejgaon Industrial</option>
                      <option value="Narayanganj Port">Narayanganj Port</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="staff-dept" className="block text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                      Department (Optional)
                    </label>
                    <input
                      id="staff-dept"
                      type="text"
                      value={newStaffDept}
                      onChange={(e) => setNewStaffDept(e.target.value)}
                      placeholder="e.g. Field Operations"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="staff-desig" className="block text-xs font-bold text-slate-900 dark:text-zinc-200 mb-1">
                      Designation (Optional)
                    </label>
                    <input
                      id="staff-desig"
                      type="text"
                      value={newStaffDesig}
                      onChange={(e) => setNewStaffDesig(e.target.value)}
                      placeholder="e.g. Senior Dispatch Coordinator"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100/80 text-xs text-slate-950 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-zinc-950 dark:border-white/10 dark:text-zinc-50 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-xs btn-press"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStaff}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] text-[#06090e] hover:bg-[#059669] transition-all shadow-sm disabled:opacity-50 btn-press"
                  >
                    {submittingStaff ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: User Inspection Details ─────────────────────────────── */}
        {selectedUser && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                <div>
                  <h3
                    id="user-details-title"
                    className="font-heading font-bold text-base text-slate-950 dark:text-zinc-50"
                  >
                    User Account Record
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-600 dark:text-zinc-400 font-mono">
                      {selectedUser.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(selectedUser.id)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-300 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 hover:text-emerald-700 transition-all shadow-xs"
                    >
                      {copiedId ? "Copied" : "Copy ID"}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  aria-label="Close dialog"
                  className="p-1 rounded-md border border-slate-300 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <XIcon size={14} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 grid grid-cols-2 gap-3 shadow-xs">
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-semibold block">Full Name</span>
                    <span className="font-bold text-slate-950 dark:text-zinc-50">
                      {selectedUser.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-semibold block">Role</span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getRoleBadge(
                        selectedUser.role
                      )}`}
                    >
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 space-y-2 shadow-xs">
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-semibold block">Email</span>
                    <span className="font-mono text-slate-950 dark:text-zinc-50 font-medium">
                      {selectedUser.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-semibold block">Branch</span>
                    <span className="text-slate-950 dark:text-zinc-50 font-bold">
                      {selectedUser.branch || "General Workforce"}
                    </span>
                  </div>
                  {selectedUser.department && (
                    <div>
                      <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-semibold block">
                        Department & Designation
                      </span>
                      <span className="text-slate-950 dark:text-zinc-50 font-medium">
                        {selectedUser.department}{" "}
                        {selectedUser.designation && `· ${selectedUser.designation}`}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-semibold block">Account Status</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border mt-0.5 ${
                        selectedUser.isActive
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedUser.isActive ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {selectedUser.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-zinc-400 text-[11px] font-semibold block">Created Date</span>
                    <span className="text-slate-950 dark:text-zinc-50 font-mono tabular-nums">{selectedUser.createdAt}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-white/10 dark:hover:bg-zinc-700 transition-all shadow-xs btn-press"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Status Change Confirmation ─────────────────────────── */}
        {confirmTargetUser && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-status-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangleIcon
                  size={16}
                  className={`shrink-0 mt-0.5 ${
                    confirmTargetUser.targetStatus ? "text-emerald-600" : "text-[#b8287a]"
                  }`}
                />
                <div>
                  <h3
                    id="confirm-status-title"
                    className="font-heading font-bold text-sm text-slate-950 dark:text-zinc-50"
                  >
                    Confirm {confirmTargetUser.targetStatus ? "Reactivation" : "Deactivation"}
                  </h3>
                  <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 mt-1">
                    {confirmTargetUser.targetStatus
                      ? `Reactivate ${confirmTargetUser.user.name}? The account will regain access to authorized portals.`
                      : `Deactivate ${confirmTargetUser.user.name}? The user will be blocked from accessing operations.`}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submittingStatusChange}
                  onClick={() => setConfirmTargetUser(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-xs btn-press"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingStatusChange}
                  onClick={handleConfirmStatusChange}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm btn-press ${
                    confirmTargetUser.targetStatus
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#10b981] dark:text-zinc-950"
                      : "bg-[#b8287a] hover:bg-[#9d1762] text-white"
                  } disabled:opacity-50`}
                >
                  {submittingStatusChange
                    ? "Updating..."
                    : confirmTargetUser.targetStatus
                    ? "Confirm Reactivation"
                    : "Confirm Deactivation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
