import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { getCoveragePlanPricing, CoveragePlanId } from "../config/coveragePricing";

export function Login() {
  const { login, loginWithGoogle, enterPreviewRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Retrieve plan from URL query param or fallback to persisted session state
  const rawPlanParam = searchParams.get("package") || searchParams.get("plan") || sessionStorage.getItem("voltops_pending_plan");
  const selectedPlanId = (rawPlanParam ? rawPlanParam.toLowerCase().trim() : null) as CoveragePlanId | null;

  useEffect(() => {
    if (selectedPlanId) {
      sessionStorage.setItem("voltops_pending_plan", selectedPlanId);
    }
  }, [selectedPlanId]);

  const planPricing = selectedPlanId ? getCoveragePlanPricing(selectedPlanId) : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  function continueAfterAuth(role: "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "CUSTOMER") {
    const pendingPlan = selectedPlanId || sessionStorage.getItem("voltops_pending_plan");
    if (role === "CUSTOMER" && pendingPlan && pendingPlan !== "custom") {
      navigate(`/checkout?plan=${pendingPlan}`);
    } else {
      navigate("/");
    }
  }

  function handleSelectPreview(role: "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "CUSTOMER") {
    if (enterPreviewRole) {
      enterPreviewRole(role);
      continueAfterAuth(role);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsGoogleSubmitting(true);

    try {
      const user = await loginWithGoogle();
      continueAfterAuth(user.role);
    } catch (err: any) {
      setError(err.message || "Google authentication failed. Please try again.");
    } finally {
      setIsGoogleSubmitting(false);
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


 // useEffect(() => {
   // if (!ref.current) return;
    //if (typeof IntersectionObserver === "undefined") {
     // setRevealed(true);
     // return;
  //  }
    

    try {
      await login(trimmedEmail, password);
      continueAfterAuth("CUSTOMER");
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">
              VoltOps
            </h1>
          </Link>
          <p className="text-[var(--text-muted)] text-xs mt-1">Field Service Workforce & Coordination Platform</p>
        </div>

        <div
          className="border rounded-2xl p-6 space-y-4 shadow-[var(--shadow-sm)]"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Log in</h2>
            <span className="text-[11px] text-[var(--text-muted)]">Commercial Access</span>
          </div>

          {/* Preserved Plan Notice */}
          {planPricing && (
            <div className="text-xs rounded-xl p-3 border bg-emerald-500/10 border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Pending plan: <strong className="text-[var(--text-primary)]">{planPricing.code}</strong>
                </span>
                <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  {planPricing.formattedPrice}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Log in as Customer to continue directly to subscription checkout.
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-status-danger bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 leading-relaxed">
              {error}
            </div>
          )}

          {/* Professional Google Sign-In Option */}
          <div className="space-y-3">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              isLoading={isGoogleSubmitting}
              disabled={isSubmitting}
              text="Continue with Google"
            />

            {/* Subtle Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[var(--border)]" />
              <span className="absolute px-2.5 text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] bg-[var(--bg-surface)]">
                Or continue with
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
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
                value={password}
                disabled={isSubmitting || isGoogleSubmitting}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full text-white rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              {isSubmitting ? "Logging in..." : "Log in with Email"}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
            New customer?{" "}
            <Link
              to={selectedPlanId ? `/register?package=${selectedPlanId}` : "/register"}
              className="font-semibold hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Create an account
            </Link>
          </p>
        </div>

        {/* Development-Only Role Preview */}
        {import.meta.env.DEV && (
          <div
            className="mt-5 border rounded-2xl p-4 shadow-[var(--shadow-sm)]"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Developer Preview
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">DEMO ROLES</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
              Explore role-guarded operational portals directly without requiring a live backend session.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreview("ADMIN")}
                className="px-2 py-1.5 text-xs font-semibold rounded-xl border transition-all text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 active:scale-[0.98] text-center truncate"
                title="Preview as Admin (/admin)"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreview("DISPATCHER")}
                className="px-2 py-1.5 text-xs font-semibold rounded-xl border transition-all text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 active:scale-[0.98] text-center truncate"
                title="Preview as Dispatcher (/dispatcher)"
              >
                Dispatcher
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreview("TECHNICIAN")}
                className="px-2 py-1.5 text-xs font-semibold rounded-xl border transition-all text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 active:scale-[0.98] text-center truncate"
                title="Preview as Field Technician (/technician)"
              >
                Technician
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreview("CUSTOMER")}
                className="px-2 py-1.5 text-xs font-bold rounded-xl border transition-all text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20 active:scale-[0.98] text-center truncate"
                title="Preview as Facility Customer (/customer)"
              >
                Customer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
