import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * A card is separated from the well by its own SURFACE, never by a border: a 1px ring around every
 * panel is what makes a dense console read boxy and flat (the GozarX panel's own finding).
 */
export function Card({
  className,
  children,
  padded = true,
  as: Tag = "section",
  ...rest
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
  as?: "section" | "div" | "article";
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  return (
    <Tag className={clsx("min-w-0 rounded-card bg-surface shadow-card", padded && "p-card", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** A card's title row: the title and its caption on one side, actions on the other. */
export function CardHeader({
  id,
  title,
  sub,
  action,
  className,
}: {
  id?: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-content">
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-xs text-content-muted">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
