import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login, enterPreviewRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSelectPreview(role: "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "CUSTOMER") {
    if (enterPreviewRole) {
      enterPreviewRole(role);
      navigate("/");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(trimmedEmail, password);
      // We don't redirect to a role-specific path here on purpose — the
      // "/" route (see App.tsx) already looks at the logged-in user's role
      // and sends them to the right dashboard. One place decides that,
      // instead of repeating the logic in every page that logs someone in.
      navigate("/");
    } catch (err: any) {
      setPassword("");

      if (err.code === "ERR_NETWORK" || !err.response || err.message?.includes("Network Error")) {
        setError(
          "Service temporarily unavailable: Unable to reach the authentication server. Please ensure the backend service is running or try again shortly."
        );
      } else if (err.response?.status === 401) {
        setError("Invalid email or password. Please verify your credentials and try again.");
      } else if (err.response?.status === 403) {
        setError("Account suspended or restricted. Please contact your system administrator.");
      } else if (err.response?.status >= 500) {
        setError("Server error (500): The authentication service encountered an error. Please try again later.");
      } else {
        setError(err.response?.data?.error || "Login failed. Please verify your credentials.");
      }
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
          <p className="text-[var(--text-muted)] text-sm mt-1">Field Service Workforce & Coordination Platform</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border rounded-2xl p-6 space-y-4 shadow-[var(--shadow-sm)]"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Log in</h2>

          {error && (
            <div className="text-sm text-status-danger bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white rounded-xl py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 shadow-sm"
            style={{ background: "var(--accent)" }}
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>

          <p className="text-center text-sm text-[var(--text-muted)]">
            New customer?{" "}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
              Create an account
            </Link>
          </p>
        </form>

        {/* Development-Only Role Preview (strictly stripped or dormant in production builds) */}
        {import.meta.env.DEV && (
          <div
            className="mt-6 border rounded-2xl p-5 shadow-[var(--shadow-sm)]"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Developer Preview
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">DEV MODE ONLY</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Explore internal operational dashboards directly without a live backend session. No credentials or JWT tokens stored.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreview("ADMIN")}
                className="px-2 py-2 text-xs font-semibold rounded-xl border transition-all text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 active:scale-[0.98] text-center truncate"
                title="Preview as Admin (/admin)"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreview("DISPATCHER")}
                className="px-2 py-2 text-xs font-semibold rounded-xl border transition-all text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 active:scale-[0.98] text-center truncate"
                title="Preview as Dispatcher (/dispatcher)"
              >
                Dispatcher
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreview("TECHNICIAN")}
                className="px-2 py-2 text-xs font-semibold rounded-xl border transition-all text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20 active:scale-[0.98] text-center truncate"
                title="Preview as Technician (/technician)"
              >
                Technician
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreview("CUSTOMER")}
                className="px-2 py-2 text-xs font-semibold rounded-xl border transition-all text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 active:scale-[0.98] text-center truncate"
                title="Preview as Customer (/customer)"
              >
                Customer
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Staff test logins are listed in the project README (seeded accounts).
        </p>
      </div>
    </div>
  );
}
