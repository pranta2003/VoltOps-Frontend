import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services/notificationService";
import { AppNotification } from "../types/notification";
import {
  BellIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  WrenchIcon,
  XIcon,
} from "./Icons";

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const role = user?.role || "CUSTOMER";
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    notificationService.getNotifications(role, user?.id)
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refreshNotifs = () => {
    setNotifications(notificationService.getNotifications(role, user?.id));
  };

  // Keep notifications fresh when role or panel open changes
  useEffect(() => {
    refreshNotifs();
  }, [role, user?.id, isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (n: AppNotification) => {
    notificationService.markAsRead(n.id);
    refreshNotifs();
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead(role, user?.id);
    refreshNotifs();
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 2) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString("en-BD", { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  const renderTypeIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircleIcon size={14} className="text-emerald-500 shrink-0 mt-0.5" />;
      case "warning":
        return <ClockIcon size={14} className="text-amber-500 shrink-0 mt-0.5" />;
      case "alert":
        return <AlertTriangleIcon size={14} className="text-rose-500 shrink-0 mt-0.5" />;
      case "info":
      default:
        return <WrenchIcon size={14} className="text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        aria-expanded={isOpen}
        title="Notifications"
        className="relative p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all flex items-center justify-center shrink-0 active:scale-95"
      >
        <BellIcon size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#10b981] text-[10px] font-bold text-[#06090e] shadow-sm animate-fade-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="region"
          aria-label="Notifications Panel"
          className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[360px] rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl z-[70] overflow-hidden animate-fade-in text-[var(--text-primary)]"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-surface-2)]/50">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-xs">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-md"
                aria-label="Close notifications"
              >
                <XIcon size={13} />
              </button>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircleIcon size={24} className="mx-auto text-emerald-500/80" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">You're all caught up</p>
                <p className="text-[11px] text-[var(--text-muted)]">No new notifications for your role.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-[var(--bg-surface-2)] ${
                    !n.read ? "bg-emerald-500/[0.04]" : ""
                  }`}
                >
                  {renderTypeIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-xs truncate ${!n.read ? "font-bold text-[var(--text-primary)]" : "font-medium text-[var(--text-secondary)]"}`}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-[var(--text-muted)]">
                      <span>{formatTimestamp(n.timestamp)}</span>
                      {n.actionLabel && (
                        <span className="font-semibold text-[#10b981] hover:underline">
                          {n.actionLabel} &rarr;
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2 bg-[var(--bg-surface-2)]/30 border-t border-[var(--border)] text-center text-[10px] text-[var(--text-muted)]">
            Role: <span className="font-semibold text-[var(--text-primary)]">{role}</span> • Local Demonstration Sync
          </div>
        </div>
      )}
    </div>
  );
}
