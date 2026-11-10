import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";

// MILESTONE 1 STATUS: this page proves that an Admin logs in, gets
// identified correctly by role, and lands on their own dashboard.
// MILESTONE 2 WILL ADD: staff account creation, technician list with
// skills/certifications, branch management.
export function AdminDashboard() {
  const { user } = useAuth();

  return (
    <Layout
      title="Admin System Console"
      subtitle="Operational governance, staff directories, and workforce auditing"
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-lg">
            ⚡
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-[var(--text-primary)]">
              Welcome back, {user?.name || "Administrator"}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              System Role: <span className="font-semibold text-purple-600 dark:text-purple-400">{user?.role}</span> · Root Branch: EPZ Division
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          This confirms Milestone 1 (authentication + dual-theme role dashboard shell) is functioning end-to-end.
          Staff management, technician recruitment screening, and system audit logs are provisioned under this console.
        </p>
      </div>
    </Layout>
  );
}
