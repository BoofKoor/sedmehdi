/**
 * The browser's own signals, as hooks: a media query, Reduce Motion, and whether the tab is visible.
 * Each is an external store, so every subscriber agrees within the same render.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

function mediaStore(query: string) {
  return {
    subscribe(cb: () => void) {
      if (typeof matchMedia !== "function") return () => {};
      const mq = matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    get: () => typeof matchMedia === "function" && matchMedia(query).matches,
  };
}

const stores = new Map<string, ReturnType<typeof mediaStore>>();

export function useMediaQuery(query: string): boolean {
  let s = stores.get(query);
  if (!s) stores.set(query, (s = mediaStore(query)));
  return useSyncExternalStore(s.subscribe, s.get, () => false);
}

/**
 * Reduce Motion. CSS honours it in index.css; this is for the motion JavaScript drives (count-ups,
 * chart tweens, the live ticker), which no stylesheet can reach.
 */
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** Phones: the same breakpoint as the portfolio's own (720px), where the rail becomes a bottom bar. */
export const usePhone = () => useMediaQuery("(max-width: 720px)");

/** Wide enough for the live panel to sit beside the console instead of under the page. */
export const useWide = () => useMediaQuery("(min-width: 1280px)");

const visibility = {
  subscribe(cb: () => void) {
    document.addEventListener("visibilitychange", cb);
    return () => document.removeEventListener("visibilitychange", cb);
  },
  get: () => !document.hidden,
};

export function useDocumentVisible(): boolean {
  return useSyncExternalStore(visibility.subscribe, visibility.get, () => true);
}

/** `value`, once it has stopped changing for `delay` ms (a search box, not a request per key). */
export function useDebouncedValue<T>(value: T, delay = 220): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return settled;
}
