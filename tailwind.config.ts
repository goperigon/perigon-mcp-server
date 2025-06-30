import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Px Grotesk"', "Roboto", "Inter", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      boxShadow: {
        card: "0px 1px 0px 0px rgba(18, 18, 18, 0.05)",
        "card-dark": "0px 1px 0px 0px #121212",
        enhanced: "0 8px 30px rgba(0, 0, 0, 0.15)",
        "enhanced-dark": "0 8px 30px rgba(0, 0, 0, 0.25)",
        focus:
          "0px 0px 6px -1px rgba(34, 124, 157, 0.15), 0px 0px 12px 2px #F3F9FE",
        "focus-dark":
          "0px 0px 6px -1px rgba(34, 124, 157, 0.20), 0px 0px 12px 2px rgba(44, 139, 174, 0.20)",
      },
      spacing: {
        card: "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
