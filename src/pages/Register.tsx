import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// This form only creates CUSTOMER accounts. See the long comment in
// backend/src/controllers/authController.ts for why — staff accounts
// (Admin/Dispatcher/Technician) are created by an Admin, not through
// public signup. That "Admin adds a staff member" screen comes in Milestone 2.
export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const packageParam = searchParams.get("package");
  const packageConfig: Record<string, { name: string; sla: string; slaLabel?: string }> = {
    // Current coverage plans
    "8hr": {
      name: "8-Hour Daily Coverage (Plan A)",
      sla: "8 hours per day defined operational window (no arrival SLA)",
      slaLabel: "Coverage Window",
    },
    "247-standard": {
      name: "24/7 Standard Coverage (Plan B)",
      sla: "Within 40 minutes — technician physically arrives at your facility",
      slaLabel: "Arrival SLA",
    },
    "247-priority": {
      name: "24/7 Priority Coverage (Plan C)",
      sla: "Within 20 minutes — rapid technician physical arrival (2× faster)",
      slaLabel: "Arrival SLA",
    },
    // Legacy backwards-compatibility fallbacks
    weekly: {
      name: "Weekly Plan (Legacy)",
      sla: "Within 40 minutes technician arrival",
      slaLabel: "Arrival SLA",
    },
    "monthly-standard": {
      name: "Monthly Standard (Legacy)",
      sla: "Within 40 minutes technician arrival",
      slaLabel: "Arrival SLA",
    },
    "monthly-priority": {
      name: "Monthly Priority (Legacy)",
      sla: "Within 20 minutes rapid technician arrival",
      slaLabel: "Arrival SLA",
    },
    standard: {
      name: "Monthly Standard (Legacy)",
      sla: "Within 40 minutes technician arrival",
      slaLabel: "Arrival SLA",
    },
    priority: {
      name: "Monthly Priority (Legacy)",
      sla: "Within 20 minutes rapid technician arrival",
      slaLabel: "Arrival SLA",
    },
    enterprise: {
      name: "Monthly Priority (Legacy)",
      sla: "Within 20 minutes rapid technician arrival",
      slaLabel: "Arrival SLA",
    },
  };

  const selectedPackage = packageParam
    ? packageConfig[packageParam.toLowerCase()] || {
        name: packageParam,
        sla: "Within plan response commitment",
        slaLabel: "Plan Commitment",
      }
    : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register(name, email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">VoltOps</h1>
          </Link>
          <p className="text-[var(--text-muted)] text-sm mt-1">Create a customer account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border rounded-2xl p-6 space-y-4 shadow-[var(--shadow-sm)]"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Sign up</h2>

          {selectedPackage && (
            <div
              className="text-sm rounded-xl p-3.5 border"
              style={{ background: "rgba(31,107,123,0.08)", borderColor: "var(--accent)" }}
            >
              <div className="font-semibold" style={{ color: "var(--accent)" }}>
                Selected plan: <span className="text-[var(--text-primary)] font-bold">{selectedPackage.name}</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
                <span className="font-bold" style={{ color: "#1E824C" }}>✓</span>
                <span>{selectedPackage.slaLabel || "Commitment"}: <strong style={{ color: "#1E824C" }}>{selectedPackage.sla}</strong></span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-status-danger bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="Karim Rahman"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white rounded-xl py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 shadow-sm"
            style={{ background: "var(--accent)" }}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
