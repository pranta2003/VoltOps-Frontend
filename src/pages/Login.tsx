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
    setIsSubmitting(true);

    try {
      await login(email, password);
      // We don't redirect to a role-specific path here on purpose — the
      // "/" route (see App.tsx) already looks at the logged-in user's role
      // and sends them to the right dashboard. One place decides that,
      // instead of repeating the logic in every page that logs someone in.
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand">VoltOps</h1>
          <p className="text-gray-500 text-sm mt-1">Electrical Workforce & Service Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Log in</h2>

          {error && (
            <div className="text-sm text-status-danger bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand hover:bg-brand-dark text-white rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>

          <p className="text-center text-sm text-gray-500">
            New customer?{" "}
            <Link to="/register" className="text-brand hover:underline">
              Create an account
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Staff test logins are listed in the project README (seeded accounts).
        </p>
      </div>
    </div>
  );
}
