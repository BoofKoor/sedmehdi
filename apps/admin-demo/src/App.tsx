/**
 * The console: an icon rail and a content well inside one rounded panel, with the dashboard's live
 * figures in a second panel beside it at desktop widths (the GozarX panel's frame). On a phone the
 * rail becomes a floating bottom bar, the frame goes edge to edge and the page scrolls as a page.
 */
import { clsx } from "clsx";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { brandFavicon } from "@/components/shell/BrandMark";
import { BusinessPicker } from "@/components/shell/BusinessPicker";
import { ChromeProvider, SIDE_STACK, useChrome } from "@/components/shell/chrome";
import { CommandPalette, type PaletteActions } from "@/components/shell/CommandPalette";
import { LanguageButton, LanguagePill, LiveDot, SearchButton, ThemeButton } from "@/components/shell/Controls";
import { DemoMenu } from "@/components/shell/DemoMenu";
import { AboutDialog, ShortcutsDialog } from "@/components/shell/HelpDialogs";
import { navItems } from "@/components/shell/nav";
import { BottomBar, Rail } from "@/components/shell/Nav";
import { useShortcuts } from "@/components/shell/useShortcuts";
import { Skeleton } from "@/components/ui/States";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { t, tl } from "@/i18n";
import { requestTitleFocus } from "@/lib/focusTitle";
import { Dashboard } from "@/pages/Dashboard";
import { PROFILES, type ProfileId } from "@/profiles";
import { currentPath, navigate, parseRoute, pathOf, replacePath, useRoute, type Route } from "@/router";
import { AppStateProvider, RANGES, useAppState, type DataMode } from "@/state/AppState";
import { clearEdits } from "@/state/edits";
import { LiveProvider } from "@/state/Live";

const Records = lazy(() => import("@/pages/Records"));
const Health = lazy(() => import("@/pages/Health"));

function channelsToHex(v: string): string {
  const [r, g, b] = v.trim().split(/\s+/).map(Number);
  return `#${[r, g, b].map((n) => (n || 0).toString(16).padStart(2, "0")).join("")}`;
}

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[52px] w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[139px] rounded-card" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

