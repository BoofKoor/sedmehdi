/**
 * A floating panel anchored under a button: the Business picker's list and the Demo menu.
 *
 * Portalled to <body> and positioned against the window, aligned to the anchor's reading-START
 * edge and kept inside the viewport. A press outside closes it; Esc closes it and hands focus back
 * to the button that opened it, which is where the keyboard user was.
 */
import { clsx } from "clsx";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const MARGIN = 8;

export function Popover({
  anchor,
  open,
  onClose,
  children,
  className,
  width = 320,
  id,
}: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: (reason: "outside" | "escape" | "tab") => void;
  children: ReactNode;
  className?: string;
  width?: number;
  id?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const place = useCallback(() => {
    const a = anchor.current?.getBoundingClientRect();
    if (!a) return;
    const vw = document.documentElement.clientWidth;
    const w = Math.min(width, vw - MARGIN * 2);
    const rtl = getComputedStyle(document.documentElement).direction === "rtl";
    let left = rtl ? a.right - w : a.left;
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
    setPos({ top: a.bottom + 6, left, width: w });
  }, [anchor, width]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => {
      removeEventListener("resize", place);
      removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      closeRef.current("outside");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current("escape");
        anchor.current?.focus();
      } else if (e.key === "Tab") {
        closeRef.current("tab");
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchor]);

  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={panel}
      id={id}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      className={clsx("fixed z-[65] max-h-[calc(100dvh-6rem)] animate-scale-in overflow-y-auto rounded-2xl bg-surface p-1.5 shadow-overlay ring-1 ring-line", className)}
    >
      {children}
    </div>,
    document.body,
  );
}
