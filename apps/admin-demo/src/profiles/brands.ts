/**
 * Every business brand in the demo, in ONE file: name, kind, logo mark and accent.
 *
 * The names are fictional. Each was checked against real brands in the same industry before it was
 * used, and three first choices were replaced because a real product already held the name
 * (docs/admin-demo/REPORT.md lists the searches). Rename a business here and nowhere else.
 *
 * This file is plain data with erasable types only, because scripts/gen-palettes.mjs imports it
 * straight from Node to derive each business's colours from `accent`.
 */

export type ProfileId = "hosting" | "saas" | "ecommerce" | "education" | "print";

/** The order of the Business picker, the command palette and the QA matrix. */
export const PROFILE_IDS: readonly ProfileId[] = ["hosting", "saas", "ecommerce", "education", "print"];

export interface BrandAccent {
  /** OKLCH hue of the brand colour, in degrees. */
  hue: number;
  /** OKLCH chroma of the brand fill. The palette generator clips it to the sRGB gamut. */
  chroma: number;
  /** How much of the brand hue the neutral surfaces carry: 1 is the original panel's indigo tint. */
  tint: number;
  /** OKLCH hue of the second chart series, picked to sit apart from the brand hue. */
  series2Hue: number;
}

export interface Brand {
  id: ProfileId;
  /** A proper noun, Latin in both languages. */
  name: string;
  kind: { en: string; fa: string };
  /** SVG path data in a 0 0 32 32 box, filled with `fill-rule: evenodd`. */
  mark: string;
  accent: BrandAccent;
}

export const BRANDS: Record<ProfileId, Brand> = {
  hosting: {
    id: "hosting",
    name: "Nodemill",
    kind: { en: "Cloud & VPS hosting", fa: "سرور مجازی و ابری" },
    // Three server slabs, each with its light and a drive slot cut out.
    mark: "M6.2 4.5H25.8A2.2 2.2 0 0 1 28 6.7V8.8A2.2 2.2 0 0 1 25.8 11H6.2A2.2 2.2 0 0 1 4 8.8V6.7A2.2 2.2 0 0 1 6.2 4.5ZM8.75 6.3A1.45 1.45 0 1 0 8.75 9.2A1.45 1.45 0 1 0 8.75 6.3ZM14 7H23A0.75 0.75 0 0 1 23.75 7.75V7.75A0.75 0.75 0 0 1 23 8.5H14A0.75 0.75 0 0 1 13.25 7.75V7.75A0.75 0.75 0 0 1 14 7ZM6.2 12.75H25.8A2.2 2.2 0 0 1 28 14.95V17.05A2.2 2.2 0 0 1 25.8 19.25H6.2A2.2 2.2 0 0 1 4 17.05V14.95A2.2 2.2 0 0 1 6.2 12.75ZM8.75 14.55A1.45 1.45 0 1 0 8.75 17.45A1.45 1.45 0 1 0 8.75 14.55ZM14 15.25H23A0.75 0.75 0 0 1 23.75 16V16A0.75 0.75 0 0 1 23 16.75H14A0.75 0.75 0 0 1 13.25 16V16A0.75 0.75 0 0 1 14 15.25ZM6.2 21H25.8A2.2 2.2 0 0 1 28 23.2V25.3A2.2 2.2 0 0 1 25.8 27.5H6.2A2.2 2.2 0 0 1 4 25.3V23.2A2.2 2.2 0 0 1 6.2 21ZM8.75 22.8A1.45 1.45 0 1 0 8.75 25.7A1.45 1.45 0 1 0 8.75 22.8ZM14 23.5H23A0.75 0.75 0 0 1 23.75 24.25V24.25A0.75 0.75 0 0 1 23 25H14A0.75 0.75 0 0 1 13.25 24.25V24.25A0.75 0.75 0 0 1 14 23.5Z",
    // The original panel's indigo: the demo opens on this business, so it opens in the panel's own colours.
    accent: { hue: 273, chroma: 0.2, tint: 1, series2Hue: 65 },
  },
  saas: {
    id: "saas",
    name: "Loopdesk",
    kind: { en: "Team workspace (SaaS)", fa: "فضای کار تیمی (SaaS)" },
    // A ring with a satellite dot.
    mark: "M14 7A10 10 0 1 1 14 27A10 10 0 1 1 14 7ZM14 12A5 5 0 1 0 14 22A5 5 0 1 0 14 12ZM25 3.5A3.5 3.5 0 1 1 25 10.5A3.5 3.5 0 1 1 25 3.5Z",
    accent: { hue: 205, chroma: 0.14, tint: 0.36, series2Hue: 32 },
  },
  ecommerce: {
    id: "ecommerce",
    name: "Fernloft",
    kind: { en: "Online home store", fa: "فروشگاه آنلاین لوازم خانه" },
    // A leaf with its midrib cut out.
    mark: "M16 2.5C24.5 7 27.5 15.5 22.3 24.3C19.3 29 12.7 29 9.7 24.3C4.5 15.5 7.5 7 16 2.5ZM15.2 9.5V27H16.8V9.5Z",
    accent: { hue: 150, chroma: 0.15, tint: 0.32, series2Hue: 300 },
  },
  education: {
    id: "education",
    name: "Quillstone",
    kind: { en: "Online academy", fa: "آکادمی آنلاین" },
    // An open book.
    mark: "M3.5 7.2C8 5.4 12 5.6 15.1 7.6V26.3C12 24.4 8 24.3 3.5 25.8ZM28.5 7.2C24 5.4 20 5.6 16.9 7.6V26.3C20 24.4 24 24.3 28.5 25.8Z",
    accent: { hue: 300, chroma: 0.19, tint: 0.6, series2Hue: 75 },
  },
  print: {
    id: "print",
    name: "Proofpost",
    kind: { en: "Print & post shop", fa: "چاپ و ارسال پستی" },
    // An envelope with its flap cut out.
    mark: "M7 5.5H25A3 3 0 0 1 28 8.5V23.5A3 3 0 0 1 25 26.5H7A3 3 0 0 1 4 23.5V8.5A3 3 0 0 1 7 5.5ZM6.6 9.4V11.7L16 18.7L25.4 11.7V9.4L16 16.4Z",
    accent: { hue: 45, chroma: 0.17, tint: 0.28, series2Hue: 245 },
  },
};

/** `?profile=` and the stored choice are only honoured when they name a real business. */
export function isProfileId(v: unknown): v is ProfileId {
  return typeof v === "string" && (PROFILE_IDS as readonly string[]).includes(v);
}

/**
 * Business ids the demo no longer has, and the one that took each one's place. Links and browsers
 * from before still carry them: the first default business was replaced by the hosting one, so its id
 * opens hosting instead of falling back to whatever the default is. index.html's pre-paint script
 * keeps the same map (a unit test holds the two together).
 */
export const LEGACY_PROFILES: Readonly<Record<string, ProfileId>> = { vpn: "hosting" };

/** A requested business id, with an old id mapped to its replacement; null when it names none. */
export function resolveProfileId(v: unknown): ProfileId | null {
  if (isProfileId(v)) return v;
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(LEGACY_PROFILES, v) ? LEGACY_PROFILES[v] : null;
}
