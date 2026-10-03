/**
 * What every modal surface owes the keyboard, in one place (ported from the GozarX panel's hook):
 * Esc closes · focus moves in on open and back to whatever had it on close · Tab cycles inside ·
 * the page behind stops scrolling.
 *
 * `onClose` is read through a ref, because callers pass inline arrows and an effect keyed on the
 * callback would tear the trap down on every parent render. Stacked traps (a confirmation over a
 * dialog) answer the keyboard innermost-first and release the scroll lock only when the last closes.
 */
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** TABBABLE descendants, hidden-ness read from attributes (layout lies for fixed elements). */
function tabbable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest("[hidden],[inert]") && el.getAttribute("aria-hidden") !== "true",
  );
}

const stack: symbol[] = [];

export function useFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  open = true,
  initialFocus?: RefObject<HTMLElement | null>,
): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol("trap");
    stack.push(id);
    const isTop = () => stack[stack.length - 1] === id;
    const before = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = tabbable(panelRef.current);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = panelRef.current?.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const html = document.documentElement;
    html.style.overflow = "hidden";
    (initialFocus?.current ?? tabbable(panelRef.current)[0] ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
      if (stack.length === 0) html.style.overflow = "";
      if (before && document.contains(before)) before.focus();
    };
  }, [panelRef, open, initialFocus]);
}
