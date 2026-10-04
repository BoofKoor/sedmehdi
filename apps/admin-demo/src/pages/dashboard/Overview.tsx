/**
 * The dashboard's overview: the KPI band, the trend and the "top" cards (the side panel of rates, live
 * figures and service health belongs to the whole dashboard: SideBlocks). The GozarX panel's
 * composition, driven by the business profile.
 *
 * Every windowed figure here comes from the days the chart draws (src/data/dashboard.ts), so a tile,
 * the chart's table view and the CSV cannot disagree.
 */
import { clsx } from "clsx";
import { ArrowDown, ArrowUp, Award, Clock, Layers, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ChartCard, LegendItem } from "@/components/charts/ChartCard";
import { HeroSparkline } from "@/components/charts/HeroSparkline";
import { DEFAULT_HEIGHTS, TrendPanels, trendHeight } from "@/components/charts/TrendPanels";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { EmptyState, ErrorState, Loading, Skeleton } from "@/components/ui/States";
import { dateOf } from "@/data/calendar";
import type { DashboardData, KpiOut } from "@/data/dashboard";
import type { DemoQuery } from "@/hooks/useDemoQuery";
import { t, tl, type L } from "@/i18n";
import { formatDate, formatHour, formatNumber, formatPct, formatWeekdayNarrow } from "@/lib/format";
import { formatMetric } from "@/lib/metric";
import type { BusinessProfile } from "@/profiles";
import { useAppState } from "@/state/AppState";

