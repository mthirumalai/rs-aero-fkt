import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Source Sans 3", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Bebas Neue", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#ec008c",           /* exact w3-pink from rsaerosailing.org */
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Status colors for alerts and messages
        status: {
          success: {
            light: "#dcfce7",     // bg-green-50 equivalent
            DEFAULT: "#16a34a",   // bg-green-600 equivalent
            dark: "#15803d",      // text-green-700 equivalent
          },
          error: {
            light: "#fee2e2",     // bg-red-50 equivalent
            DEFAULT: "#dc2626",   // bg-red-600 equivalent
            dark: "#b91c1c",      // text-red-700 equivalent
          },
          warning: {
            light: "#fef3c7",     // bg-yellow-50 equivalent
            DEFAULT: "#d97706",   // bg-yellow-600 equivalent
            dark: "#92400e",      // text-yellow-700 equivalent
          },
          info: {
            light: "#dbeafe",     // bg-blue-50 equivalent
            DEFAULT: "#2563eb",   // bg-blue-600 equivalent
            dark: "#1d4ed8",      // text-blue-700 equivalent
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
