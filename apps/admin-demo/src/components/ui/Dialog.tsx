/**
 * The demo's one dialog: centred over a blurred backdrop, portalled to <body> (a `fixed` element
 * inside a transformed ancestor is positioned against THAT ancestor, not the window), named by its
 * title, and keyboard-complete through `useFocusTrap`. A press that starts inside and ends on the
 * backdrop does not close it: only a click that is entirely on the backdrop does.
 */
import { clsx } from "clsx";
import { X } from "lucide-react";
import { useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { t } from "@/i18n";

import { useFocusTrap } from "./useFocusTrap";

export function Dialog({
  onClose,
  title,
  sub,
  children,
  footer,
  className,
  bodyClassName,
  initialFocus,
  hideTitle = false,
  testId,
}: {
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  /** The palette names itself through its input; its header would only repeat it. */
  hideTitle?: boolean;
  testId?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const down = useRef<EventTarget | null>(null);
  useFocusTrap(panelRef, onClose, true, initialFocus);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid animate-fade-in place-items-center bg-black/45 p-3 backdrop-blur-sm sm:p-6"
      onPointerDown={(e) => (down.current = e.target)}
      onClick={(e) => {
        if (e.target === e.currentTarget && down.current === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
        className={clsx(
          "flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg animate-scale-in flex-col overflow-hidden rounded-2xl bg-surface shadow-overlay outline-none sm:max-h-[calc(100dvh-3rem)]",
          className,
        )}
      >
        <header className={clsx("flex items-start justify-between gap-3 border-b border-line px-5 py-4", hideTitle && "sr-only")}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-content">
              {title}
            </h2>
            {sub && <p className="mt-0.5 text-xs text-content-muted">{sub}</p>}
          </div>
          {!hideTitle && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("record.close")}
              className="-me-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-content-muted transition hover:bg-surface-hover hover:text-content md:h-9 md:w-9"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
        </header>
        <div className={clsx("scrollbar-thin min-h-0 flex-1 overflow-y-auto", bodyClassName ?? "p-5")}>{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
