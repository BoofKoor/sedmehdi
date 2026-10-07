/**
 * Local calendar days as integers. The generator keys every value on the day number, so a given date
 * has the same figures whatever range it appears in, today or a month from now.
 */

const MS_DAY = 86_400_000;

/** Days since 1970-01-01 for the LOCAL calendar date of `d` (DST-proof: computed from Y-M-D). */
export function dayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_DAY);
}

/** "YYYY-MM-DD" → day number. */
export function dayNumberOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
}

/** The local midnight of a day number. */
export function dateOf(day: number): Date {
  const u = new Date(day * MS_DAY);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
}

/** 0 = Sunday, as Date#getDay. */
export function weekdayOf(day: number): number {
  return (((day + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
}

/** How far through the local day `now` is, in [0, 1). */
export function dayFraction(now: Date): number {
  return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86_400;
}
