import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[]; // if omitted, any logged-in user can view this page
}

// REMINDER (also written in authorize.ts on the backend): this component
// only controls what's SHOWN in the browser. It makes the app feel right
// and stops normal users from wandering into pages meant for other roles.
// It is NOT real security by itself — the backend's authorize() middleware
// is what actually blocks unauthorized actions, because that runs on our
// server where a user can't tamper with it.
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
