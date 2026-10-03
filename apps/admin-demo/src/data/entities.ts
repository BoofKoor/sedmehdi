/**
 * The rows of a records table, and the per-record extras the detail dialog shows (a 30-day trend and
 * a few recent events). Seeded per business, table and row index: stable across visits.
 */
import type { L } from "@/i18n";
import type { BusinessProfile, CellValue, EntityDef } from "@/profiles/types";

import { dayNumber, weekdayOf } from "./calendar";
import { hash32, mix, rng } from "./prng";

export interface Row {
  id: string;
  index: number;
  cells: Record<string, CellValue>;
}

const rowCache = new Map<string, Row[]>();

export function buildRows(p: BusinessProfile, entity: EntityDef, now: Date): Row[] {
  const key = `${p.id}|${entity.id}|${dayNumber(now)}`;
  const hit = rowCache.get(key);
  if (hit) return hit;
  const rows: Row[] = [];
  for (let i = 0; i < entity.count; i++) {
    const r = rng(mix(p.seed, hash32(entity.id), i));
    const cells: Record<string, CellValue> = {};
    for (const col of entity.columns) cells[col.id] = col.gen(r, cells, { now, index: i });
    rows.push({ id: `${entity.path}-${i}`, index: i, cells });
  }
  if (rowCache.size > 40) rowCache.clear();
  rowCache.set(key, rows);
  return rows;
}

/** A record's last 30 days of activity (the dialog's mini trend), oldest first. */
export function rowTrend(p: BusinessProfile, entity: EntityDef, row: Row, now: Date): { day: number; value: number }[] {
  const r = rng(mix(p.seed, hash32(`${entity.id}:trend`), row.index));
  const scale = r.lognormal(1, 0.5);
  const today = dayNumber(now);
  return Array.from({ length: 30 }, (_, i) => {
    const day = today - 29 + i;
    const v = entity.trend.base * scale * p.week[weekdayOf(day)] * (0.7 + r.next() * 0.6);
    return { day, value: Math.max(0, Math.round(v)) };
  });
}

/** A few recent events for a record, newest first: a template and when it happened. */
export function rowActivity(p: BusinessProfile, entity: EntityDef, row: Row, now: Date): { text: L; n: number; at: number }[] {
  const r = rng(mix(p.seed, hash32(`${entity.id}:activity`), row.index));
  let at = now.getTime() - r.int(10, 240) * 60_000;
  return Array.from({ length: 4 }, () => {
    const ev = { text: r.pick(entity.activity), n: r.int(2, 9), at };
    at -= r.int(3, 60) * 3_600_000;
    return ev;
  });
}
