import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { getCoveragePlanPricing, CoveragePlanId } from "../config/coveragePricing";

export function Register() {
  const { register, loginWithGoogle, enterPreviewRole } = useAuth();
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

  // Real registration form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Local Preview demonstration registration state
  const [demoName, setDemoName] = useState("Karim Rahman");
  const [demoEmail, setDemoEmail] = useState("karim@pacificepz.com");
  const [demoCompany, setDemoCompany] = useState("Pacific Fabrics EPZ, Savar");

  function continueAfterAuth() {
    const pendingPlan = selectedPlanId || sessionStorage.getItem("voltops_pending_plan");
    if (pendingPlan && pendingPlan !== "custom") {
      navigate(`/checkout?plan=${pendingPlan}`);
    } else {
      navigate("/customer");
    }
  }

  function handleDemoRegister() {
    if (enterPreviewRole) {
      enterPreviewRole("CUSTOMER", {
        name: demoName.trim() || "Karim Rahman (Preview)",
        email: demoEmail.trim() || "karim@pacificepz.com",
        company: demoCompany.trim() || "Pacific Fabrics EPZ, Savar",
      });
      continueAfterAuth();
    }
  }

  async function handleGoogleSignUp() {
    setError("");
    setIsGoogleSubmitting(true);

    try {
      await loginWithGoogle();
      continueAfterAuth();
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
      continueAfterAuth();
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
      <div className="w-full max-w-md">
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

          {/* Preserved Plan Banner with BDT Prototype Pricing */}
          {planPricing && (
            <div
              className="text-xs rounded-xl p-3.5 border bg-emerald-500/10 border-emerald-500/30 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Selected plan: <strong className="text-[var(--text-primary)]">{planPricing.name}</strong>
                </span>
                <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {planPricing.formattedPrice}
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">{planPricing.billingUnit}</span>
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                <span className="font-bold text-emerald-600">✓</span>
                <span>Arrival SLA: <strong>{planPricing.arrivalSlaLabel}</strong></span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                <span className="font-bold text-emerald-600">✓</span>
                <span>Included allowance: <strong>{planPricing.includedVisitsLabel}</strong></span>
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1 border-t border-emerald-500/20">
                {planPricing.prototypeNotice}
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

          {/* Dedicated Local Preview Demonstration Registration */}
          <div
            className="mt-4 pt-4 border-t border-[var(--border)] rounded-xl p-3.5 bg-amber-500/5 border border-amber-500/20 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Local Preview Registration
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">DEMO MODE</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Demonstrate customer registration, session establishment, and automated plan preservation without a running backend.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Demo Name</label>
                <input
                  type="text"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  className="w-full border rounded-lg px-2.5 py-1 text-xs"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Facility / Company</label>
                <input
                  type="text"
                  value={demoCompany}
                  onChange={(e) => setDemoCompany(e.target.value)}
                  className="w-full border rounded-lg px-2.5 py-1 text-xs"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoRegister}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-amber-950 dark:text-amber-200 bg-amber-400 dark:bg-amber-500/20 hover:bg-amber-500 dark:hover:bg-amber-500/30 border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
            >
              <span>Demonstrate Registration as Customer</span>
              {selectedPlanId && <span className="opacity-90">→ Continue to Checkout</span>}
            </button>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
            Already have an account?{" "}
            <Link
              to={selectedPlanId ? `/login?package=${selectedPlanId}` : "/login"}
              className="font-semibold hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
