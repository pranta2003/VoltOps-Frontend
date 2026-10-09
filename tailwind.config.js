/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // class-based dark mode – controlled by ThemeContext
  theme: {
    extend: {
      colors: {
        // Brand tokens – change here, reflected everywhere
        brand: {
          DEFAULT: "#1F4B5B",
          dark: "#153742",
          light: "#3D7186",
        },
        // Status tokens
        status: {
          available: "#1E824C",
          busy: "#C97A1B",
          offline: "#6B7280",
          danger: "#B3261E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      keyframes: {
        "ambient-drift": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(25px, -15px) scale(1.05)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "0.9" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "ambient-drift": "ambient-drift 18s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 4s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out",
      },
    },
  },
  plugins: [],
};
