/**
 * The demo's global state: which business, which language, which theme, which date range, and
 * which data mode (live, empty, error, slow). One provider, so the shell, the pages and the command
 * palette can never disagree about any of them.
 *
 * Precedence on load is the pre-paint script's (index.html): the URL, then the saved choice, then
 * the default. React starts from what that script already put on <html>, so the first render
 * matches the first paint. Afterwards every change is applied to <html> FIRST (palette, direction,
 * theme) and to React state second, and the module-level locale is set before the re-render, so a
 * formatter called during that render already speaks the new language.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { dirFor, setCurrentLocale, type Locale } from "@/i18n";
import { PROFILES, resolveProfileId, type BusinessProfile, type ProfileId } from "@/profiles";

import { KEYS, readKey, writeKey } from "./storage";

export type Theme = "light" | "dark";
export type DataMode = "live" | "empty" | "error" | "slow";
export const RANGES = [7, 14, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const DEFAULTS = { profile: "hosting" as ProfileId, locale: "en" as Locale, range: 14 as Range };

export const isRange = (n: unknown): n is Range => (RANGES as readonly unknown[]).includes(n);

interface AppState {
  profile: BusinessProfile;
  locale: Locale;
  theme: Theme;
  range: Range;
  mode: DataMode;
  /** Bumped by "Reset the demo": everything keyed on it starts over. */
  epoch: number;
  setProfile(id: ProfileId): void;
  setLocale(locale: Locale): void;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
  setRange(range: Range): void;
  setMode(mode: DataMode): void;
  reset(): void;
}

const Ctx = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAppState outside AppStateProvider");
  return s;
}

const root = () => document.documentElement;
const systemDark = () => typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;

/** Keeps the address bar reproducing the view: `?profile=` and `?lang=` always, `?theme=` never
 *  once the visitor has chosen one themselves (a stale `?theme=dark` would fight their choice). */
function syncUrl(profile: ProfileId, locale: Locale, dropTheme = false) {
  try {
    const url = new URL(location.href);
    url.searchParams.set("profile", profile);
    url.searchParams.set("lang", locale);
    if (dropTheme) url.searchParams.delete("theme");
    if (url.href !== location.href) history.replaceState(history.state, "", url);
  } catch {
    /* an opaque origin (file://) cannot rewrite its URL; the state still applies */
  }
}

function applyLocale(locale: Locale) {
  setCurrentLocale(locale);
  root().lang = locale;
  root().dir = dirFor(locale);
}

function readInitial() {
  const r = root();
  const q = new URLSearchParams(location.search);
  const profile: ProfileId = resolveProfileId(r.dataset.profile) ?? DEFAULTS.profile;
  const locale: Locale = r.lang === "fa" ? "fa" : "en";
  const theme: Theme = r.dataset.theme === "dark" ? "dark" : "light";
  const savedRange = Number(readKey(KEYS.range));
  const range: Range = isRange(savedRange) ? savedRange : DEFAULTS.range;
  const urlTheme = q.get("theme") === "light" || q.get("theme") === "dark";
  // Who decided the theme: an explicit choice is kept, the system's is followed as it changes.
  const themeFrom: "url" | "saved" | "system" = urlTheme ? "url" : readKey(KEYS.theme) ? "saved" : "system";
  return { profile, locale, theme, range, themeFrom };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const init = useRef(readInitial()).current;
  const [profileId, setProfileId] = useState<ProfileId>(init.profile);
  const [locale, setLocaleState] = useState<Locale>(init.locale);
  const [theme, setThemeState] = useState<Theme>(init.theme);
  const [range, setRangeState] = useState<Range>(init.range);
  const [mode, setModeState] = useState<DataMode>("live");
  const [epoch, setEpoch] = useState(0);
  const themeFrom = useRef(init.themeFrom);

  // Arriving with ?profile= or ?lang= is a choice too: remember it, and normalise the URL.
  useEffect(() => {
    writeKey(KEYS.profile, init.profile);
    writeKey(KEYS.lang, init.locale);
    applyLocale(init.locale);
    syncUrl(init.profile, init.locale);
  }, [init]);

  const setProfile = useCallback(
    (id: ProfileId) => {
      root().dataset.profile = id;
      writeKey(KEYS.profile, id);
      syncUrl(id, locale);
      setProfileId(id);
    },
    [locale],
  );

  const setLocale = useCallback(
    (next: Locale) => {
      applyLocale(next);
      writeKey(KEYS.lang, next);
      syncUrl(profileId, next);
      setLocaleState(next);
    },
    [profileId],
  );

  const setTheme = useCallback(
    (next: Theme) => {
      root().dataset.theme = next;
      writeKey(KEYS.theme, next);
      themeFrom.current = "saved";
      syncUrl(profileId, locale, true);
      setThemeState(next);
    },
    [profileId, locale],
  );

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  const setRange = useCallback((next: Range) => {
    writeKey(KEYS.range, String(next));
    setRangeState(next);
  }, []);

  const setMode = useCallback((next: DataMode) => setModeState(next), []);

  const reset = useCallback(() => {
    root().dataset.profile = DEFAULTS.profile;
    applyLocale(DEFAULTS.locale);
    writeKey(KEYS.profile, DEFAULTS.profile);
    writeKey(KEYS.lang, DEFAULTS.locale);
    writeKey(KEYS.range, null);
    syncUrl(DEFAULTS.profile, DEFAULTS.locale);
    setProfileId(DEFAULTS.profile);
    setLocaleState(DEFAULTS.locale);
    setRangeState(DEFAULTS.range);
    setModeState("live");
    setEpoch((e) => e + 1);
  }, []);

  // The system theme, followed only while nobody has chosen one; and the portfolio's own switch in
  // another tab (the same `sm-theme` key), applied here as it happens.
  useEffect(() => {
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
    const onSystem = () => {
      if (themeFrom.current !== "system") return;
      const next: Theme = systemDark() ? "dark" : "light";
      root().dataset.theme = next;
      setThemeState(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEYS.theme) return;
      const next: Theme = e.newValue === "dark" ? "dark" : e.newValue === "light" ? "light" : systemDark() ? "dark" : "light";
      themeFrom.current = e.newValue ? "saved" : "system";
      root().dataset.theme = next;
      setThemeState(next);
    };
    mq?.addEventListener("change", onSystem);
    addEventListener("storage", onStorage);
    return () => {
      mq?.removeEventListener("change", onSystem);
      removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<AppState>(
    () => ({
      profile: PROFILES[profileId],
      locale,
      theme,
      range,
      mode,
      epoch,
      setProfile,
      setLocale,
      setTheme,
      toggleTheme,
      setRange,
      setMode,
      reset,
    }),
    [profileId, locale, theme, range, mode, epoch, setProfile, setLocale, setTheme, toggleTheme, setRange, setMode, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
