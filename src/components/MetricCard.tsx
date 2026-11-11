import { FC, ReactNode, ComponentType } from "react";
import { IconProps } from "./Icons";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    label: string;
  };
  icon?: ComponentType<IconProps>;
  badge?: ReactNode;
  alert?: boolean;
}

export const MetricCard: FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon: Icon,
  badge,
  alert = false,
}) => {
  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-200 shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] relative overflow-hidden ${
        alert
          ? "bg-red-500/[0.04] border-red-500/30 dark:bg-red-500/[0.08]"
          : "bg-[var(--bg-surface)] border-[var(--border)]"
      }`}
    >
      {/* Top row: Label & Icon / Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          {Icon && (
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                alert
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-[var(--bg-surface-2)] text-[var(--text-secondary)]"
              }`}
            >
              <Icon size={15} />
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Value */}
      <div className="flex items-baseline gap-2">
        <span className="font-heading font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
              trend.direction === "up"
                ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300"
                : trend.direction === "down"
                ? "text-amber-700 bg-amber-500/10 dark:text-amber-300"
                : "text-[var(--text-muted)] bg-[var(--bg-surface-2)]"
            }`}
          >
            {trend.label}
          </span>
        )}
      </div>

      {/* Subtext description */}
      {subtext && (
        <p className="text-xs text-[var(--text-muted)] mt-1.5 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
