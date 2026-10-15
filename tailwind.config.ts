import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // États et marqueur de DESIGN.md : toujours avec une icône et un texte, jamais la couleur seule.
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        "action-foreground": "hsl(var(--action-foreground))",
        marker: "hsl(var(--marker))",
        // Titres pixel (texte de grande taille seulement) et accents décoratifs : jamais du texte courant.
        display: "hsl(var(--display))",
        tone: {
          teal: "hsl(var(--tone-teal))",
          violet: "hsl(var(--tone-violet))",
          orange: "hsl(var(--tone-orange))",
          pink: "hsl(var(--tone-pink))",
          yellow: "hsl(var(--tone-yellow))",
        },
        filet: "hsl(var(--filet))",
        // Séries de graphiques : jamais la signature ni un état.
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        pixel: ["var(--font-pixel)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        // Dégradés de DESIGN.md (statiques, jamais animés), clair ou sombre selon le thème.
        "gradient-action": "var(--gradient-action)",
        "gradient-subtle": "var(--gradient-1)",
        "gradient-sunset": "var(--gradient-2)",
      },
      // Traits marine de 2 px en clair, 1 px en sombre (jeton --border-w) ; ombre dure en clair seulement.
      borderWidth: { DEFAULT: "var(--border-w)" },
      boxShadow: { hard: "var(--shadow-hard)" },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
