/**
 * The trend inside the hero tile, white on the brand gradient. Ported from the GozarX panel, with
 * its two rules: the LINE fades at both ends (seven days are a slice of a longer series), and the
 * BAND under the marked day does not fade (a marker is not a measurement), clipped to the region
 * under the curve so the curve is its top edge. Mirrored in Persian, like every time axis here.
 */
import { useId } from "react";

import { getLocale } from "@/i18n";

import { smoothPath, underCurve, type Point } from "./geometry";

const W = 268;
const H = 138;
const TOP = 30;
const PLOT_H = 66;
const PAD_X = 18;

export function HeroSparkline({
  values,
  labels,
  highlight,
  delta,
  ariaLabel,
}: {
  values: number[];
  labels: string[];
  highlight: number;
  delta?: string;
  ariaLabel: string;
}) {
  const uid = useId().replace(/:/g, "");
  const rtl = getLocale() === "fa";
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const x = (i: number) => {
    const ltr = PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    return rtl ? W - ltr : ltr;
  };
  const y = (v: number) => TOP + (1 - (v - min) / (max - min || 1)) * PLOT_H;
  const pts: Point[] = values.map((v, i) => [x(i), y(v)]);
  const ordered = rtl ? [...pts].reverse() : pts;
  const line = smoothPath(pts);
  const under = underCurve(smoothPath(ordered), ordered, W, H);
  const hi = Math.max(0, Math.min(values.length - 1, highlight));
  const hx = x(hi);
  const hy = y(values[hi]);
  const pillW = delta ? Math.max(44, delta.length * 7.6 + 14) : 0;
  const pillX = Math.min(Math.max(hx - pillW / 2, 3), W - pillW - 3);
  const pillY = Math.max(hy - 31, 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
      <defs>
        <linearGradient id={`${uid}-ends`} gradientUnits="userSpaceOnUse" x1={PAD_X} y1="0" x2={W - PAD_X} y2="0">
          <stop offset="0%" stopColor="#000" />
          <stop offset="22%" stopColor="#fff" />
          <stop offset="78%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </linearGradient>
        <mask id={`${uid}-mask`}>
          <rect width={W} height={H} fill={`url(#${uid}-ends)`} />
        </mask>
        <clipPath id={`${uid}-under`}>
          <path d={under} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-under)`}>
        <rect x={hx - 13} y="0" width="26" height={H} rx="13" fill="#fff" opacity=".26" />
      </g>
      <path d={line} fill="none" stroke="#fff" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" mask={`url(#${uid}-mask)`} />
      <circle cx={hx} cy={hy} r="4.5" className="fill-hero-a" stroke="#fff" strokeWidth="2.25" />
      {delta && (
        <g>
          <rect x={pillX} y={pillY} width={pillW} height="21" rx="7" fill="#fff" />
          {/* A signed figure keeps its sign in front in both languages. */}
          <text x={pillX + pillW / 2} y={pillY + 14.5} textAnchor="middle" fontSize="11.5" fontWeight="700" style={{ direction: "ltr", unicodeBidi: "isolate" }} className="fill-hero-ink">
            {delta}
          </text>
        </g>
      )}
      {labels.map((label, i) => (
        <text key={i} x={x(i).toFixed(1)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#fff" fontWeight={i === hi ? 700 : 400}>
          {label}
        </text>
      ))}
    </svg>
  );
}
