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
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        heading: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"],
      },
      keyframes: {
        "ambient-drift": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -20px) scale(1.08)" },
          "66%": { transform: "translate(-20px, 15px) scale(0.95)" },
        },
        "ambient-drift-rev": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(-25px, 25px) scale(1.05)" },
          "66%": { transform: "translate(20px, -15px) scale(0.92)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.85" },
        },
        "float-gentle": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "ambient-drift": "ambient-drift 22s ease-in-out infinite",
        "ambient-drift-rev": "ambient-drift-rev 26s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 6s ease-in-out infinite",
        "float-gentle": "float-gentle 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
