import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";

// MILESTONE 3 WILL ADD: "Request service" form and a list of the
// customer's own requests with live status.
export function CustomerDashboard() {
  const { user } = useAuth();

//api.interceptors.request.use((config) => {
 // const token = localStorage.getItem("voltops_token");
//  if (token) {
 //   config.headers.Authorization = `Bearer ${token}`;
 // }
//  return config;
//  });


  
  return (
    <Layout title="My Account">
      <div className="bg-white border rounded-lg p-6">
        <p className="text-gray-700">
          Welcome, <span className="font-medium">{user?.name}</span>.
        </p>
        <p className="text-gray-500 text-sm mt-3">
          You'll be able to submit a service request and track its status here,
          starting in Milestone 3.
        </p>
      </div>
    </Layout>
  );
}
