/**
 * CSV export, built from the same arrays the screen renders. UTF-8 with a byte-order mark so
 * spreadsheet apps read Persian headers correctly; ISO dates and plain digits so the file is data,
 * not a picture of the screen.
 */

export type CsvCell = string | number | null | undefined;

function quote(v: CsvCell): string {
  if (v == null) return "";
  const s = typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : v;
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: CsvCell[][]): string {
  return "﻿" + rows.map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";
}

/** Parses what `toCsv` writes (used by the tests to read a file back). */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

/** Hands the file to the browser as a download; nothing leaves the page. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "fernloft-orders-2026-10-03.csv" */
export function csvName(...parts: (string | number)[]): string {
  return `${parts.map((p) => String(p).toLowerCase().replace(/[^a-z0-9-]+/g, "-")).join("-")}.csv`;
}
