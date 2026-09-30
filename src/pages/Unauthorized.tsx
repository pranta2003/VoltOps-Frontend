import { Link } from "react-router-dom";

export function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">Access denied</h1>
      <p className="text-gray-500 mb-6">Your account role doesn't have access to this page.</p>
      <Link to="/" className="text-brand hover:underline text-sm">
        Go back home
      </Link>
    </div>
  );
}
