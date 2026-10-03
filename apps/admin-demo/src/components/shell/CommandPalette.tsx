/**
 * Ctrl+K / ⌘K: every destination and every switch in one keyboard-first list: pages, the five
 * businesses, the date ranges, theme, language, the demo's data modes, and the links out.
 *
 * The combobox pattern: focus stays in the input while the arrows move a highlight, which is
 * announced through `aria-activedescendant`. Options are out of the tab order on purpose, so Tab
 * leaves the dialog instead of walking thirty rows.
 */
import { clsx } from "clsx";
import {
  Clock3,
  CornerDownLeft,
  Database,
  ExternalLink,
  HelpCircle,
  Home,
  Info,
  Keyboard,
  Languages,
  Moon,
  RotateCcw,
  Search,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { formatNumber } from "@/lib/format";
import { t, tl } from "@/i18n";
import { BRANDS, PROFILE_IDS, type ProfileId } from "@/profiles";
import { navigate } from "@/router";
import { RANGES, useAppState, type DataMode, type Range } from "@/state/AppState";

import { Dialog } from "../ui/Dialog";
import { BrandMark } from "./BrandMark";
import type { NavItem } from "./nav";

export interface PaletteActions {
  pickBusiness(id: ProfileId): void;
  setMode(mode: DataMode): void;
  openShortcuts(): void;
  openAbout(): void;
  reset(): void;
}

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon | ((p: { className?: string }) => ReactNode);
  keywords: string[];
  current?: boolean;
  run(): void;
}

const MODES: { mode: DataMode; key: "demo.mode.live" | "demo.mode.empty" | "demo.mode.error" | "demo.mode.slow"; words: string[] }[] = [
  { mode: "live", key: "demo.mode.live", words: ["live", "data", "زنده"] },
  { mode: "empty", key: "demo.mode.empty", words: ["empty", "blank", "خالی"] },
  { mode: "error", key: "demo.mode.error", words: ["error", "fail", "خطا"] },
  { mode: "slow", key: "demo.mode.slow", words: ["slow", "network", "loading", "کند"] },
];

