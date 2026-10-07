/**
 * A hash router: four kinds of page, addressed as `#/`, `#/growth`, `#/users`, `#/health`.
 *
 * Hash rather than path routing because the demo is a set of static files under /lab/admin/ with
 * no server rewrite behind it: a reload of `/lab/admin/users` would be the portfolio's 404, while
 * `/lab/admin/#/users` is always the same index.html. It also keeps every link relative, so the
 * build works at any base path.
 */
import { clsx } from "clsx";
import { useSyncExternalStore, type AnchorHTMLAttributes, type ReactNode } from "react";

import type { BusinessProfile } from "@/profiles";

export const DASH_TABS = ["overview", "growth", "retention", "behaviour"] as const;
export type DashTab = (typeof DASH_TABS)[number];

export type Route =
  | { page: "dashboard"; tab: DashTab }
  | { page: "records"; index: 0 | 1 }
  | { page: "health" };

const subscribe = (cb: () => void) => {
  addEventListener("hashchange", cb);
  return () => removeEventListener("hashchange", cb);
};

/** The path after `#`, or "/" for anything that is not a route (an empty hash, a stray `#main`). */
export function currentPath(): string {
  const h = location.hash;
  return h.startsWith("#/") ? h.slice(1) : "/";
}

export function useHashPath(): string {
  return useSyncExternalStore(subscribe, currentPath, () => "/");
}

export function parseRoute(path: string, p: BusinessProfile): Route {
  const seg = path.replace(/^\/+|\/+$/g, "");
  if (seg === "" || seg === "overview") return { page: "dashboard", tab: "overview" };
  if ((DASH_TABS as readonly string[]).includes(seg)) return { page: "dashboard", tab: seg as DashTab };
  if (seg === "health") return { page: "health" };
  const i = p.entities.findIndex((e) => e.path === seg);
  if (i === 0 || i === 1) return { page: "records", index: i };
  return { page: "dashboard", tab: "overview" };
}

export function pathOf(route: Route, p: BusinessProfile): string {
  switch (route.page) {
    case "dashboard":
      return route.tab === "overview" ? "/" : `/${route.tab}`;
    case "records":
      return `/${p.entities[route.index].path}`;
    case "health":
      return "/health";
  }
}

export function useRoute(p: BusinessProfile): Route {
  return parseRoute(useHashPath(), p);
}

/** A new history entry, so Back returns to the previous page. */
export function navigate(path: string): void {
  if (currentPath() === path) return;
  location.hash = path;
}

/** The same page under another address (a business switch renames its tables): no history entry. */
export function replacePath(path: string): void {
  if (currentPath() === path) return;
  history.replaceState(history.state, "", `#${path}`);
  dispatchEvent(new HashChangeEvent("hashchange"));
}

export function Link({
  to,
  current,
  className,
  children,
  ...rest
}: { to: string; current?: boolean; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <a href={`#${to}`} aria-current={current ? "page" : undefined} className={clsx(className)} {...rest}>
      {children}
    </a>
  );
}
