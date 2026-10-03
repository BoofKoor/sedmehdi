/**
 * The dashboard's overview: the KPI band, the trend, the "top" cards, and the side panel of rates,
 * live figures and service health. The GozarX panel's composition, driven by the business profile.
 *
 * Every windowed figure here comes from the days the chart draws (src/data/dashboard.ts), so a tile,
 * the chart's table view and the CSV cannot disagree.
 */
import { clsx } from "clsx";
import { ArrowDown, ArrowUp, Award, Clock, Layers, Radio, Sparkles, UserPlus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ChartCard, LegendItem } from "@/components/charts/ChartCard";
import { HeroSparkline } from "@/components/charts/HeroSparkline";
import { RadarRates } from "@/components/charts/RadarRates";
import { DEFAULT_HEIGHTS, TrendPanels, trendHeight } from "@/components/charts/TrendPanels";
import { SidePanel } from "@/components/shell/chrome";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { EmptyState, ErrorState, Loading, Skeleton } from "@/components/ui/States";
import { dateOf } from "@/data/calendar";
import type { DashboardData, KpiOut } from "@/data/dashboard";
import type { DemoQuery } from "@/hooks/useDemoQuery";
import { t, tl, type L } from "@/i18n";
import { formatDate, formatHour, formatMs, formatNumber, formatPct, formatTime, formatWeekdayNarrow } from "@/lib/format";
import { formatMetric } from "@/lib/metric";
import type { BusinessProfile, HealthDef } from "@/profiles";
import { Link } from "@/router";
import { useAppState } from "@/state/AppState";
import { isDegraded, useLive } from "@/state/Live";

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
      <SidePanel label={t("dash.side.panel")}>
        <SideBlocks p={p} q={q} />
      </SidePanel>
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
    <section aria-label={t("dash.kpis")} className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[1.22fr_repeat(3,1fr)]" data-testid="kpis">
      <div className="flex min-w-0 flex-col rounded-card bg-hero p-4 pb-2 text-white shadow-hero" data-kpi={p.kpis[0].id}>
        {d ? (
          <>
            <div className="text-[2rem] font-bold leading-[1.1] tracking-[-0.025em]">
              <CountUp value={d.hero.kpi.value} format={(n) => formatMetric(n, d.hero.kpi.format, p.currency)} />
            </div>
            <div className="mt-1.5 text-[10px] font-medium uppercase leading-[1.5] tracking-[0.085em] text-white">
              {label(d.hero.kpi.label)} · {t("dash.scope.allTime")}
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
          <div key={def.id} className="flex min-h-[120px] min-w-0 flex-col rounded-card bg-surface p-4 shadow-card md:min-h-[139px]" data-kpi={def.id}>
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

// ------------------------------------------------------------------------------------- side panel

function SideHead({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-2 text-[0.95rem] font-bold text-content">
      <span className="flex-1">{children}</span>
      {aside && <span className="text-[11px] font-normal text-content-muted">{aside}</span>}
    </h2>
  );
}

function Gauge({ icon: Icon, label, value, outOf, outOfLabel, testId }: { icon: LucideIcon; label: string; value: number; outOf: number; outOfLabel: string; testId: string }) {
  const r = 21;
  const c = 2 * Math.PI * r;
  const frac = outOf > 0 ? Math.min(1, value / outOf) : 0;
  return (
    <div className="flex items-center gap-3 rounded-[13px] bg-surface-raised px-[0.9rem] py-[0.8rem]" data-live={testId} data-value={value}>
      <div className="min-w-0 flex-1 text-[0.8rem] leading-[1.4] text-content-muted">{label}</div>
      <div className="relative grid h-[3.05rem] w-[3.05rem] shrink-0 place-items-center">
        <svg viewBox="0 0 50 50" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
          <circle cx="25" cy="25" r={r} fill="none" className="stroke-line" strokeWidth="4" />
          <circle cx="25" cy="25" r={r} fill="none" style={{ stroke: "rgb(var(--chart-1))", transition: "stroke-dasharray .6s ease" }} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * frac).toFixed(2)} ${c.toFixed(2)}`} />
        </svg>
        <Icon className="relative h-[1.05rem] w-[1.05rem] text-brand-700" aria-hidden />
      </div>
      <div className="shrink-0 text-end">
        <div className="text-[0.65rem] uppercase tracking-[0.06em] text-content-muted">
          {outOfLabel} {formatNumber(outOf)}
        </div>
        <div className="text-[1.4rem] font-bold leading-tight tracking-[-0.02em] text-content">
          <CountUp value={value} format={(n) => formatNumber(n)} />
        </div>
      </div>
    </div>
  );
}

function healthReading(def: HealthDef, v: number): string {
  switch (def.kind) {
    case "latency":
      return formatMs(v);
    case "nodes":
      return `${formatNumber(v)} / ${formatNumber(def.base)}`;
    case "queue":
      return formatNumber(v);
    case "percent":
      return formatPct(v);
  }
}

export function HealthLine({ def, value, last }: { def: HealthDef; value: number; last?: boolean }) {
  const bad = isDegraded(def, value);
  return (
    <div className={clsx("flex items-center gap-[0.55rem] py-[0.62rem] text-[0.8rem]", !last && "border-b border-line")} data-health={def.id} data-degraded={bad}>
      <span className={clsx("h-2 w-2 shrink-0 rounded-full ring-[3px]", bad ? "bg-warning-500 ring-warning-500/20" : "bg-success-500 ring-success-500/20")} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-content-muted">
        {tl(def.name)}
        <span className="sr-only">: {t(bad ? "health.slow" : "health.ok")}</span>
      </span>
      <b className="shrink-0 font-medium text-content" dir={def.kind === "nodes" ? "ltr" : undefined} style={{ unicodeBidi: "isolate" }}>
        {healthReading(def, value)}
      </b>
    </div>
  );
}

function LiveCaption() {
  const live = useLive();
  const text =
    live.status === "running" ? t("dash.live.updated", { time: formatTime(live.updatedAt, true) }) : live.status === "paused" ? t("dash.live.paused") : t("dash.live.still");
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-content-muted" data-testid="live-caption" data-live-status={live.status}>
      <Radio className="h-3.5 w-3.5" aria-hidden />
      {text}
    </p>
  );
}

function SideBlocks({ p, q }: { p: BusinessProfile; q: DemoQuery<DashboardData> }) {
  const live = useLive();
  const d = q.data;
  const error = q.status === "error";
  return (
    <>
      <div className="flex flex-col gap-3" data-side-block="rates">
        <SideHead aside={d ? t("dash.side.ratesScope", { n: formatNumber(d.range) }) : undefined}>{t("dash.side.rates")}</SideHead>
        {error ? (
          <ErrorState compact onRetry={q.retry} />
        ) : !d ? (
          <Loading>
            <Skeleton className="mx-auto aspect-[340/254] w-full max-w-[340px] rounded-full opacity-60" />
          </Loading>
        ) : d.empty ? (
          <EmptyState className="py-6" />
        ) : (
          <>
            <RadarRates axes={d.rates.map((r) => ({ label: tl(r.label), value: r.value, title: tl(r.full) }))} />
            <ul className="sr-only">
              {d.rates.map((r) => (
                <li key={r.label.en}>
                  {tl(r.full)}: {r.value == null ? "—" : formatPct(r.value)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3" data-side-block="live">
        <SideHead>{t("dash.side.live")}</SideHead>
        {error ? (
          <ErrorState compact onRetry={q.retry} />
        ) : (
          <>
            <Gauge icon={Radio} label={tl(p.live.online.label)} value={live.online} outOf={Math.max(live.online, live.onlineOf)} outOfLabel={tl(p.live.online.ofLabel)} testId="online" />
            <Gauge icon={UserPlus} label={tl(p.live.today.label)} value={live.today} outOf={Math.max(live.today, live.todayOf)} outOfLabel={tl(p.live.today.ofLabel)} testId="today" />
            <div className="flex items-center gap-3 rounded-[13px] bg-surface-raised px-[0.9rem] py-[0.8rem]" data-live="lifetime">
              <div className="min-w-0 flex-1">
                <div className="text-[0.8rem] leading-[1.4] text-content-muted">{tl(p.live.lifetime.label)}</div>
                <div className="text-[11px] text-content-muted">{tl(p.live.lifetime.sub)}</div>
              </div>
              <span className="shrink-0 text-[1.3rem] font-bold tracking-[-0.02em] text-content">{formatMetric(live.lifetime, p.live.lifetime.format, p.currency)}</span>
            </div>
            <LiveCaption />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3" data-side-block="health">
        <SideHead>{t("dash.side.health")}</SideHead>
        {error ? (
          <ErrorState compact onRetry={q.retry} />
        ) : (
          <div className="rounded-[13px] bg-surface-raised px-[0.9rem] py-1">
            {p.health
              .filter((h) => h.side)
              .map((h, i, all) => (
                <HealthLine key={h.id} def={h} value={live.readings[h.id]} last={i === all.length - 1} />
              ))}
          </div>
        )}
        <Link to="/health" className="inline-flex min-h-11 items-center gap-1.5 self-start px-1 text-xs font-medium text-brand-700 hover:underline md:min-h-8">
          {t("dash.side.healthMore")}
        </Link>
      </div>
    </>
  );
}
