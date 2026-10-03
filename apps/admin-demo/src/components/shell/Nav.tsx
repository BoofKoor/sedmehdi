/**
 * Navigation, twice: the icon rail on wider screens and the floating bottom bar on phones.
 *
 * The rail is the GozarX panel's: outlined squares, the current one tinted in the brand colour with
 * a marker flush against the rail's start edge. Its labels appear beside each square on hover AND on
 * keyboard focus, because a `title` tooltip never shows for the keyboard.
 *
 * The bottom bar borrows the portfolio's own phone tab bar (frosted glass, the current tab opening
 * into a capsule with its name), in the business's colours, so a visitor arriving from the site on
 * a phone is already holding a familiar control.
 */
import { clsx } from "clsx";

import { t } from "@/i18n";
import { Link } from "@/router";
import { useAppState } from "@/state/AppState";

import { BrandTile } from "./BrandMark";
import type { NavItem } from "./nav";

export function Rail({ items }: { items: NavItem[] }) {
  const { profile } = useAppState();
  return (
    <nav aria-label={t("shell.nav")} className="hidden w-[68px] shrink-0 flex-col items-center gap-3 bg-nav pb-5 pt-[18px] md:flex">
      <BrandTile brand={profile.brand} className="mb-5 h-9 w-9" />
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          current={item.active}
          aria-label={item.label}
          data-nav={item.id}
          className={clsx(
            "group relative grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border transition",
            item.active ? "border-transparent bg-brand/15 text-brand-700" : "border-line-control text-content-muted hover:border-brand hover:text-brand-700",
          )}
        >
          {item.active && <span aria-hidden className="absolute -start-[14px] top-1/2 h-[26px] w-[3px] -translate-y-1/2 rounded-e-[3px] bg-brand" />}
          <item.icon className="h-[18px] w-[18px]" aria-hidden />
          <span
            aria-hidden
            className="pointer-events-none absolute start-full top-1/2 z-50 ms-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-content px-2 py-1 text-xs font-medium text-surface opacity-0 shadow-raised transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export function BottomBar({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label={t("shell.sections")} className="bottom-bar fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-40 md:hidden">
      <div className="bottom-pill flex h-16 items-center justify-between gap-1 rounded-full p-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            current={item.active}
            aria-label={item.active ? undefined : item.label}
            data-nav={item.id}
            className={clsx(
              "flex h-12 min-w-12 items-center justify-center rounded-full transition-[background-color,padding,color] duration-300",
              item.active ? "bg-surface px-4 text-content shadow-raised" : "px-3 text-content-muted",
            )}
          >
            <item.icon className={clsx("h-[22px] w-[22px] shrink-0", item.active && "text-brand-700")} aria-hidden />
            {item.active && <span className="ms-2 max-w-[6.5rem] truncate text-sm font-semibold">{item.short}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