function normalise(s: string) {
  return s.toLowerCase().replace(/[‌‏‎]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");
}

export function CommandPalette({ items, actions, onClose, tab }: { items: NavItem[]; actions: PaletteActions; onClose: () => void; tab: string | null }) {
  const app = useAppState();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = t("palette.goto");
    const nav = (it: NavItem): Command => ({
      id: `nav:${it.id}`,
      group: go,
      label: it.label,
      icon: it.icon,
      keywords: it.keywords,
      current: it.active && (it.id !== "dashboard" || tab === "overview"),
      run: () => navigate(it.to),
    });
    const [dash, ...pages] = items;
    // The dashboard's other sections are destinations too, listed right under it.
    const tabs: Command[] = (["growth", "retention", "behaviour"] as const).map((id) => ({
      id: `nav:tab:${id}`,
      group: go,
      label: `${dash.label} › ${t(`dash.tab.${id}` as const)}`,
      icon: dash.icon,
      keywords: [id, t(`dash.tab.${id}` as const), "tab"],
      current: tab === id,
      run: () => navigate(`/${id}`),
    }));
    const out: Command[] = [nav(dash), ...tabs, ...pages.map(nav)];
    for (const id of PROFILE_IDS) {
      const b = BRANDS[id];
      out.push({
        id: `biz:${id}`,
        group: t("palette.business"),
        label: b.name,
        hint: tl(b.kind),
        icon: ({ className }: { className?: string }) => <BrandMark brand={b} className={className} />,
        keywords: [b.kind.en, b.kind.fa, id, "business", "کسب‌وکار"],
        current: id === app.profile.id,
        run: () => actions.pickBusiness(id),
      });
    }
    for (const r of RANGES) {
      out.push({
        id: `range:${r}`,
        group: t("palette.range"),
        label: t("palette.lastDays", { n: formatNumber(r) }),
        icon: Clock3,
        keywords: [`${r}d`, `${r} days`, "range", "بازه", String(r)],
        current: r === app.range,
        run: () => {
          app.setRange(r as Range);
        },
      });
    }
    out.push(
      {
        id: "theme:light",
        group: t("palette.appearance"),
        label: t("palette.themeLight"),
        icon: Sun,
        keywords: ["theme", "light", "تم", "روشن"],
        current: app.theme === "light",
        run: () => app.setTheme("light"),
      },
      {
        id: "theme:dark",
        group: t("palette.appearance"),
        label: t("palette.themeDark"),
        icon: Moon,
        keywords: ["theme", "dark", "تم", "تیره"],
        current: app.theme === "dark",
        run: () => app.setTheme("dark"),
      },
      {
        id: "lang:en",
        group: t("palette.appearance"),
        label: t("palette.english"),
        icon: Languages,
        keywords: ["language", "english", "زبان", "انگلیسی"],
        current: app.locale === "en",
        run: () => app.setLocale("en"),
      },
      {
        id: "lang:fa",
        group: t("palette.appearance"),
        label: t("palette.persian"),
        icon: Languages,
        keywords: ["language", "persian", "farsi", "زبان", "فارسی"],
        current: app.locale === "fa",
        run: () => app.setLocale("fa"),
      },
    );
    for (const m of MODES)
      out.push({
        id: `mode:${m.mode}`,
        group: t("palette.demo"),
        label: t(m.key),
        icon: Database,
        keywords: [...m.words, "demo", "دمو", "state"],
        current: app.mode === m.mode,
        run: () => actions.setMode(m.mode),
      });
    out.push(
      { id: "help:keys", group: t("palette.help"), label: t("demo.shortcuts"), icon: Keyboard, keywords: ["keyboard", "shortcuts", "keys", "?", "میانبر"], run: actions.openShortcuts },
      { id: "help:about", group: t("palette.help"), label: t("demo.about"), icon: Info, keywords: ["about", "demo", "درباره"], run: actions.openAbout },
      { id: "help:reset", group: t("palette.help"), label: t("demo.reset"), icon: RotateCcw, keywords: ["reset", "default", "بازنشانی"], run: actions.reset },
      { id: "link:case", group: t("palette.links"), label: t("demo.caseStudy"), icon: ExternalLink, keywords: ["gozarx", "case study", "project", "کیس"], run: () => location.assign("/projects/gozarx/") },
      { id: "link:home", group: t("palette.links"), label: t("demo.home"), icon: Home, keywords: ["home", "portfolio", "sed.mehdi", "خانه"], run: () => location.assign("/") },
    );
    return out;
  }, [items, app, actions, tab]);

  const visible = useMemo(() => {
    const q = normalise(query.trim());
    if (!q) return commands;
    return commands.filter((c) => [c.label, c.hint ?? "", c.group, ...c.keywords].some((s) => normalise(s).includes(q)));
  }, [commands, query]);

  useEffect(() => setCursor(0), [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const run = (i: number) => {
    const c = visible[i];
    if (!c) return;
    onClose();
    // After the dialog has closed and handed focus back, so the action's own focus moves win.
    requestAnimationFrame(() => c.run());
  };

  let lastGroup = "";
  const optionId = (i: number) => `cmdk-${i}`;

  return (
    <Dialog onClose={onClose} title={t("palette.aria")} hideTitle initialFocus={input} className="max-w-xl self-start sm:mt-[10vh]" bodyClassName="p-0" testId="palette">
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
        <input
          ref={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            const n = Math.max(1, visible.length);
            if (e.key === "ArrowDown") setCursor((c) => (c + 1) % n);
            else if (e.key === "ArrowUp") setCursor((c) => (c - 1 + n) % n);
            else if (e.key === "Home" && e.ctrlKey) setCursor(0);
            else if (e.key === "End" && e.ctrlKey) setCursor(n - 1);
            else if (e.key === "Enter") run(cursor);
            else return;
            e.preventDefault();
          }}
          placeholder={t("palette.placeholder")}
          aria-label={t("palette.aria")}
          role="combobox"
          aria-expanded={visible.length > 0}
          aria-controls="cmdk-list"
          aria-autocomplete="list"
          aria-activedescendant={visible.length ? optionId(cursor) : undefined}
          className="h-14 w-full bg-transparent text-[0.95rem] text-content outline-none placeholder:text-content-muted"
          data-testid="palette-input"
        />
        <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-content-muted sm:block">Esc</kbd>
      </div>
      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-content-muted">{t("palette.empty")}</p>
      ) : (
        <ul ref={list} id="cmdk-list" role="listbox" aria-label={t("palette.aria")} className="scrollbar-thin max-h-[min(26rem,60dvh)] overflow-y-auto p-2">
          {visible.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const active = i === cursor;
            const Icon = c.icon;
            return (
              <li key={c.id} role="presentation">
                {header && (
                  <div role="presentation" className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-content-muted first:pt-1">
                    {header}
                  </div>
                )}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={active}
                  data-active={active}
                  data-command={c.id}
                  onPointerMove={() => setCursor(i)}
                  onClick={() => run(i)}
                  className={clsx(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm",
                    active ? "bg-brand/15 text-brand-700" : "text-content",
                  )}
                >
                  <Icon className={clsx("h-4 w-4 shrink-0", active ? "text-brand-700" : "text-content-muted")} />
                  <span className="min-w-0 flex-1 truncate">
                    <span style={{ unicodeBidi: "isolate" }}>{c.label}</span>
                    {c.hint && <span className={clsx("ms-2 text-xs", active ? "text-brand-700" : "text-content-muted")}>{c.hint}</span>}
                  </span>
                  {c.current && <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold text-content-muted">{t("palette.current")}</span>}
                  {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 rtl:-scale-x-100" aria-hidden />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-[11px] text-content-muted" aria-hidden>
        <HelpCircle className="h-3.5 w-3.5" />
        {t("palette.footer")}
      </div>
    </Dialog>
  );
}
