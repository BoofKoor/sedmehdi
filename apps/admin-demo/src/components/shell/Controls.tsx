/**
 * The top bar's small controls: the theme switch, the language switch and the live dot.
 */
import { clsx } from "clsx";
import { Moon, Search, Sun } from "lucide-react";

import { t } from "@/i18n";
import { Link } from "@/router";
import { useAppState } from "@/state/AppState";
import { useLive } from "@/state/Live";

const ICON_BTN =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-content-muted transition hover:bg-surface-hover hover:text-content md:h-9 md:w-9";

export function ThemeButton() {
  const { theme, toggleTheme } = useAppState();
  const dark = theme === "dark";
  return (
    <button type="button" onClick={toggleTheme} aria-label={dark ? t("shell.theme.toLight") : t("shell.theme.toDark")} className={ICON_BTN} data-testid="theme-toggle">
      {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}

/**
 * Both labels are written in their OWN script and never translated: a language switch that renames
 * its options in the language you are trying to leave is unusable to whoever cannot read it.
 */
export function LanguagePill({ className }: { className?: string }) {
  const { locale, setLocale } = useAppState();
  const options = [
    { value: "en" as const, label: "EN" },
    { value: "fa" as const, label: "فا" },
  ];
  return (
    <div role="group" aria-label={t("shell.language")} className={clsx("flex items-center gap-0.5 rounded-full bg-surface-hover p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.value}
          aria-pressed={locale === o.value}
          onClick={() => setLocale(o.value)}
          style={{ unicodeBidi: "isolate" }}
          data-testid={`lang-${o.value}`}
          className={clsx(
            "min-w-9 rounded-full px-2.5 py-1 text-xs font-semibold transition",
            locale === o.value ? "bg-btn text-btn-ink shadow-sm" : "text-content-muted hover:text-content",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The phone's language switch: one 44px button naming the OTHER language in its own script. */
export function LanguageButton() {
  const { locale, setLocale } = useAppState();
  const other = locale === "fa" ? "en" : "fa";
  return (
    <button type="button" onClick={() => setLocale(other)} aria-label={t("shell.switchLang")} lang={other} className={clsx(ICON_BTN, "text-xs font-bold")} data-testid="lang-toggle">
      {other === "fa" ? "فا" : "EN"}
    </button>
  );
}

export function SearchButton({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  if (compact)
    return (
      <button type="button" onClick={onClick} aria-label={t("shell.searchAria")} className={ICON_BTN} data-testid="palette-open">
        <Search className="h-5 w-5" aria-hidden />
      </button>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("shell.searchAria")}
      data-testid="palette-open"
      className="flex h-9 items-center gap-2 rounded-xl border border-line-control px-2.5 text-xs text-content-muted transition hover:bg-surface-hover hover:text-content"
    >
      <Search className="h-4 w-4" aria-hidden />
      <span>{t("shell.search")}</span>
      <kbd dir="ltr" className="rounded border border-line px-1 py-0.5 font-sans text-[10px]" style={{ unicodeBidi: "isolate" }}>
        Ctrl K
      </kbd>
    </button>
  );
}

/** A status light that is also a way to the Health page. Green and pulsing only while it ticks. */
export function LiveDot() {
  const { status } = useLive();
  const running = status === "running";
  const label = running ? t("shell.liveDot") : t("shell.liveDotPaused");
  return (
    <Link to="/health" title={label} aria-label={label} className={ICON_BTN} data-testid="live-dot" data-live-status={status}>
      <span className="relative flex h-2.5 w-2.5">
        {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-60" />}
        <span className={clsx("relative inline-flex h-2.5 w-2.5 rounded-full", running ? "bg-success-500" : "bg-content-subtle")} />
      </span>
    </Link>
  );
}
