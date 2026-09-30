import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// This runs before EVERY request this instance makes. Instead of manually
// adding "Authorization: Bearer <token>" to every single API call in every
// page, we do it once, here, and every page automatically gets it for free.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("voltops_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// This runs after EVERY response. If the backend ever says "your token is
// invalid/expired" (401), we log the user out automatically instead of
// leaving them stuck on a broken page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("voltops_token");
      localStorage.removeItem("voltops_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
