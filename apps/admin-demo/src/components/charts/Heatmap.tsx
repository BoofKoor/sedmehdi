/**
 * When the business is busy: weekday × hour, on one sequential ramp of the brand colour (ported
 * from the GozarX panel's activity heatmap). Rows start on the locale's first day of the week, the
 * hours run in the reading direction, and each cell names its slot and count on hover.
 */
import { clsx } from "clsx";

import { dateOf } from "@/data/calendar";
import { t } from "@/i18n";
import { formatHour, formatNumber, formatWeekday, localizeDigits, weekStart } from "@/lib/format";

/** A Sunday's day number, so weekday names come from Intl in the active language. */
const SUNDAY = 20_457; // 2026-01-04

export const weekdayName = (wd: number, style: "short" | "long" = "short") => formatWeekday(dateOf(SUNDAY + wd), style);

export function weekOrder(): number[] {
  const s = weekStart();
  return Array.from({ length: 7 }, (_, i) => (s + i) % 7);
}

const LEVELS = ["bg-surface-sunken", "bg-brand/20", "bg-brand/45", "bg-brand/70", "bg-brand"];

function level(v: number, max: number) {
  if (v <= 0) return 0;
  const f = v / max;
  return f > 0.8 ? 4 : f > 0.55 ? 3 : f > 0.3 ? 2 : 1;
}

export function Heatmap({ grid, unit, ariaLabel }: { grid: number[][]; unit: string; ariaLabel: string }) {
  const max = Math.max(1, ...grid.flat());
  const hours = Array.from({ length: 24 }, (_, h) => h);
  return (
    <div role="img" aria-label={ariaLabel} className="scrollbar-thin overflow-x-auto" data-chart="heatmap">
      <div className="min-w-[560px]">
        <div className="mb-1 flex ps-12 text-[10px] text-content-muted">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center">
              {h % 3 === 0 ? localizeDigits(String(h)) : ""}
            </div>
          ))}
        </div>
        {weekOrder().map((wd) => (
          <div key={wd} className="mb-1 flex items-center">
            <div className="w-12 shrink-0 pe-2 text-end text-[11px] text-content-muted">{weekdayName(wd)}</div>
            <div className="flex flex-1 gap-[3px]">
              {hours.map((h) => {
                const v = grid[wd][h];
                return (
                  <div
                    key={h}
                    title={`${weekdayName(wd, "long")} ${formatHour(h)}: ${formatNumber(v)} ${unit}`}
                    className={clsx("h-6 flex-1 rounded-[3px] lg:h-7", LEVELS[level(v, max)])}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-content-muted">
          <span>{t("chart.low")}</span>
          {LEVELS.map((c) => (
            <span key={c} className={clsx("h-3 w-3 rounded-[3px]", c)} />
          ))}
          <span>{t("chart.high")}</span>
        </div>
      </div>
    </div>
  );
}
