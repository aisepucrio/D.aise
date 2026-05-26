import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#22c55e",
          emerald: "#10b981",
        },
        /** App canvas: near-black, máximo contraste com cards */
        "background-app": "#050505",
        /** Cards, painéis, dropdowns — um passo acima do fundo */
        "surface-card": "#121214",
        /** Inputs: ligeiramente mais fechado que o card */
        "surface-input": "rgb(0 0 0 / 0.55)",
        foreground: "#f4f4f5",
        muted: "#a1a1aa",
        /** Bordas padrão — mais sutis que zinc-800 */
        stroke: "#1f1f22",
        "stroke-subtle": "rgb(255 255 255 / 0.05)",
      },
      borderRadius: {
        card: "0.75rem",
        panel: "1rem",
        button: "0.5rem",
        input: "0.375rem",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        "glow-brand":
          "0 0 24px -4px rgb(34 197 94 / 0.35), 0 0 8px -2px rgb(34 197 94 / 0.2)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
