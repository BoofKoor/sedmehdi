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

export type ProfileId = "vpn" | "saas" | "ecommerce" | "education" | "print";

/** The order of the Business picker, the command palette and the QA matrix. */
export const PROFILE_IDS: readonly ProfileId[] = ["vpn", "saas", "ecommerce", "education", "print"];

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
  vpn: {
    id: "vpn",
    name: "Passway",
    kind: { en: "VPN service", fa: "سرویس VPN" },
    // A shield with a forward chevron cut out of it.
    mark: "M16 2.5L27.5 6.5V15C27.5 22.2 22.6 27.4 16 29.5C9.4 27.4 4.5 22.2 4.5 15V6.5ZM12.4 10.4L15 8.7L22.1 16L15 23.3L12.4 21.6L17.9 16Z",
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
