// Derives every business's colours from its accent (src/profiles/brands.ts), for both themes.
//
// The anchor is the approved GozarX panel palette, "Nocturne": each surface, ink and line of that
// design was measured in OKLCH (lightness L, chroma C, hue H). Here the same L levels are kept and
// the hue is swapped for the business's own, with the chroma scaled by its `tint`, so all five
// businesses share one depth order and one contrast budget. Values the original shipped below
// WCAG AA (the dark primary button at 3.63:1, the hero tile's label) are moved until they pass;
// src/theme/palette.test.ts measures every pair a component actually draws.
//
// Pure functions: imported by scripts/gen-palettes.mjs (writes src/theme/palettes.css) and by the
// unit test (which also fails when the committed CSS drifts from this file).

import { BRANDS, PROFILE_IDS } from "../src/profiles/brands.ts";

// ---------------------------------------------------------------------------- colour maths
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** OKLCH to hex. Out-of-gamut colours keep their L and H and lose chroma until they fit. */
export function oklch(L, C, H) {
  const at = (c) => oklabToRgb([L, c * Math.cos((H * Math.PI) / 180), c * Math.sin((H * Math.PI) / 180)]);
  let rgb = at(C);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid;
      else hi = mid;
    }
    rgb = at(lo);
  }
  return rgbToHex(rgb);
}

export function luminance(hex) {
  const w = [0.2126, 0.7152, 0.0722];
  return hexToRgb(hex).reduce((s, v, i) => s + lin(v) * w[i], 0);
}

/** WCAG 2 contrast ratio. */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** `fg` at `alpha` over `bg`, the colour a translucent fill actually paints. */
export function over(fg, alpha, bg) {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return rgbToHex(f.map((v, i) => v * alpha + b[i] * (1 - alpha)));
}

// ---------------------------------------------------------------------------- the design
// Nocturne's neutrals, measured (L, C) at its hue 273-277. `c` is scaled by the business's tint.
const NEUTRALS = {
  light: {
    bg: [0.947, 0.014],
    surface: [1, 0],
    "surface-sunken": [0.979, 0.006],
    "surface-hover": [0.962, 0.012],
    "surface-raised": [0.962, 0.012],
    nav: [1, 0],
    line: [0.919, 0.017],
    "line-strong": [0.888, 0.022],
    // Not in Nocturne: control borders (inputs, selects) need 3:1 against what they sit on.
    "line-control": [0.6, 0.03],
    text: [0.227, 0.065],
    "text-muted": [0.43, 0.06],
    "text-subtle": [0.5, 0.058],
  },
  dark: {
    bg: [0.271, 0.072],
    surface: [0.354, 0.091],
    "surface-sunken": [0.314, 0.078],
    "surface-hover": [0.389, 0.102],
    "surface-raised": [0.389, 0.102],
    nav: [0.292, 0.074],
    line: [0.411, 0.104],
    "line-strong": [0.447, 0.119],
    "line-control": [0.64, 0.08],
    text: [0.967, 0.016],
    "text-muted": [0.845, 0.05],
    "text-subtle": [0.78, 0.055],
  },
};

// The brand ramp: lightness per step, and how much of the accent's chroma each step carries.
const RAMP_L = { 50: 0.975, 100: 0.945, 200: 0.885, 300: 0.8, 400: 0.7, 500: 0.537, 600: 0.491, 700: 0.427, 800: 0.37, 900: 0.31, 950: 0.24 };
const RAMP_C = { 50: 0.1, 100: 0.2, 200: 0.38, 300: 0.62, 400: 0.85, 500: 1, 600: 1.02, 700: 0.9, 800: 0.75, 900: 0.6, 950: 0.45 };
// The dark theme lifts the three steps components read as fill, deep fill and ink.
const DARK_STEP = { 500: [0.66, 0.92], 600: [0.6, 1], 700: [0.84, 0.48] };

function brandRamp(accent, mode) {
  const out = {};
  for (const step of Object.keys(RAMP_L)) {
    let L = RAMP_L[step];
    let k = RAMP_C[step];
    if (mode === "dark" && DARK_STEP[step]) [L, k] = DARK_STEP[step];
    out[`brand-${step}`] = oklch(L, accent.chroma * k, accent.hue);
  }
  return out;
}

/**
 * A chart series colour: inside the mode's categorical lightness band, at least 3.2:1 against both
 * surfaces charts sit on (cards and the content well), and as much chroma as the sRGB gamut allows near the preferred lightness. Some hues
 * (teal) cannot reach the 0.10 chroma floor at the darker end of the band, so L is searched.
 */
function seriesColor(hue, chroma, mode, grounds) {
  const [lo, hi, pref] = mode === "light" ? [0.45, 0.68, 0.55] : [0.6, 0.66, 0.655];
  let best = null;
  for (let L = lo; L <= hi + 1e-9; L += 0.005) {
    const hex = oklch(L, chroma, hue);
    if (Math.min(...grounds.map((g) => contrast(hex, g))) < 3.2) continue;
    const c = chromaOf(hex);
    const score = Math.min(c, chroma) * 10 - Math.abs(L - pref);
    if (!best || score > best.score) best = { hex, score };
  }
  return best ? best.hex : oklch(pref, chroma, hue);
}

