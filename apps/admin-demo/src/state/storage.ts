/**
 * localStorage that never throws. A private window, blocked site data or a full quota must cost
 * the visitor a remembered preference, never the page.
 */
export function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeKey(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* not remembered, still applied */
  }
}

/** The keys the demo owns, plus the portfolio's theme key it shares (one site, one theme). */
export const KEYS = {
  profile: "sm-admin-profile",
  lang: "sm-admin-lang",
  range: "sm-admin-range",
  theme: "sm-theme",
} as const;
