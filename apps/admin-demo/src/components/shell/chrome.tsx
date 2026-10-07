/**
 * The slot the shell owns and the dashboard fills: the side panel. At 1280px and up it is a second
 * panel beside the console (the GozarX design); below that the same subtree renders at the end of
 * the page, where the page scrolls it. A portal moves only the DOM node, so the panel's
 * hooks and data stay in the page that wrote it.
 */
import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useWide } from "@/hooks/media";

interface Chrome {
  sideHost: HTMLElement | null;
  setSideHost(el: HTMLElement | null): void;
}

const Ctx = createContext<Chrome | null>(null);

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [sideHost, setSideHost] = useState<HTMLElement | null>(null);
  return <Ctx.Provider value={{ sideHost, setSideHost }}>{children}</Ctx.Provider>;
}

export const useChrome = () => useContext(Ctx);

/** The side panel's rhythm, defined once because it is placed twice. `[&>*]:shrink-0`: a scrolling
 *  flex column whose children may shrink squeezes them instead of scrolling (the GozarX finding). */
export const SIDE_STACK = "flex flex-col gap-3 [&>*]:shrink-0";

export function SidePanel({ children, label }: { children: ReactNode; label: string }) {
  const chrome = useChrome();
  const wide = useWide();
  // Wide: the shell's slot, which it shows for every dashboard address from the first render (so
  // nothing moves when the panel fills). Until the slot's element exists (the first commit) nothing
  // is drawn rather than the inline copy, which would be painted once and then jump away.
  if (wide) return chrome?.sideHost ? createPortal(children, chrome.sideHost) : null;
  // Inline, the three blocks share one surface and sit side by side where there is room.
  return (
    <section aria-label={label} data-side="inline" className="mt-4 grid gap-x-6 gap-y-6 rounded-card bg-surface p-4 shadow-card md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
      {children}
    </section>
  );
}
