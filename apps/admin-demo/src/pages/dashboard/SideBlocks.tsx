/**
 * The dashboard's side panel: the key rates for the range, the live figures and the service health.
 * It belongs to the whole dashboard, not one tab, so switching tabs never moves the console (the
 * panel stays where it is); the shell shows its slot for every dashboard address.
 */
import { clsx } from "clsx";
import { Radio, UserPlus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { RADAR_ASPECT, RadarRates } from "@/components/charts/RadarRates";
import { CountUp } from "@/components/ui/CountUp";
import { EmptyState, ErrorState, Loading, Skeleton } from "@/components/ui/States";
import type { DashboardData } from "@/data/dashboard";
import type { DemoQuery } from "@/hooks/useDemoQuery";
import { t, tl } from "@/i18n";
import { formatMs, formatNumber, formatPct, formatTime } from "@/lib/format";
import { formatMetric } from "@/lib/metric";
import type { BusinessProfile, HealthDef } from "@/profiles";
import { Link } from "@/router";
import { isDegraded, useLive } from "@/state/Live";

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
      <b className="shrink-0 font-medium text-content" dir={def.kind === "nodes" ? "ltr" : undefined} style={{ unicodeBidi: "isolate" }} data-pair={def.kind === "nodes" || undefined}>
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

export function SideBlocks({ p, q }: { p: BusinessProfile; q: DemoQuery<DashboardData> }) {
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
            <Skeleton className="mx-auto w-full max-w-[340px] rounded-full opacity-60" style={{ aspectRatio: RADAR_ASPECT }} />
          </Loading>
        ) : d.empty ? (
          <EmptyState className="py-6" />
        ) : (
          <>
            <RadarRates axes={d.rates.map((r) => ({ label: tl(r.label), value: r.value, title: tl(r.full) }))} />
            <ul className="sr-only">
              {d.rates.map((r) => (
                <li key={r.label.en} data-rate={r.value ?? ""}>
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
            {/* Two fixed lines: the label over its period, the figure on its own line, so a business with
                a wider figure (money against terabytes) cannot wrap the label and grow the row. */}
            <div className="rounded-[13px] bg-surface-raised px-[0.9rem] py-[0.8rem]" data-live="lifetime">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[0.8rem] leading-[1.4] text-content-muted">{tl(p.live.lifetime.label)}</span>
                <span className="shrink-0 truncate text-[11px] text-content-muted">{tl(p.live.lifetime.sub)}</span>
              </div>
              <div className="mt-0.5 truncate text-[1.3rem] font-bold leading-tight tracking-[-0.02em] text-content">{formatMetric(live.lifetime, p.live.lifetime.format, p.currency)}</div>
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
