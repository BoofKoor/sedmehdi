/**
 * One record, opened: its status (changeable here, for this tab only), every field, its last 30
 * days and its recent activity. Centred over a blurred backdrop, as the GozarX panel opens a user.
 */
import { useId } from "react";

import { MiniTrend } from "@/components/charts/Small";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { rowActivity, rowTrend, type Row } from "@/data/entities";
import { t, tl } from "@/i18n";
import { formatNumber, formatRelative } from "@/lib/format";
import type { EntityDef } from "@/profiles";
import { useAppState } from "@/state/AppState";
import { editKey, setEdit } from "@/state/edits";

import { recordName, recordSub, renderCell, statusOf } from "./cells";

export function RecordDialog({ entity: e, row, status, now, onClose }: { entity: EntityDef; row: Row; status: string; now: Date; onClose: () => void }) {
  const { profile: p, locale } = useAppState();
  const toast = useToast();
  const selectId = useId();
  const trend = rowTrend(p, e, row, now);
  const activity = rowActivity(p, e, row, now);
  const name = recordName(e, row.cells, locale);
  const statusCol = e.columns.find((c) => c.kind === "status");
  const sum = trend ? trend.reduce((a, b) => a + b.value, 0) : 0;

  const change = (next: string) => {
    setEdit(editKey(p.id, e.id, row.id), next);
    const s = statusOf(e, next);
    toast(t("records.statusChanged", { name, status: s ? tl(s.label) : next }));
  };

  return (
    <Dialog onClose={onClose} title={name} sub={recordSub(e, row.cells)} testId="record" className="max-w-xl">
      <div className="space-y-5">
        {statusCol && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-content-muted">
              {t("record.status")}
              {renderCell(p, e, statusCol, null, status, now, locale)}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-content-muted" id={selectId}>
                {t("record.setStatus")}
              </span>
              <select aria-labelledby={selectId} value={status} onChange={(ev) => change(ev.target.value)} className="field-control h-11 w-auto cursor-pointer md:h-9" data-testid="record-status">
                {e.statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {tl(s.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <section aria-labelledby={`${selectId}-d`}>
          <h3 id={`${selectId}-d`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
            {t("record.details")}
          </h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {e.columns
              .filter((c) => c.kind !== "status")
              .map((c) => (
                <div key={c.id} className="min-w-0">
                  <dt className="text-xs text-content-muted">{tl(c.label)}</dt>
                  <dd className="mt-0.5 truncate text-sm text-content">{renderCell(p, e, c, row.cells[c.id], status, now, locale)}</dd>
                </div>
              ))}
          </dl>
        </section>

        {trend && e.trend && (
          <section aria-labelledby={`${selectId}-t`}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h3 id={`${selectId}-t`} className="text-xs font-semibold uppercase tracking-wide text-content-muted">
                {tl(e.trend.label)} · {t("record.trend")}
              </h3>
              <span className="text-sm font-semibold text-content">{formatNumber(sum)}</span>
            </div>
            <div className="rounded-xl bg-surface-raised px-3 pt-3">
              <MiniTrend values={trend.map((x) => x.value)} ariaLabel={`${tl(e.trend.label)}, ${t("record.trend")}: ${formatNumber(sum)}`} />
            </div>
          </section>
        )}

        <section aria-labelledby={`${selectId}-a`}>
          <h3 id={`${selectId}-a`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
            {t(e.story ? "record.history" : "record.activity")}
          </h3>
          {activity.length === 0 && <p className="text-sm text-content-muted">{t("record.noActivity")}</p>}
          <ol className="space-y-2">
            {activity.map((a, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-content">{tl(a.text, { n: formatNumber(a.n) })}</span>
                <time className="shrink-0 text-xs text-content-muted" dateTime={new Date(a.at).toISOString()}>
                  {formatRelative(new Date(a.at), now)}
                </time>
              </li>
            ))}
          </ol>
        </section>
        <p className="text-xs text-content-muted">{t("record.saved")}</p>
      </div>
    </Dialog>
  );
}
