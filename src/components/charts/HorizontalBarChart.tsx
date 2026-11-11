import { FC, useState } from "react";

export interface HorizontalBarItem {
  label: string;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
  badge?: string;
  color?: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarItem[];
  maxScale?: number;
  valueSuffix?: string;
  emptyMessage?: string;
}

export const HorizontalBarChart: FC<HorizontalBarChartProps> = ({
  data,
  maxScale,
  valueSuffix = "",
  emptyMessage = "No trade data available",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[var(--text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  const maxValue = maxScale || Math.max(...data.map((d) => d.value + (d.secondaryValue || 0)), 1);

  return (
    <div className="space-y-2.5 w-full">
      {data.map((item, idx) => {
        const primaryWidth = Math.min(100, Math.round((item.value / maxValue) * 100));
        const secondaryWidth = item.secondaryValue
          ? Math.min(100 - primaryWidth, Math.round((item.secondaryValue / maxValue) * 100))
          : 0;
        const isHovered = hoveredIdx === idx;

        return (
          <div
            key={item.label}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`p-1.5 rounded-lg transition-colors ${
              isHovered ? "bg-[var(--bg-surface-2)]" : "hover:bg-[var(--bg-surface-2)]/40"
            }`}
          >
            {/* Header / Labels */}
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span className="font-medium text-[var(--text-primary)] truncate text-[11px] sm:text-xs">
                {item.label}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                <span className="font-bold text-[var(--text-primary)]">
                  {item.value}
                  {valueSuffix}
                </span>
                {item.secondaryValue !== undefined && (
                  <span className="text-[var(--text-muted)] text-[10px]">
                    / {item.secondaryValue} {item.secondaryLabel || ""}
                  </span>
                )}
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 ml-1">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Stacked / Proportional Bar */}
            <div className="h-2 w-full bg-[var(--border)] rounded-full overflow-hidden flex items-center">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${primaryWidth}%`,
                  backgroundColor: item.color || "var(--accent)",
                }}
              />
              {secondaryWidth > 0 && (
                <div
                  className="h-full rounded-r-full transition-all duration-500 ease-out bg-amber-500/80"
                  style={{ width: `${secondaryWidth}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
