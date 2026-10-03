/**
 * A small, mutually exclusive choice (the date range, a status filter), as a real radio group: one
 * tab stop on the checked option, arrows that step AND select (swapped in RTL, where the next option
 * sits to the left), Home and End. The GozarX panel's control, with 44px targets on phones.
 */
import { clsx } from "clsx";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** The accessible name when the label is terse ("7d"). */
  title?: string;
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  testId,
}: {
  value: T;
  onChange: (next: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
  testId?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const n = options.length;
    const next =
      e.key === (rtl ? "ArrowLeft" : "ArrowRight") || e.key === "ArrowDown"
        ? (index + 1) % n
        : e.key === (rtl ? "ArrowRight" : "ArrowLeft") || e.key === "ArrowUp"
          ? (index - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : null;
    if (next == null) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown} data-testid={testId} className={clsx("inline-flex items-center gap-0.5 rounded-xl bg-surface-sunken p-0.5", className)}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.title}
            tabIndex={i === index ? 0 : -1}
            onClick={() => onChange(opt.value)}
            data-value={opt.value}
            className={clsx(
              "inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] px-2.5 text-xs font-semibold tabular-nums transition md:min-h-8 md:min-w-0",
              active ? "bg-surface text-content shadow-card ring-1 ring-line-control" : "text-content-muted hover:text-content",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
