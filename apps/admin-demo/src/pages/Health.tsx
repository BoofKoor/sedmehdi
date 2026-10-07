/**
 * Service health: the live probes (moving every few seconds, paused with the tab, still under
 * Reduce Motion), ninety days of uptime per service, resource use, and recent incidents. Every
 * state is said in words as well as colour: a dot is never the only signal.
 */
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Cpu, HardDrive, MemoryStick } from "lucide-react";

import { MiniTrend } from "@/components/charts/Small";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { PageTitle } from "@/components/ui/PageTitle";
import { ErrorState, Loading, Skeleton } from "@/components/ui/States";
import { dateOf, dayNumber } from "@/data/calendar";
import { uptimeDays, uptimeOf } from "@/data/health";
import { useDemoQuery } from "@/hooks/useDemoQuery";
import { t, tl } from "@/i18n";
import { formatDate, formatDuration, formatMs, formatNumber, formatPct, formatTime } from "@/lib/format";
import type { HealthDef } from "@/profiles";
import { useAppState } from "@/state/AppState";
import { isDegraded, useLive } from "@/state/Live";

function reading(def: HealthDef, v: number): string {
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

const LEVEL = {
  ok: { cls: "bg-success-500", key: "health.day.ok" },
  minor: { cls: "bg-warning-500", key: "health.day.minor" },
  major: { cls: "bg-danger-500", key: "health.day.major" },
} as const;

export default function Health() {
  const { profile: p } = useAppState();
  const live = useLive();
  // The history is generated, not live, so it loads like any other request (and can fail).
  const q = useDemoQuery(`health|${p.id}`, () => {
    const today = dayNumber(new Date());
    return { today, uptime: p.health.map((def) => ({ def, days: uptimeDays(p, def, today) })) };
  });
  const degraded = p.health.filter((h) => isDegraded(h, live.readings[h.id]));
  const ok = degraded.length === 0;

  return (
    <div data-page="health">
      <PageTitle title={tl(p.copy.health)} sub={t("health.sub")} />

      <div
        role="status"
        className={clsx("mb-4 flex items-center gap-3 rounded-card px-4 py-3 text-sm font-semibold", ok ? "bg-success-500/15 text-success-700" : "bg-warning-500/15 text-warning-700")}
        data-testid="health-banner"
      >
        {ok ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> : <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />}
        <span className="flex-1">{ok ? t("health.allOk") : t("health.someSlow", { n: formatNumber(degraded.length) })}</span>
        <span className="text-xs font-normal">
          {live.status === "running" ? t("dash.live.updated", { time: formatTime(live.updatedAt, true) }) : live.status === "paused" ? t("dash.live.paused") : t("dash.live.still")}
        </span>
      </div>

      <section aria-label={t("health.probes")} className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {p.health.map((def) => {
          const v = live.readings[def.id];
          const bad = isDegraded(def, v);
          return (
            <Card key={def.id} className="flex flex-col gap-3" data-probe={def.id}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-content">{tl(def.name)}</h2>
                <Badge tone={bad ? "warning" : "success"} dot>
                  {t(bad ? "health.slow" : "health.ok")}
                </Badge>
              </div>
              <div className="text-[1.6rem] font-bold leading-none tracking-[-0.02em] text-content">
                {/* An "up / total" pair reads left to right in both languages; dir on the inline run, not the block,
                    which would also move it to the card's left edge in Persian. */}
                {def.kind === "nodes" ? (
                  <span dir="ltr" style={{ unicodeBidi: "isolate" }} data-pair>
                    {reading(def, v)}
                  </span>
                ) : (
                  <CountUp value={v} format={(n) => reading(def, n)} />
                )}
              </div>
              <MiniTrend values={live.history[def.id] ?? []} className="h-10" />
              <p className="text-[11px] text-content-muted">{t(def.kind === "latency" ? "health.probeTrend" : "health.probeTrendOther")}</p>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" aria-labelledby="uptime-title">
          <CardHeader
            id="uptime-title"
            title={t("health.uptime")}
            action={
              <span className="flex flex-wrap items-center gap-3 text-[11px] text-content-muted">
                {(["ok", "minor", "major"] as const).map((l) => (
                  <span key={l} className="inline-flex items-center gap-1.5">
                    <i className={clsx("h-2.5 w-2.5 rounded-sm", LEVEL[l].cls)} aria-hidden />
                    {t(LEVEL[l].key)}
                  </span>
                ))}
              </span>
            }
          />
          {q.status === "error" ? (
            <ErrorState onRetry={q.retry} />
          ) : !q.data ? (
            <Loading className="space-y-5">
              {p.health.map((h) => (
                <Skeleton key={h.id} className="h-[42px] w-full" />
              ))}
            </Loading>
          ) : (
            <ul className="space-y-4" data-testid="uptime">
              {q.data.uptime.map(({ def, days }) => {
                const total = uptimeOf(days);
                const issues = days.filter((d) => d.level !== "ok").length;
                return (
                  <li key={def.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                      <span className="font-medium text-content">{tl(def.name)}</span>
                      <span className="tabular-nums text-content-muted">{formatPct(total, 2)}</span>
                    </div>
                    <div
                      role="img"
                      aria-label={t("health.uptimeAria", { name: tl(def.name), pct: formatPct(total, 2), n: formatNumber(issues) })}
                      className="flex h-6 gap-px sm:gap-[2px]"
                    >
                      {days.map((d) => (
                        <span
                          key={d.day}
                          title={t("health.uptimeDay", { date: formatDate(dateOf(d.day)), pct: `${formatPct(d.pct, 2)} · ${t(LEVEL[d.level].key)}` })}
                          className={clsx("min-w-0 flex-1 rounded-[1px] sm:rounded-[2px]", LEVEL[d.level].cls, d.level === "ok" && "opacity-70")}
                        />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card aria-labelledby="res-title">
            <CardHeader id="res-title" title={t("health.resources")} />
            <ul className="space-y-4">
              {(
                [
                  ["cpu", Cpu, live.resources.cpu],
                  ["memory", MemoryStick, live.resources.memory],
                  ["disk", HardDrive, live.resources.disk],
                ] as const
              ).map(([key, Icon, v]) => (
                <li key={key} data-resource={key}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 text-content-muted">
                      <Icon className="h-4 w-4" aria-hidden />
                      {t(`health.${key}` as const)}
                    </span>
                    <b className="font-semibold tabular-nums text-content">{formatPct(v, 0)}</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v}%`, background: v > 85 ? "rgb(var(--warning-500))" : "rgb(var(--chart-1))" }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card aria-labelledby="inc-title">
            <CardHeader id="inc-title" title={t("health.incidents")} />
            <ol className="space-y-3">
              {p.incidents.map((inc) => {
                const def = p.health.find((h) => h.id === inc.service);
                const when = dateOf(dayNumber(new Date()) - inc.daysAgo);
                return (
                  <li key={inc.title.en} className="rounded-xl bg-surface-raised px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-content">{tl(inc.title)}</p>
                      <Badge tone="success">{t("health.resolved")}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-content-muted">
                      {def ? `${tl(def.name)} · ` : ""}
                      {formatDate(when)} · {t("health.lasted", { d: formatDuration(inc.minutes) })}
                    </p>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
