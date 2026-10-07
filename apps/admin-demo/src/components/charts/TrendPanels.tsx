/**
 * The demo's time-series chart: one panel per measure, stacked on a shared time axis, with ONE
 * crosshair through all of them and ONE readout listing every value for the day under it.
 *
 * Two panels rather than the GozarX chart's two y-axes. New signups run at a few percent of the
 * main count, so on a shared scale they were a flat line along the floor; GozarX answered with a
 * second axis, and a dual-axis chart invites reading the crossing of two lines on unrelated scales.
 * Aligned panels keep each measure readable on its own scale and keep the day-by-day comparison.
 *
 * A panel draws an AREA (the GozarX trend: the fill exists over the recent tail only and each line
 * fades in at the axis, because the window is a slice of a longer series), a LINE (which may frame
 * its own range, e.g. a running total, where an area must stand on zero), or COLUMNS. Today is still
 * filling, so its segment is dashed and its column is an outline.
 *
 * Geometry is in real pixels, measured from the container, so 11px labels are 11px whether the chart
 * spans the page or half of it. The height is fixed from the first render, so measuring the width
 * moves nothing on the page.
 *
 * Time reads in the reading direction: oldest at the start, so Persian mirrors the axis along with
 * the layout. Keyboard: the plot is one tab stop; the arrows step day by day in the visual
 * direction, Home and End jump, and each step is announced.
 */
import { clsx } from "clsx";
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

import { dateOf } from "@/data/calendar";
import { getLocale, t } from "@/i18n";
import { formatDate, formatDayNum, formatWeekday, formatWeekdayNarrow } from "@/lib/format";

import { areaFrom, niceRange, niceTicks, smoothPath, visibleLabels, type Point } from "./geometry";

export interface TrendPanel {
  id: string;
  label: string;
  values: number[];
  format: (n: number) => string;
  /** 1 is the business's own colour, 2 its contrasting partner. */
  color: 1 | 2;
  mark?: "area" | "line" | "column";
}

const AXIS = 56;
const END = 12;
const GAP = 34;
const XLAB = 36;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** The chart's fixed height for a set of panel heights: what a skeleton reserves. */
export function trendHeight(heights: number[], labelled: boolean): number {
  const top = labelled ? 24 : 10;
  return top + heights.reduce((a, b) => a + b, 0) + GAP * (heights.length - 1) + XLAB;
}

export const DEFAULT_HEIGHTS = { single: [220], double: [150, 104] };

