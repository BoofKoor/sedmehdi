/**
 * Everything the dashboard draws for one business, one range and one moment, from the generator.
 * Every windowed figure is computed from the same days the charts plot, so the KPI tiles, the chart,
 * its table view and the CSV can never disagree.
 */
import type { L } from "@/i18n";
import type { BusinessProfile, HealthDef, KpiDef, MetricFormat, TopDef } from "@/profiles/types";

import { dayNumber, weekdayOf } from "./calendar";
import { businessDayFraction, dayValue, fullDay, lifetime, windowDays, windowStats, windowSum, type DayRow } from "./model";
import { hash32, unit, valueNoise } from "./prng";

export interface KpiOut {
  id: string;
  label: L;
  format: MetricFormat;
  upIsGood: boolean;
  value: number;
  previous: number | null;
  /** null when there is no baseline to compare with. */
  deltaPct: number | null;
}

export interface RateOut {
  label: L;
  full: L;
  value: number | null;
  previous: number | null;
}

export interface TopOut {
  label: L;
  unit: L;
  scope: "range" | "allTime";
  /** null: nothing to lead with yet (an empty workspace). */
  headline: L | null;
  value: number;
  mono?: boolean;
}

export interface HealthOut {
  def: HealthDef;
  /** latency ms · nodes online · queue depth · percent */
  value: number;
}

export interface DashboardData {
  range: number;
  today: number;
  empty: boolean;
  days: DayRow[];
  hero: { kpi: KpiOut; spark: { values: number[]; days: number[]; peak: number; deltaPct: number | null } };
  kpis: KpiOut[];
  rates: RateOut[];
  tops: TopOut[];
  peakHour: { hour: number; value: number } | null;
  live: { online: number; onlineOf: number; today: number; todayOf: number; lifetime: number; lifetimeFormat: MetricFormat };
  health: HealthOut[];
  growth: {
    cumulative: { day: number; total: number }[];
    split: { day: number; fresh: number; returning: number; partial: boolean }[];
    funnel: number[];
  };
  retention: {
    cohorts: { week: number; size: number; retention: number[] }[];
    distribution: number[];
  };
  behaviour: {
    /** [weekday 0 = Sunday][hour] */
    heat: number[][];
    segments: { name: L; value: number; share: number }[];
    list: { name: L; value: number }[];
  };
}

const pct = (cur: number, prev: number | null) =>
  prev == null || prev === 0 || !Number.isFinite(prev) ? null : ((cur - prev) / prev) * 100;

function kpiOut(def: KpiDef, value: number, previous: number | null): KpiOut {
  return { id: def.id, label: def.label, format: def.format, upIsGood: def.upIsGood, value, previous, deltaPct: pct(value, previous) };
}

/** Weights that drift a little from window to window (deterministic for a given date and range). */
function drift<T extends { weight: number }>(p: BusinessProfile, salt: string, items: T[], today: number, range: number) {
  const s = (p.seed ^ hash32(salt)) >>> 0;
  return items.map((it, i) => ({ ...it, w: it.weight * (1 + 0.16 * valueNoise(s + i * 31, today - range / 2, 11)) }));
}

function leaderOf(p: BusinessProfile, top: TopDef, today: number, range: number) {
  const items = drift(p, `top:${top.label.en}`, top.items, today, range);
  const sum = items.reduce((a, b) => a + b.w, 0);
  const best = items.reduce((a, b) => (b.w > a.w ? b : a));
  return { name: best.name, share: best.w / sum };
}

/** The weekday × hour grid of the window's complete days. */
function heatGrid(p: BusinessProfile, today: number, range: number): number[][] {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const total = p.hours.reduce((a, b) => a + b, 0);
  const s = (p.seed ^ hash32("heat")) >>> 0;
  for (let d = today - range; d < today; d++) {
    const v = fullDay(p, "primary", d);
    const wd = weekdayOf(d);
    for (let h = 0; h < 24; h++) grid[wd][h] += (v * p.hours[h]) / total * (1 + 0.14 * (unit(s, d * 24 + h) * 2 - 1));
  }
  return grid.map((row) => row.map((v) => Math.round(v)));
}

