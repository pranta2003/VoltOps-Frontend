import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

export function Register() {
  const { register, loginWithGoogle } = useAuth();
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
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleGoogleSignUp() {
    setError("");
    setIsGoogleSubmitting(true);

    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Google registration failed. Please try again.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side pre-validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setError("Please provide a valid full name (at least 2 characters).");
      return;
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please provide a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters in length.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(trimmedName, trimmedEmail, password);
      navigate("/");
    } catch (err: any) {
      setPassword("");

      if (err.code === "ERR_NETWORK" || !err.response || err.message?.includes("Network Error")) {
        setError(
          "Service temporarily unavailable: Unable to reach the authentication server. Please verify your connection or try again shortly."
        );
      } else if (err.response?.status === 409) {
        setError("An account with this email address already exists. Please log in instead.");
      } else if (err.response?.status === 400 || err.response?.status === 422) {
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            "Invalid registration data. Please verify your details."
        );
      } else if (err.response?.status >= 500) {
        setError("Server error (500): The authentication service encountered an error. Please try again later.");
      } else {
        setError(err.response?.data?.error || "Registration could not be completed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">
              VoltOps
            </h1>
          </Link>
          <p className="text-[var(--text-muted)] text-xs mt-1">Create a facility customer account</p>
        </div>

        <div
          className="border rounded-2xl p-6 space-y-4 shadow-[var(--shadow-sm)]"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Sign up</h2>
            <span className="text-[11px] text-[var(--text-muted)]">Commercial Access</span>
          </div>

          {selectedPackage && (
            <div
              className="text-xs rounded-xl p-3 border"
              style={{ background: "rgba(31,107,123,0.08)", borderColor: "var(--accent)" }}
            >
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                Selected plan: <span className="text-[var(--text-primary)] font-bold">{selectedPackage.name}</span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                <span className="font-bold text-emerald-600">✓</span>
                <span>
                  {selectedPackage.slaLabel || "Commitment"}: <strong>{selectedPackage.sla}</strong>
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-status-danger bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 leading-relaxed">
              {error}
            </div>
          )}

          {/* Google Sign-up Button */}
          <div className="space-y-3">
            <GoogleSignInButton
              onClick={handleGoogleSignUp}
              isLoading={isGoogleSubmitting}
              disabled={isSubmitting}
              text="Sign up with Google"
            />

            {/* Subtle Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[var(--border)]" />
              <span className="absolute px-2.5 text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] bg-[var(--bg-surface)]">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Full name</label>
              <input
                type="text"
                required
                value={name}
                disabled={isSubmitting || isGoogleSubmitting}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                placeholder="Karim Rahman"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                disabled={isSubmitting || isGoogleSubmitting}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                disabled={isSubmitting || isGoogleSubmitting}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full text-white rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
