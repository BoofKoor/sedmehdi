/**
 * Display formatting, always in the ACTIVE language: Persian digits, separators and the Persian
 * calendar in Persian; Latin digits and the Gregorian calendar in English. Everything comes from the
 * browser's own Intl, so there is no locale data to ship.
 *
 * Adapted from the GozarX panel's lib/format, minus its fixed Asia/Tehran clock: synthetic data has
 * no server time zone, so dates are the visitor's own local days.
 */
import { getLocale, localeTag } from "@/i18n";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** ASCII digits, and a decimal point between two of them, in the locale's own glyphs. */
export function localizeDigits(s: string): string {
  if (getLocale() !== "fa") return s;
  return s.replace(/[0-9]/g, (d) => FA_DIGITS[+d]).replace(/(?<=[۰-۹])\.(?=[۰-۹])/g, "٫");
}

/**
 * A "<number> <Latin unit>" quantity wrapped in a Unicode isolate (FSI…PDI), so it never reorders
 * inside a Persian sentence: «۱۲۴ ms» would otherwise render as «ms ۱۲۴».
 */
export function isolate(s: string): string {
  return `⁨${s}⁩`;
}

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.ListFormat>();
function memo<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.ListFormat>(
  key: string,
  make: () => T,
): T {
  const k = `${localeTag()}|${key}`;
  const hit = cache.get(k);
  if (hit) return hit as T;
  const made = make();
  cache.set(k, made);
  return made;
}

export function formatNumber(n: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return memo(`num${maximumFractionDigits}`, () => new Intl.NumberFormat(localeTag(), { maximumFractionDigits })).format(n);
}

/** 12,900 → "12.9K" / «۱۲٫۹ هزار». */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) < 10_000) return formatNumber(n);
  return memo("compact", () => new Intl.NumberFormat(localeTag(), { notation: "compact", maximumFractionDigits: 1 })).format(n);
}

/** A percentage given in percent units: 37.5 → "37.5%" / «۳۷٫۵٪». */
export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = memo(`pct${digits}`, () => new Intl.NumberFormat(localeTag(), { maximumFractionDigits: digits })).format(n);
  return getLocale() === "fa" ? `${v}٪` : `${v}%`;
}

export function formatMoney(n: number, currency = "USD", compact = false): string {
  if (!Number.isFinite(n)) return "—";
  if (compact && Math.abs(n) >= 100_000) {
    return memo(`money-c-${currency}`, () =>
      new Intl.NumberFormat(localeTag(), {
        style: "currency",
        currency,
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    ).format(n);
  }
  const digits = Math.abs(n) >= 1000 ? 0 : 2;
  return memo(`money-${currency}-${digits}`, () =>
    new Intl.NumberFormat(localeTag(), { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }),
  ).format(n);
}

const UNITS = {
  en: { ms: "ms", h: "h", m: "m", d: "d", hours: "h" },
  fa: { ms: "ms", h: "ساعت", m: "دقیقه", d: "روز", hours: "ساعت" },
};

/** A latency reading: "124 ms" / «۱۲۴ ms», isolated so the unit never jumps ahead of its number. */
export function formatMs(ms: number): string {
  return isolate(localizeDigits(`${Math.round(ms)} ${UNITS[getLocale()].ms}`));
}

/** Hours with one decimal: "6.9h" / «۶٫۹ ساعت». */
export function formatHours(h: number): string {
  if (!Number.isFinite(h)) return "—";
  const u = UNITS[getLocale()];
  const v = formatNumber(h, 1);
  return getLocale() === "fa" ? `${v} ${u.hours}` : `${v}${u.hours}`;
}

/** Minutes as the largest whole units: "1h 20m" / «۱ ساعت ۲۰ دقیقه». */
export function formatDuration(minutes: number): string {
  const u = UNITS[getLocale()];
  const fa = getLocale() === "fa";
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const part = (n: number, unit: string) => (fa ? `${formatNumber(n)} ${unit}` : `${formatNumber(n)}${unit}`);
  if (h && m) return `${part(h, u.h)} ${part(m, u.m)}`;
  if (h) return part(h, u.h);
  return part(m, u.m);
}

/** Bytes as a human size, isolated: "3.1 TB" / «۳٫۱ TB». */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "—";
  let v = Math.max(0, n);
  for (const unit of ["B", "KB", "MB", "GB", "TB", "PB"]) {
    if (v < 1024 || unit === "PB") return isolate(localizeDigits(`${unit === "B" ? Math.round(v) : v.toFixed(1)} ${unit}`));
    v /= 1024;
  }
  return "—";
}

// ------------------------------------------------------------------------------------------ dates
/** A local calendar day as "YYYY-MM-DD" (the CSV's and the generator's key). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "October 3, 2026" / «۱۱ مهر ۱۴۰۵». */
export function formatDate(d: Date): string {
  return memo("date", () => new Intl.DateTimeFormat(localeTag(), { year: "numeric", month: "long", day: "numeric" })).format(d);
}

/** "Oct 3" / «۱۱ مهر». */
export function formatDayShort(d: Date): string {
  return memo("dayShort", () => new Intl.DateTimeFormat(localeTag(), { month: "short", day: "numeric" })).format(d);
}

/** The day of the month in the locale's calendar: "3" / «۱۱». */
export function formatDayNum(d: Date): string {
  return memo("dayNum", () => new Intl.DateTimeFormat(localeTag(), { day: "numeric" })).format(d);
}

/** The weekday's initial: "S" / «ش». */
export function formatWeekdayNarrow(d: Date): string {
  return memo("wdNarrow", () => new Intl.DateTimeFormat(localeTag(), { weekday: "narrow" })).format(d);
}

/** "Sat" / «شنبه». */
export function formatWeekday(d: Date, style: "short" | "long" = "short"): string {
  return memo(`wd-${style}`, () => new Intl.DateTimeFormat(localeTag(), { weekday: style })).format(d);
}

/** A clock time on a 24-hour dial: "14:05" / «۱۴:۰۵». */
export function formatTime(d: Date, seconds = false): string {
  return memo(`time${seconds ? "s" : ""}`, () =>
    new Intl.DateTimeFormat(localeTag(), { hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined, hourCycle: "h23" }),
  ).format(d);
}

/** An hour of the day as a clock reading: 17 → "17:00" / «۱۷:۰۰». */
export function formatHour(h: number): string {
  return localizeDigits(`${String(h).padStart(2, "0")}:00`);
}

const REL_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["week", 7 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** How long ago, in the largest unit the gap fills: "3 hours ago" / «۳ ساعت پیش». */
export function formatRelative(d: Date, now: Date): string {
  const seconds = (d.getTime() - now.getTime()) / 1000;
  const fmt = memo("rel", () => new Intl.RelativeTimeFormat(localeTag(), { numeric: "auto" }));
  for (const [unit, span] of REL_UNITS) {
    if (Math.abs(seconds) >= span) return fmt.format(Math.round(seconds / span), unit);
  }
  return fmt.format(0, "minute");
}

/** "A, B and C" / «A، B و C». */
export function listJoin(items: string[]): string {
  return memo("list", () => new Intl.ListFormat(localeTag(), { type: "conjunction" })).format(items);
}

/** The first day of the week in the active language: Saturday in Persian, Monday in English. */
export function weekStart(): number {
  return getLocale() === "fa" ? 6 : 1;
}
