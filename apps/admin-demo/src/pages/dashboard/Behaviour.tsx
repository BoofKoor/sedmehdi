/**
 * Behaviour: when the business is busy (weekday × hour), how its volume splits, and what leads.
 * Shares are drawn as ranked bars rather than a donut: lengths on a shared baseline compare at a
 * glance, angles do not.
 */
import { ChartCard } from "@/components/charts/ChartCard";
import { Heatmap, weekdayName, weekOrder } from "@/components/charts/Heatmap";
import { BarList } from "@/components/charts/Small";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, Loading, Skeleton } from "@/components/ui/States";
import type { DashboardData } from "@/data/dashboard";
import type { DemoQuery } from "@/hooks/useDemoQuery";
import { t, tl } from "@/i18n";
import { formatHour, formatNumber } from "@/lib/format";
import { useAppState } from "@/state/AppState";

export default function Behaviour({ q }: { q: DemoQuery<DashboardData> }) {
  const { profile: p } = useAppState();
  if (q.status === "error")
    return (
      <Card>
        <ErrorState onRetry={q.retry} />
      </Card>
    );
  const d = q.data;
  const b = p.behaviour;
  const unit = tl(p.series.primary.unit);
  let best = { wd: 0, h: 0, v: -1 };
  if (d) for (let wd = 0; wd < 7; wd++) for (let h = 0; h < 24; h++) if (d.behaviour.heat[wd][h] > best.v) best = { wd, h, v: d.behaviour.heat[wd][h] };
  const when = t("behaviour.when", { day: weekdayName(best.wd, "long"), hour: formatHour(best.h) });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        className="lg:col-span-2"
        title={tl(b.heat)}
        sub={d && !d.empty ? t("behaviour.busiest", { when }) : undefined}
        testId="heatmap"
        table={
          d && !d.empty
            ? {
                columns: [{ label: t("chart.day") }, ...Array.from({ length: 24 }, (_, h) => ({ label: formatHour(h), numeric: true }))],
                rows: weekOrder().map((wd) => [weekdayName(wd), ...d.behaviour.heat[wd].map((v) => formatNumber(v))]),
              }
            : undefined
        }
      >
        {!d ? (
          <Loading>
            <Skeleton className="h-[248px] w-full rounded-xl" />
          </Loading>
        ) : d.empty ? (
          <EmptyState />
        ) : (
          <Heatmap grid={d.behaviour.heat} unit={unit} ariaLabel={t("chart.heatAria", { metric: tl(b.heat), when })} />
        )}
      </ChartCard>

      <ChartCard
        title={tl(b.segments.title)}
        sub={tl(b.segments.sub)}
        testId="segments"
        table={d && !d.empty ? { columns: [{ label: t("csv.item") }, { label: t("csv.value"), numeric: true }], rows: d.behaviour.segments.map((s) => [tl(s.name), formatNumber(s.value)]) } : undefined}
      >
        {!d ? (
          <Loading className="space-y-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[30px] w-full" />
            ))}
          </Loading>
        ) : d.empty ? (
          <EmptyState />
        ) : (
          <BarList share format={(n) => formatNumber(n)} items={d.behaviour.segments.map((s) => ({ label: tl(s.name), value: s.value }))} />
        )}
      </ChartCard>

      <ChartCard
        title={tl(b.list.title)}
        sub={tl(b.list.sub)}
        testId="toplist"
        table={d && !d.empty ? { columns: [{ label: t("csv.item") }, { label: t("csv.value"), numeric: true }], rows: d.behaviour.list.map((s) => [tl(s.name), formatNumber(s.value)]) } : undefined}
      >
        {!d ? (
          <Loading className="space-y-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[30px] w-full" />
            ))}
          </Loading>
        ) : d.empty ? (
          <EmptyState />
        ) : (
          <BarList color={2} format={(n) => formatNumber(n)} items={d.behaviour.list.map((s) => ({ label: tl(s.name), value: s.value }))} />
        )}
      </ChartCard>
    </div>
  );
}
