import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1a3a8f",       // Royal blue
        "primary-light": "#2451c4",
        "primary-dark": "#0f2460",
        accent: "#dc2626",        // Red
        "accent-light": "#ef4444",
        "accent-dark": "#991b1b",
        gold: "#eab308",          // Yellow/gold
        "gold-light": "#facc15",
        "gold-dark": "#a16207",
        success: "#16a34a",
        danger: "#dc2626",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
