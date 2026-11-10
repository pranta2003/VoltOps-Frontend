import { FC } from "react";
import { useTheme } from "../context/ThemeContext";
import { SunIcon, MoonIcon } from "./Icons";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: FC<ThemeToggleProps> = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[#10b981]/40 active:scale-95 transition-all duration-150 group ${className}`}
    >
      {isLight ? (
        <SunIcon
          size={16}
          className="text-amber-500 group-hover:rotate-45 transition-transform duration-300"
        />
      ) : (
        <MoonIcon
          size={15}
          className="text-sky-400 group-hover:-rotate-12 transition-transform duration-300"
        />
      )}
    </button>
  );
};
