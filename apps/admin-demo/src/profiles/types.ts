/**
 * The BusinessProfile: one object per business drives the whole panel. Brand, navigation, KPIs,
 * chart series, radar axes, live statistics, service checks, table columns and every word of copy
 * (as `{ en, fa }` pairs, so a missing translation is a type error) all come from here.
 *
 * Profiles are code rather than JSON so that a KPI can say how it is computed (`value`) and a table
 * column how its synthetic values are drawn (`gen`), next to the label that names them.
 */
import type { L } from "@/i18n";
import type { Rng } from "@/data/prng";

import type { Brand, ProfileId } from "./brands";

/** How a figure is printed. */
export type MetricFormat = "number" | "compact" | "money" | "percent" | "hours" | "decimal" | "bytes";

/** Seven multipliers indexed by `Date#getDay()` (0 = Sunday): the business's weekly rhythm. */
export type WeekRhythm = [number, number, number, number, number, number, number];

/** A daily count the business produces (orders, lessons, configs issued, new customers…). */
export interface SeriesDef {
  /** What one unit is, plural: "Orders" / «سفارش‌ها». */
  label: L;
  /** The unit word after a number: "orders" / «سفارش». */
  unit: L;
  /** The full-day value on the profile's reference date, before the weekly rhythm. */
  base: number;
  /** Year-on-year growth as a fraction: 0.6 is +60% a year. */
  growth: number;
  /** Amplitude of the smooth day-to-day wobble: 0.08 is about ±8%. */
  noise: number;
}

/**
 * A daily stream derived from a series: revenue from orders, items printed from jobs, paid
 * conversions from trials. `level` streams are averages (a turnaround time), not sums.
 */
export interface StreamDef {
  from: "primary" | "secondary";
  ratio: number;
  noise: number;
  kind?: "sum" | "level";
}

/** The window the dashboard is showing, and the equally long one before it. */
export interface WindowStats {
  days: number;
  /** Sum (or, for a level stream, the mean) of a stream over the window and over the one before. */
  cur(stream: string): number;
  prev(stream: string): number;
  /** Distinct active people in the window and in the one before (estimated from the primary series). */
  active: number;
  prevActive: number;
  /** Everything up to today, since the business started: the hero tile's figure. */
  total: number;
}

export interface KpiValue {
  value: number;
  /** null: there is nothing to compare with (the hero tile shows a sparkline instead). */
  previous: number | null;
}

export interface KpiDef {
  id: string;
  /** May contain {days}, filled with the window length. */
  label: L;
  format: MetricFormat;
  /** false for figures where a rise is bad news: churn, turnaround time. */
  upIsGood: boolean;
  value(s: WindowStats): KpiValue;
}

export interface RateDef {
  label: L;
  /** The long form, for the tooltip and the table view. */
  full: L;
  /** A typical value in percent; each window drifts deterministically around it. */
  base: number;
  spread: number;
}

/** A "top X" card: the leading item of a weighted list, its figure and the period it covers. */
export interface TopDef {
  label: L;
  unit: L;
  scope: "range" | "allTime";
  items: { name: L; weight: number }[];
  /** Which share of the window's (or all time's) primary volume the list covers. */
  of: "primary" | "secondary";
  share: number;
  /** Latin names (people's handles, codes) are set in a monospace run, isolated from the sentence. */
  mono?: boolean;
}

export interface LiveDef {
  online: { label: L; ofLabel: L; share: number };
  today: { label: L; ofLabel: L };
  /** A running total of a stream since launch, or over the last `window` days when given. */
  lifetime: { label: L; sub: L; stream: string; format: MetricFormat; scale?: number; window?: number };
}

export type HealthKind = "latency" | "nodes" | "queue" | "percent";
export interface HealthDef {
  id: string;
  name: L;
  kind: HealthKind;
  /** latency: ms · nodes: how many there are · queue: typical depth · percent: typical value */
  base: number;
  /** Above (latency, queue) or below (percent) this, the row is degraded. */
  warn: number;
  /** Shown in the dashboard's side panel (four of them). */
  side?: boolean;
  /** 90-day uptime: how often a day is less than perfect. */
  flaky: number;
}

export interface IncidentDef {
  title: L;
  service: string;
  daysAgo: number;
  minutes: number;
}

