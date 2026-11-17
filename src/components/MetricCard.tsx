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
  size?: "sm" | "md" | "lg";
}

export const MetricCard: FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon: Icon,
  badge,
  alert = false,
  size = "md",
}) => {
  const isTextValue = typeof value === "string" && !/\d/.test(value);
  const sizeClasses =
    size === "sm"
      ? "text-lg sm:text-xl font-bold tabular-nums"
      : size === "lg"
      ? "text-2xl sm:text-3xl font-extrabold tabular-nums"
      : isTextValue
      ? "text-lg sm:text-xl font-bold"
      : "text-xl sm:text-2xl font-bold tabular-nums";

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-150 relative overflow-hidden ${
        alert
          ? "bg-rose-500/[0.04] border-rose-500/30 dark:bg-rose-500/[0.08]"
          : "bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--border-strong)]"
      }`}
    >
      {/* Top row: Label & Icon / Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-[var(--text-muted)] truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          {Icon && (
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                alert
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
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
        <span className={`font-heading text-[var(--text-primary)] tracking-tight ${sizeClasses}`}>
          {value}
        </span>
        {trend && (
          <span
            className={`text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
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
