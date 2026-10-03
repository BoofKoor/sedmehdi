/**
 * Retention: weekly signup cohorts against the weeks after signup (ported from the GozarX panel's
 * cohort table, a real table and therefore its own text alternative), and how much each active
 * person did in the range.
 */
import { clsx } from "clsx";

import { ChartCard } from "@/components/charts/ChartCard";
import { BarList } from "@/components/charts/Small";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, ErrorState, Loading, Skeleton } from "@/components/ui/States";
import { dateOf } from "@/data/calendar";
import type { DashboardData } from "@/data/dashboard";
import type { DemoQuery } from "@/hooks/useDemoQuery";
import { t, tl } from "@/i18n";
import { formatDayShort, formatNumber, formatPct } from "@/lib/format";
import { useAppState } from "@/state/AppState";

/** Five bucketed steps of the brand ramp, so neighbouring cells stay distinct. Ink flips to white
 *  where the fill is dark enough to carry it. */
function cellClass(pct: number): string {
  if (pct <= 0) return "bg-surface-sunken text-content-muted";
  if (pct < 20) return "bg-brand/15 text-content";
  if (pct < 40) return "bg-brand/30 text-content";
  if (pct < 60) return "bg-brand/40 text-content";
  if (pct < 80) return "bg-hero-a text-white";
  return "bg-hero-b text-white";
}

export default function Retention({ q }: { q: DemoQuery<DashboardData> }) {
  const { profile: p } = useAppState();
  if (q.status === "error")
    return (
      <Card>
        <ErrorState onRetry={q.retry} />
      </Card>
    );
  const d = q.data;
  const cohorts = d?.retention.cohorts ?? [];
  const width = Math.max(1, ...cohorts.map((c) => c.retention.length));
  const sized = cohorts.filter((c) => c.retention.length > 1 && c.size > 0);
  const avg = sized.length ? sized.reduce((s, c) => s + c.retention[1], 0) / sized.length : null;
  const dist = p.retention.distribution;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2" aria-labelledby="ret-title">
        <CardHeader id="ret-title" title={tl(p.retention.title)} sub={tl(p.retention.sub)} action={avg != null ? <Badge tone="brand">{t("retention.avg", { pct: formatPct(avg) })}</Badge> : undefined} />
        {!d ? (
          <Loading className="space-y-1.5">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-[31px] w-full" />
            ))}
          </Loading>
        ) : d.empty ? (
          <EmptyState />
        ) : (
          <div className="scrollbar-thin overflow-x-auto" data-testid="cohorts">
            <table className="w-full min-w-[560px] border-collapse text-xs">
              <caption className="sr-only">{tl(p.retention.title)}</caption>
              <thead>
                <tr>
                  <th scope="col" className="p-1.5 text-start font-semibold text-content-muted">
                    {t("retention.week")}
                  </th>
                  <th scope="col" className="p-1.5 text-end font-semibold text-content-muted">
                    {t("retention.size")}
                  </th>
                  {Array.from({ length: width }, (_, i) => (
                    <th key={i} scope="col" className="p-1.5 text-center font-semibold text-content-muted">
                      {t("retention.weekN", { n: formatNumber(i) })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.week}>
                    <th scope="row" className="whitespace-nowrap p-1.5 text-start font-normal text-content-muted">
                      {formatDayShort(dateOf(c.week))}
                    </th>
                    <td className="p-1.5 text-end tabular-nums text-content">{formatNumber(c.size)}</td>
                    {Array.from({ length: width }, (_, i) => {
                      const v = c.retention[i];
                      // A cohort younger than this column has no cell: blank, not a 0% that would
                      // read as "nobody came back".
                      if (v === undefined) return <td key={i} className="p-0.5" />;
                      return (
                        <td key={i} className="p-0.5">
                          <div className={clsx("rounded-md py-1.5 text-center tabular-nums", cellClass(v))} title={t("retention.cell", { pct: formatPct(v), n: formatNumber(c.size) })}>
                            {formatPct(v, 0)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ChartCard
        title={tl(dist.title)}
        sub={tl(dist.sub)}
        testId="distribution"
        table={
          d && !d.empty
            ? { columns: [{ label: t("csv.item") }, { label: t("csv.value"), numeric: true }], rows: dist.buckets.map((b, i) => [tl(b), formatNumber(d.retention.distribution[i])]) }
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
          <BarList share format={(n) => formatNumber(n)} items={dist.buckets.map((b, i) => ({ label: tl(b), value: d.retention.distribution[i] }))} />
        )}
      </ChartCard>
    </div>
  );
}
