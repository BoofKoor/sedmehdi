/**
 * Ninety days of uptime per service, from the profile's `flaky` rate and its incident list:
 * mostly perfect days, a few short dips, and the incidents on the days they happened. Seeded per
 * business and day, like everything else, so a day's bar is the same on every visit.
 */
import type { BusinessProfile, HealthDef } from "@/profiles";

import { hash32, unit } from "./prng";

export interface UptimeDay {
  day: number;
  /** Percent of the day the service answered. */
  pct: number;
  level: "ok" | "minor" | "major";
}

export function uptimeDays(p: BusinessProfile, def: HealthDef, today: number, days = 90): UptimeDay[] {
  const s = (p.seed ^ hash32(`uptime:${def.id}`)) >>> 0;
  const incidents = p.incidents.filter((i) => i.service === def.id);
  return Array.from({ length: days }, (_, k) => {
    const day = today - (days - 1) + k;
    let pct = 100;
    if (unit(s, day) < def.flaky) pct = 99.5 + unit(s + 1, day) * 0.45;
    for (const inc of incidents) if (today - inc.daysAgo === day) pct = Math.min(pct, 100 - (inc.minutes / 1440) * 100);
    pct = Math.round(pct * 100) / 100;
    return { day, pct, level: pct >= 100 ? "ok" : pct >= 99.5 ? "minor" : "major" };
  });
}

/** Time-weighted uptime over the window. */
export function uptimeOf(days: UptimeDay[]): number {
  return Math.round((days.reduce((a, d) => a + d.pct, 0) / days.length) * 100) / 100;
}
