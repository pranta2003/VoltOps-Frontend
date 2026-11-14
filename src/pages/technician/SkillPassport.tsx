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
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#10b981] text-[#06090e] hover:bg-[#34d399] transition-all"
        >
          <span>View Active Jobs</span>
          <ArrowRightIcon size={12} />
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Verification Status & Identity Header */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-bold text-base flex items-center justify-center shrink-0">
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
                  <h2 className="text-base font-bold text-[var(--text-primary)] font-heading">
                    {profile?.name || "Kamrul Islam"}
                  </h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                    {profile?.employeeId || "EMP-ELEC-409"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <CheckCircleIcon size={11} className="text-emerald-500" />
                    <span>Verified Tier 1</span>
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {profile?.designation || "Senior High-Voltage Specialist"} · {profile?.branch || "EPZ Industrial Core Hub"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <span className="px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Duty: {profile?.status || "AVAILABLE"}
              </span>
              <span className="px-2.5 py-1 rounded-md font-mono text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface-2)] border border-[var(--border)]">
                Active: {profile?.activeJobCount || 0} jobs
              </span>
            </div>
          </div>
        </div>

        {/* Credentials & Licensing Table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface-2)] flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider">
                Government Licenses & Certifications
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Authoritative credentials validated against Department of Energy standards
              </p>
            </div>
            <span className="text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
              All Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Credential Name</th>
                  <th className="py-2.5 px-4">Issuing Authority</th>
                  <th className="py-2.5 px-4">Expiry / Status</th>
                  <th className="py-2.5 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {profile?.certifications && profile.certifications.length > 0 ? (
                  profile.certifications.map((cert) => (
                    <tr key={cert.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                        {cert.name}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">
                        {cert.issuedBy}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-[var(--text-primary)]">
                          {cert.expiryDate ? `Expires ${cert.expiryDate}` : "Permanent / Indefinite"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <CheckCircleIcon size={10} className="text-emerald-500" />
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
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm space-y-3">
          <div className="border-b border-[var(--border)] pb-2.5">
            <h3 className="font-heading font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider">
              Trade Endorsements & Authorized Equipment
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Primary and secondary trade domains where technician is cleared for solo emergency dispatch
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {profile?.skills && profile.skills.length > 0 ? (
              profile.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-xs flex items-center gap-2 shadow-xs"
                >
                  <WrenchIcon size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="font-medium text-[var(--text-primary)]">{skill.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]">
                    {skill.category}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No trade competencies recorded.</p>
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
