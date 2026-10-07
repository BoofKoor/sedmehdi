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

const DAY = 86_400_000;

/** The instant held by an `ago` column of the record, when the table names one. */
function instant(row: Row, column?: string): number | undefined {
  const v = column ? row.cells[column] : undefined;
  return typeof v === "number" ? v : undefined;
}

/**
 * A record's last 30 days (the dialog's mini trend), oldest first, or null where the table has none.
 * It agrees with the record it sits beside: zero outside the record's span and for a quiet status, no
 * day over `cap`, and a count (`total`) never more in 30 days than the record's own lifetime figure,
 * as whole events on the days it was active, one of them on the day it was last seen.
 */
export function rowTrend(p: BusinessProfile, entity: EntityDef, row: Row, now: Date): { day: number; value: number }[] | null {
  const tr = entity.trend;
  if (!tr) return null;
  const r = rng(mix(p.seed, hash32(`${entity.id}:trend`), row.index));
  const scale = r.lognormal(1, 0.5);
  const today = dayNumber(now);
  const quiet = entity.quiet?.includes(String(row.cells.status)) ?? false;
  const from = instant(row, entity.span?.from);
  const to = instant(row, entity.span?.to);
  const first = from == null ? -Infinity : dayNumber(new Date(from));
  const last = to == null ? Infinity : dayNumber(new Date(to));
  const per = tr.per ? (Number(row.cells[tr.per]) || 0) / 100 : 1;
  const cap = tr.cap ? Number(row.cells[tr.cap]) || 0 : Infinity;
  const days = Array.from({ length: 30 }, (_, i) => today - 29 + i);
  const live = (day: number) => !quiet && day >= first && day <= last;
  let values = days.map((day) => {
    const noise = 0.7 + r.next() * 0.6;
    return live(day) ? Math.min(cap, Math.max(0, Math.round(tr.base * scale * per * p.week[weekdayOf(day)] * noise))) : 0;
  });
  if (tr.total) {
    const lifetime = Math.max(0, Math.floor(Number(row.cells[tr.total]) || 0));
    if (values.reduce((a, b) => a + b, 0) > lifetime) {
      const liveDays = days.filter(live);
      values = days.map(() => 0);
      for (let k = 0; k < lifetime && liveDays.length > 0; k++) {
        const day = k === 0 && last >= days[0] && last <= today ? last : liveDays[Math.floor(r.next() * liveDays.length)];
        values[day - days[0]] += 1;
      }
    }
  }
  return days.map((day, i) => ({ day, value: values[i] }));
}

/**
 * A record's recent events, newest first. A one-off record (an order, an invoice) tells its `story`
 * up to the status it is in, in order, after it began. An ongoing one gives up to four lines from
 * `activity`, inside its span (an idle user's end when they were last seen) and none when quiet.
 */
export function rowActivity(p: BusinessProfile, entity: EntityDef, row: Row, now: Date): { text: L; n: number; at: number }[] {
  const r = rng(mix(p.seed, hash32(`${entity.id}:activity`), row.index));
  const status = String(row.cells.status);
  const nowMs = now.getTime();
  const from = instant(row, entity.span?.from);
  const to = instant(row, entity.span?.to);
  if (entity.story) {
    const steps = entity.story[status] ?? [];
    // The first step follows the record's start within minutes (an invoice is sent as it is issued);
    // the rest spread over the time since, the last one shortly before now.
    const start = from ?? nowMs - 3 * DAY;
    const first = Math.min(nowMs, start + r.int(1, 30) * 60_000);
    const end = Math.max(first + 60_000, nowMs - r.int(2, 30) * 60_000);
    const gaps = steps.slice(1).map(() => 0.4 + r.next());
    const room = gaps.reduce((a, b) => a + b, 0) + 0.3;
    let acc = 0;
    return steps
      .map((text, i) => {
        if (i > 0) acc += gaps[i - 1];
        return { text, n: r.int(2, 9), at: Math.floor(Math.min(nowMs, first + ((end - first) * acc) / room)) };
      })
      .reverse();
  }
  if (entity.quiet?.includes(status) || !entity.activity?.length) return [];
  const until = Math.min(nowMs, to ?? nowMs);
  let at = Math.min(nowMs - r.int(10, 240) * 60_000, until);
  if (from != null && at < from) at = from + (until - from) * (0.3 + r.next() * 0.6);
  const events: { text: L; n: number; at: number }[] = [];
  for (let k = 0; k < 4 && (from == null || at >= from); k++) {
    events.push({ text: r.pick(entity.activity), n: r.int(2, 9), at: Math.floor(at) });
    at -= r.int(3, 60) * 3_600_000;
  }
  return events;
}
