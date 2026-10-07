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
  const packageNames: Record<string, string> = {
    standard: "Standard care",
    priority: "Priority 24/7",
    enterprise: "Enterprise",
  };
  const selectedPackageName = packageParam
    ? packageNames[packageParam.toLowerCase()] || packageParam
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

//<div>
        //    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
      //      <input
    //          type="password"
    //          required
    //          value={password}
    //          onChange={(e) => setPassword(e.target.value)}
   //           className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
     //         placeholder="••••••••"
    //        />
    //      </div>






  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand">VoltOps</h1>
          <p className="text-gray-500 text-sm mt-1">Create a customer account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Sign up</h2>

          {selectedPackageName && (
            <div className="text-sm text-brand bg-brand/10 border border-brand/20 rounded-md px-3 py-2">
              Selected package: <span className="font-semibold">{selectedPackageName}</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-status-danger bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              placeholder="Karim Rahman"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand hover:bg-brand-dark text-white rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-brand hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
