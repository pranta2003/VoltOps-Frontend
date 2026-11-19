import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { operationalStore } from "../../services/operationalStore";
import { TechnicianProfile } from "../../types";
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  BuildingIcon,
  RefreshCwIcon,
  WrenchIcon,
  ArrowRightIcon,
} from "../../components/Icons";

export function SkillPassport() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = () => {
    setIsLoading(true);
    const techs = operationalStore.getTechnicians();
    // Match current technician or default to preview lead tech (Kamrul Islam / tech-01)
    const current =
      techs.find((t) => t.id === user?.id || t.email === user?.email) ||
      techs.find((t) => t.id === "tech-01") ||
      techs[0];
    setProfile(current || null);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProfile();
    const unsub = operationalStore.subscribe(() => {
      loadProfile();
    });
    return unsub;
  }, [user?.id]);

  return (
    <Layout
      title="Skill Passport"
      action={
        <Link
          to="/technician/jobs"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
        >
          <span>View Active Jobs</span>
          <ArrowRightIcon size={12} />
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Verification Status & Identity Header */}
        <div className="p-4 rounded-xl border border-slate-300 border-l-4 border-l-emerald-500 bg-white shadow-md dark:border-white/5 dark:border-l-white/5 dark:bg-zinc-900 dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 border border-cyan-300 text-cyan-800 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300 font-bold text-base flex items-center justify-center shrink-0">
                {profile?.name
                  ? profile.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                  : "KI"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-950 dark:text-zinc-50 font-heading">
                    {profile?.name || "Kamrul Islam"}
                  </h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-white/10 font-medium">
                    {profile?.employeeId || "EMP-ELEC-409"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                    <CheckCircleIcon size={11} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Verified Tier 1</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-0.5">
                  {profile?.designation || "Senior High-Voltage Specialist"} · {profile?.branch || "EPZ Industrial Core Hub"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <span className="px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                Duty: {profile?.status ? profile.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Available"}
              </span>
              <span className="px-2.5 py-1 rounded-md font-mono text-[11px] text-slate-700 dark:text-zinc-300 bg-slate-100 border border-slate-300 dark:bg-zinc-950 dark:border-white/10 font-medium">
                Active: {profile?.activeJobCount || 0} {(profile?.activeJobCount === 1) ? "job" : "jobs"}
              </span>
            </div>
          </div>
        </div>

        {/* Credentials & Licensing Table */}
        <div className="rounded-xl border border-slate-300 border-t-4 border-t-emerald-500 bg-white shadow-md overflow-hidden dark:border-white/5 dark:border-t-white/5 dark:bg-zinc-900 dark:shadow-none">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between dark:border-white/5 dark:bg-zinc-950">
            <div>
              <h3 className="font-heading font-bold text-xs text-slate-950 dark:text-zinc-50">
                Government licenses & certifications
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
                Authoritative credentials validated against Department of Energy standards
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded">
              All Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-200/70 text-slate-800 font-bold text-xs uppercase tracking-wider dark:border-white/5 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <th className="py-2.5 px-4">Credential name</th>
                  <th className="py-2.5 px-4">Issuing authority</th>
                  <th className="py-2.5 px-4">Expiry / Status</th>
                  <th className="py-2.5 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/80 dark:divide-white/5">
                {profile?.certifications && profile.certifications.length > 0 ? (
                  profile.certifications.map((cert) => (
                    <tr key={cert.id} className="odd:bg-white even:bg-slate-50/90 hover:bg-emerald-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-950 dark:text-zinc-50">
                        {cert.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-zinc-400 font-medium">
                        {cert.issuedBy}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-slate-700 dark:text-zinc-300 font-medium">
                          {cert.expiryDate ? `Expires ${cert.expiryDate}` : "Permanent / Indefinite"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                          <CheckCircleIcon size={10} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Admin Signed</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No certifications listed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Competencies & Trade Endorsements */}
        <div className="p-4 rounded-xl border border-slate-300 bg-white shadow-md dark:border-white/5 dark:bg-zinc-900 dark:shadow-none space-y-3">
          <div className="border-b border-slate-200 dark:border-white/5 pb-2.5">
            <h3 className="font-heading font-bold text-xs text-slate-950 dark:text-zinc-50">
              Trade endorsements & authorized equipment
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
              Primary and secondary trade domains where technician is cleared for solo emergency dispatch
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {profile?.skills && profile.skills.length > 0 ? (
              profile.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs flex items-center gap-2 shadow-xs dark:border-white/10 dark:bg-zinc-950"
                >
                  <WrenchIcon size={13} className="text-cyan-700 dark:text-cyan-400 shrink-0" />
                  <span className="font-bold text-slate-950 dark:text-zinc-50">{skill.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-white/10 font-medium">
                    {skill.category}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">No trade competencies recorded.</p>
            )}
          </div>
        </div>

        {/* Truthful Telemetry Notice */}
        <div className="p-3 rounded-xl border border-slate-700/30 bg-slate-800/10 text-xs text-[var(--text-muted)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon size={14} className="text-[#10b981] shrink-0" />
            <span>
              Demonstration Mode: Skill passport credentials synchronize locally and adhere to central dispatch matching rules.
            </span>
          </div>
          <button
            type="button"
            onClick={loadProfile}
            className="text-xs font-semibold text-[#10b981] hover:underline shrink-0"
          >
            Refresh
          </button>
        </div>
      </div>
    </Layout>
  );
}
