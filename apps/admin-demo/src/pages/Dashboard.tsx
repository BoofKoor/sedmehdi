/**
 * The dashboard: four sections behind one range control. The range and the CSV sit in ONE row
 * above everything they scope, beside the section links, so the control and what it moves are
 * never apart. All four sections read the same generated data, so switching section never
 * reloads, while switching range or business does (with skeletons, as a real panel would).
 */
import { Download } from "lucide-react";
import { lazy, Suspense } from "react";

import { Button } from "@/components/ui/Button";
import { NavTabs } from "@/components/ui/NavTabs";
import { PageTitle } from "@/components/ui/PageTitle";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { downloadCsv, csvName } from "@/data/csv";
import { buildDashboard, type DashboardData } from "@/data/dashboard";
import { dashboardCsv } from "@/data/exports";
import { useDemoQuery, type DemoQuery } from "@/hooks/useDemoQuery";
import { t } from "@/i18n";
import { formatNumber, isoDate } from "@/lib/format";
import type { DashTab } from "@/router";
import { RANGES, useAppState } from "@/state/AppState";

import { Overview } from "./dashboard/Overview";

const Growth = lazy(() => import("./dashboard/Growth"));
const Retention = lazy(() => import("./dashboard/Retention"));
const Behaviour = lazy(() => import("./dashboard/Behaviour"));

export function useDashboardQuery(): DemoQuery<DashboardData> {
  const { profile, range } = useAppState();
  return useDemoQuery(`dash|${profile.id}|${range}`, (mode) => buildDashboard(profile, range, new Date(), mode === "empty"));
}

export function Dashboard({ tab }: { tab: DashTab }) {
  const { profile, range, setRange } = useAppState();
  const toast = useToast();
  const q = useDashboardQuery();
  const days = formatNumber(range);

  const exportCsv = () => {
    if (!q.data) return;
    const file = csvName(profile.brand.name, tab, `${range}d`, isoDate(new Date()));
    downloadCsv(file, dashboardCsv(profile, q.data, tab));
    toast(t("dash.csv.done", { file }));
  };

  const tabs = (["overview", "growth", "retention", "behaviour"] as const).map((id) => ({
    to: id === "overview" ? "/" : `/${id}`,
    label: t(`dash.tab.${id}` as const),
    current: tab === id,
  }));

  return (
    <div data-page="dashboard" data-tab={tab}>
      <PageTitle title={t("dash.title")} sub={t("dash.sub", { days })} />
      <div className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-3">
        <NavTabs items={tabs} label={t("dash.tabs")} className="min-w-0 flex-1 basis-[20rem]" />
        <div className="flex items-center gap-2">
          <Segmented
            value={range}
            onChange={setRange}
            ariaLabel={t("dash.range")}
            testId="range"
            options={RANGES.map((n) => ({ value: n, label: t("dash.range.days", { n: formatNumber(n) }), title: t("dash.range.full", { n: formatNumber(n) }) }))}
          />
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={q.status !== "ready"} data-testid="dash-csv">
            <Download className="h-4 w-4" aria-hidden />
            <span>{t("dash.csv")}</span>
          </Button>
        </div>
      </div>
      {tab === "overview" ? (
        <Overview q={q} />
      ) : (
        <Suspense fallback={<TabFallback />}>
          {tab === "growth" && <Growth q={q} />}
          {tab === "retention" && <Retention q={q} />}
          {tab === "behaviour" && <Behaviour q={q} />}
        </Suspense>
      )}
    </div>
  );
}

function TabFallback() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
      <Skeleton className="h-80 rounded-card lg:col-span-2" />
      <Skeleton className="h-72 rounded-card" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
