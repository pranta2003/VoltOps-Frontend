import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import {
  BuildingIcon,
  RadioIcon,
  WrenchIcon,
  ShieldCheckIcon,
  SettingsIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MenuIcon,
  XIcon,
  ZapIcon,
} from "./Icons";

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Layout({ children, title, subtitle, action }: LayoutProps) {
  const { user, logout, isPreview, exitPreview } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Derive navigation links based on user role
  const role = user?.role || "CUSTOMER";

  const getNavLinks = () => {
    switch (role) {
      case "DISPATCHER":
        return [
          { label: "Dashboard", path: "/dispatcher", icon: RadioIcon },
          { label: "Service Requests", path: "/dispatcher/requests", icon: AlertTriangleIcon },
          { label: "Work Orders", path: "/dispatcher/work-orders", icon: WrenchIcon },
          { label: "Technicians", path: "/dispatcher/technicians", icon: ShieldCheckIcon },
          { label: "Schedule", path: "/dispatcher/schedule", icon: ClockIcon },
          { label: "Audit Log", path: "/dispatcher/audit", icon: CheckCircleIcon },
        ];
      case "ADMIN":
        return [
          { label: "Admin Console", path: "/admin", icon: SettingsIcon },
          { label: "Dispatcher Board", path: "/dispatcher", icon: RadioIcon },
          { label: "User Management", path: "/admin/users", icon: BuildingIcon },
          { label: "Technicians", path: "/admin/technicians", icon: ShieldCheckIcon },
          { label: "Audit Log", path: "/admin/audit", icon: CheckCircleIcon },
        ];
      case "TECHNICIAN":
        return [
          { label: "Dashboard", path: "/technician", icon: WrenchIcon },
          { label: "My Jobs", path: "/technician/jobs", icon: ClockIcon },
          { label: "Skills Passport", path: "/technician/skills", icon: ShieldCheckIcon },
          { label: "Leave Requests", path: "/technician/leave", icon: AlertTriangleIcon },
        ];
      case "CUSTOMER":
      default:
        return [
          { label: "My Dashboard", path: "/customer", icon: BuildingIcon },
          { label: "New Request", path: "/customer/new-request", icon: AlertTriangleIcon },
          { label: "Facility Assets", path: "/customer/assets", icon: WrenchIcon },
          { label: "Invoices & Billing", path: "/customer/invoices", icon: CheckCircleIcon },
        ];
    }
  };

  const navLinks = getNavLinks();

  // Role display badge format
  const getRoleBadge = () => {
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

  // Get user initials
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "VO";

  return (
    <div className="flex h-screen w-full max-w-full overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* ── Desktop Sidebar (Linear / Vercel Neutral Slate: 240px wide) ──── */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-[#0b1117] text-slate-300 select-none">
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-[#10b981] flex items-center justify-center font-extrabold shadow-sm">
                <ZapIcon size={15} className="text-[#06090e]" />
              </div>
              <div>
                <span className="font-heading font-extrabold text-base tracking-tight text-white group-hover:text-[#10b981] transition-colors">
                  VoltOps
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {role} Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-2.5 space-y-0.5">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-[#10b981]" : "text-slate-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account / Footer Card */}
        <div className="p-3 border-t border-white/[0.08]">
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 text-[#10b981] font-bold text-xs flex items-center justify-center shrink-0 border border-[#10b981]/30">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.name || "User"}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{user?.role}</div>
              </div>
            </div>
            <button
              onClick={logout}
              type="button"
              className="text-[11px] text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10 shrink-0"
              title="Sign Out"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Shell ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Local Preview Notification Strip (Strictly dev mode) */}
        {isPreview && (
          <aside
            aria-label="Developer Preview Notice"
            className="shrink-0 bg-amber-500/15 border-b border-amber-500/30 px-3.5 py-1.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-medium select-none z-20"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="font-bold tracking-tight">LOCAL PREVIEW</span>
              <span className="hidden sm:inline text-amber-600/80 dark:text-amber-400/80 font-normal">
                — Offline Demonstration Mode ({role}). Backend APIs bypassed.
              </span>
            </div>
            <button
              type="button"
              onClick={exitPreview}
              className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 transition-colors shrink-0"
            >
              Exit Preview
            </button>
          </aside>
        )}

        {/* Top Header Bar */}
        <header className="h-14 shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 sm:px-6 flex items-center justify-between gap-3 min-w-0 w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              <MenuIcon size={17} />
            </button>

            <div className="min-w-0">
              <h1 className="font-heading font-bold text-base sm:text-lg lg:text-xl text-[var(--text-primary)] tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] hidden md:block truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Header Affordances: Role Badge, Two-state Theme Toggle, Header Action */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Role Badge */}
            <span
              className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border ${getRoleBadge()}`}
            >
              {role}
            </span>

            {/* Two-state Theme Toggle */}
            <ThemeToggle />

            {/* Header Action slot */}
            {action && <div className="flex items-center gap-1.5">{action}</div>}
          </div>
        </header>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-over Menu */}
            <div className="relative w-64 max-w-[80vw] h-full bg-[#0b1117] text-slate-200 border-r border-slate-800 p-4 flex flex-col justify-between z-10 shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#10b981] flex items-center justify-center font-bold text-xs text-black">
                      <ZapIcon size={13} />
                    </div>
                    <span className="font-bold text-sm text-white">VoltOps</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white"
                  >
                    <XIcon size={16} />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navLinks.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                          isActive
                            ? "bg-white/15 text-white font-semibold"
                            : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
                        }`}
                      >
                        <Icon size={15} className={isActive ? "text-[#10b981]" : "text-slate-400"} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs text-slate-400 truncate">{user?.name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs text-[#10b981] font-semibold hover:underline"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6 w-full min-w-0">
          <div className="max-w-7xl mx-auto space-y-4 w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
