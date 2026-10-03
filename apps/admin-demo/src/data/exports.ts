/**
 * The CSV behind each screen, built from the same objects the screen renders, so a download is
 * exactly what was on the page: the dashboard's tiles, series, cards and rates for the chosen range
 * (one tidy table with a section column), and a records table's filtered, sorted rows, every one of
 * them, not only the page showing.
 *
 * Labels are in the language on screen; values are data: plain digits, ISO dates, no units.
 */
import { t, tl } from "@/i18n";
import { isoDate } from "@/lib/format";
import { rawMetric } from "@/lib/metric";
import type { BusinessProfile, CellValue, EntityDef } from "@/profiles";
import type { DashTab } from "@/router";

import { dateOf } from "./calendar";
import { toCsv, type CsvCell } from "./csv";
import type { DashboardData } from "./dashboard";
import type { Row } from "./entities";

const HEAD = () => [t("csv.section"), t("csv.metric"), t("csv.item"), t("csv.date"), t("csv.value"), t("csv.previous"), t("csv.change"), t("csv.note")];

const iso = (day: number) => isoDate(dateOf(day));
const pct = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);

export function dashboardCsv(p: BusinessProfile, d: DashboardData, tab: DashTab): string {
  const rows: CsvCell[][] = [HEAD()];
  const days = { days: d.range };
  const add = (section: string, metric: string, item: CsvCell, date: CsvCell, value: CsvCell, previous: CsvCell = null, change: CsvCell = null, note: CsvCell = null) =>
    rows.push([section, metric, item, date, value, previous, change, note]);
  const partialNote = (partial: boolean) => (partial ? t("chart.partial") : null);

  if (tab === "overview") {
    const kpi = t("csv.kpi");
    add(kpi, tl(d.hero.kpi.label, days), null, null, rawMetric(d.hero.kpi.value), null, null, t("dash.scope.allTime"));
    for (const k of d.kpis) add(kpi, tl(k.label, days), null, null, rawMetric(k.value), k.previous == null ? null : rawMetric(k.previous), pct(k.deltaPct));
    const daily = t("csv.daily");
    for (const day of d.days) {
      add(daily, tl(p.series.primary.label), null, iso(day.day), day.primary, null, null, partialNote(day.partial));
      add(daily, tl(p.series.secondary.label), null, iso(day.day), day.secondary, null, null, partialNote(day.partial));
    }
    const top = t("csv.top");
    for (const c of d.tops) add(top, tl(c.label), c.headline ? tl(c.headline) : null, null, c.value, null, null, c.scope === "range" ? t("dash.scope.range", { n: d.range }) : t("dash.scope.allTime"));
    if (d.peakHour) add(top, t("dash.peakHour"), `${String(d.peakHour.hour).padStart(2, "0")}:00`, null, d.peakHour.value, null, null, t("dash.scope.range", { n: d.range }));
    const rate = t("csv.rate");
    for (const r of d.rates) add(rate, tl(r.label), tl(r.full), null, r.value, r.previous, r.value != null && r.previous != null ? Math.round((r.value - r.previous) * 10) / 10 : null, "%");
  }

  if (tab === "growth") {
    const cum = tl(p.growth.cumulative);
    for (const c of d.growth.cumulative) add(t("csv.cumulative"), cum, null, iso(c.day), c.total);
    for (const s of d.growth.split) {
      add(t("csv.split"), tl(p.growth.split.fresh), null, iso(s.day), s.fresh, null, null, partialNote(s.partial));
      add(t("csv.split"), tl(p.growth.split.returning), null, iso(s.day), s.returning, null, null, partialNote(s.partial));
    }
    d.growth.funnel.forEach((v, i) =>
      add(t("csv.funnel"), tl(p.growth.funnel.steps[i]), null, null, v, null, i > 0 && d.growth.funnel[i - 1] > 0 ? Math.round((v / d.growth.funnel[i - 1]) * 1000) / 10 : null, i > 0 ? t("csv.ofPrevious") : null),
    );
  }

  if (tab === "retention") {
    for (const c of d.retention.cohorts)
      c.retention.forEach((v, k) => add(t("csv.cohort"), t("retention.weekN", { n: k }), c.size, iso(c.week), v, null, null, "%"));
    p.retention.distribution.buckets.forEach((b, i) => add(t("csv.distribution"), tl(p.retention.distribution.title), tl(b), null, d.retention.distribution[i]));
  }

  if (tab === "behaviour") {
    for (let wd = 0; wd < 7; wd++)
      for (let h = 0; h < 24; h++) add(t("csv.heatmap"), tl(p.behaviour.heat), `${WEEKDAYS_EN[wd]} ${String(h).padStart(2, "0")}:00`, null, d.behaviour.heat[wd][h]);
    for (const s of d.behaviour.segments) add(t("csv.segment"), tl(p.behaviour.segments.title), tl(s.name), null, s.value, null, null, `${Math.round(s.share * 10) / 10}%`);
    for (const s of d.behaviour.list) add(t("csv.list"), tl(p.behaviour.list.title), tl(s.name), null, s.value);
  }
  return toCsv(rows);
}

/** Weekdays as data keys: the heatmap's CSV is read by machines, Sunday first like getDay(). */
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cellCsv(v: CellValue, kind: string, locale: "en" | "fa"): CsvCell {
  if (v == null) return null;
  if (typeof v === "number") {
    if (kind === "ago" || kind === "due") return new Date(v).toISOString();
    return rawMetric(v);
  }
  if (typeof v === "string") return v;
  if ("handle" in v) return v.name[locale];
  return v[locale];
}

/** Every filtered, sorted row, with every column (the ones a phone hides included). */
export function recordsCsv(p: BusinessProfile, e: EntityDef, rows: Row[], locale: "en" | "fa", status: (row: Row) => string): string {
  const head: CsvCell[] = [];
  for (const c of e.columns) {
    const label = tl(c.label);
    if (c.kind === "money") head.push(`${label} (${p.currency})`);
    else if (c.kind === "ms") head.push(`${label} (ms)`);
    else if (c.kind === "percent" || c.kind === "progress") head.push(`${label} (%)`);
    else if (c.kind === "hours") head.push(`${label} (h)`);
    else head.push(label);
    if (c.kind === "person") head.push(`${label} · ${t("csv.handle")}`);
  }
  const body = rows.map((r) => {
    const out: CsvCell[] = [];
    for (const c of e.columns) {
      if (c.kind === "status") {
        const s = e.statuses.find((x) => x.id === status(r));
        out.push(s ? s.label[locale] : status(r));
      } else out.push(cellCsv(r.cells[c.id], c.kind, locale));
      if (c.kind === "person") {
        const v = r.cells[c.id];
        out.push(v && typeof v === "object" && "handle" in v ? v.handle : null);
      }
    }
    return out;
  });
  return toCsv([head, ...body]);
}
