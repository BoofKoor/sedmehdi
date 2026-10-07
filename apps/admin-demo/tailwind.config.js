/** @type {import('tailwindcss').Config} */

// Every colour resolves to a CSS custom property: the shared roles live in src/theme/base.css and
// the per-business ramps in src/theme/palettes.css (generated, see scripts/gen-palettes.mjs).
// Wrapping them as `rgb(var(--x) / <alpha-value>)` keeps Tailwind's opacity modifiers working
// (`bg-brand/15`). Opacity modifiers are multiples of 5: `/12` compiles to nothing.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const ramp = (prefix, stops) => Object.fromEntries(stops.map((s) => [s, token(`${prefix}-${s}`)]));

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // The theme is always an explicit attribute: the pre-paint script resolves the saved choice or
  // the system setting before the first frame, so components never need a media query of their own.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    // `md` starts right after the portfolio's phone breakpoint (720px), so "phone" means the same
    // width on both sides of the link.
    screens: { sm: "480px", md: "721px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "Vazirmatn", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "Arial", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: token("brand-500"),
          ...ramp("brand", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        },
        hero: { a: token("hero-a"), b: token("hero-b"), ink: token("hero-ink") },
        btn: { DEFAULT: token("btn-primary"), ink: token("btn-primary-ink") },
        success: { DEFAULT: token("success-500"), ...ramp("success", [500, 700]) },
        warning: { DEFAULT: token("warning-500"), ...ramp("warning", [500, 700]) },
        danger: { DEFAULT: token("danger-500"), ...ramp("danger", [500, 700]) },
        info: { DEFAULT: token("info-500"), ...ramp("info", [500, 700]) },
        chart: { 1: token("chart-1"), 2: token("chart-2") },
        canvas: token("bg"),
        surface: {
          DEFAULT: token("surface"),
          sunken: token("surface-sunken"),
          hover: token("surface-hover"),
          raised: token("surface-raised"),
        },
        nav: token("nav"),
        line: { DEFAULT: token("line"), strong: token("line-strong"), control: token("line-control") },
        content: { DEFAULT: token("text"), muted: token("text-muted"), subtle: token("text-subtle") },
      },
      borderColor: { DEFAULT: token("line") },
      ringColor: { DEFAULT: token("ring") },
      backgroundImage: {
        hero: "linear-gradient(157deg, rgb(var(--hero-a)), rgb(var(--hero-b)))",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)",
        hero: "var(--shadow-hero)",
      },
      spacing: { card: "18px" },
      borderRadius: { card: "14px", xl: "0.75rem", "2xl": "1rem", "3xl": "1.5rem" },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "none" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.97)" }, "100%": { opacity: "1", transform: "none" } },
        shimmer: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "scale-in": "scale-in 0.15s ease-out both",
        shimmer: "shimmer 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