/** OKLCH chroma of a hex colour (what the gamut clipping left of the asked-for chroma). */
function chromaOf(hex) {
  const [r, g, b] = hexToRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return Math.hypot(a, bb);
}

/** Lowers L until white text clears `need` on the colour (the hero tile is white-on-brand). */
function darkenForWhite(L, C, H, need) {
  let l = L;
  while (contrast("#FFFFFF", oklch(l, C, H)) < need && l > 0.2) l -= 0.005;
  return oklch(l, C, H);
}

export function buildTheme(accent, mode) {
  const { hue, chroma, tint } = accent;
  const t = {};
  for (const [name, [L, c]] of Object.entries(NEUTRALS[mode])) t[name] = oklch(L, c * tint, hue);
  Object.assign(t, brandRamp(accent, mode));
  // The hero tile: a gradient from hero-a to hero-b with white text, the label included (4.5:1).
  t["hero-a"] = darkenForWhite(0.567, chroma * 1.04, hue, 4.6);
  t["hero-b"] = darkenForWhite(0.491, chroma * 1.02, hue, 5.2);
  t["hero-ink"] = oklch(0.3, 0.077 * Math.max(tint, 0.6), hue);
  // The primary button: charcoal on the light console, a light brand fill with dark ink on the dark
  // one (the original's periwinkle with white text measured 3.63:1).
  if (mode === "light") {
    t["btn-primary"] = oklch(0.319, 0.062 * Math.max(tint, 0.5), hue);
    t["btn-primary-ink"] = "#FFFFFF";
  } else {
    t["btn-primary"] = oklch(0.82, chroma * 0.5, hue);
    t["btn-primary-ink"] = oklch(0.2, 0.05, hue);
  }
  // Focus ring: a solid brand line that clears 3:1 against every surface it lands on.
  t.ring = mode === "light" ? oklch(0.48, chroma, hue) : oklch(0.76, chroma * 0.7, hue);
  // Chart series 1 and 2, inside the categorical lightness band (0.43-0.77 light, 0.48-0.67 dark)
  // and 3:1 against the surfaces charts sit on; validated with the dataviz six-checks script too.
  const grounds = [t.surface, t["surface-sunken"]];
  t["chart-1"] = seriesColor(hue, Math.max(chroma, 0.13), mode, grounds);
  t["chart-2"] = seriesColor(accent.series2Hue, 0.15, mode, grounds);
  return t;
}

// Shared across businesses: status colours never follow the brand.
export const SHARED = {
  light: {
    "success-500": "#1A9A5E",
    "success-700": "#0F7347",
    "warning-500": "#B9781C",
    "warning-700": "#7F4E12",
    "danger-500": "#E04848",
    "danger-700": "#AE2E2E",
    "info-500": "#2A8FB0",
    "info-700": "#1C5E76",
  },
  dark: {
    "success-500": "#2EC07A",
    "success-700": "#5BE3A2",
    "warning-500": "#E39A3B",
    "warning-700": "#F2BE6E",
    "danger-500": "#F06262",
    "danger-700": "#FFA3A3",
    "info-500": "#45B4D8",
    "info-700": "#8AD3EB",
  },
};

export function buildAll() {
  const all = {};
  for (const id of PROFILE_IDS) {
    const accent = BRANDS[id].accent;
    all[id] = { light: buildTheme(accent, "light"), dark: buildTheme(accent, "dark") };
  }
  return all;
}

const channels = (hex) => hexToRgb(hex).map((v) => Math.round(v * 255)).join(" ");

/** The stylesheet: shared status colours, then one light and one dark block per business. */
export function toCss(all = buildAll()) {
  const block = (sel, vars) =>
    `${sel} {\n${Object.entries(vars)
      .map(([k, v]) => `  --${k}: ${channels(v)}; /* ${v} */`)
      .join("\n")}\n}\n`;
  let css =
    "/* GENERATED by scripts/gen-palettes.mjs from src/profiles/brands.ts. Do not edit by hand:\n" +
    "   change an accent there and run `npm run palettes -w admin-demo`. Values are R G B channels,\n" +
    "   so Tailwind's opacity modifiers keep working (rgb(var(--x) / <alpha-value>)). */\n\n";
  css += block(":root", SHARED.light);
  css += block(':root[data-theme="dark"]', SHARED.dark);
  for (const id of PROFILE_IDS) {
    css += `\n/* ${BRANDS[id].name} (${id}) */\n`;
    // `data-profile-scope` re-scopes a subtree to another business: the Business picker previews
    // each option in that business's own colours.
    css += block(`:root[data-profile="${id}"],\n[data-profile-scope="${id}"]`, all[id].light);
    css += block(`:root[data-profile="${id}"][data-theme="dark"],\n:root[data-theme="dark"] [data-profile-scope="${id}"]`, all[id].dark);
  }
  return css;
}
