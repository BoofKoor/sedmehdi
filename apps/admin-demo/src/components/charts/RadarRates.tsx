/**
 * Four key rates on one 0–100 scale (ported from the GozarX panel). The fill is a RADIAL gradient
 * from the centre, so how far an axis reached is legible from the colour alone; the axes keep a
 * fixed order (a chart whose axes change places is unreadable across two visits), each value is
 * printed under its label, and the whole figure mirrors in Persian. Its text alternative is the
 * list of rates beside it.
 *
 * The axis labels are HTML laid over the drawing, not SVG text. A business names its own rates,
 * and SVG text neither wraps nor knows the room it has: "Proofs within 24h" or «حضور در کلاس زنده»
 * beside a spoke ran past the edge of the frame and was cut off. As HTML a label wraps inside the
 * room between its spoke and the frame, and keeps an 11px size however narrow the panel draws the
 * figure (scaled with the SVG it was 8.6px in the side panel).
 */
import type { CSSProperties } from "react";
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
const H = 260;
const CX = W / 2;
const CY = 128;
const R = 84;
/** Between a spoke's end and its label, in drawing units. */
const GAP = 8;
const STEPS = [0.25, 0.5, 0.75, 1];
const TICK_ANGLE = (52 * Math.PI) / 180;

/** The figure's aspect, for a placeholder that must take the same room. */
export const RADAR_ASPECT = `${W} / ${H}`;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * Where an axis label goes: anchored at GAP beyond the spoke's end, growing AWAY from the figure
 * (leftwards from a left spoke, upwards from a top one), and no wider than the room between the
 * anchor and the frame. Physical left/top on purpose: the geometry is already mirrored for RTL.
 */
function labelStyle(angle: number): CSSProperties {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = CX + cos * (R + GAP);
  const y = CY + sin * (R + GAP);
  const side = cos > 0.3 ? "right" : cos < -0.3 ? "left" : "middle";
  const tx = side === "right" ? "0" : side === "left" ? "-100%" : "-50%";
  const ty = sin < -0.3 ? "-100%" : sin > 0.3 ? "0" : "-50%";
  const room = side === "right" ? W - x - 2 : side === "left" ? x - 2 : 2 * Math.min(x, W - x) - 4;
  return {
    left: pct(x, W),
    top: pct(y, H),
    transform: `translate(${tx}, ${ty})`,
    width: "max-content",
    maxWidth: pct(room, W),
    textAlign: side === "right" ? "left" : side === "left" ? "right" : "center",
  };
}

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
    <div className="relative mx-auto w-full max-w-[340px]" data-chart="radar">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("chart.ratesAria")} className="block h-auto w-full">
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
      </svg>
      {/* Hidden from screen readers: the list of rates beside the figure says the same, in full. */}
      <div aria-hidden="true">
        {axes.map((axis, i) => (
          <div key={i} className="pointer-events-none absolute text-[11px] leading-[1.25] [overflow-wrap:anywhere]" style={labelStyle(angles[i])} data-radar-label>
            <div className="text-content-muted">{axis.label}</div>
            <div className="font-semibold text-content">{axis.value == null ? "—" : formatPct(axis.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
