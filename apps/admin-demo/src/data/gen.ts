/**
 * The small toolkit profiles use to describe how a table column's synthetic values are drawn.
 * Every function takes the row's own seeded generator, so a row is the same on every visit.
 */
import type { L } from "@/i18n";
import type { CellValue, Person, StatusDef } from "@/profiles/types";

import { COMPANIES, FIRST_COUNT, INITIAL_COUNT, personAt } from "./names";
import type { Rng } from "./prng";

const DAY = 86_400_000;

export const g = {
  person(r: Rng): Person {
    const a = r.int(0, FIRST_COUNT - 1);
    const b = r.int(0, INITIAL_COUNT - 1);
    return personAt(a, b, r.int(1, 9999));
  },
  company(r: Rng): string {
    return r.pick(COMPANIES);
  },
  /** "ORD-48213": a prefix and a number that grows with the row (newest rows have the highest). */
  code(prefix: string, start: number, index: number, step = 3): string {
    return `${prefix}-${start - index * step}`;
  },
  pick(r: Rng, items: readonly L[]): L {
    return r.pick(items);
  },
  weighted(r: Rng, items: readonly { name: L; weight: number }[]): L {
    return r.weighted(items, (it) => it.weight).name;
  },
  status(r: Rng, statuses: readonly StatusDef[]): string {
    return r.weighted(statuses, (s) => s.weight).id;
  },
  int(r: Rng, min: number, max: number): number {
    return r.int(min, max);
  },
  /** A whole number around `median`, skewed the way counts are (many small, a few large). */
  count(r: Rng, median: number, spread = 0.7, min = 0): number {
    return Math.max(min, Math.round(r.lognormal(median, spread)));
  },
  money(r: Rng, median: number, spread = 0.6): number {
    return Math.round(r.lognormal(median, spread) * 100) / 100;
  },
  pct(r: Rng, min: number, max: number, digits = 1): number {
    const f = Math.pow(10, digits);
    return Math.round((min + r.next() * (max - min)) * f) / f;
  },
  /** An instant in the past, more often recent: epoch ms. */
  ago(r: Rng, now: Date, maxDays: number): number {
    return now.getTime() - Math.pow(r.next(), 2.2) * maxDays * DAY - r.int(0, 3600) * 1000;
  },
  /** An instant ahead of now (a due date): epoch ms. */
  ahead(r: Rng, now: Date, maxDays: number): number {
    return now.getTime() + (0.15 + r.next() * maxDays) * DAY;
  },
  rating(r: Rng): number {
    return Math.round((3.6 + Math.pow(r.next(), 0.5) * 1.4) * 10) / 10;
  },
};

/** A readable value for search and sorting, in the given language. */
export function cellText(v: CellValue, locale: "en" | "fa"): string {
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "string") return String(v);
  if ("handle" in v) return `${v.name[locale]} ${v.handle}`;
  return v[locale];
}
