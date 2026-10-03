/**
 * The slot the shell owns and the dashboard fills: the live side panel. At 1280px and up it is a
 * second panel beside the console (the GozarX design); below that the same subtree renders at the
 * end of the page, where the page scrolls it. A portal moves only the DOM node, so the panel's
 * hooks and data stay in the page that wrote it.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useWide } from "@/hooks/media";

interface Chrome {
  sideHost: HTMLElement | null;
  setSideHost(el: HTMLElement | null): void;
  sideFilled: boolean;
  claimSide(on: boolean): void;
}

const Ctx = createContext<Chrome | null>(null);

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [sideHost, setSideHost] = useState<HTMLElement | null>(null);
  // A counter, not a flag: the incoming page can mount before the outgoing one unmounts.
  const [claims, setClaims] = useState(0);
  const claimSide = useCallback((on: boolean) => setClaims((n) => Math.max(0, n + (on ? 1 : -1))), []);
  return <Ctx.Provider value={{ sideHost, setSideHost, sideFilled: claims > 0, claimSide }}>{children}</Ctx.Provider>;
}

export const useChrome = () => useContext(Ctx);

/** The side panel's rhythm, defined once because it is placed twice. `[&>*]:shrink-0`: a scrolling
 *  flex column whose children may shrink squeezes them instead of scrolling (the GozarX finding). */
export const SIDE_STACK = "flex flex-col gap-3 [&>*]:shrink-0";

export function SidePanel({ children, label }: { children: ReactNode; label: string }) {
  const chrome = useChrome();
  const wide = useWide();
  const claim = chrome?.claimSide;
  useEffect(() => {
    if (!claim) return;
    claim(true);
    return () => claim(false);
  }, [claim]);
  if (wide && chrome?.sideHost) return createPortal(children, chrome.sideHost);
  // Inline, the three blocks share one surface and sit side by side where there is room.
  return (
    <section aria-label={label} data-side="inline" className="grid gap-x-6 gap-y-6 rounded-card bg-surface p-4 shadow-card md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
      {children}
    </section>
  );
}
