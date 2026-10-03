/**
 * A business's records: users, accounts, orders, students, print jobs. One page for all of them,
 * driven by the entity's column definitions: search (in either language), a status filter, the
 * entity's own select filter, sortable columns, 25 rows a page, cards instead of a table on a
 * phone, a record dialog, and a CSV of every filtered, sorted row (not just the page on screen).
 */
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Download, Search, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, ErrorState, Loading, Skeleton } from "@/components/ui/States";
import { SortTH, TBody, TD, THead, TR, Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { csvName, downloadCsv } from "@/data/csv";
import { buildRows, type Row } from "@/data/entities";
import { recordsCsv } from "@/data/exports";
import { cellText } from "@/data/gen";
import { useDebouncedValue, usePhone } from "@/hooks/media";
import { useDemoQuery } from "@/hooks/useDemoQuery";
import { t, tl } from "@/i18n";
import { formatNumber, isoDate } from "@/lib/format";
import type { EntityDef } from "@/profiles";
import { useAppState } from "@/state/AppState";
import { editKey, useEdits } from "@/state/edits";

import { NUMERIC, foldQuery, recordName, renderCell, searchText, sortKey } from "./records/cells";
import { RecordDialog } from "./records/RecordDialog";

const PAGE = 25;

export default function Records({ index }: { index: 0 | 1 }) {
  const { profile: p, locale } = useAppState();
  const e: EntityDef = p.entities[index];
  const toast = useToast();
  const phone = usePhone();
  const edits = useEdits();
  const q = useDemoQuery(`rows|${p.id}|${e.id}`, (mode) => ({ rows: mode === "empty" ? [] : buildRows(p, e, new Date()), now: new Date() }));

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: e.sort.column, dir: e.sort.dir });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Row | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const settled = useDebouncedValue(query);

  // A new business or table starts clean: its filters, its own default sort, page one.
  useEffect(() => {
    setQuery("");
    setStatus("all");
    setFilter("all");
    setSort({ col: e.sort.column, dir: e.sort.dir });
    setPage(1);
    setOpen(null);
  }, [p.id, e.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // "/" from anywhere on the page puts the cursor in the search box.
  useEffect(() => {
    const focus = () => search.current?.focus();
    addEventListener("demo:search", focus);
    return () => removeEventListener("demo:search", focus);
  }, []);

  const statusOfRow = (r: Row) => edits[editKey(p.id, e.id, r.id)] ?? String(r.cells.status);
  const filterCol = e.filter ? e.columns.find((c) => c.id === e.filter!.column) : undefined;

  const filterOptions = useMemo(() => {
    if (!filterCol || !q.data) return [];
    const seen = new Map<string, string>();
    for (const r of q.data.rows) {
      const v = r.cells[filterCol.id];
      const key = cellText(v, "en");
      if (!seen.has(key)) seen.set(key, cellText(v, locale));
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], locale));
  }, [filterCol, q.data, locale]);

  const visible = useMemo(() => {
    if (!q.data) return [];
    const needle = foldQuery(settled.trim());
    const col = e.columns.find((c) => c.id === sort.col) ?? e.columns[0];
    const rows = q.data.rows.filter((r) => {
      const st = statusOfRow(r);
      if (status !== "all" && st !== status) return false;
      if (filterCol && filter !== "all" && cellText(r.cells[filterCol.id], "en") !== filter) return false;
      return !needle || searchText(e, r.cells, st).includes(needle);
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      const ka = sortKey(e, col, a.cells[col.id], statusOfRow(a), locale);
      const kb = sortKey(e, col, b.cells[col.id], statusOfRow(b), locale);
      const c = typeof ka === "number" && typeof kb === "number" ? ka - kb : String(ka).localeCompare(String(kb), locale);
      return c !== 0 ? c * dir : a.index - b.index;
    });
  }, [q.data, settled, status, filter, sort, locale, edits, e]); // eslint-disable-line react-hooks/exhaustive-deps

  // The page belongs to its filters: a changed filter reads as page one in the same render.
  const filterKey = `${settled}|${status}|${filter}|${sort.col}|${sort.dir}`;
  const [pageKey, setPageKey] = useState(filterKey);
  const current = pageKey === filterKey ? page : 1;
  const goPage = (n: number) => {
    setPageKey(filterKey);
    setPage(n);
  };
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const at = Math.min(current, pages);
  const shown = visible.slice((at - 1) * PAGE, at * PAGE);
  const total = q.data?.rows.length ?? 0;
  const now = q.data?.now ?? new Date();

  const toggleSort = (col: string) =>
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: NUMERIC.has(e.columns.find((c) => c.id === col)!.kind) ? "desc" : "asc" }));

  const exportCsv = () => {
    const file = csvName(p.brand.name, e.path, isoDate(new Date()));
    downloadCsv(file, recordsCsv(p, e, visible, locale, statusOfRow));
    toast(t("dash.csv.done", { file }));
  };

  const clear = () => {
    setQuery("");
    setStatus("all");
    setFilter("all");
  };
  const filtered = query !== "" || status !== "all" || filter !== "all";

  return (
    <div data-page="records" data-entity={e.id}>
      <PageTitle title={tl(e.label)} sub={t("records.sub", { n: formatNumber(total), things: tl(e.things) })} />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <label className="relative min-w-0 flex-1 basis-[14rem]">
            <span className="sr-only">{t("table.searchAria", { things: tl(e.things) })}</span>
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-content-muted" aria-hidden />
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              placeholder={t("table.search", { things: tl(e.things) })}
              className="field-control h-11 ps-9 md:h-9"
              data-testid="records-search"
            />
          </label>
          {filterCol && (
            <label className="relative">
              <span className="sr-only">{tl(e.filter!.label)}</span>
              <select value={filter} onChange={(ev) => setFilter(ev.target.value)} className="field-control h-11 w-auto cursor-pointer pe-8 md:h-9" data-testid="records-filter">
                <option value="all">
                  {tl(e.filter!.label)}: {t("records.anyValue")}
                </option>
                {filterOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={q.status !== "ready" || visible.length === 0} data-testid="records-csv">
            <Download className="h-4 w-4" aria-hidden />
            {t("table.csv", { n: formatNumber(visible.length) })}
          </Button>
          <div className="w-full">
            <Segmented
              value={status}
              onChange={setStatus}
              ariaLabel={t("table.statusFilter")}
              testId="records-status"
              className="flex-wrap"
              options={[{ value: "all", label: t("table.all") }, ...e.statuses.map((s) => ({ value: s.id, label: tl(s.label) }))]}
            />
          </div>
        </div>

        <p className="px-4 pb-1 pt-3 text-xs text-content-muted" aria-live="polite" data-testid="records-count" data-count={visible.length}>
          {q.status === "ready" && visible.length > 0
            ? t("records.showing", { from: formatNumber((at - 1) * PAGE + 1), to: formatNumber((at - 1) * PAGE + shown.length), n: formatNumber(visible.length) })
            : " "}
        </p>

        {q.status === "error" ? (
          <ErrorState onRetry={q.retry} />
        ) : q.status === "loading" ? (
          <Loading className="space-y-px p-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[49px] w-full rounded-none" />
            ))}
          </Loading>
        ) : total === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t("table.noMatch")}
            message={t("table.noMatchMsg")}
            action={
              filtered ? (
                <Button variant="outline" size="sm" onClick={clear}>
                  {t("table.clear")}
                </Button>
              ) : undefined
            }
          />
        ) : phone ? (
          <ul className="divide-y divide-line" data-testid="records-cards">
            {shown.map((r) => {
              const cols = e.columns.slice(1).filter((c) => !c.secondary && c.kind !== "status");
              const st = statusOfRow(r);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(r)} className="block w-full px-4 py-3 text-start transition hover:bg-surface-hover" data-row={r.id}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0">{renderCell(p, e, e.columns[0], r.cells[e.columns[0].id], st, now, locale, true)}</span>
                      {renderCell(p, e, e.columns.find((c) => c.kind === "status")!, null, st, now, locale)}
                    </span>
                    <span className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      {cols.slice(0, 4).map((c) => (
                        <span key={c.id} className="min-w-0">
                          <span className="block text-content-muted">{tl(c.label)}</span>
                          <span className="block truncate text-sm text-content">{renderCell(p, e, c, r.cells[c.id], st, now, locale)}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Table label={tl(e.label)} className="border-t border-line">
            <THead>
              <tr>
                {e.columns.map((c) => (
                  <SortTH key={c.id} label={tl(c.label)} numeric={NUMERIC.has(c.kind)} dir={sort.col === c.id ? sort.dir : null} onSort={() => toggleSort(c.id)} />
                ))}
              </tr>
            </THead>
            <TBody>
              {shown.map((r) => {
                const st = statusOfRow(r);
                const edited = edits[editKey(p.id, e.id, r.id)] != null;
                return (
                  <TR key={r.id} onOpen={() => setOpen(r)} label={t("table.open", { name: recordName(e, r.cells, locale) })}>
                    {e.columns.map((c) => (
                      <TD key={c.id} className={clsx(NUMERIC.has(c.kind) && "text-end tabular-nums", "whitespace-nowrap")}>
                        {renderCell(p, e, c, r.cells[c.id], st, now, locale)}
                        {c.kind === "status" && edited && <span className="ms-1.5 text-[10px] text-content-muted">{t("records.edited")}</span>}
                      </TD>
                    ))}
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        {q.status === "ready" && pages > 1 && (
          <nav aria-label={t("table.page", { n: formatNumber(at), total: formatNumber(pages) })} className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
            <Button variant="outline" size="sm" iconOnly aria-label={t("table.prev")} disabled={at <= 1} onClick={() => goPage(at - 1)}>
              <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </Button>
            <span className="text-xs text-content-muted">{t("table.page", { n: formatNumber(at), total: formatNumber(pages) })}</span>
            <Button variant="outline" size="sm" iconOnly aria-label={t("table.next")} disabled={at >= pages} onClick={() => goPage(at + 1)}>
              <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </Button>
          </nav>
        )}
      </Card>

      {open && <RecordDialog entity={e} row={open} status={statusOfRow(open)} now={now} onClose={() => setOpen(null)} />}
    </div>
  );
}