function mondayOf(day: number): number {
  return day - ((weekdayOf(day) + 6) % 7);
}

function initialHealth(p: BusinessProfile, def: HealthDef, today: number): number {
  const s = (p.seed ^ hash32(`health:${def.id}`)) >>> 0;
  switch (def.kind) {
    case "latency":
      return Math.round(def.base * (1 + 0.12 * valueNoise(s, today, 3)));
    case "nodes":
      return unit(s, today) < 0.3 ? def.base - 1 : def.base;
    case "queue":
      return Math.max(0, Math.round(def.base * (0.6 + unit(s + 1, today) * 0.8)));
    case "percent":
      return Math.round((def.base + 0.4 * valueNoise(s + 2, today, 5)) * 10) / 10;
  }
}

export function buildDashboard(p: BusinessProfile, range: number, now: Date, empty = false): DashboardData {
  const today = dayNumber(now);
  const fr = businessDayFraction(p, now);
  const days = windowDays(p, range, now).map((d) => (empty ? { ...d, primary: 0, secondary: 0 } : d));
  const stats = windowStats(p, range, now);

  // KPI tiles: the hero (an all-time figure with its sparkline) and three windowed ones.
  const [heroDef, ...rest] = p.kpis;
  const heroValue = empty ? 0 : heroDef.value(stats).value;
  const sparkDays = Array.from({ length: 7 }, (_, i) => today - 7 + i);
  const sparkValues = sparkDays.map((d) => (empty ? 0 : fullDay(p, "secondary", d)));
  const prevSpark = Array.from({ length: 7 }, (_, i) => (empty ? 0 : fullDay(p, "secondary", today - 14 + i)));
  const peak = sparkValues.reduce((best, v, i) => (v > sparkValues[best] ? i : best), 0);
  const sparkSum = sparkValues.reduce((a, b) => a + b, 0);
  const prevSum = prevSpark.reduce((a, b) => a + b, 0);
  const kpis = rest.map((def) => {
    if (empty) return kpiOut(def, 0, null);
    const v = def.value(stats);
    return kpiOut(def, v.value, v.previous);
  });

  // Key rates: each drifts around its typical value, a little less over longer windows.
  const rates: RateOut[] = p.radar.map((def, i) => {
    if (empty) return { label: def.label, full: def.full, value: null, previous: null };
    const s = (p.seed ^ hash32(`rate:${i}`)) >>> 0;
    const at = (end: number) => {
      const wob = 0.7 * valueNoise(s, end, 13) + 0.3 * valueNoise(s + 5, end, 4);
      const v = def.base + def.spread * wob * Math.sqrt(14 / range);
      return Math.round(Math.min(99, Math.max(1, v)) * 10) / 10;
    };
    return { label: def.label, full: def.full, value: at(today), previous: at(today - range) };
  });

  // Behaviour grid, and the busiest hour it implies (the fourth "top" card).
  const heat = empty ? Array.from({ length: 7 }, () => new Array<number>(24).fill(0)) : heatGrid(p, today, range);
  const byHour = Array.from({ length: 24 }, (_, h) => heat.reduce((s, row) => s + row[h], 0));
  const busiest = byHour.reduce((best, v, h) => (v > byHour[best] ? h : best), 0);

  const tops: TopOut[] = p.tops.map((top) => {
    if (empty) return { label: top.label, unit: top.unit, scope: top.scope, headline: null, value: 0, mono: top.mono };
    const lead = leaderOf(p, top, today, range);
    const volume = top.scope === "range" ? stats.cur(top.of) : top.of === "secondary" ? stats.total : lifetime(p, "primary", now);
    return { label: top.label, unit: top.unit, scope: top.scope, headline: lead.name, value: Math.round(volume * top.share * lead.share), mono: top.mono };
  });

  // Live statistics, as of `now` (the ticker moves them from here).
  const week = windowStats(p, 7, now);
  const hourWeight = p.hours[now.getHours()] / Math.max(...p.hours);
  const live = {
    online: empty ? 0 : Math.round(week.active * p.live.online.share * (0.35 + 0.65 * hourWeight)),
    onlineOf: empty ? 0 : week.active,
    today: empty ? 0 : dayValue(p, "secondary", today, today, fr),
    todayOf: empty ? 0 : windowSum(p, "secondary", today, 7, fr),
    lifetime: empty
      ? 0
      : (p.live.lifetime.window
          ? windowSum(p, p.live.lifetime.stream, today, p.live.lifetime.window, fr)
          : lifetime(p, p.live.lifetime.stream, now)) * (p.live.lifetime.scale ?? 1),
    lifetimeFormat: p.live.lifetime.format,
  };
  const health = p.health.map((def) => ({ def, value: initialHealth(p, def, today) }));

  // Growth: the running total, new against returning people per day, and the funnel.
  const before = empty ? 0 : stats.total - days.reduce((s, d) => s + d.secondary, 0);
  let running = before;
  const cumulative = days.map((d) => ({ day: d.day, total: (running += d.secondary) }));
  const split = days.map((d) => {
    const fresh = Math.round(d.secondary * 0.8);
    return { day: d.day, fresh, returning: Math.max(0, Math.round(d.primary / p.perActive.day) - fresh), partial: d.partial };
  });
  const fs = (p.seed ^ hash32("funnel")) >>> 0;
  const funnel: number[] = [empty ? 0 : stats.cur("secondary")];
  p.growth.funnel.rates.forEach((r, i) => {
    const jitter = 1 + 0.05 * valueNoise(fs + i, today, 9);
    funnel.push(Math.round(funnel[i] * Math.min(0.98, r * jitter)));
  });

  // Retention: eight weekly signup cohorts, each filled only for the weeks that have elapsed.
  const thisWeek = mondayOf(today);
  const [w0, w1, floor] = p.retention.curve;
  const cs = (p.seed ^ hash32("cohort")) >>> 0;
  const cohorts = empty
    ? []
    : Array.from({ length: 8 }, (_, c) => {
        const week = thisWeek - 7 * (7 - c);
        let size = 0;
        for (let d = week; d < week + 7 && d <= today; d++) size += d === today ? dayValue(p, "secondary", d, today, fr) : fullDay(p, "secondary", d);
        const elapsed = 7 - c;
        const retention = Array.from({ length: elapsed + 1 }, (_, k) => {
          const n = 1 + 0.06 * (unit(cs, week * 16 + k) * 2 - 1);
          const v = k === 0 ? w0 * n : (floor + (w1 - floor) * Math.exp(-(k - 1) / 2.4)) * n;
          return Math.round(Math.min(0.99, v) * 1000) / 10;
        });
        return { week, size, retention };
      });
  const dw = p.retention.distribution.weights;
  const dsum = dw.reduce((a, b) => a + b, 0);
  const distribution = dw.map((w) => (empty ? 0 : Math.round((stats.active * w) / dsum)));

  // Behaviour: segment shares and the leading items, from the window's primary volume.
  const segItems = drift(p, "segments", p.behaviour.segments.items, today, range);
  const segSum = segItems.reduce((a, b) => a + b.w, 0);
  const segments = segItems
    .map((it) => ({ name: it.name, share: (it.w / segSum) * 100, value: empty ? 0 : Math.round((stats.cur("primary") * it.w) / segSum) }))
    .sort((a, b) => b.share - a.share);
  const listItems = drift(p, "list", p.behaviour.list.items, today, range);
  const listSum = listItems.reduce((a, b) => a + b.w, 0);
  const list = listItems
    .map((it) => ({ name: it.name, value: empty ? 0 : Math.round((stats.cur("primary") * 0.6 * it.w) / listSum) }))
    .sort((a, b) => b.value - a.value);

  return {
    range,
    today,
    empty,
    days,
    hero: {
      kpi: kpiOut(heroDef, heroValue, null),
      spark: { values: sparkValues, days: sparkDays, peak, deltaPct: empty ? null : pct(sparkSum, prevSum) },
    },
    kpis,
    rates,
    tops,
    peakHour: empty ? null : { hour: busiest, value: byHour[busiest] },
    live,
    health,
    growth: { cumulative: empty ? [] : cumulative, split: empty ? [] : split, funnel },
    retention: { cohorts, distribution },
    behaviour: { heat, segments: empty ? [] : segments, list: empty ? [] : list },
  };
}
