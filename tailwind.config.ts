import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0eaff",
          200: "#c4d4ff",
          300: "#9db3ff",
          400: "#7088ff",
          500: "#4a5fff",
          600: "#3340f5",
          700: "#2830e0",
          800: "#2129b5",
          900: "#1e248f",
          950: "#131659",
        },
        surface: {
          DEFAULT: "#0f1117",
          raised: "#161821",
          overlay: "#1c1f2e",
          border: "#2a2d3e",
          muted: "#383b52",
        },
        ink: {
          DEFAULT: "#e8eaf6",
          muted: "#9194ac",
          faint: "#555872",
        },
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
    },
  },
  plugins: [],
};

export default config;
