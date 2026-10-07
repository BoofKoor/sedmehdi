import type { MetricFormat } from "@/profiles";

import { formatBytes, formatCompact, formatHours, formatMoney, formatNumber, formatPct } from "./format";

/** A KPI's figure, printed the way its profile says it should be. */
export function formatMetric(v: number, f: MetricFormat, currency: string): string {
  switch (f) {
    case "number":
      return formatNumber(v);
    case "compact":
      return formatCompact(v);
    case "money":
      return formatMoney(v, currency, true);
    case "percent":
      return formatPct(v);
    case "hours":
      return formatHours(v);
    case "decimal":
      return formatNumber(v, 2);
    case "bytes":
      return formatBytes(v);
  }
}

/** A CSV keeps the figure as data: plain digits, two decimals at most, no units or separators. */
export function rawMetric(v: number): number {
  return Math.round(v * 100) / 100;
}
