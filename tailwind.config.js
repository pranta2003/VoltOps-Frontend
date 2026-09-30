/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Naming colors by their JOB (not just "blue-500") means when a
        // designer/teammate wants to change the brand color later, they
        // change it in ONE place instead of hunting through every file.
        brand: {
          DEFAULT: "#1F4B5B", // deep teal-navy - main brand color
          dark: "#153742",
          light: "#3D7186",
        },
        // Status colors map directly to TechnicianStatus / job states,
        // used consistently everywhere a status badge appears.
        status: {
          available: "#1E824C", // green
          busy: "#C97A1B", // amber
          offline: "#6B7280", // gray
          danger: "#B3261E", // red - SLA breach, errors
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
