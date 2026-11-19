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
          ? "bg-rose-50 border-rose-300 dark:bg-[#b8287a]/10 dark:border-[#b8287a]/30 shadow-md dark:shadow-none"
          : "bg-white border-slate-300 shadow-md dark:bg-zinc-900 dark:border-white/5 dark:shadow-none"
      }`}
    >
      {/* Top row: Label & Icon / Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          {Icon && (
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                alert
                  ? "bg-rose-100 text-[#8a1858] dark:bg-[#b8287a]/20 dark:text-[#f472b6]"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/5"
              }`}
            >
              <Icon size={15} />
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Value */}
      <div className="flex items-baseline gap-2">
        <span className={`font-heading text-slate-950 dark:text-zinc-50 tracking-tight ${sizeClasses}`}>
          {value}
        </span>
        {trend && (
          <span
            className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full border ${
              trend.label === "Clear" || trend.direction === "up"
                ? "text-emerald-800 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                : trend.direction === "down" || trend.label.toLowerCase().includes("action")
                ? "text-cyan-800 bg-cyan-50 border-cyan-300 dark:text-[#06b6d4] dark:bg-[#06b6d4]/15 dark:border-[#06b6d4]/30"
                : "text-slate-700 bg-slate-100 border-slate-300 dark:text-zinc-400 dark:bg-zinc-800 dark:border-white/10"
            }`}
          >
            {trend.label}
          </span>
        )}
      </div>

      {/* Subtext description */}
      {subtext && (
        <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-1.5 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
