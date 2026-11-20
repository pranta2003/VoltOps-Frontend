import { FC } from "react";
import { motion } from "framer-motion";
import { CheckCircleIcon } from "../Icons";

interface LightHeroVisualProps {
  shouldReduceMotion?: boolean;
}

export const LightHeroVisual: FC<LightHeroVisualProps> = ({ shouldReduceMotion = false }) => {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Soft emerald/cyan radial halo */}
      <div
        className="absolute -inset-4 bg-gradient-to-tr from-emerald-400/25 via-cyan-400/20 to-emerald-400/15 rounded-3xl blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Elevated White Dashboard Card */}
      <div className="relative z-10 bg-white border border-slate-300/90 rounded-2xl shadow-xl p-7 sm:p-8 space-y-6 text-left">
        {/* 1. Minimal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Live Dispatch
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-600">
            EPZ Hub
          </span>
        </div>

        {/* 2. Clean Visual Focal Point */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums text-slate-950 tracking-tight">14 min</span>
              <span className="text-xs text-slate-500 font-medium">ETA</span>
            </div>
            <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200/80">
              En Route · WO-3002
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: "25%" }}
              animate={
                shouldReduceMotion
                  ? { width: "65%" }
                  : { width: ["25%", "68%", "68%"] }
              }
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            />
          </div>
        </div>

        {/* 3. Minimal Technician Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
              KI
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                Kamrul Islam
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Master Electrician
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
            <CheckCircleIcon size={12} className="text-emerald-600" />
            <span>Verified</span>
          </span>
        </div>
      </div>
    </div>
  );
};