/** One column of a records table. */
export interface ColumnDef {
  id: string;
  label: L;
  kind:
    | "person"
    | "text"
    | "code"
    | "status"
    | "enum"
    | "number"
    | "money"
    | "percent"
    | "progress"
    | "ms"
    | "ago"
    | "due"
    | "rating"
    | "hours";
  /** Draws a synthetic value for this cell. `row` holds the columns drawn before it. */
  gen(r: Rng, row: Record<string, CellValue>, ctx: GenContext): CellValue;
  /** Hidden from the phone card layout (still in the dialog and the CSV). */
  secondary?: boolean;
  /** Money: decimals printed in every row of the column (default 2), so it never mixes $1,800 and $840.00. */
  digits?: number;
}

export type Person = { name: L; handle: string; initials: L };
export type CellValue = number | string | L | Person | null;

export interface GenContext {
  now: Date;
  index: number;
}

export interface StatusDef {
  id: string;
  label: L;
  tone: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
  weight: number;
}

export interface EntityDef {
  id: string;
  /** The hash route: #/<path>. */
  path: string;
  label: L;
  /** For "Search {things}…" and "Open {name}": the plural in the middle of a sentence. */
  things: L;
  icon: IconName;
  count: number;
  columns: ColumnDef[];
  statuses: StatusDef[];
  /** A select filter over an enum column. */
  filter?: { column: string; label: L };
  sort: { column: string; dir: "asc" | "desc" };
  /**
   * The record dialog's 30-day trend: what is counted per day. It prints a 30-day total beside the
   * record's own columns, so it must agree with them: `total` names a lifetime count it may not
   * exceed (a user's configs), `cap` a ceiling no day may pass (an account's seats), `per` a column
   * the daily level scales with (`base` per 100 of it: a course's students). Left out for one-off
   * records, which have a `story` instead.
   */
  trend?: { label: L; base: number; total?: string; cap?: string; per?: string };
  /** Lines for the record dialog's activity list (ongoing records); {n} is filled with a small count. */
  activity?: L[];
  /**
   * One-off records (an order, an invoice, a print job): the events up to each status, oldest first.
   * A paid order has been paid and nothing more; a posted job has its whole story.
   */
  story?: Record<string, L[]>;
  /**
   * `ago` columns bounding the record's life, which its trend and activity stay inside: when it
   * began (`from`: created, enrolled, placed) and when it was last active (`to`: last seen).
   */
  span?: { from?: string; to?: string };
  /** Statuses with no activity at all: a blocked user, a churned account, a course still in draft. */
  quiet?: string[];
}

export type IconName =
  | "dashboard"
  | "users"
  | "server"
  | "building"
  | "receipt"
  | "cart"
  | "heart"
  | "graduation"
  | "book"
  | "package"
  | "health";

export interface BusinessProfile {
  id: ProfileId;
  brand: Brand;
  /** Seeds every random draw for this business: same seed, same numbers, for everyone. */
  seed: number;
  currency: string;
  /** The date `SeriesDef.base` refers to, and the day the business started. */
  reference: string;
  launched: string;
  week: WeekRhythm;
  /** 24 relative weights: when in the day the business is busy. */
  hours: number[];

  series: { primary: SeriesDef; secondary: SeriesDef };
  streams: Record<string, StreamDef>;
  /** How many primary units an active person produces in a day, and in a 7- and a 90-day window. */
  perActive: { day: number; d7: number; d90: number };

  copy: {
    /** The overview chart's title and caption. */
    chartTitle: L;
    chartSub: L;
    /** The hero tile's sparkline: what it counts per day. */
    sparkMetric: L;
    /** The Health nav item and page title. */
    health: L;
  };

  kpis: [KpiDef, KpiDef, KpiDef, KpiDef];
  radar: [RateDef, RateDef, RateDef, RateDef];
  tops: [TopDef, TopDef, TopDef];
  live: LiveDef;
  health: HealthDef[];
  incidents: IncidentDef[];

  growth: {
    cumulative: L;
    split: { title: L; sub: L; fresh: L; returning: L };
    funnel: { title: L; sub: L; steps: [L, L, L, L]; rates: [number, number, number] };
  };
  retention: {
    title: L;
    sub: L;
    /** Share of a cohort active in its own week, in the week after, and the floor it settles to. */
    curve: [number, number, number];
    distribution: { title: L; sub: L; buckets: [L, L, L, L]; weights: [number, number, number, number] };
  };
  behaviour: {
    heat: L;
    segments: { title: L; sub: L; items: { name: L; weight: number }[] };
    list: { title: L; sub: L; items: { name: L; weight: number }[] };
  };

  entities: [EntityDef, EntityDef];
}
