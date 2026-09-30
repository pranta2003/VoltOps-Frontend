import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";

// MILESTONE 1 STATUS: this page proves that an Admin logs in, gets
// identified correctly by role, and lands on their own dashboard.
// MILESTONE 2 WILL ADD: staff account creation, technician list with
// skills/certifications, branch management.
export function AdminDashboard() {
  const { user } = useAuth();

  return (
    <Layout title="Admin Dashboard">
      <div className="bg-white border rounded-lg p-6">
        <p className="text-gray-700">
          Welcome, <span className="font-medium">{user?.name}</span>. You are logged in as{" "}
          <span className="font-medium">{user?.role}</span>.
        </p>
        <p className="text-gray-500 text-sm mt-3">
          This confirms Milestone 1 (auth + role-based routing) is working end-to-end.
          Staff management, technician oversight, and system-wide reports will appear
          here in Milestone 2.
        </p>
      </div>
    </Layout>
  );
}
