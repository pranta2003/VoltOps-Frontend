import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Staff test logins are listed in the project README (seeded accounts).
        </p>
      </div>
    </div>
  );
}
