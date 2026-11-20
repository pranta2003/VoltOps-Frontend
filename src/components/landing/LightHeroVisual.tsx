import { FC } from "react";
import { motion } from "framer-motion";
import {
  ClockIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from "../Icons";

interface LightHeroVisualProps {
  shouldReduceMotion?: boolean;
}

export const LightHeroVisual: FC<LightHeroVisualProps> = ({ shouldReduceMotion = false }) => {
  return (
    <div className="relative w-full max-w-lg lg:max-w-xl mx-auto">
      {/* Soft emerald/cyan radial halo */}
      <div
        className="absolute -inset-4 bg-gradient-to-tr from-emerald-400/25 via-cyan-400/20 to-emerald-400/15 rounded-3xl blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Floating Micro-Card 1: Top-Right (99.4% On-Time Arrival) */}
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                y: [0, -6, 0],
                transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="absolute -top-4 -right-2 sm:-right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-300/90 shadow-xl rounded-xl px-3.5 py-2 flex items-center gap-2.5"
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircleIcon size={15} className="text-emerald-600" />
        </div>
        <div>
          <div className="text-xs font-black text-slate-900 tracking-tight">99.4%</div>
          <div className="text-[10px] font-semibold text-slate-500 leading-none">On-Time Arrival</div>
        </div>
      </motion.div>

      {/* Floating Micro-Card 2: Bottom-Left (7 Licensed Trades Ready) */}
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                y: [0, 6, 0],
                transition: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
              }
        }
        className="absolute -bottom-4 -left-2 sm:-left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-300/90 shadow-xl rounded-xl px-3.5 py-2 flex items-center gap-2.5"
      >
        <div className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
          <ShieldCheckIcon size={15} className="text-cyan-700" />
        </div>
        <div>
          <div className="text-xs font-black text-slate-900 tracking-tight">7 Licensed Trades</div>
          <div className="text-[10px] font-semibold text-slate-500 leading-none">EPZ Certified · Standby</div>
        </div>
      </motion.div>

      {/* Main Elevated White Dashboard Card */}
      <div className="relative z-10 bg-white border border-slate-300/90 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 text-left">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 truncate">
              Live Dispatch Desk
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-500 truncate">EPZ Industrial Core</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-bold shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
            </span>
            <span>SLA Active</span>
          </div>
        </div>

        {/* Active Work Order Preview Card */}
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/80 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-extrabold text-slate-950 shrink-0">WO-3002</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-bold text-slate-800 truncate">Raw Water Booster Pump P-03</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-cyan-300 bg-cyan-50 text-cyan-800 shrink-0">
              20m Physical SLA
            </span>
          </div>

          {/* Progress Row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-cyan-800 font-bold">
                <ClockIcon size={12} className="text-cyan-600" />
                <span>En Route to Site</span>
              </div>
              <span className="font-mono font-bold text-slate-800 tabular-nums">14m ETA</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                initial={{ width: "25%" }}
                animate={{ width: ["25%", "72%", "72%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>Dispatched: 14:12</span>
              <span className="text-emerald-700 font-semibold">On Schedule (6m buffer)</span>
              <span>Target: 14:32</span>
            </div>
          </div>
        </div>

        {/* Matched Technician Row */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              KI
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                <span>Kamrul Islam</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Tier 1
                </span>
              </div>
              <div className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                Verified Tier 1 · DOE Master Electrician
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white shadow-xs">
              <CheckCircleIcon size={12} />
              <span>96% Match</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
