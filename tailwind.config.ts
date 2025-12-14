import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      sm: {
        min: "300px",
        max: "768px",
      },
      md: {
        min: "768px",
        max: "1150px",
      },
      lg: {
        min: "1150px",
        max: "4440px",
      },
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        title: "var(--title)",
        body: "var(--body)",
        button: "var(--button-text)",
        deepblue: "#0055FF",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        border: "var(--border)",
        input: "var(--input)",
      },
    },
  },
  safelist: [
    "math",
    "math-inline",
    "math-display",
    "katex",
    "katex-display",
    "katex-html",
    "katex-mathml",
    "dark",
    "light",
  ],
  plugins: [typography],
} satisfies Config;
