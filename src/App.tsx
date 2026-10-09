import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AdminDashboard } from "./pages/AdminDashboard";
import { DispatcherDashboard } from "./pages/DispatcherDashboard";
import { TechnicianDashboard } from "./pages/TechnicianDashboard";
import { CustomerDashboard } from "./pages/CustomerDashboard";
import { NotFound } from "./pages/NotFound";
import { Unauthorized } from "./pages/Unauthorized";

import { LandingPage } from "./pages/LandingPage";

// This one component is the ONLY place that decides "which dashboard does
// this role see at '/'". If we ever add a 5th role, we add one line here —
// not one change in every page that redirects after login.
// For logged-out visitors, it renders the public LandingPage directly.
function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <LandingPage />;

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "DISPATCHER":
      return <DispatcherDashboard />;
    case "TECHNICIAN":
      return <TechnicianDashboard />;
    case "CUSTOMER":
      return <CustomerDashboard />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route path="/" element={<HomeRedirect />} />

            {/* Direct paths are also guarded by role, in case we link to them
                directly later (e.g. from a notification). */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher"
              element={
                <ProtectedRoute allowedRoles={["DISPATCHER"]}>
                  <DispatcherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/technician"
              element={
                <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
                  <TechnicianDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer"
              element={
                <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
