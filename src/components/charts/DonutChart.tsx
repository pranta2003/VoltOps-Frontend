import { FC, useState } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  totalLabel?: string;
  size?: number;
  strokeWidth?: number;
  emptyMessage?: string;
}

export const DonutChart: FC<DonutChartProps> = ({
  data,
  totalLabel = "Total",
  size = 140,
  strokeWidth = 18,
  emptyMessage = "No data available",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-[var(--text-muted)]">
        <div
          className="w-20 h-20 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center mb-2"
        >
          <span className="text-[10px] uppercase font-mono">0</span>
        </div>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  // Calculate cumulative stroke dashes
  let accumulatedAngle = 0;
  const segments = data.map((seg, idx) => {
    const strokeDasharray = `${(seg.value / total) * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle;
    accumulatedAngle += (seg.value / total) * circumference;

    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  const activeSegment = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 w-full">
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] transition-all duration-300"
          aria-hidden="true"
        >
          {/* Base track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth - 2}
            className="text-[var(--border)] opacity-30"
          />

          {/* Segment arcs */}
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={hoveredIdx === seg.idx ? strokeWidth + 3 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(seg.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
          <span className="font-heading font-extrabold text-lg text-[var(--text-primary)] leading-none">
            {activeSegment ? activeSegment.value : total}
          </span>
          <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase mt-0.5 truncate max-w-[80px]">
            {activeSegment ? activeSegment.label : totalLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full space-y-1.5 min-w-0">
        {data.map((seg, idx) => {
          const pct = Math.round((seg.value / total) * 100);
          const isHovered = hoveredIdx === idx;
          return (
            <button
              key={seg.label}
              type="button"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`w-full flex items-center justify-between text-xs px-2 py-1 rounded-md transition-all text-left ${
                isHovered
                  ? "bg-[var(--bg-surface-2)] font-semibold"
                  : "hover:bg-[var(--bg-surface-2)]/60 text-[var(--text-secondary)]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] ml-2">
                <span className="text-[var(--text-primary)] font-bold">{seg.value}</span>
                <span className="text-[var(--text-muted)] text-[10px] w-7 text-right">({pct}%)</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