export function TrendPanels({
  panels,
  days,
  partialLast,
  ariaLabel,
  heights,
}: {
  panels: TrendPanel[];
  days: number[];
  partialLast: boolean;
  ariaLabel: string;
  heights?: number[];
}) {
  const uid = useId().replace(/:/g, "");
  const [frame, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const rtl = getLocale() === "fa";
  const count = days.length;
  const labelled = panels.length > 1;
  const hs = heights ?? (panels.length === 1 ? DEFAULT_HEIGHTS.single : DEFAULT_HEIGHTS.double);
  const H = trendHeight(hs, labelled);

  const TOP = labelled ? 24 : 10;
  const tops: number[] = [];
  let y = TOP;
  for (const h of hs) {
    tops.push(y);
    y += h + GAP;
  }
  const plotBottom = y - GAP;
  const columns = panels.some((p) => p.mark === "column");
  const plotW = Math.max(1, W - AXIS - END);
  // Columns sit in slots, points on slot edges: either way day i maps to one x.
  const slot = plotW / Math.max(1, columns ? count : count - 1);
  const px = (i: number) => {
    const ltr = AXIS + (columns ? slot * (i + 0.5) : i * slot);
    return rtl ? W - ltr : ltr;
  };
  const showLabel = visibleLabels(count, plotW, 30);
  const splitAt = partialLast && count > 1 ? (px(count - 2) + px(count - 1)) / 2 : null;

  const shaped = panels.map((p, k) => {
    const mark = p.mark ?? "area";
    const min = Math.min(...p.values);
    const max = Math.max(...p.values, 0);
    const all = mark === "line" ? niceRange(min, max) : niceTicks(max);
    const lo = all[0];
    const hi = all[all.length - 1];
    const ticks = mark === "line" ? all : [all[0], all[2], all[4]];
    const h = hs[k];
    const yOf = (v: number) => tops[k] + (1 - (v - lo) / (hi - lo || 1)) * h;
    const pts: Point[] = p.values.map((v, i) => [px(i), yOf(v)]);
    return { ...p, mark, ticks, yOf, pts, line: smoothPath(pts), base: tops[k] + h, top: tops[k], h };
  });

  const describe = (i: number) =>
    [formatDate(dateOf(days[i])), partialLast && i === count - 1 ? t("chart.partial") : null, ...panels.map((p) => `${p.label}: ${p.format(p.values[i])}`)].filter(Boolean).join(", ");

  function track(clientX: number) {
    const box = frame.current?.getBoundingClientRect();
    if (!box || box.width === 0 || count === 0) return;
    const x = clientX - box.left;
    const ltr = rtl ? W - x : x;
    const raw = columns ? (ltr - AXIS) / slot - 0.5 : (ltr - AXIS) / slot;
    setHover(Math.max(0, Math.min(count - 1, Math.round(raw))));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const at = hover ?? count - 1;
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (e.key === forward) next = Math.min(count - 1, at + 1);
    else if (e.key === back) next = Math.max(0, at - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else if (e.key === "Escape") {
      setHover(null);
      return;
    }
    if (next == null) return;
    e.preventDefault();
    setHover(next);
    setAnnounce(describe(next));
  }

  const g = (k: number) => `rgb(var(--chart-${k}))`;
  const startEdge = rtl ? W - AXIS : AXIS;
  const endEdge = rtl ? END : W - END;
  const gridFrom = rtl ? END : AXIS;
  const gridTo = rtl ? W - AXIS : W - END;
  const colW = Math.max(2, Math.min(18, slot * 0.62));

  /** A column with a rounded cap at its data end, flat on the baseline. */
  const column = (x: number, top: number, base: number) => {
    const w = colW;
    const r = Math.min(4, w / 2, Math.max(0, base - top));
    const l = x - w / 2;
    return `M${l},${base}V${top + r}Q${l},${top} ${l + r},${top}H${l + w - r}Q${l + w},${top} ${l + w},${top + r}V${base}Z`;
  };

  return (
    <div className="relative">
      <div
        ref={frame}
        tabIndex={0}
        role="group"
        aria-label={`${ariaLabel}. ${t("chart.keys")}`}
        onKeyDown={onKey}
        onFocus={() => {
          if (hover == null && count) {
            setHover(count - 1);
            setAnnounce(describe(count - 1));
          }
        }}
        onBlur={() => setHover(null)}
        onPointerMove={(e) => track(e.clientX)}
        onPointerDown={(e) => track(e.clientX)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        style={{ height: H }}
        className="relative touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        data-chart="trend"
      >
        {W > 0 && count > 1 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block select-none" aria-hidden>
            <defs>
              {shaped.map((s, k) => (
                <linearGradient key={k} id={`${uid}-fill-${k}`} gradientUnits="userSpaceOnUse" x1="0" y1={s.top} x2="0" y2={s.base}>
                  <stop offset="0%" style={{ stopColor: g(s.color) }} stopOpacity={0.28} />
                  <stop offset="100%" style={{ stopColor: g(s.color) }} stopOpacity={0} />
                </linearGradient>
              ))}
              <linearGradient id={`${uid}-tail`} gradientUnits="userSpaceOnUse" x1={startEdge} y1="0" x2={endEdge} y2="0">
                <stop offset="0%" stopColor="#000" />
                <stop offset="45%" stopColor="#000" />
                <stop offset="100%" stopColor="#fff" />
              </linearGradient>
              <mask id={`${uid}-tailMask`}>
                <rect width={W} height={H} fill={`url(#${uid}-tail)`} />
              </mask>
              <linearGradient id={`${uid}-head`} gradientUnits="userSpaceOnUse" x1={startEdge} y1="0" x2={rtl ? startEdge - 80 : startEdge + 80} y2="0">
                <stop offset="0%" stopColor="#000" />
                <stop offset="100%" stopColor="#fff" />
              </linearGradient>
              <mask id={`${uid}-headMask`}>
                <rect width={W} height={H} fill={`url(#${uid}-head)`} />
              </mask>
              {splitAt != null && (
                <>
                  <mask id={`${uid}-done`}>
                    <rect x={rtl ? splitAt : 0} width={rtl ? W - splitAt : splitAt} height={H} fill="#fff" />
                  </mask>
                  <mask id={`${uid}-part`}>
                    <rect x={rtl ? 0 : splitAt} width={rtl ? splitAt : W - splitAt} height={H} fill="#fff" />
                  </mask>
                </>
              )}
              <clipPath id={`${uid}-wipe`}>
                <rect className="chart-wipe" style={{ transformOrigin: rtl ? `${W}px 0` : "0 0" }} width={W} height={H} />
              </clipPath>
            </defs>

            {shaped.map((s) => (
              <g key={s.id}>
                {labelled && (
                  <>
                    <circle cx={rtl ? W - AXIS - 4 : AXIS + 4} cy={s.top - 14} r="4" style={{ fill: g(s.color) }} />
                    {/* `text-anchor` is logical: "start" runs inward from the axis in both directions. */}
                    <text x={rtl ? W - AXIS - 14 : AXIS + 14} y={s.top - 10} textAnchor="start" fontSize="12" fontWeight="600" className="fill-content-muted">
                      {s.label}
                    </text>
                  </>
                )}
                {s.ticks.map((tv) => (
                  <g key={tv}>
                    <line x1={gridFrom} x2={gridTo} y1={s.yOf(tv)} y2={s.yOf(tv)} className="stroke-line" strokeWidth="1" />
                    <text x={rtl ? W - AXIS + 8 : AXIS - 8} y={s.yOf(tv) + 4} textAnchor="end" fontSize="11" className="fill-content-muted">
                      {s.format(tv)}
                    </text>
                  </g>
                ))}
              </g>
            ))}

            <g clipPath={`url(#${uid}-wipe)`}>
              <g mask={`url(#${uid}-tailMask)`}>
                {shaped.map((s, k) => (s.mark === "area" ? <path key={k} d={areaFrom(s.line, s.pts, s.base)} fill={`url(#${uid}-fill-${k})`} /> : null))}
              </g>
              <g mask={`url(#${uid}-headMask)`}>
                <g mask={splitAt != null ? `url(#${uid}-done)` : undefined}>
                  {shaped.map((s) => (s.mark !== "column" ? <path key={s.id} d={s.line} fill="none" style={{ stroke: g(s.color) }} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" /> : null))}
                </g>
                {splitAt != null && (
                  <g mask={`url(#${uid}-part)`}>
                    {shaped.map((s) => (s.mark !== "column" ? <path key={s.id} d={s.line} fill="none" style={{ stroke: g(s.color) }} strokeWidth={2.25} strokeDasharray="4 5" strokeLinecap="round" /> : null))}
                  </g>
                )}
              </g>
              {shaped.map((s) =>
                s.mark === "column"
                  ? s.pts.map(([x, yy], i) => {
                      const partial = partialLast && i === count - 1;
                      const dim = hover != null && hover !== i;
                      return (
                        <path
                          key={`${s.id}-${i}`}
                          d={column(x, yy, s.base)}
                          style={partial ? { fill: "none", stroke: g(s.color) } : { fill: g(s.color) }}
                          strokeWidth={partial ? 1.5 : 0}
                          strokeDasharray={partial ? "3 2" : undefined}
                          opacity={dim ? 0.5 : 1}
                        />
                      );
                    })
                  : (() => {
                      const end = s.pts[s.pts.length - 1];
                      return <circle key={s.id} cx={end[0]} cy={end[1]} r="3.5" style={{ fill: g(s.color) }} className="stroke-surface" strokeWidth="2" />;
                    })(),
              )}
            </g>

            {hover != null && (
              <g>
                {!columns && <line x1={px(hover)} x2={px(hover)} y1={TOP - 6} y2={plotBottom} className="stroke-content-muted" strokeWidth="1" />}
                {shaped.map((s) => (s.mark !== "column" ? <circle key={s.id} cx={s.pts[hover][0]} cy={s.pts[hover][1]} r="4.5" style={{ fill: g(s.color) }} className="stroke-surface" strokeWidth="2" /> : null))}
              </g>
            )}

            {days.map((d, i) =>
              !showLabel[i] ? null : (
                <g key={d}>
                  <text x={px(i)} y={H - 19} textAnchor="middle" fontSize="11" className="fill-content-muted">
                    {formatDayNum(dateOf(d))}
                  </text>
                  <text x={px(i)} y={H - 5} textAnchor="middle" fontSize="10" className="fill-content-muted">
                    {formatWeekdayNarrow(dateOf(d))}
                  </text>
                </g>
              ),
            )}
          </svg>
        )}

        {hover != null && W > 0 && (
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: px(hover),
              top: Math.max(0, Math.min(...shaped.map((s) => s.pts[hover][1])) - 12),
              transform: `translate(${px(hover) / W > 0.66 ? "calc(-100% - 10px)" : px(hover) / W < 0.34 ? "10px" : "-50%"}, -100%)`,
            }}
            data-testid="chart-tooltip"
          >
            <div className="min-w-[9.5rem] rounded-xl bg-surface px-3 py-2 text-xs shadow-overlay ring-1 ring-line">
              <div className="flex items-baseline gap-1.5 whitespace-nowrap font-semibold text-content">
                <span>{formatDate(dateOf(days[hover]))}</span>
                <span className="font-normal text-content-muted">{formatWeekday(dateOf(days[hover]))}</span>
              </div>
              {partialLast && hover === count - 1 && <div className="text-[11px] text-content-muted">{t("chart.partial")}</div>}
              {shaped.map((s) => (
                <div key={s.id} className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-content-muted">
                  <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: g(s.color) }} aria-hidden />
                  <span className={clsx("font-semibold text-content")}>{s.format(s.values[hover])}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
