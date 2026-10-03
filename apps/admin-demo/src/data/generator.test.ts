/**
 * The generator's promises, checked: the same numbers for everyone, ranges that are slices of each
 * other, KPIs that are the sum of the points the chart draws, a previous window of equal length,
 * a still-filling today, and a CSV that reads back to what was written.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { PROFILE_LIST, type BusinessProfile } from "@/profiles";

import { dayNumber, weekdayOf } from "./calendar";
import { parseCsv, toCsv } from "./csv";
import { buildDashboard } from "./dashboard";
import { buildRows, rowActivity, rowTrend } from "./entities";
import { businessDayFraction, fullDay, windowStats, windowSum } from "./model";

const NOW = new Date(2026, 9, 3, 14, 5);
const RANGES = [7, 14, 30, 90] as const;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const at = (base: Date, days: number, h = base.getHours(), m = base.getMinutes()) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, h, m);

/** Every number anywhere inside a value. */
function numbers(v: unknown, out: number[] = []): number[] {
  if (typeof v === "number") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => numbers(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => numbers(x, out));
  return out;
}

describe.each(PROFILE_LIST.map((p) => [p.id, p] as [string, BusinessProfile]))("%s", (_id, p) => {
  it("never reaches for Math.random", () => {
    const spy = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random used");
    });
    for (const r of RANGES) buildDashboard(p, r, at(NOW, 40));
    for (const e of p.entities) {
      const rows = buildRows(p, e, at(NOW, 40));
      rowTrend(p, e, rows[0], NOW);
      rowActivity(p, e, rows[0], NOW);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("is deterministic across fresh module instances", async () => {
    const a = buildDashboard(p, 30, NOW);
    vi.resetModules();
    const fresh = await import("./dashboard");
    const freshProfiles = await import("@/profiles");
    const b = fresh.buildDashboard(freshProfiles.PROFILES[p.id], 30, NOW);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it("draws every range as a slice of the longer ones", () => {
    const by = Object.fromEntries(RANGES.map((r) => [r, buildDashboard(p, r, NOW)]));
    for (const r of RANGES) {
      const d = by[r].days;
      expect(d).toHaveLength(r);
      expect(d.at(-1)!.day).toBe(dayNumber(NOW));
      d.forEach((row, i) => i && expect(row.day - d[i - 1].day).toBe(1));
    }
    expect(by[7].days).toEqual(by[14].days.slice(7));
    expect(by[14].days).toEqual(by[30].days.slice(16));
    expect(by[30].days).toEqual(by[90].days.slice(60));
  });

  it("makes every windowed figure the sum of the days the chart draws", () => {
    const fr = businessDayFraction(p, NOW);
    for (const r of RANGES) {
      const d = buildDashboard(p, r, NOW);
      const s = windowStats(p, r, NOW);
      expect(s.cur("primary")).toBe(sum(d.days.map((x) => x.primary)));
      expect(s.cur("secondary")).toBe(sum(d.days.map((x) => x.secondary)));
      // Each KPI that reports a series' window total is exactly that sum.
      for (const k of d.kpis) {
        const def = p.kpis.find((x) => x.id === k.id)!;
        const v = def.value(s);
        expect(k.value).toBe(v.value);
        expect(k.previous).toBe(v.previous);
      }
      // A derived stream is summed over the same days, today cut at the same hour.
      for (const [name, def] of Object.entries(p.streams)) {
        if (def.kind === "level") continue;
        const today = dayNumber(NOW);
        const manual = sum(d.days.map((x) => (x.partial ? Math.round(fullDay(p, name, x.day) * fr) : fullDay(p, name, x.day))));
        expect(windowSum(p, name, today, r, fr)).toBe(manual);
      }
    }
  });

  it("compares with the window before, shifted back, cut at the same hour", () => {
    const fr = businessDayFraction(p, NOW);
    const today = dayNumber(NOW);
    for (const r of RANGES) {
      const s = windowStats(p, r, NOW);
      let manual = 0;
      for (let day = today - 2 * r + 1; day <= today - r; day++) {
        const v = fullDay(p, "primary", day);
        manual += day === today - r ? Math.round(v * fr) : v;
      }
      expect(s.prev("primary")).toBe(manual);
    }
  });

  it("draws today as a partial day that fills with the clock", () => {
    const morning = buildDashboard(p, 7, at(NOW, 0, 0, 0)).days.at(-1)!;
    const noon = buildDashboard(p, 7, at(NOW, 0, 12, 0)).days.at(-1)!;
    const late = buildDashboard(p, 7, at(NOW, 0, 23, 59)).days.at(-1)!;
    const full = fullDay(p, "primary", dayNumber(NOW));
    expect(late.partial).toBe(true);
    expect(morning.primary).toBe(0);
    expect(noon.primary).toBeGreaterThan(0);
    expect(noon.primary).toBeLessThan(late.primary);
    expect(late.primary).toBeLessThanOrEqual(full);
    expect(late.primary).toBeGreaterThan(full * 0.97);
    // Only the last day is partial.
    expect(buildDashboard(p, 14, NOW).days.filter((d) => d.partial)).toHaveLength(1);
  });

  it("gives a date the same figures whatever day it is viewed from", () => {
    const a = buildDashboard(p, 30, NOW).days;
    const b = buildDashboard(p, 30, at(NOW, 5)).days;
    const complete = a.filter((d) => !d.partial);
    for (const d of complete) {
      const same = b.find((x) => x.day === d.day);
      if (same) expect(same).toEqual(d);
    }
  });

  it("follows the business's weekly rhythm and grows over time", () => {
    const today = dayNumber(NOW);
    const days = Array.from({ length: 182 }, (_, i) => today - 185 + i);
    const ratio = new Map<number, number[]>();
    for (const d of days) {
      const around = Array.from({ length: 7 }, (_, k) => fullDay(p, "primary", d - 3 + k));
      const r = fullDay(p, "primary", d) / (sum(around) / 7);
      ratio.set(weekdayOf(d), [...(ratio.get(weekdayOf(d)) ?? []), r]);
    }
    const seen = Array.from({ length: 7 }, (_, w) => sum(ratio.get(w)!) / ratio.get(w)!.length);
    const want = p.week;
    const mean = (xs: readonly number[]) => sum([...xs]) / xs.length;
    const [ms, mw] = [mean(seen), mean(want)];
    const cov = sum(seen.map((s, i) => (s - ms) * (want[i] - mw)));
    const corr = cov / Math.sqrt(sum(seen.map((s) => (s - ms) ** 2)) * sum(want.map((w) => (w - mw) ** 2)));
    expect(corr).toBeGreaterThan(0.85);

    const recent = sum(Array.from({ length: 28 }, (_, i) => fullDay(p, "primary", today - 28 + i)));
    const earlier = sum(Array.from({ length: 28 }, (_, i) => fullDay(p, "primary", today - 28 * 8 + i)));
    expect(recent).toBeGreaterThan(earlier);
  });

  it("produces finite, plausible numbers everywhere", () => {
    for (const r of RANGES) {
      const d = buildDashboard(p, r, NOW);
      for (const n of numbers(d)) expect(Number.isFinite(n)).toBe(true);
      for (const k of [d.hero.kpi, ...d.kpis]) expect(k.value).toBeGreaterThan(0);
      for (const k of d.kpis) expect(k.deltaPct).not.toBeNull();
      for (const rate of d.rates) {
        expect(rate.value).toBeGreaterThanOrEqual(1);
        expect(rate.value).toBeLessThanOrEqual(99);
      }
      expect(d.live.online).toBeLessThanOrEqual(d.live.onlineOf);
      expect(d.live.today).toBeLessThanOrEqual(d.live.todayOf);
      d.growth.funnel.forEach((v, i) => i && expect(v).toBeLessThanOrEqual(d.growth.funnel[i - 1]));
      d.growth.cumulative.forEach((c, i) => i && expect(c.total).toBeGreaterThanOrEqual(d.growth.cumulative[i - 1].total));
      // The growth tab's running total ends exactly on the hero tile's figure.
      expect(d.growth.cumulative.at(-1)!.total).toBe(d.hero.kpi.value);
      for (const c of d.retention.cohorts) {
        expect(Math.max(...c.retention)).toBe(c.retention[0]);
        if (c.retention.length > 2) expect(c.retention.at(-1)!).toBeLessThan(c.retention[1] * 1.07);
      }
      expect(d.behaviour.heat).toHaveLength(7);
      for (const row of d.behaviour.heat) expect(row).toHaveLength(24);
      const heat = sum(d.behaviour.heat.flat());
      const complete = sum(d.days.slice(0, -1).map((x) => x.primary)) + fullDay(p, "primary", d.today - r);
      expect(heat / complete).toBeGreaterThan(0.95);
      expect(heat / complete).toBeLessThan(1.05);
    }
  });

  it("puts the hero sparkline on the last seven complete days", () => {
    const d = buildDashboard(p, 14, NOW);
    expect(d.hero.spark.values).toEqual(d.days.slice(6, 13).map((x) => x.secondary));
    expect(d.hero.spark.values[d.hero.spark.peak]).toBe(Math.max(...d.hero.spark.values));
  });

  it("empties every figure in the empty workspace", () => {
    const d = buildDashboard(p, 14, NOW, true);
    expect(d.empty).toBe(true);
    expect(d.days.every((x) => x.primary === 0 && x.secondary === 0)).toBe(true);
    expect(d.hero.kpi.value).toBe(0);
    for (const k of d.kpis) expect([k.value, k.previous, k.deltaPct]).toEqual([0, null, null]);
    expect(d.rates.every((r) => r.value === null)).toBe(true);
    expect(d.tops.every((t) => t.headline === null)).toBe(true);
    expect(d.peakHour).toBeNull();
    expect(d.retention.cohorts).toEqual([]);
    expect(d.behaviour.segments).toEqual([]);
    expect(d.growth.split).toEqual([]);
  });

  it("builds the same records every visit, the same people every day", () => {
    for (const e of p.entities) {
      const rows = buildRows(p, e, NOW);
      expect(rows).toHaveLength(e.count);
      expect(new Set(rows.map((r) => r.id)).size).toBe(e.count);
      const statusIds = new Set(e.statuses.map((s) => s.id));
      for (const r of rows) {
        expect(statusIds.has(String(r.cells.status))).toBe(true);
        for (const c of e.columns) expect(r.cells[c.id]).not.toBeUndefined();
      }
      // Tomorrow the same rows hold the same people and values; only instants move with the clock.
      const tomorrow = buildRows(p, e, at(NOW, 1));
      const timeless = e.columns.filter((c) => c.kind !== "ago" && c.kind !== "due").map((c) => c.id);
      rows.forEach((r, i) => timeless.forEach((c) => expect(tomorrow[i].cells[c]).toEqual(r.cells[c])));
      expect(rowTrend(p, e, rows[3], NOW)).toEqual(rowTrend(p, e, rows[3], NOW));
      expect(rowTrend(p, e, rows[3], NOW)).toHaveLength(30);
    }
  });
});

describe("csv", () => {
  afterEach(() => vi.restoreAllMocks());

  it("round-trips commas, quotes, line breaks, Persian and edge spaces", () => {
    const rows = [
      ["Date", "Orders", "Note"],
      ["2026-10-03", 418, 'He said "hi", then left'],
      ["2026-10-02", 0, "line one\nline two"],
      ["2026-10-01", 12.5, " leading space"],
      ["۱۴۰۵/۰۷/۱۱", null, "سفارش‌ها، امروز"],
    ];
    const text = toCsv(rows);
    expect(text.startsWith("﻿")).toBe(true);
    expect(text.endsWith("\r\n")).toBe(true);
    expect(parseCsv(text)).toEqual(rows.map((r) => r.map((c) => (c == null ? "" : String(c)))));
  });
});
