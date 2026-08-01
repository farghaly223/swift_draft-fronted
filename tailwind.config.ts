import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9fb",
          100: "#e0f3f7",
          200: "#b3e5ef",
          300: "#80d4e7",
          400: "#4dbfd0",
          500: "#2ba8ba",
          600: "#0891b2",
          700: "#067a8f",
          800: "#055f73",
          900: "#044555",
        },
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",
      },
      borderRadius: {
        xs: "2px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",
        sm: "0 1px 3px rgba(0,0,0,0.1)",
        md: "0 2px 6px rgba(0,0,0,0.08)",
        lg: "0 4px 12px rgba(0,0,0,0.1)",
        xl: "0 8px 20px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
