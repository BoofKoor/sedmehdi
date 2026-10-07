/**
 * The global keyboard shortcuts. Every one of them stands down while the visitor is typing in a
 * field or a dialog is open, so a letter typed into a search box is a letter, never a page change.
 * Ctrl/⌘+K is the exception that still works over the page (not inside a field), since it is how
 * the palette is reached.
 */
import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  palette(): void;
  help(): void;
  go(where: "d" | "1" | "2" | "h"): void;
  range(step: -1 | 1): void;
  business(): void;
  theme(): void;
  language(): void;
  search(): void;
}

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

const modalOpen = () => document.querySelector('[aria-modal="true"]') !== null;

export function useShortcuts(h: ShortcutHandlers): void {
  const ref = useRef(h);
  ref.current = h;

  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      const hh = ref.current;
      if (e.defaultPrevented || e.isComposing) return;
      if ((e.code === "KeyK" || e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey) && !e.altKey) {
        if (typing(e.target) || modalOpen()) return;
        e.preventDefault();
        hh.palette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || modalOpen()) return;
      // Typed while the menus are open, the letters belong to them.
      if (document.querySelector('[role="listbox"]:focus, [role="menu"] :focus')) return;

      // Physical keys (`code`), not characters: with a Persian layout active the T key types «ف»,
      // and a shortcut that only works in English is half a shortcut in a bilingual panel.
      const code = e.code;
      if (pendingG && Date.now() - pendingG < 1200) {
        pendingG = 0;
        const map: Record<string, "d" | "1" | "2" | "h"> = { KeyD: "d", Digit1: "1", Digit2: "2", KeyH: "h", Numpad1: "1", Numpad2: "2" };
        const where = map[code];
        if (where) {
          e.preventDefault();
          hh.go(where);
        }
        return;
      }
      if (e.key === "?" || (code === "Slash" && e.shiftKey)) hh.help();
      else if (e.shiftKey) return;
      else if (code === "KeyG") {
        pendingG = Date.now();
        return;
      } else if (code === "BracketLeft") hh.range(-1);
      else if (code === "BracketRight") hh.range(1);
      else if (code === "KeyB") hh.business();
      else if (code === "KeyT") hh.theme();
      else if (code === "KeyL") hh.language();
      else if (code === "Slash") hh.search();
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}
