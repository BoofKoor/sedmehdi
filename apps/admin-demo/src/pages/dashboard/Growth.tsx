/**
 * Growth: the running total, new against returning people per day, and the funnel from first
 * contact to the step a business cares about most. Loaded on first visit to the tab.
 */
import { ChartCard, LegendItem } from "@/components/charts/ChartCard";
import { BarList } from "@/components/charts/Small";
import { DEFAULT_HEIGHTS, TrendPanels, trendHeight } from "@/components/charts/TrendPanels";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, Loading, Skeleton } from "@/components/ui/States";
import { dateOf } from "@/data/calendar";
import type { DashboardData } from "@/data/dashboard";
import type { DemoQuery } from "@/hooks/useDemoQuery";
import { t, tl } from "@/i18n";
import { formatDate, formatNumber, formatPct } from "@/lib/format";
import { useAppState } from "@/state/AppState";

const SPLIT_HEIGHTS = [110, 80];

export default function Growth({ q }: { q: DemoQuery<DashboardData> }) {
  const { profile: p } = useAppState();
  if (q.status === "error")
    return (
      <Card>
        <ErrorState onRetry={q.retry} />
      </Card>
    );
  const d = q.data;
  const g = p.growth;
  const total = tl(p.growth.cumulative);
  const fresh = tl(g.split.fresh);
  const back = tl(g.split.returning);
  const funnel = d?.growth.funnel ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        className="lg:col-span-2"
        title={total}
        sub={t("growth.cumulativeSub")}
        testId="cumulative"
        table={
          d && !d.empty
            ? { columns: [{ label: t("chart.date") }, { label: total, numeric: true }], rows: d.growth.cumulative.map((c) => [formatDate(dateOf(c.day)), formatNumber(c.total)]) }
            : undefined
        }
      >
        {!d ? (
          <Loading>
            <Skeleton className="w-full rounded-xl" style={{ height: trendHeight(DEFAULT_HEIGHTS.single, false) }} />
          </Loading>
        ) : d.empty ? (
          <EmptyState />
        ) : (
          <TrendPanels
            days={d.growth.cumulative.map((c) => c.day)}
            partialLast
            ariaLabel={total}
            panels={[{ id: "total", label: total, values: d.growth.cumulative.map((c) => c.total), format: (n) => formatNumber(n), color: 1, mark: "line" }]}
          />
        )}
      </ChartCard>

      <ChartCard
        title={tl(g.split.title)}
        sub={tl(g.split.sub)}
        testId="split"
        legend={
          <>
            <LegendItem color={1} label={back} />
            <LegendItem color={2} label={fresh} />
            <LegendItem dashed label={t("dash.chart.partialLegend")} />
          </>
        }
        table={
          d && !d.empty
            ? {
                columns: [{ label: t("chart.date") }, { label: fresh, numeric: true }, { label: back, numeric: true }],
                rows: d.growth.split.map((s) => [`${formatDate(dateOf(s.day))}${s.partial ? ` (${t("chart.soFar")})` : ""}`, formatNumber(s.fresh), formatNumber(s.returning)]),
              }
            : undefined
        }
      >
        {!d ? (
          <Loading>
            <Skeleton className="w-full rounded-xl" style={{ height: trendHeight(SPLIT_HEIGHTS, true) }} />
          </Loading>
        ) : d.empty ? (
          <EmptyState />
        ) : (
          // Two panels on their own scales, like the overview: new people are a few percent of a
          // day's total, and stacked on the returning ones they were a sliver nobody could read.
          <TrendPanels
            days={d.growth.split.map((s) => s.day)}
            partialLast
            ariaLabel={tl(g.split.sub)}
            heights={SPLIT_HEIGHTS}
            panels={[
              { id: "returning", label: back, values: d.growth.split.map((s) => s.returning), format: (n) => formatNumber(n), color: 1, mark: "column" },
              { id: "new", label: fresh, values: d.growth.split.map((s) => s.fresh), format: (n) => formatNumber(n), color: 2, mark: "column" },
            ]}
          />
        )}
      </ChartCard>

      <ChartCard
        title={tl(g.funnel.title)}
        sub={tl(g.funnel.sub)}
        testId="funnel"
        table={
          d && !d.empty
            ? {
                columns: [{ label: t("csv.item") }, { label: t("csv.value"), numeric: true }, { label: t("csv.ofPrevious"), numeric: true }],
                rows: g.funnel.steps.map((s, i) => [tl(s), formatNumber(funnel[i]), i > 0 && funnel[i - 1] ? formatPct((funnel[i] / funnel[i - 1]) * 100) : "—"]),
              }
            : undefined
        }
      >
        {!d ? (
          <Loading className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[30px] w-full" />
            ))}
          </Loading>
        ) : d.empty ? (
          <EmptyState />
        ) : (
          <BarList
            testId="funnel-bars"
            format={(n) => formatNumber(n)}
            items={g.funnel.steps.map((s, i) => ({
              label: tl(s),
              value: funnel[i],
              note: i > 0 && funnel[i - 1] ? t("growth.ofPrev", { pct: formatPct((funnel[i] / funnel[i - 1]) * 100) }) : undefined,
            }))}
          />
        )}
      </ChartCard>
    </div>
  );
}
