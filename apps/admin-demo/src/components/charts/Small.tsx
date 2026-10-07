/**
 * The smaller charts: a record's thumbnail trend, a probe's latency trace, and ranked bars. All draw in the business's chart colours through CSS variables, so a
 * theme or business switch repaints them without a render.
 */
import { clsx } from "clsx";
import { useId } from "react";

import { getLocale } from "@/i18n";
import { formatPct } from "@/lib/format";

import { smoothPath, type Point } from "./geometry";

/**
 * A thumbnail series (the record dialog, a health probe). `preserveAspectRatio="none"` is safe only
 * because there is no text and no round marker inside to distort, only a stroke (GozarX's rule).
 */
export function MiniTrend({ values, ariaLabel, className, color = 1 }: { values: number[]; ariaLabel?: string; className?: string; color?: 1 | 2 }) {
  const uid = useId().replace(/:/g, "");
  const rtl = getLocale() === "fa";
  if (values.length < 2) return null;
  const W = 260;
  const H = 54;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const x = (i: number) => {
    const l = (i / (values.length - 1)) * W;
    return rtl ? W - l : l;
  };
  const y = (v: number) => 3 + (1 - (v - min) / (max - min || 1)) * (H - 8);
  const pts: Point[] = values.map((v, i) => [x(i), y(v)]);
  const line = smoothPath(pts);
  const c = `rgb(var(--chart-${color}))`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role={ariaLabel ? "img" : undefined} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : true} className={clsx("block w-full", className ?? "h-[54px]")}>
      <defs>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: c }} stopOpacity=".3" />
          <stop offset="100%" style={{ stopColor: c }} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${x(values.length - 1)},${H}L${x(0)},${H}Z`} fill={`url(#${uid}-f)`} />
      <path d={line} fill="none" style={{ stroke: c }} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Ranked horizontal bars: label, bar and value on one line. The bar grows from the reading start,
 * ends in a 4px rounded cap, and carries its value as text beside it, so the length is never the
 * only way to read the figure.
 */
export function BarList({
  items,
  format,
  share,
  color = 1,
  testId,
}: {
  items: { label: string; value: number; note?: string }[];
  format: (n: number) => string;
  /** Show each item's share of the total after its value. */
  share?: boolean;
  color?: 1 | 2;
  testId?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((a, b) => a + b.value, 0);
  return (
    <ul className="space-y-3" data-testid={testId} data-barlist>
      {items.map((it) => (
        <li key={it.label}>
          {/* The name is the row's subject: it wraps, and when the figure and its note do not fit beside
              it they drop to a line of their own (at 320px a funnel step read "Started a …"). */}
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
            <span className="min-w-0 text-content [overflow-wrap:anywhere]">{it.label}</span>
            {/* Separate flex items, not one inline run: two numbers side by side are one run to the bidi
                algorithm, so in Persian «۹۸۱» and «۸۷٫۳٪ …» were reordered into one figure, «۹۸۱۸۷٫۳٪», with
                the gap outside them. A <bdi> does not settle it: holding only digits it resolves LTR, and its
                margin lands on the wrong side. */}
            <span className="ms-auto flex shrink-0 items-baseline gap-1.5 tabular-nums text-content" data-barlist-value>
              <b className="font-semibold">{format(it.value)}</b>
              {share && total > 0 && <span className="text-xs text-content-muted">{formatPct((it.value / total) * 100)}</span>}
              {it.note && <span className="text-xs text-content-muted">{it.note}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="bar-grow h-full rounded-e-[4px]"
              style={{ width: `${(it.value / max) * 100}%`, background: `rgb(var(--chart-${color}))` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
