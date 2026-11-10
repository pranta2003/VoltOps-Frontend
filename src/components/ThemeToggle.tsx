import { FC } from "react";
import { useTheme, ThemePreference } from "../context/ThemeContext";
import { SunIcon, MoonIcon, LaptopIcon } from "./Icons";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: FC<ThemeToggleProps> = ({ className = "" }) => {
  const { preference, setPreference } = useTheme();

  const options: { value: ThemePreference; label: string; icon: typeof SunIcon }[] = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: LaptopIcon },
  ];

  return (
    <div
      className={`inline-flex items-center p-1 rounded-full border border-[var(--border)] bg-[var(--bg-surface-2)] shadow-inner ${className}`}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = preference === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setPreference(value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#10b981] ${
              isActive
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-semibold border border-[var(--border-strong)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
            role="radio"
            aria-checked={isActive}
            title={`Switch to ${label} mode`}
          >
            <Icon size={13} className={isActive ? "text-[#10b981]" : "text-current"} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