export function Overview({ q }: { q: DemoQuery<DashboardData> }) {
  const { profile: p } = useAppState();
  return (
    <div className="flex flex-col gap-4">
      {q.status === "error" ? (
        <Card>
          <ErrorState onRetry={q.retry} />
        </Card>
      ) : (
        <>
          <KpiBand p={p} d={q.data} />
          <Trend p={p} d={q.data} />
          <Tops p={p} d={q.data} />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ KPIs

function Delta({ k, days }: { k: KpiOut; days: number }) {
  if (k.deltaPct == null) return <span className="text-xs font-medium text-content-muted">{t("dash.delta.first")}</span>;
  const rose = k.deltaPct > 0;
  const flat = Math.abs(k.deltaPct) < 0.05;
  const good = flat ? null : k.upIsGood === rose;
  const Icon = rose ? ArrowUp : ArrowDown;
  const pctText = formatPct(Math.abs(k.deltaPct));
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-semibold", good == null ? "text-content-muted" : good ? "text-success-700" : "text-danger-700")} data-delta={k.deltaPct.toFixed(1)}>
      {!flat && <Icon className="h-3.5 w-3.5" aria-hidden />}
      <span aria-hidden>{flat ? t("dash.delta.flat") : pctText}</span>
      <span className="sr-only">{flat ? t("dash.delta.flat") : t("dash.delta.sr", { dir: t(rose ? "dash.delta.up" : "dash.delta.down"), pct: pctText, days: formatNumber(days) })}</span>
    </span>
  );
}

function KpiBand({ p, d }: { p: BusinessProfile; d?: DashboardData }) {
  const { range } = useAppState();
  const days = d?.range ?? range;
  const label = (l: L) => tl(l, { days: formatNumber(days) });
  return (
    // The hero spans two rows beside the four windowed tiles (two by two on a desk, one beside it and
    // two under it on a tablet), so five figures take the band the original four did.
    <section aria-label={t("dash.kpis")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.22fr_1fr_1fr]" data-testid="kpis">
      <div className="flex min-w-0 flex-col rounded-card bg-hero p-4 pb-2 text-white shadow-hero sm:row-span-2" data-kpi={p.kpis[0].id}>
        {d ? (
          <>
            <div className="text-[2rem] font-bold leading-[1.1] tracking-[-0.025em]">
              <CountUp value={d.hero.kpi.value} format={(n) => formatMetric(n, d.hero.kpi.format, p.currency)} />
            </div>
            <div className="mt-1.5 text-[10px] font-medium uppercase leading-[1.5] tracking-[0.085em] text-white">
              {label(d.hero.kpi.label)} · {t(d.hero.kpi.scope === "now" ? "dash.scope.now" : "dash.scope.allTime")}
            </div>
            {d.empty ? (
              <div className="mt-auto pt-3 text-xs text-white">{t("state.empty")}</div>
            ) : (
              <div className="-mx-4 -mb-2 mt-auto pt-2">
                <HeroSparkline
                  values={d.hero.spark.values}
                  labels={d.hero.spark.days.map((x) => formatWeekdayNarrow(dateOf(x)))}
                  highlight={d.hero.spark.peak}
                  delta={d.hero.spark.deltaPct == null ? undefined : `${d.hero.spark.deltaPct >= 0 ? "+" : "−"}${formatPct(Math.abs(d.hero.spark.deltaPct))}`}
                  ariaLabel={t("dash.spark.aria", {
                    metric: tl(p.copy.sparkMetric),
                    days: formatNumber(7),
                    peak: `${formatDate(dateOf(d.hero.spark.days[d.hero.spark.peak]))}, ${formatNumber(d.hero.spark.values[d.hero.spark.peak])}`,
                  })}
                />
              </div>
            )}
          </>
        ) : (
          <Loading className="flex flex-1 flex-col">
            <Skeleton className="h-[35px] w-32 bg-white/20 after:hidden" />
            <Skeleton className="mt-1.5 h-[15px] w-40 bg-white/15 after:hidden" />
            {/* The sparkline's own box, so the tile is its final height before the data lands. */}
            <div className="-mx-4 -mb-2 mt-auto pt-2">
              <div className="aspect-[268/138]" />
            </div>
          </Loading>
        )}
      </div>
      {p.kpis.slice(1).map((def, i) => {
        const k = d?.kpis[i];
        return (
          <div key={def.id} className="flex min-h-[132px] min-w-0 flex-col rounded-card bg-surface p-4 shadow-card md:min-h-[139px]" data-kpi={def.id}>
            {k ? (
              <>
                <div className="text-[2rem] font-bold leading-[1.1] tracking-[-0.025em] text-content">
                  <CountUp value={k.value} format={(n) => formatMetric(n, k.format, p.currency)} />
                </div>
                <div className="mt-1.5 text-[10px] uppercase leading-[1.5] tracking-[0.085em] text-content-muted">{label(k.label)}</div>
                <div className="mt-auto pt-3">{d?.empty ? <span className="text-xs text-content-muted">{t("state.empty")}</span> : <Delta k={k} days={days} />}</div>
              </>
            ) : (
              <Loading className="flex flex-1 flex-col">
                <Skeleton className="h-[35px] w-28" />
                <Skeleton className="mt-2 h-[15px] w-36" />
                <Skeleton className="mt-auto h-4 w-24" />
              </Loading>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ----------------------------------------------------------------------------------------- trend

function Trend({ p, d }: { p: BusinessProfile; d?: DashboardData }) {
  const prim = tl(p.series.primary.label);
  const sec = tl(p.series.secondary.label);
  const table = d && {
    columns: [{ label: t("chart.date") }, { label: prim, numeric: true }, { label: sec, numeric: true }],
    rows: d.days.map((x) => [`${formatDate(dateOf(x.day))}${x.partial ? ` (${t("chart.soFar")})` : ""}`, formatNumber(x.primary), formatNumber(x.secondary)]),
    marked: d.days.map((x, i) => (x.partial ? i : -1)).filter((i) => i >= 0),
  };
  return (
    <ChartCard
      title={tl(p.copy.chartTitle)}
      sub={tl(p.copy.chartSub)}
      table={table || undefined}
      testId="trend"
      legend={
        <>
          <LegendItem color={1} label={prim} />
          <LegendItem color={2} label={sec} />
          <LegendItem dashed label={t("dash.chart.partialLegend")} />
        </>
      }
    >
      {!d ? (
        <Loading>
          <Skeleton className="w-full rounded-xl" style={{ height: trendHeight(DEFAULT_HEIGHTS.double, true) }} />
        </Loading>
      ) : d.empty ? (
        <div className="grid place-items-center" style={{ height: trendHeight(DEFAULT_HEIGHTS.double, true) }}>
          <EmptyState />
        </div>
      ) : (
        <TrendPanels
          days={d.days.map((x) => x.day)}
          partialLast
          ariaLabel={tl(p.copy.chartSub)}
          panels={[
            { id: "primary", label: prim, values: d.days.map((x) => x.primary), format: (n) => formatNumber(n), color: 1 },
            { id: "secondary", label: sec, values: d.days.map((x) => x.secondary), format: (n) => formatNumber(n), color: 2 },
          ]}
        />
      )}
    </ChartCard>
  );
}

// ------------------------------------------------------------------------------------------ tops

const TOP_ICONS: LucideIcon[] = [Award, Layers, Sparkles];

function TopCard({ icon: Icon, label, scope, headline, value, unit, mono, loading }: { icon: LucideIcon; label: string; scope: string; headline: ReactNode; value: ReactNode; unit: string; mono?: boolean; loading?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col rounded-card bg-surface px-[14px] pb-4 pt-[15px] shadow-card" data-top>
      <div className="flex min-h-[41px] items-start gap-2">
        <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-brand/15 text-brand-700">
          <Icon className="h-[15px] w-[15px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.085em] text-content-muted">
            {label}
            <span className="normal-case tracking-normal"> · {scope}</span>
          </div>
          {loading ? (
            <Skeleton className="mt-1 h-[18px] w-24" />
          ) : (
            <div className={clsx("truncate text-sm font-bold text-content", mono && "font-mono text-[12.5px]")} dir={mono ? "ltr" : undefined} style={mono ? { unicodeBidi: "isolate" } : undefined}>
              {headline}
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-baseline pt-3.5 text-[22px] font-bold tracking-[-0.02em] text-content">
        {loading ? <Skeleton className="h-[26px] w-20" /> : <span>{value}</span>}
        <small className="ms-2 border-s border-line ps-[7px] text-[11px] font-normal text-content-muted">{unit}</small>
      </div>
    </div>
  );
}

function Tops({ p, d }: { p: BusinessProfile; d?: DashboardData }) {
  const range = d?.range ?? 0;
  const scopeOf = (s: "range" | "allTime") => (s === "range" ? t("dash.scope.range", { n: formatNumber(range) }) : t("dash.scope.allTime"));
  return (
    <section aria-label={t("dash.tops")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {p.tops.map((top, i) => {
        const c = d?.tops[i];
        return (
          <TopCard
            key={top.label.en}
            icon={TOP_ICONS[i]}
            label={tl(top.label)}
            scope={scopeOf(top.scope)}
            headline={c?.headline ? tl(c.headline) : "—"}
            value={c ? <CountUp value={c.value} format={(n) => formatNumber(n)} /> : null}
            unit={tl(top.unit)}
            mono={top.mono}
            loading={!d}
          />
        );
      })}
      <TopCard
        icon={Clock}
        label={t("dash.peakHour")}
        scope={scopeOf("range")}
        headline={d?.peakHour ? formatHour(d.peakHour.hour) : "—"}
        value={d ? <CountUp value={d.peakHour?.value ?? 0} format={(n) => formatNumber(n)} /> : null}
        unit={tl(p.series.primary.unit)}
        loading={!d}
      />
    </section>
  );
}
