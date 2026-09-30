import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../api/axios";
import { AuthUser, LoginResponse } from "../types";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean; // true while we check "is there a saved login?" on first load
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load (or page refresh), check if we have a saved token and,
  // if so, ask the backend "is this still valid, and who is this?" via
  // GET /api/auth/me. This is what keeps someone logged in after refresh.
  useEffect(() => {
    const savedToken = localStorage.getItem("voltops_token");

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("voltops_token");
        localStorage.removeItem("voltops_user");
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
    localStorage.removeItem("voltops_token");
    localStorage.removeItem("voltops_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
