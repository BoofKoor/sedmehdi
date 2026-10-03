/**
 * How each kind of column is printed, sorted and searched. One place, so the table, the phone
 * cards, the record dialog and the sort order cannot disagree about what a cell says.
 */
import { clsx } from "clsx";
import { Star } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cellText } from "@/data/gen";
import { tl, type Locale } from "@/i18n";
import { formatDate, formatHours, formatMoney, formatMs, formatNumber, formatPct, formatRelative, formatTime } from "@/lib/format";
import type { BusinessProfile, CellValue, ColumnDef, EntityDef, Person, StatusDef } from "@/profiles";

export const isPerson = (v: CellValue): v is Person => typeof v === "object" && v != null && "handle" in v;

export const NUMERIC = new Set<ColumnDef["kind"]>(["number", "money", "percent", "progress", "ms", "rating", "hours"]);

export function statusOf(e: EntityDef, id: string): StatusDef | undefined {
  return e.statuses.find((s) => s.id === id);
}

/** The record's name: the first column (a person, a code or a title). */
export function recordName(e: EntityDef, cells: Record<string, CellValue>, locale: Locale): string {
  const v = cells[e.columns[0].id];
  if (isPerson(v)) return v.name[locale];
  return cellText(v, locale);
}

export function recordSub(e: EntityDef, cells: Record<string, CellValue>): string | undefined {
  const v = cells[e.columns[0].id];
  return isPerson(v) ? v.handle : undefined;
}

export function renderCell(p: BusinessProfile, e: EntityDef, col: ColumnDef, v: CellValue, status: string, now: Date, locale: Locale, compact = false): ReactNode {
  if (col.kind === "status") {
    const s = statusOf(e, status);
    return s ? (
      <Badge tone={s.tone} dot>
        {tl(s.label)}
      </Badge>
    ) : (
      status
    );
  }
  if (v == null) return <span className="text-content-muted">—</span>;
  switch (col.kind) {
    case "person": {
      const person = v as Person;
      return (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar initials={person.initials[locale]} seed={person.handle} className={compact ? "h-9 w-9" : "h-8 w-8"} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-content">{person.name[locale]}</span>
            <span className="block truncate text-xs text-content-muted" dir="ltr" style={{ unicodeBidi: "isolate" }}>
              {person.handle}
            </span>
          </span>
        </span>
      );
    }
    case "code":
      return (
        <span className="font-mono text-[12.5px] font-medium text-content" dir="ltr" style={{ unicodeBidi: "isolate" }}>
          {String(v)}
        </span>
      );
    case "text":
    case "enum":
      return cellText(v, locale);
    case "number":
      return formatNumber(v as number);
    case "money":
      return formatMoney(v as number, p.currency, false, col.digits ?? 2);
    case "percent":
      return formatPct(v as number);
    case "ms":
      return formatMs(v as number);
    case "hours":
      return formatHours(v as number);
    case "rating":
      return (
        <span className="inline-flex items-center gap-1">
          {formatNumber(v as number, 1)}
          <Star className="h-3.5 w-3.5 fill-current text-content-muted" aria-hidden />
        </span>
      );
    case "progress": {
      const n = v as number;
      return (
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
            <span className={clsx("block h-full rounded-full", n > 85 ? "bg-warning-500" : "bg-brand")} style={{ width: `${n}%` }} />
          </span>
          <span className="tabular-nums">{formatPct(n, 0)}</span>
        </span>
      );
    }
    case "ago":
    case "due": {
      const d = new Date(v as number);
      return (
        <time dateTime={d.toISOString()} title={`${formatDate(d)} ${formatTime(d)}`}>
          {formatRelative(d, now)}
        </time>
      );
    }
  }
}

/** A sortable key: numbers compare as numbers, everything else as text in the visitor's language. */
export function sortKey(e: EntityDef, col: ColumnDef, v: CellValue, status: string, locale: Locale): number | string {
  if (col.kind === "status") return e.statuses.findIndex((s) => s.id === status);
  if (v == null) return "";
  if (typeof v === "number") return v;
  if (isPerson(v)) return v.name[locale];
  return cellText(v, locale);
}

const fold = (s: string) => s.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌‎‏]/g, "");

/** A row's searchable text, in BOTH languages, so a name typed in either script finds its record. */
export function searchText(e: EntityDef, cells: Record<string, CellValue>, status: string): string {
  const parts: string[] = [];
  for (const c of e.columns) {
    const v = c.kind === "status" ? null : cells[c.id];
    if (c.kind === "status") {
      const s = statusOf(e, status);
      if (s) parts.push(s.label.en, s.label.fa);
    } else if (typeof v === "string") parts.push(v);
    else if (isPerson(v)) parts.push(v.name.en, v.name.fa, v.handle);
    else if (v && typeof v === "object") parts.push(v.en, v.fa);
  }
  return fold(parts.join(" "));
}

export const foldQuery = fold;
