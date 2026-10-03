/**
 * Loading, empty and failed: three states that need three different responses, so they never share
 * a look. A failed request must not render as an empty list (one asks for a retry, the other for
 * patience or data), and a skeleton must occupy exactly the box its content will, so the page does
 * not move when the content lands.
 */
import { clsx } from "clsx";
import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { t } from "@/i18n";

import { Button } from "./Button";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className={clsx(
        "relative block overflow-hidden rounded-md bg-surface-sunken",
        "after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-surface-hover after:to-transparent rtl:after:[animation-direction:reverse]",
        className,
      )}
    />
  );
}

/** Announces a region that is loading, once, without reading out the placeholder shapes. */
export function Loading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} aria-busy="true" data-state="loading">
      <span className="sr-only" role="status">
        {t("state.loading")}
      </span>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
  className,
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-center gap-3 px-6 py-10 text-center", className)} data-state="empty">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-content-muted">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-content">{title ?? t("state.empty")}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-content-muted">{message ?? t("state.emptyMsg")}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  onRetry,
  message,
  className,
  icon: Icon = AlertTriangle,
  compact = false,
}: {
  onRetry?: () => void;
  message?: ReactNode;
  className?: string;
  icon?: LucideIcon;
  /** One line and a retry, for the side panel's small blocks. */
  compact?: boolean;
}) {
  if (compact)
    return (
      <div role="alert" className={clsx("flex items-center gap-3 rounded-[13px] bg-danger-500/15 px-3 py-2.5", className)} data-state="error">
        <Icon className="h-4 w-4 shrink-0 text-danger-700" aria-hidden />
        <p className="min-w-0 flex-1 text-xs font-medium text-danger-700">{message ?? t("state.errorShort")}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
            {t("state.retry")}
          </Button>
        )}
      </div>
    );
  return (
    <div role="alert" className={clsx("flex flex-col items-center gap-3 px-6 py-10 text-center", className)} data-state="error">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-500/15 text-danger-700">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="max-w-sm text-sm text-content-muted">{message ?? t("state.error")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="h-4 w-4" aria-hidden />
          {t("state.retry")}
        </Button>
      )}
    </div>
  );
}