function Shell() {
  const app = useAppState();
  const { profile, locale, mode } = app;
  const toast = useToast();
  const route = useRoute(profile);
  const items = useMemo(() => navItems(profile, route), [profile, route, locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const chrome = useChrome();
  const main = useRef<HTMLElement>(null);
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [about, setAbout] = useState(false);
  const [picker, setPicker] = useState(false);

  const pickBusiness = useCallback(
    (id: ProfileId) => {
      // A business renames its tables (users → accounts), so the page keeps its place by POSITION.
      const was = parseRoute(currentPath(), profile);
      app.setProfile(id);
      if (was.page === "records") replacePath(pathOf(was, PROFILES[id]));
      const b = PROFILES[id].brand;
      toast(t("biz.switched", { brand: b.name, kind: tl(b.kind) }), "info");
    },
    [app, profile, toast],
  );

  const setMode = useCallback(
    (m: DataMode) => {
      app.setMode(m);
      const key = ({ live: "demo.mode.live", empty: "demo.mode.empty", error: "demo.mode.error", slow: "demo.mode.slow" } as const)[m];
      toast(t("demo.mode.changed", { mode: t(key) }), "info");
    },
    [app, toast],
  );

  const reset = useCallback(() => {
    app.reset();
    clearEdits();
    navigate("/");
    toast(t("demo.resetDone"));
  }, [app, toast]);

  const actions: PaletteActions = useMemo(
    () => ({ pickBusiness, setMode, openShortcuts: () => setShortcuts(true), openAbout: () => setAbout(true), reset }),
    [pickBusiness, setMode, reset],
  );

  useShortcuts({
    palette: () => setPalette(true),
    help: () => setShortcuts(true),
    go: (w) => navigate(w === "d" ? "/" : w === "h" ? "/health" : `/${profile.entities[w === "1" ? 0 : 1].path}`),
    range: (step) => {
      const i = RANGES.indexOf(app.range);
      const next = RANGES[Math.max(0, Math.min(RANGES.length - 1, i + step))];
      if (next !== app.range) app.setRange(next);
    },
    business: () => setPicker(true),
    theme: app.toggleTheme,
    language: () => app.setLocale(locale === "fa" ? "en" : "fa"),
    search: () => dispatchEvent(new CustomEvent("demo:search")),
  });

  // The tab names the page and the business; the tab icon is the business's mark in its colour.
  const pageLabel = items.find((i) => i.active)?.label ?? t("nav.dashboard");
  useEffect(() => {
    document.title = `${pageLabel} · ${t("shell.documentTitle", { brand: profile.brand.name })}`;
  }, [pageLabel, profile, locale]);
  useEffect(() => {
    const color = channelsToHex(getComputedStyle(document.documentElement).getPropertyValue("--hero-a"));
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/svg+xml";
    link.href = brandFavicon(profile.brand, color);
  }, [profile, app.theme]);

  // The skip link is static HTML (first in the page); its target lives here. Handled in script
  // because its `#main` would otherwise be read by the router as an address.
  useEffect(() => {
    const skip = document.getElementById("skip-link");
    const go = (e: Event) => {
      e.preventDefault();
      main.current?.focus();
    };
    skip?.addEventListener("click", go);
    return () => skip?.removeEventListener("click", go);
  }, []);

  // A new page starts at its top, and a keyboard or screen-reader user lands on its heading (the
  // heading takes focus as it mounts, see lib/focusTitle). A dashboard tab is not a new page: the
  // tabs keep focus, so the next tab is one arrow or Tab away.
  const pageKey = route.page === "records" ? `r:${route.index}` : route.page;
  // A LAYOUT effect: it runs before every passive effect of the commit, including the mount effect
  // of the new page's heading, which is what takes the focus.
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.scrollTo?.({ top: 0 });
    window.scrollTo?.({ top: 0 });
    requestTitleFocus();
  }, [pageKey]);

  return (
    <>
      <div className="flex gap-[0.9rem] md:h-[calc(100dvh-var(--banner-h))] md:p-[0.9rem]" data-mode={mode}>
        <div className="flex min-w-0 flex-1 overflow-clip bg-nav md:rounded-[14px] md:shadow-raised">
          <Rail items={items} />
          <div className="flex min-w-0 flex-1 flex-col bg-surface-sunken">
            <header className="sticky top-0 z-30 flex items-center gap-1.5 border-b border-line bg-surface-sunken/90 px-2 py-1.5 backdrop-blur-md md:static md:gap-2 md:border-0 md:bg-surface-sunken md:px-5 md:pb-2 md:pt-3 md:backdrop-blur-none">
              <BusinessPicker open={picker} setOpen={setPicker} onPick={pickBusiness} />
              <span className="flex-1" />
              <div className="hidden items-center gap-2 md:flex">
                <SearchButton onClick={() => setPalette(true)} />
                <LanguagePill />
                <LiveDot />
                <ThemeButton />
              </div>
              <div className="flex items-center md:hidden">
                <SearchButton compact onClick={() => setPalette(true)} />
                <LanguageButton />
                <ThemeButton />
              </div>
            </header>
            <main
              ref={main}
              id="main"
              tabIndex={-1}
              className="scrollbar-thin flex-1 px-3 pb-28 pt-4 outline-none sm:px-4 md:overflow-y-auto md:px-5 md:pb-8 md:pt-3"
            >
              <div className="mx-auto w-full max-w-[1180px]">
                <Suspense fallback={<PageFallback />}>
                  <Page key={pageKey} route={route} />
                </Suspense>
              </div>
            </main>
          </div>
        </div>
        <aside
          ref={chrome?.setSideHost}
          aria-label={t("dash.side.live")}
          className={clsx(
            "scrollbar-thin w-[19.5rem] shrink-0 overflow-y-auto rounded-[14px] bg-surface px-4 pb-5 pt-4 shadow-raised",
            SIDE_STACK,
            route.page === "dashboard" ? "hidden xl:flex" : "hidden",
          )}
        />
      </div>
      <BottomBar items={items} />

      <DemoMenu onMode={setMode} onAbout={() => setAbout(true)} onShortcuts={() => setShortcuts(true)} onReset={reset} />
      {palette && <CommandPalette items={items} actions={actions} tab={route.page === "dashboard" ? route.tab : null} onClose={() => setPalette(false)} />}
      {shortcuts && <ShortcutsDialog onClose={() => setShortcuts(false)} />}
      {about && <AboutDialog onClose={() => setAbout(false)} />}
    </>
  );
}

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case "dashboard":
      return <Dashboard tab={route.tab} />;
    case "records":
      return <Records index={route.index} />;
    case "health":
      return <Health />;
  }
}

export function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <LiveProvider>
          <ChromeProvider>
            <Shell />
          </ChromeProvider>
        </LiveProvider>
      </ToastProvider>
    </AppStateProvider>
  );
}
