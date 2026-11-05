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
        photo: "hsl(var(--photo))",
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
      // Échelle du nombre d'or (φ = 1,618) : tailles de texte φ^(n/2) × la taille du corps, interligne 1 + φ⁻¹ / taille (voir `.folio` dans `app/globals.css`), espacements φ^n rem.
      fontSize: {
        "phi-n1": ["var(--phi-n1)", { lineHeight: "var(--lh-n1)" }],
        "phi-0": ["var(--phi-0)", { lineHeight: "var(--lh-0)" }],
        "phi-1": ["var(--phi-1)", { lineHeight: "var(--lh-1)" }],
        "phi-2": ["var(--phi-2)", { lineHeight: "var(--lh-2)" }],
        "phi-3": ["var(--phi-3)", { lineHeight: "var(--lh-3)" }],
        "phi-4": ["var(--phi-4)", { lineHeight: "var(--lh-4)" }],
        "phi-5": ["var(--phi-5)", { lineHeight: "var(--lh-5)" }],
        "phi-6": ["var(--phi-6)", { lineHeight: "var(--lh-6)" }],
        "phi-7": ["var(--phi-7)", { lineHeight: "var(--lh-7)" }],
        "phi-8": ["var(--phi-8)", { lineHeight: "var(--lh-8)" }],
      },
      spacing: {
        "phi-0": "1rem",
        "phi-1": "1.618rem",
        "phi-2": "2.618rem",
        "phi-3": "4.236rem",
        "phi-4": "6.854rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
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
