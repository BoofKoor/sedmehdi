/**
 * A chart's card, with its text alternative one press away: every chart in the demo can be read as
 * a table, which is what a screen reader, a keyboard-only visitor, or anyone who wants an exact
 * figure gets. The toggle is a pressed/unpressed button, so it says which view is showing.
 */
import { clsx } from "clsx";
import { BarChart3, Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { t } from "@/i18n";

import { Card, CardHeader } from "../ui/Card";

export interface TableView {
  columns: { label: string; numeric?: boolean }[];
  rows: (string | number)[][];
  /** Rows to mark (today, still filling). */
  marked?: number[];
}

export function ChartCard({
  title,
  sub,
  legend,
  table,
  children,
  className,
  action,
  testId,
}: {
  title: string;
  sub?: ReactNode;
  legend?: ReactNode;
  table?: TableView;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  testId?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <Card className={clsx("flex flex-col", className)} aria-labelledby={id} data-testid={testId}>
      <CardHeader
        id={id}
        title={title}
        sub={sub}
        action={
          <>
            {action}
            {table && (
              <button
                type="button"
                aria-pressed={asTable}
                onClick={() => setAsTable((v) => !v)}
                aria-label={t("chart.asTableAria", { chart: title })}
                data-testid="chart-table-toggle"
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line-control px-2.5 text-xs font-medium text-content-muted transition hover:bg-surface-hover hover:text-content md:h-8"
              >
                {asTable ? <BarChart3 className="h-3.5 w-3.5" aria-hidden /> : <Table2 className="h-3.5 w-3.5" aria-hidden />}
                {asTable ? t("chart.asChart") : t("chart.asTable")}
              </button>
            )}
          </>
        }
      />
      {legend && !asTable && <div className="-mt-2 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-muted">{legend}</div>}
      {asTable && table ? <DataTable table={table} caption={title} /> : children}
    </Card>
  );
}

export function DataTable({ table, caption }: { table: TableView; caption: string }) {
  return (
    <div className="scrollbar-thin max-h-[22rem] overflow-auto rounded-xl ring-1 ring-line" data-testid="chart-table">
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface-raised">
          <tr>
            {table.columns.map((c) => (
              <th key={c.label} scope="col" className={clsx("whitespace-nowrap px-3 py-2 font-semibold text-content-muted", c.numeric ? "text-end" : "text-start")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {table.rows.map((r, i) => (
            <tr key={i} className={clsx(table.marked?.includes(i) && "bg-brand/[0.06]")}>
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="whitespace-nowrap px-3 py-1.5 text-start font-medium text-content">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className={clsx("whitespace-nowrap px-3 py-1.5 tabular-nums text-content", table.columns[j]?.numeric && "text-end")}>
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A legend entry: a swatch and the series name in ink (series colours are fills, not text). */
export function LegendItem({ color, label, dashed }: { color?: 1 | 2; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dashed ? (
        <svg width="14" height="2" aria-hidden className="text-content-muted">
          <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
        </svg>
      ) : (
        <i className="h-2 w-2 rounded-full" style={{ background: `rgb(var(--chart-${color ?? 1}))` }} aria-hidden />
      )}
      {label}
    </span>
  );
}
