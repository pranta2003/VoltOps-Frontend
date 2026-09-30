import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";

// MILESTONE 4 WILL ADD: the Matching Engine screen — create a job, see
// eligible vs. rejected technicians with reasons, and assign the job.
// MILESTONE 5 WILL ADD: live status updates via Socket.io.
export function DispatcherDashboard() {
  const { user } = useAuth();

  return (
    <Layout title="Dispatcher Dashboard">
      <div className="bg-white border rounded-lg p-6">
        <p className="text-gray-700">
          Welcome, <span className="font-medium">{user?.name}</span>. You are logged in as{" "}
          <span className="font-medium">{user?.role}</span>.
        </p>
        <p className="text-gray-500 text-sm mt-3">
          The job assignment board and the technician Matching Engine (the core
          feature of this whole project) will be built here in Milestone 4.
        </p>
      </div>
    </Layout>
  );
}
