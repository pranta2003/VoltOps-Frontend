import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

interface TechnicianProfileData {
  id: string;
  employeeId: string;
  branch: string;
  designation: string | null;
  status: string;
  currentArea: string | null;
  skills: { skill: { id: string; name: string } }[];
  certifications: { certification: { id: string; name: string }; expiryDate: string }[];
}

// A small map from status -> color, using the semantic colors we defined
// in tailwind.config.js. Centralizing this here means every status badge
// in the app (this page, the dispatcher's technician list later, etc.)
// stays visually consistent.
const statusColors: Record<string, string> = {
  AVAILABLE: "bg-status-available/10 text-status-available",
  ON_JOB: "bg-status-busy/10 text-status-busy",
  TRAVELLING: "bg-status-busy/10 text-status-busy",
  BREAK: "bg-status-offline/10 text-status-offline",
  OFF_DUTY: "bg-status-offline/10 text-status-offline",
  ON_LEAVE: "bg-status-offline/10 text-status-offline",
  UNAVAILABLE: "bg-status-danger/10 text-status-danger",
};

export function TechnicianDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TechnicianProfileData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/technicians/me")
      .then((res) => setProfile(res.data.profile))
      .catch((err) => setError(err.response?.data?.error || "Could not load your profile."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <Layout title="Technician Dashboard">
      <div className="bg-white border rounded-lg p-6 mb-6">
        <p className="text-gray-700">
          Welcome, <span className="font-medium">{user?.name}</span>.
        </p>
      </div>

      {isLoading && <p className="text-gray-500 text-sm">Loading your profile...</p>}

      {error && (
        <div className="text-sm text-status-danger bg-red-50 border border-red-100 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {profile && (
        <div className="bg-white border rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Employee ID</p>
              <p className="font-medium">{profile.employeeId}</p>
            </div>
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                statusColors[profile.status] || "bg-gray-100 text-gray-600"
              }`}
            >
              {profile.status.replace("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Branch</p>
              <p className="font-medium">{profile.branch}</p>
            </div>
            <div>
              <p className="text-gray-500">Designation</p>
              <p className="font-medium">{profile.designation || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">Current area</p>
              <p className="font-medium">{profile.currentArea || "—"}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">Skills</p>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span
                  key={s.skill.id}
                  className="text-xs bg-brand/10 text-brand px-2.5 py-1 rounded-full"
                >
                  {s.skill.name}
                </span>
              ))}
              {profile.skills.length === 0 && (
                <span className="text-sm text-gray-400">No skills added yet.</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">Certifications</p>
            <div className="space-y-1.5">
              {profile.certifications.map((c) => {
                const isExpired = new Date(c.expiryDate) < new Date();
                return (
                  <div
                    key={c.certification.id}
                    className="flex justify-between text-sm border rounded-md px-3 py-2"
                  >
                    <span>{c.certification.name}</span>
                    <span className={isExpired ? "text-status-danger" : "text-gray-500"}>
                      {isExpired ? "Expired" : "Valid until"}{" "}
                      {new Date(c.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
              {profile.certifications.length === 0 && (
                <span className="text-sm text-gray-400">No certifications added yet.</span>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 pt-2 border-t">
            Job history and assignments will appear here starting Milestone 3.
          </p>
        </div>
      )}
    </Layout>
  );
}
