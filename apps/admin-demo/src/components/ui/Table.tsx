/**
 * Table primitives. A table is FLUSH with its card (the header band runs the card's full width),
 * the wrapper owns the horizontal scroll so a wide table never slides the page sideways, and a row
 * that opens something is a control: focusable, Enter/Space, and named for the record it opens.
 */
import { clsx } from "clsx";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { t } from "@/i18n";

export function Table({ children, label, className, minWidth = "min-w-[640px]" }: { children: ReactNode; label: string; className?: string; minWidth?: string }) {
  return (
    <div className={clsx("scrollbar-thin overflow-x-auto", className)}>
      <table aria-label={label} className={clsx("w-full border-collapse text-sm", minWidth)}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-raised">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({ children, onOpen, label, className }: { children: ReactNode; onOpen?: () => void; label?: string; className?: string }) {
  return (
    <tr
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? label : undefined}
      className={clsx(onOpen && "cursor-pointer hover:bg-surface-hover focus-visible:relative focus-visible:z-10", "transition-colors", className)}
    >
      {children}
    </tr>
  );
}

export function TH({ children, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th scope="col" className={clsx("px-4 py-2.5 text-start text-xs font-semibold text-content-muted", className)} {...rest}>
      {children}
    </th>
  );
}

/** A sortable column header: the button sorts, `aria-sort` on the cell says how. */
export function SortTH({
  label,
  dir,
  onSort,
  numeric,
}: {
  label: string;
  dir: "asc" | "desc" | null;
  onSort: () => void;
  numeric?: boolean;
}) {
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"} className={clsx("px-2 py-1.5 text-xs font-semibold text-content-muted", numeric ? "text-end" : "text-start")}>
      <button
        type="button"
        onClick={onSort}
        title={t("table.sortBy", { col: label })}
        className={clsx("inline-flex min-h-8 items-center gap-1 rounded-lg px-2 transition hover:bg-surface-hover hover:text-content", numeric && "flex-row-reverse", dir && "text-content")}
      >
        {label}
        <Icon className={clsx("h-3.5 w-3.5 shrink-0", !dir && "opacity-50")} aria-hidden />
      </button>
    </th>
  );
}

export function TD({ children, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={clsx("px-4 py-2.5 align-middle text-content", className)} {...rest}>
      {children}
    </td>
  );
}
