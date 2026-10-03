/**
 * Four key rates on one 0–100 scale (ported from the GozarX panel). The fill is a RADIAL gradient
 * from the centre, so how far an axis reached is legible from the colour alone; the axes keep a
 * fixed order (a chart whose axes change places is unreadable across two visits), each value is
 * printed under its label, and the whole figure mirrors in Persian. Its text alternative is the
 * list of rates beside it.
 */
import { useId } from "react";

import { getLocale, t } from "@/i18n";
import { formatNumber, formatPct } from "@/lib/format";

import { rosePath, rosePoints, spokeAngles } from "./geometry";

export interface RadarAxis {
  label: string;
  value: number | null;
  title: string;
}

const W = 340;
const H = 254;
const CX = W / 2;
const CY = 122;
const R = 92;
const STEPS = [0.25, 0.5, 0.75, 1];
const TICK_ANGLE = (52 * Math.PI) / 180;

export function RadarRates({ axes }: { axes: RadarAxis[] }) {
  const uid = useId().replace(/:/g, "");
  const rtl = getLocale() === "fa";
  if (axes.length < 3) return null;
  // Mirrored in RTL: the second axis sits on the left, as the reading order goes.
  const angles = spokeAngles(axes.length).map((a) => (rtl ? Math.PI - a : a));
  const at = (i: number, k: number) => [CX + Math.cos(angles[i]) * R * k, CY + Math.sin(angles[i]) * R * k] as const;
  const clamp = (v: number | null) => Math.max(0, Math.min(100, v ?? 0));
  const radii = axes.map((a) => (clamp(a.value) / 100) * R);
  const shape = rosePath(CX, CY, rosePoints(spokeAngles(axes.length), radii));
  const tickAngle = rtl ? Math.PI - TICK_ANGLE : TICK_ANGLE;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("chart.ratesAria")} className="mx-auto block h-auto w-full max-w-[340px]">
      <defs>
        <radialGradient id={`${uid}-fill`} gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={R}>
          <stop offset="0%" style={{ stopColor: "rgb(var(--chart-1))" }} stopOpacity=".04" />
          <stop offset="45%" style={{ stopColor: "rgb(var(--chart-1))" }} stopOpacity=".14" />
          <stop offset="80%" style={{ stopColor: "rgb(var(--chart-1))" }} stopOpacity=".3" />
          <stop offset="100%" style={{ stopColor: "rgb(var(--chart-1))" }} stopOpacity=".44" />
        </radialGradient>
      </defs>
      {STEPS.map((k) => (
        <circle key={k} cx={CX} cy={CY} r={R * k} fill="none" className="stroke-line" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = at(i, 1);
        return (
          <g key={i}>
            <line x1={CX} y1={CY} x2={x} y2={y} className="stroke-line" strokeWidth="1" />
            <circle cx={x} cy={y} r="2.6" className="fill-content-muted" opacity=".75" />
          </g>
        );
      })}
      <g transform={rtl ? `translate(${W},0) scale(-1,1)` : undefined}>
        <path d={shape} fill={`url(#${uid}-fill)`} style={{ stroke: "rgb(var(--chart-1))" }} strokeWidth="2" strokeLinejoin="round" />
      </g>
      {STEPS.map((k) => (
        <text
          key={k}
          x={CX + Math.cos(tickAngle) * R * k + (rtl ? -3 : 3)}
          y={CY + Math.sin(tickAngle) * R * k + 3}
          fontSize="8.5"
          textAnchor="start"
          className="fill-content-muted stroke-surface"
          paintOrder="stroke"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          {formatNumber(Math.round(100 * k))}
        </text>
      ))}
      {axes.map((axis, i) => {
        const [px, py] = at(i, clamp(axis.value) / 100);
        return (
          <circle key={i} cx={px} cy={py} r="11" fill="transparent">
            <title>{`${axis.title}: ${axis.value == null ? "—" : formatPct(axis.value)}`}</title>
          </circle>
        );
      })}
      {axes.map((axis, i) => {
        const lx = CX + Math.cos(angles[i]) * (R + 24);
        const ly = CY + Math.sin(angles[i]) * (R + 15);
        // Logical anchors: in RTL "start" pins the RIGHT edge, so "outwards" flips with direction.
        const right = lx > CX;
        const anchor = Math.abs(lx - CX) < 12 ? "middle" : right !== rtl ? "start" : "end";
        return (
          <g key={i}>
            <text x={lx} y={ly - 2} textAnchor={anchor} fontSize="10.5" className="fill-content-muted">
              {axis.label}
            </text>
            <text x={lx} y={ly + 10} textAnchor={anchor} fontSize="10" fontWeight="600" className="fill-content">
              {axis.value == null ? "—" : formatPct(axis.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
