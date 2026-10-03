/**
 * English and Persian, with one rule for every string in the demo: it is an `{ en, fa }` pair, so a
 * missing translation is a type error, not a blank on screen. The fixed UI lives in `ui.ts`; each
 * business's own vocabulary lives in its profile.
 *
 * The active locale is also a module-level value, so plain functions (number and date formatting,
 * chart label factories) follow the language without being hooks. The app state writes it before
 * React re-renders, so the two never disagree for a frame.
 */
import { UI, type UiKey } from "./ui";

export type Locale = "en" | "fa";
export type L = { en: string; fa: string };
export type Tokens = Record<string, string | number>;

const TAGS: Record<Locale, string> = { en: "en-US", fa: "fa-IR" };

let current: Locale = typeof document !== "undefined" && document.documentElement.lang === "fa" ? "fa" : "en";

export function getLocale(): Locale {
  return current;
}

export function setCurrentLocale(locale: Locale): void {
  current = locale;
}

/** The BCP-47 tag Intl formats with: fa-IR brings Persian digits and the Persian calendar. */
export function localeTag(locale: Locale = current): string {
  return TAGS[locale];
}

export function dirFor(locale: Locale = current): "ltr" | "rtl" {
  return locale === "fa" ? "rtl" : "ltr";
}

/** Substitutes `{token}` placeholders, and only the ones actually supplied. */
export function fill(template: string, tokens?: Tokens): string {
  if (!tokens) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in tokens ? String(tokens[key]) : whole));
}

/** A string pair in the active language. */
export function tl(pair: L, tokens?: Tokens, locale: Locale = current): string {
  return fill(pair[locale], tokens);
}

/** A fixed UI string in the active language. */
export function t(key: UiKey, tokens?: Tokens, locale: Locale = current): string {
  return fill(UI[key][locale], tokens);
}

export type { UiKey };
