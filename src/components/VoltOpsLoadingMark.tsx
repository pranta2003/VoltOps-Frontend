import React from "react";
import { ZapIcon } from "./Icons";

interface VoltOpsLoadingMarkProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  className?: string;
}

export function VoltOpsLoadingMark({
  size = "md",
  message,
  className = "",
}: VoltOpsLoadingMarkProps) {
  const sizeMap = {
    sm: { container: "w-8 h-8", icon: 14, ring: "w-11 h-11" },
    md: { container: "w-11 h-11", icon: 20, ring: "w-16 h-16" },
    lg: { container: "w-16 h-16", icon: 28, ring: "w-24 h-24" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 select-none ${className}`} role="status">
      <div className="relative flex items-center justify-center">
        {/* Subtle emerald loading ring / orbit */}
        <div
          className={`absolute ${currentSize.ring} rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin`}
          style={{ animationDuration: "1.2s" }}
          aria-hidden="true"
        />

        {/* Outer glowing halo */}
        <div
          className={`absolute ${currentSize.container} rounded-2xl bg-emerald-500/25 blur-md animate-pulse`}
          aria-hidden="true"
        />

        {/* Central VoltOps Lightning Emblem */}
        <div
          className={`relative ${currentSize.container} rounded-2xl bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] shadow-lg flex items-center justify-center`}
        >
          <ZapIcon size={currentSize.icon} className="text-white drop-shadow-sm" />
        </div>
      </div>

      {message && (
        <p className="text-xs font-semibold text-[var(--text-muted)] animate-pulse tracking-wide font-sans">
          {message}
        </p>
      )}

      <span className="sr-only">Loading VoltOps...</span>
    </div>
  );
}
