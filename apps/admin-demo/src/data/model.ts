/**
 * The generator's core: what a business produced on a given day, and the window statistics every
 * KPI is computed from.
 *
 * A day's value is a pure function of (business, stream, day number):
 *
 *   base · growth(day) · launch ramp · weekday rhythm · smooth wobble · campaign bumps
 *
 * so the 7-day window is literally the tail of the 14-day one, and yesterday's figure is the same
 * tomorrow. Today is the full day's value scaled by how much of the business's day has passed (its
 * hourly curve), which is the dashed, still-filling last point of every chart.
 */
import type { BusinessProfile, StreamDef, WindowStats } from "@/profiles/types";

import { dayFraction, dayNumber, dayNumberOf, weekdayOf } from "./calendar";
import { hash32, unit, valueNoise } from "./prng";

export type Stream = string;

const isSeries = (s: Stream): s is "primary" | "secondary" => s === "primary" || s === "secondary";

const cache = new Map<string, number>();

function seedOf(p: BusinessProfile, name: string): number {
  return (p.seed ^ hash32(name)) >>> 0;
}

/** Campaign days: rare uplifts shared by every stream of a business, decaying over three days. */
function bump(p: BusinessProfile, day: number): number {
  const s = seedOf(p, "campaign");
  let b = 1;
  for (let k = 0; k < 4; k++) {
    const d = day - k;
    if (unit(s, d) < 0.022) b += (0.3 + unit(s + 1, d) * 0.45) * Math.pow(0.42, k);
  }
  return b;
}

/** A series' full-day value (not rounded). */
function seriesDay(p: BusinessProfile, which: "primary" | "secondary", day: number): number {
  const def = p.series[which];
  const launch = dayNumberOf(p.launched);
  if (day < launch) return 0;
  const years = (day - dayNumberOf(p.reference)) / 365;
  const trend = Math.exp(Math.log(1 + def.growth) * years);
  const age = day - launch;
  const ramp = 1 / (1 + Math.exp(-(age - 40) / 11));
  const s = seedOf(p, which);
  const wobble =
    1 +
    def.noise *
      (0.65 * valueNoise(s, day, 9) + 0.35 * valueNoise(s + 7, day, 3) + 0.3 * (unit(s + 13, day) * 2 - 1));
  return Math.max(0, def.base * trend * ramp * p.week[weekdayOf(day)] * wobble * bump(p, day));
}

function streamDay(p: BusinessProfile, name: string, def: StreamDef, day: number): number {
  const s = seedOf(p, `stream:${name}`);
  const wobble = 1 + def.noise * (0.7 * valueNoise(s, day, 7) + 0.3 * (unit(s + 3, day) * 2 - 1));
  if (def.kind === "level") return Math.max(0, def.ratio * wobble);
  return Math.max(0, seriesDay(p, def.from, day) * def.ratio * wobble);
}

