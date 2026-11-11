import { FC } from "react";
import { useTheme } from "../context/ThemeContext";
import { SunIcon, MoonIcon, LaptopIcon } from "./Icons";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: FC<ThemeToggleProps> = ({ className = "", showLabel = false }) => {
  const { preference, toggleTheme } = useTheme();

  const getLabel = () => {
    switch (preference) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
    }
  };

  const getTitle = () => {
    switch (preference) {
      case "light":
        return "Theme: Light (click for Dark)";
      case "dark":
        return "Theme: Dark (click for System)";
      case "system":
        return "Theme: System (click for Light)";
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={getTitle()}
      title={getTitle()}
      className={`relative inline-flex items-center justify-center gap-1.5 px-2.5 h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[#10b981]/40 active:scale-95 transition-all duration-150 group ${className}`}
    >
      {preference === "light" && (
        <SunIcon
          size={15}
          className="text-amber-500 group-hover:rotate-45 transition-transform duration-200"
        />
      )}
      {preference === "dark" && (
        <MoonIcon
          size={15}
          className="text-cyan-400 group-hover:-rotate-12 transition-transform duration-200"
        />
      )}
      {preference === "system" && (
        <LaptopIcon
          size={15}
          className="text-slate-600 dark:text-slate-300 transition-colors"
        />
      )}
      {showLabel && (
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          {getLabel()}
        </span>
      )}
    </button>
  );
};
