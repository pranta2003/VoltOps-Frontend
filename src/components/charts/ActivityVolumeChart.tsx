import { FC, useState } from "react";

export interface ActivityBarItem {
  key: string;
  label: string;
  timestamp: string;
  volume: number;
  secondaryVolume?: number;
}

interface ActivityVolumeChartProps {
  data: ActivityBarItem[];
  maxVolume?: number;
  height?: number;
  emptyMessage?: string;
  primaryLabel?: string;
}

export const ActivityVolumeChart: FC<ActivityVolumeChartProps> = ({
  data,
  maxVolume,
  height = 100,
  emptyMessage = "No activity logs available",
  primaryLabel = "Events",
}) => {
  const [activeTooltip, setActiveTooltip] = useState<ActivityBarItem | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[var(--text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  const maxVal = maxVolume || Math.max(...data.map((d) => d.volume + (d.secondaryVolume || 0)), 1);

  return (
    <div className="w-full">
      {/* Active Bar Tooltip Readout */}
      <div className="h-5 flex items-center justify-between text-xs px-1 mb-2">
        {activeTooltip ? (
          <>
            <span className="font-semibold text-[var(--text-primary)]">
              {activeTooltip.label} ({activeTooltip.timestamp}):
            </span>
            <span className="font-mono text-[var(--accent)] font-bold">
              {activeTooltip.volume} {primaryLabel}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)] font-medium">
            Hourly dispatch volume across active shift
          </span>
        )}
      </div>

      {/* Bar Columns Container */}
      <div
        className="flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-[var(--border)] pb-1"
        style={{ height }}
      >
        {data.map((item) => {
          const heightPct = Math.max(8, Math.round((item.volume / maxVal) * 100));
          const isSelected = activeTooltip?.key === item.key;

          return (
            <div
              key={item.key}
              onMouseEnter={() => setActiveTooltip(item)}
              onMouseLeave={() => setActiveTooltip(null)}
              className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
            >
              <div
                className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 ${
                  isSelected
                    ? "bg-[var(--accent)] shadow-sm scale-y-105"
                    : "bg-[var(--border-strong)] group-hover:bg-[var(--accent)]/70"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-Axis labels */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono pt-1.5 px-1">
        {data.map((item) => (
          <span key={item.key} className="truncate max-w-[44px] text-center">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};
