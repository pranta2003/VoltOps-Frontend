import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../api/axios";
import { AuthUser, LoginResponse } from "../types";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean; // true while we check "is there a saved login?" on first load
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isPreview?: boolean;
  enterPreviewRole?: (role: "ADMIN" | "DISPATCHER" | "TECHNICIAN") => void;
  exitPreview?: () => void;
}

const PREVIEW_USERS: Record<"ADMIN" | "DISPATCHER" | "TECHNICIAN", AuthUser> = {
  ADMIN: {
    id: "usr-preview-admin",
    name: "Pranta Admin (Preview)",
    email: "admin@voltops.com",
    role: "ADMIN",
    initials: "PA",
    company: "VoltOps Central EPZ",
  },
  DISPATCHER: {
    id: "usr-preview-dispatcher",
    name: "Bani Dispatcher (Preview)",
    email: "dispatcher@voltops.com",
    role: "DISPATCHER",
    initials: "BD",
    company: "VoltOps Gazipur Ops",
  },
  TECHNICIAN: {
    id: "usr-preview-technician",
    name: "Kamrul Islam (Preview)",
    email: "kamrul.tech@voltops.internal",
    role: "TECHNICIAN",
    initials: "KI",
    company: "VoltOps Field Services",
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);

  // Development-only role preview helpers
  function enterPreviewRole(role: "ADMIN" | "DISPATCHER" | "TECHNICIAN") {
    if (!import.meta.env.DEV) return;
    setIsPreview(true);
    setUser(PREVIEW_USERS[role]);
    sessionStorage.setItem("voltops_preview_role", role);
  }

  function exitPreview() {
    setIsPreview(false);
    sessionStorage.removeItem("voltops_preview_role");
    // Restore saved user if present, otherwise null
    const savedUserStr = localStorage.getItem("voltops_user");
    if (savedUserStr && localStorage.getItem("voltops_token")) {
      try {
        setUser(JSON.parse(savedUserStr));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    // Explicitly navigate to /login when exiting developer preview
    window.location.href = "/login";
  }

  // On first load (or page refresh), check if we have a saved token or active dev preview
  useEffect(() => {
    // If in dev mode and a preview role was selected in this session, restore preview
    if (import.meta.env.DEV) {
      const savedPreviewRole = sessionStorage.getItem("voltops_preview_role") as "ADMIN" | "DISPATCHER" | "TECHNICIAN" | null;
      if (savedPreviewRole && PREVIEW_USERS[savedPreviewRole]) {
        setIsPreview(true);
        setUser(PREVIEW_USERS[savedPreviewRole]);
        setIsLoading(false);
        return;
      }
    }

    const savedToken = localStorage.getItem("voltops_token");
    const savedUserStr = localStorage.getItem("voltops_user");

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    if (savedUserStr) {
      try {
        setUser(JSON.parse(savedUserStr));
      } catch {
        localStorage.removeItem("voltops_user");
      }
    }

    api
      .get("/auth/me")
      .then((res) => {
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem("voltops_user", JSON.stringify(res.data.user));
        }
      })
      .catch((err) => {
        // Only clear credentials if backend explicitly reports unauthorized 401
        if (err.response?.status === 401) {
          localStorage.removeItem("voltops_token");
          localStorage.removeItem("voltops_user");
          setUser(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<LoginResponse>("/auth/login", { email, password });
    localStorage.setItem("voltops_token", res.data.token);
    localStorage.setItem("voltops_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.post<LoginResponse>("/auth/register", { name, email, password });
    localStorage.setItem("voltops_token", res.data.token);
    localStorage.setItem("voltops_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  function logout() {
    setIsPreview(false);
    sessionStorage.removeItem("voltops_preview_role");
    localStorage.removeItem("voltops_token");
    localStorage.removeItem("voltops_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isPreview,
        enterPreviewRole,
        exitPreview,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// A small custom hook so every component does:
//   const { user, logout } = useAuth();
// instead of importing useContext + AuthContext everywhere.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return context;
}
