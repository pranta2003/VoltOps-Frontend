import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../api/axios";
import { AuthUser, LoginResponse } from "../types";
import { authService, formatFirebaseErrorMessage } from "../services/authService";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean; // true while checking saved login or Firebase session
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<AuthUser>;
  logout: () => Promise<void>;
  isPreview?: boolean;
  enterPreviewRole?: (role: "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "CUSTOMER") => void;
  exitPreview?: () => void;
  authNotice?: string | null;
  clearAuthNotice?: () => void;
}

const PREVIEW_USERS: Record<"ADMIN" | "DISPATCHER" | "TECHNICIAN" | "CUSTOMER", AuthUser> = {
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
  CUSTOMER: {
    id: "cust-epz-01",
    name: "Apex Facility Manager (Preview)",
    email: "facility@apexmills.com",
    role: "CUSTOMER",
    initials: "AF",
    company: "Apex Spinning & Weaving Mills, Savar",
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  function clearAuthNotice() {
    setAuthNotice(null);
  }

  // Development-only role preview helpers
  function enterPreviewRole(role: "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "CUSTOMER") {
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

  // Session bootstrap: checks dev preview, saved token, and Firebase auth state
  useEffect(() => {
    // 1. If in dev mode and a preview role was selected in this session, restore preview
    if (import.meta.env.DEV) {
      const savedPreviewRole = sessionStorage.getItem("voltops_preview_role") as
        | "ADMIN"
        | "DISPATCHER"
        | "TECHNICIAN"
        | "CUSTOMER"
        | null;
      if (savedPreviewRole && PREVIEW_USERS[savedPreviewRole]) {
        setIsPreview(true);
        setUser(PREVIEW_USERS[savedPreviewRole]);
        setIsLoading(false);
        return;
      }
    }

    // 2. Check saved user / token
    const savedToken = localStorage.getItem("voltops_token");
    const savedUserStr = localStorage.getItem("voltops_user");

    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        setUser(parsed);
      } catch {
        localStorage.removeItem("voltops_user");
      }
    }

    if (!savedToken) {
      // 3. Listen to Firebase auth state if configured
      if (authService.isConfigured()) {
        const unsubscribe = authService.onAuthStateChanged((fbUser) => {
          if (!fbUser && !localStorage.getItem("voltops_token")) {
            setUser(null);
          }
          setIsLoading(false);
        });
        return unsubscribe;
      }

      setIsLoading(false);
      return;
    }

    // 4. Validate saved token with backend if present
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

  async function loginWithGoogle(): Promise<AuthUser> {
    try {
      const { voltOpsUser, voltOpsToken, isOfflineMock } = await authService.signInWithGoogle();

      // Store application token and user
      localStorage.setItem("voltops_token", voltOpsToken);
      localStorage.setItem("voltops_user", JSON.stringify(voltOpsUser));
      setUser(voltOpsUser);

      if (isOfflineMock) {
        setAuthNotice(
          "Signed in via Google identity. VoltOps backend integration contract ready (Customer role assigned)."
        );
      }

      return voltOpsUser;
    } catch (err: any) {
      const msg = formatFirebaseErrorMessage(err);
      throw new Error(msg);
    }
  }

  async function logout() {
    setIsPreview(false);
    sessionStorage.removeItem("voltops_preview_role");
    localStorage.removeItem("voltops_token");
    localStorage.removeItem("voltops_user");
    setUser(null);

    // Also sign out of Firebase identity if active
    await authService.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        isPreview,
        enterPreviewRole,
        exitPreview,
        authNotice,
        clearAuthNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return context;
}
