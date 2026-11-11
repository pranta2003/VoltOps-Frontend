import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type Theme = "light" | "dark";
// For backward compatibility with existing imports:
export type ThemePreference = Theme | "system";
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

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolved: "light",
  preference: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  setPreference: () => {},
});

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        return saved;
      }
    } catch {}
    // Default theme: strictly Light
    return "light";
  });

  // Apply theme to DOM
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  const setPreference = (p: ThemePreference) => {
    if (p === "dark") setTheme("dark");
    else setTheme("light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolved: theme,
        preference: theme,
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
