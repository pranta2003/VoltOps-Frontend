import { FC } from "react";
import { motion } from "framer-motion";
import {
  ZapIcon,
  SnowflakeIcon,
  ShieldCheckIcon,
  ServerIcon,
  LaptopIcon,
  WrenchIcon,
  BuildingIcon,
  ClockIcon,
  BadgeCheckIcon,
} from "../Icons";

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

      {/* Bento Grid: 2 columns */}
      <div className="relative z-10 grid grid-cols-2 gap-4">
        {/* 1. Top Wide Tile (col-span-2) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          className="col-span-2 bg-white/95 backdrop-blur-md border border-slate-300/90 rounded-2xl p-7 shadow-xl transition-shadow duration-300 hover:shadow-2xl text-left"
        >
          {/* Top-left micro-label */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
                PHYSICAL ARRIVAL SLA
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border border-emerald-200/80 bg-emerald-50 text-emerald-800">
              Plan B & C
            </span>
          </div>

          {/* Centerpiece editorial typography + radar pulse */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-5xl font-extrabold tracking-tight tabular-nums text-slate-950">
                20–40 min
              </div>
              <p className="text-sm text-slate-600 mt-2 font-medium">
                Certified technician on-site, guaranteed.
              </p>
            </div>

            {/* Concentric radar/pulse ring */}
            <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
              <motion.div
                animate={
                  shouldReduceMotion
                    ? { scale: 1, opacity: 0.3 }
                    : { scale: [1, 1.35, 1.7], opacity: [0.6, 0.3, 0] }
                }
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2 border-emerald-500/50"
              />
              <motion.div
                animate={
                  shouldReduceMotion
                    ? { scale: 1, opacity: 0.4 }
                    : { scale: [1, 1.25, 1.5], opacity: [0.7, 0.35, 0] }
                }
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                className="absolute inset-2 rounded-full border-2 border-cyan-500/40"
              />
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white">
                <ClockIcon size={20} className="text-white" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Bottom-Left Tile (col-span-1) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          className="col-span-1 bg-white/95 border border-slate-300/90 rounded-2xl p-6 shadow-lg transition-shadow duration-300 hover:shadow-xl text-left flex flex-col justify-between"
        >
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-950">
              7 Trades
            </div>
            <div className="text-xs font-medium text-slate-600 mt-1">
              Single Contract
            </div>
          </div>

          {/* Strip of 7 minimal trade icons with gliding emerald highlight */}
          <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 mt-4">
            {!shouldReduceMotion && (
              <motion.div
                animate={{
                  x: ["-100%", "350%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 1,
                }}
                className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent pointer-events-none"
              />
            )}
            <div className="flex items-center justify-between text-slate-600">
              <span title="Electrical"><ZapIcon size={14} className="hover:text-emerald-600 transition-colors" /></span>
              <span title="HVAC"><SnowflakeIcon size={14} className="hover:text-cyan-600 transition-colors" /></span>
              <span title="Security"><ShieldCheckIcon size={14} className="hover:text-emerald-600 transition-colors" /></span>
              <span title="Networking"><ServerIcon size={14} className="hover:text-cyan-600 transition-colors" /></span>
              <span title="IT Support"><LaptopIcon size={14} className="hover:text-emerald-600 transition-colors" /></span>
              <span title="Plumbing"><WrenchIcon size={14} className="hover:text-cyan-600 transition-colors" /></span>
              <span title="Facility"><BuildingIcon size={14} className="hover:text-emerald-600 transition-colors" /></span>
            </div>
          </div>
        </motion.div>

        {/* 3. Bottom-Right Tile (col-span-1) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          className="col-span-1 bg-white/95 border border-slate-300/90 rounded-2xl p-6 shadow-lg transition-shadow duration-300 hover:shadow-xl text-left flex flex-col justify-between"
        >
          <div>
            <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              100%
            </div>
            <div className="text-xs font-medium text-slate-600 mt-1">
              Verified & Licensed
            </div>
          </div>

          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <BadgeCheckIcon size={14} className="text-emerald-600 shrink-0" />
              <span>Skill Passport</span>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