/** The full-day value of any stream, rounded for counts and money (levels keep one decimal). */
export function fullDay(p: BusinessProfile, stream: Stream, day: number): number {
  const key = `${p.id}|${stream}|${day}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let v: number;
  if (isSeries(stream)) v = Math.round(seriesDay(p, stream, day));
  else {
    const def = p.streams[stream];
    if (!def) throw new Error(`unknown stream ${stream} for ${p.id}`);
    const raw = streamDay(p, stream, def, day);
    v = def.kind === "level" ? Math.round(raw * 10) / 10 : Math.round(raw);
  }
  if (cache.size > 60_000) cache.clear();
  cache.set(key, v);
  return v;
}

/** How much of the business's own day has passed at `now`: its hourly curve, integrated. */
export function businessDayFraction(p: BusinessProfile, now: Date): number {
  const f = dayFraction(now) * 24;
  const h = Math.floor(f);
  const total = p.hours.reduce((a, b) => a + b, 0);
  let done = 0;
  for (let i = 0; i < h; i++) done += p.hours[i];
  done += p.hours[h] * (f - h);
  return Math.min(1, done / total);
}

/** A day's value with today scaled to the part already lived (levels are never partial). */
export function dayValue(p: BusinessProfile, stream: Stream, day: number, today: number, fraction: number): number {
  const full = fullDay(p, stream, day);
  if (day !== today) return full;
  const def = isSeries(stream) ? null : p.streams[stream];
  if (def?.kind === "level") return full;
  return Math.round(full * fraction);
}

export interface DayRow {
  day: number;
  partial: boolean;
  primary: number;
  secondary: number;
}

/** The window's days, oldest first, ending today (partial). */
export function windowDays(p: BusinessProfile, range: number, now: Date): DayRow[] {
  const today = dayNumber(now);
  const fr = businessDayFraction(p, now);
  const out: DayRow[] = [];
  for (let d = today - range + 1; d <= today; d++) {
    out.push({
      day: d,
      partial: d === today,
      primary: dayValue(p, "primary", d, today, fr),
      secondary: dayValue(p, "secondary", d, today, fr),
    });
  }
  return out;
}

/**
 * Sum (or mean, for a level stream) of a stream over `range` days ending on `endDay`, where the last
 * day only counts the fraction `fr` of itself. The previous window is the current one shifted back
 * by `range` days, so its last day is cut at the same hour: both windows are the same length, and a
 * comparison at 00:30 is not a comparison against a whole extra day.
 */
export function windowSum(p: BusinessProfile, stream: Stream, endDay: number, range: number, fr: number): number {
  const def = isSeries(stream) ? null : p.streams[stream];
  let s = 0;
  for (let d = endDay - range + 1; d <= endDay; d++) {
    const v = fullDay(p, stream, d);
    s += def?.kind === "level" ? v : d === endDay ? Math.round(v * fr) : v;
  }
  return def?.kind === "level" ? Math.round((s / range) * 10) / 10 : s;
}

/** Units an active person produces over `days`, interpolated in log-days between 7 and 90. */
export function perActive(p: BusinessProfile, days: number): number {
  const { d7, d90 } = p.perActive;
  const t = (Math.log(days) - Math.log(7)) / (Math.log(90) - Math.log(7));
  return d7 * Math.pow(d90 / d7, t);
}

/** Everything a business has produced of a stream from its launch up to `now` (today partial). */
export function lifetime(p: BusinessProfile, stream: Stream, now: Date): number {
  const today = dayNumber(now);
  const fr = businessDayFraction(p, now);
  let s = 0;
  for (let d = dayNumberOf(p.launched); d <= today; d++) s += dayValue(p, stream, d, today, fr);
  return s;
}

export function windowStats(p: BusinessProfile, range: number, now: Date): WindowStats {
  const today = dayNumber(now);
  const fr = businessDayFraction(p, now);
  const cur = (stream: string) => windowSum(p, stream, today, range, fr);
  const prev = (stream: string) => windowSum(p, stream, today - range, range, fr);
  // How much each active person did drifts from window to window (people used the product a bit
  // more or less), so a "per active user" figure moves instead of echoing the model's constant.
  const s = (p.seed ^ hash32("perActive")) >>> 0;
  const k = (end: number) => perActive(p, range) * (1 + 0.06 * valueNoise(s, end, 17) + 0.02 * valueNoise(s + 1, end, 5));
  // Lifetimes up to now, and up to the end of each earlier window: the window sums peeled off the
  // running total, so a level read from them agrees with the windowed figures to the unit.
  const lives = new Map<string, number>();
  const life = (stream: string, back = 0) => {
    let v = lives.get(stream);
    if (v === undefined) lives.set(stream, (v = lifetime(p, stream, now)));
    for (let k = 0; k < back; k++) v -= windowSum(p, stream, today - k * range, range, fr);
    return v;
  };
  return {
    days: range,
    cur,
    prev,
    active: Math.round(cur("primary") / k(today)),
    prevActive: Math.round(prev("primary") / k(today - range)),
    total: life("secondary"),
    life,
  };
}
