/**
 * The banner's Demo menu: the data modes that make every state of the panel reachable (live,
 * empty, failing, slow), the About and shortcuts sheets, a reset, and the way back to the
 * portfolio. The button itself is static HTML in index.html, so the banner is right before any
 * script runs; this attaches the menu to it once the app mounts.
 *
 * A real `menu`: arrows move between items, Home and End jump, Enter or Space activates, Esc
 * closes back to the button, and the data modes are `menuitemradio`s that say which one is on.
 */
import { clsx } from "clsx";
import { Check, ExternalLink, Home, Info, Keyboard, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { t } from "@/i18n";
import { useAppState, type DataMode } from "@/state/AppState";

import { Popover } from "../ui/Popover";

const MODES: { mode: DataMode; key: "demo.mode.live" | "demo.mode.empty" | "demo.mode.error" | "demo.mode.slow" }[] = [
  { mode: "live", key: "demo.mode.live" },
  { mode: "empty", key: "demo.mode.empty" },
  { mode: "error", key: "demo.mode.error" },
  { mode: "slow", key: "demo.mode.slow" },
];

export function DemoMenu({
  onMode,
  onAbout,
  onShortcuts,
  onReset,
}: {
  onMode: (m: DataMode) => void;
  onAbout: () => void;
  onShortcuts: () => void;
  onReset: () => void;
}) {
  const { mode } = useAppState();
  const anchor = useRef<HTMLElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const btn = document.getElementById("demo-menu-btn");
    anchor.current = btn;
    if (!btn) return;
    btn.setAttribute("aria-controls", "demo-menu");
    const toggle = () => setOpen((o) => !o);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
    };
    btn.addEventListener("click", toggle);
    btn.addEventListener("keydown", onKey);
    return () => {
      btn.removeEventListener("click", toggle);
      btn.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    anchor.current?.setAttribute("aria-expanded", String(open));
    if (open) requestAnimationFrame(() => items()[0]?.focus());
  }, [open]);

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = items();
    const i = all.indexOf(document.activeElement as HTMLElement);
    const go = (k: number) => all[(k + all.length) % all.length]?.focus();
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(all.length - 1);
    else return;
    e.preventDefault();
  };

  const close = () => {
    setOpen(false);
    anchor.current?.focus();
  };
  const act = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} width={272} id="demo-menu">
      <div ref={menu} role="menu" aria-label={t("demo.menu")} onKeyDown={onKeyDown} data-testid="demo-menu">
        <div role="group" aria-labelledby="demo-menu-data">
          <div id="demo-menu-data" className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-content-muted">
            {t("demo.data")}
          </div>
          {MODES.map((m) => (
            <Item key={m.mode} role="menuitemradio" checked={mode === m.mode} onClick={act(() => onMode(m.mode))} testId={`mode-${m.mode}`}>
              <span className="grid h-4 w-4 shrink-0 place-items-center">{mode === m.mode && <Check className="h-4 w-4 text-brand-700" aria-hidden />}</span>
              {t(m.key)}
            </Item>
          ))}
        </div>
        <Sep />
        <Item onClick={act(onAbout)}>
          <Info className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
          {t("demo.about")}
        </Item>
        <Item onClick={act(onShortcuts)}>
          <Keyboard className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
          {t("demo.shortcuts")}
        </Item>
        <Item onClick={act(onReset)}>
          <RotateCcw className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
          {t("demo.reset")}
        </Item>
        <Sep />
        <Item href="/projects/spindle/">
          <ExternalLink className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
          {t("demo.caseStudy")}
        </Item>
        <Item href="/">
          <Home className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
          {t("demo.home")}
        </Item>
      </div>
    </Popover>
  );
}

function Sep() {
  return <div role="separator" className="mx-2 my-1.5 h-px bg-line" />;
}

function Item({
  children,
  onClick,
  href,
  role = "menuitem",
  checked,
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  role?: "menuitem" | "menuitemradio";
  checked?: boolean;
  testId?: string;
}) {
  const cls = clsx(
    "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-start text-sm text-content outline-none transition hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--ring))] md:min-h-9",
  );
  if (href)
    return (
      <a role={role} href={href} tabIndex={-1} className={cls}>
        {children}
      </a>
    );
  return (
    <button type="button" role={role} aria-checked={role === "menuitemradio" ? checked : undefined} tabIndex={-1} onClick={onClick} className={cls} data-testid={testId}>
      {children}
    </button>
  );
}
