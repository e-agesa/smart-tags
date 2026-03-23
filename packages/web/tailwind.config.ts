import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0066ff",
        success: "#00c853",
        danger: "#ff3b30",
      },
    },
  },
  plugins: [],
} satisfies Config;
