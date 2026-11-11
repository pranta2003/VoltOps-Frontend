import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type Theme = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Theme;

interface ThemeContextValue {
  theme: Theme;
  resolved: Theme;
  preference: ThemePreference;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  setPreference: (p: ThemePreference) => void;
}

const STORAGE_KEY = "voltops-theme";

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolved: "light",
  preference: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light" || saved === "system") {
        return saved as ThemePreference;
      }
    } catch {}
    return "light";
  });

  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  // Listen to OS theme changes when in 'system' mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Compute resolved active theme
  const resolvedTheme: Theme = preference === "system" ? systemTheme : preference;

  // Apply to DOM whenever resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {}
  };

  const setTheme = (next: Theme) => {
    setPreference(next);
  };

  const toggleTheme = () => {
    // Cycle: light -> dark -> system -> light
    if (preference === "light") {
      setPreference("dark");
    } else if (preference === "dark") {
      setPreference("system");
    } else {
      setPreference("light");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        resolved: resolvedTheme,
        preference,
        toggleTheme,
        setTheme,
        setPreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
