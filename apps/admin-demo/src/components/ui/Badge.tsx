import { clsx } from "clsx";
import type { ReactNode } from "react";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

// Alpha-tinted fills read on both themes, and the `*-700` inks flip per theme in the palette, so a
// tone has ONE definition. Every pair is checked for 4.5:1 in src/theme/palette.test.ts.
const TONES: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-content-muted",
  brand: "bg-brand/15 text-brand-700",
  success: "bg-success-500/15 text-success-700",
  warning: "bg-warning-500/15 text-warning-700",
  danger: "bg-danger-500/15 text-danger-700",
  info: "bg-info-500/15 text-info-700",
};

export const DOTS: Record<Tone, string> = {
  neutral: "bg-content-subtle",
  brand: "bg-brand",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
};

/** A state label. The dot is never the only signal: the word beside it always says the state. */
export function Badge({ tone = "neutral", dot = false, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {dot && <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", DOTS[tone])} aria-hidden />}
      {children}
    </span>
  );
}
