import { ReactNode, useState } from "react";
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
  SearchIcon,
  ZapIcon,
} from "./Icons";

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Layout({ children, title, subtitle, action }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          { label: "Request History", path: "/customer/history", icon: ClockIcon },
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
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* ── Sidebar (Figma: #1B3644 deep slate; 260px wide) ─────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-[var(--border)] bg-[#1B3644] text-[#BAC9CE] select-none">
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center font-extrabold shadow-sm">
                <ZapIcon size={16} className="text-[#06090e]" />
              </div>
              <div>
                <span className="font-heading font-extrabold text-lg tracking-tight text-white group-hover:text-[#10b981] transition-colors">
                  VoltOps
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#91a7af]">
                  {role} PORTAL
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/15 text-white font-semibold shadow-sm"
                      : "text-[#BAC9CE] hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-[#10b981]" : "text-[#BAC9CE]"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account / Footer Card */}
        <div className="p-4 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-[#164275] border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/20">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.name || "User"}</div>
                <div className="text-[10px] text-white/70 uppercase tracking-wider truncate">{user?.role}</div>
              </div>
            </div>
            <button
              onClick={logout}
              type="button"
              className="text-xs text-white/80 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10 shrink-0"
              title="Sign Out"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Shell ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Toggle Navigation Menu"
            >
              <MenuIcon size={18} />
            </button>

            <div>
              <h1 className="font-heading font-semibold text-lg text-[var(--text-primary)] tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] hidden sm:block truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Header Affordances: Search, Role Badge, Theme Selector, User */}
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs text-[var(--text-muted)] focus-within:border-[#10b981] focus-within:ring-1 focus-within:ring-[#10b981]/30">
              <SearchIcon size={14} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] w-36 lg:w-48"
              />
            </div>

            {/* Role Badge */}
            <span
              className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge()}`}
            >
              {role}
            </span>

            {/* Two-state Theme Toggle */}
            <ThemeToggle />

            {/* Header Action slot */}
            {action && <div>{action}</div>}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden p-4 border-b border-[var(--border)] bg-[#1B3644] text-white space-y-1">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium hover:bg-white/10"
              >
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/70">{user?.name}</span>
              <button onClick={logout} className="text-xs text-[#10b981] font-bold">
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
