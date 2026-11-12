import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { NotFound } from "./pages/NotFound";
import { Unauthorized } from "./pages/Unauthorized";
import { LandingPage } from "./pages/LandingPage";

// Route-Level Code Splitting for Dashboards & Complex Portal Views
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const UserManagement = lazy(() => import("./pages/admin/UserManagement").then((m) => ({ default: m.UserManagement })));
const TechnicianVerification = lazy(() => import("./pages/admin/TechnicianVerification").then((m) => ({ default: m.TechnicianVerification })));
const AuditLog = lazy(() => import("./pages/admin/AuditLog").then((m) => ({ default: m.AuditLog })));

const DispatcherDashboard = lazy(() => import("./pages/dispatcher/DispatcherDashboard").then((m) => ({ default: m.DispatcherDashboard })));
const ServiceRequests = lazy(() => import("./pages/dispatcher/ServiceRequests").then((m) => ({ default: m.ServiceRequests })));
const WorkOrders = lazy(() => import("./pages/dispatcher/WorkOrders").then((m) => ({ default: m.WorkOrders })));
const TechnicianRoster = lazy(() => import("./pages/dispatcher/TechnicianRoster").then((m) => ({ default: m.TechnicianRoster })));
const DispatcherSchedule = lazy(() => import("./pages/dispatcher/DispatcherSchedule").then((m) => ({ default: m.DispatcherSchedule })));
const DispatchAuditLog = lazy(() => import("./pages/dispatcher/DispatchAuditLog").then((m) => ({ default: m.DispatchAuditLog })));

const TechnicianDashboard = lazy(() => import("./pages/TechnicianDashboard").then((m) => ({ default: m.TechnicianDashboard })));
const MyJobs = lazy(() => import("./pages/technician/MyJobs").then((m) => ({ default: m.MyJobs })));

const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard").then((m) => ({ default: m.CustomerDashboard })));
const NewServiceRequest = lazy(() => import("./pages/customer/NewServiceRequest").then((m) => ({ default: m.NewServiceRequest })));
const CustomerInvoices = lazy(() => import("./pages/customer/CustomerInvoices").then((m) => ({ default: m.CustomerInvoices })));

const RouteLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-muted)] text-xs font-mono">
    Loading VoltOps Module...
  </div>
);

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
          <Suspense fallback={<RouteLoadingFallback />}>
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
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/technicians"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <TechnicianVerification />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <AuditLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatcher"
                element={
                  <ProtectedRoute allowedRoles={["DISPATCHER", "ADMIN"]}>
                    <DispatcherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatcher/requests"
                element={
                  <ProtectedRoute allowedRoles={["DISPATCHER", "ADMIN"]}>
                    <ServiceRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatcher/work-orders"
                element={
                  <ProtectedRoute allowedRoles={["DISPATCHER", "ADMIN"]}>
                    <WorkOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatcher/technicians"
                element={
                  <ProtectedRoute allowedRoles={["DISPATCHER", "ADMIN"]}>
                    <TechnicianRoster />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatcher/schedule"
                element={
                  <ProtectedRoute allowedRoles={["DISPATCHER", "ADMIN"]}>
                    <DispatcherSchedule />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatcher/audit"
                element={
                  <ProtectedRoute allowedRoles={["DISPATCHER", "ADMIN"]}>
                    <DispatchAuditLog />
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
                path="/technician/jobs"
                element={
                  <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
                    <MyJobs />
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
              <Route
                path="/customer/new-request"
                element={
                  <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                    <NewServiceRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/invoices"
                element={
                  <ProtectedRoute allowedRoles={["CUSTOMER", "ADMIN"]}>
                    <CustomerInvoices />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
