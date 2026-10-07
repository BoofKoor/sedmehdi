/**
 * A section's sub-navigation: links (each tab is an address, so Back and a shared link work), not
 * a `tablist`. The strip scrolls on a phone and FADES the edge that still has tabs behind it,
 * measured physically, because RTL Chromium counts `scrollLeft` down from zero (ported from the
 * GozarX panel's `NavTabs`, including its fix for the strip turning into a vertical scroller).
 */
import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

import { Link } from "@/router";

const FADE = "2rem";

function useEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const range = el.scrollWidth - el.clientWidth;
    const rtl = getComputedStyle(el).direction === "rtl";
    const min = rtl ? -range : 0;
    const max = rtl ? 0 : range;
    setEdges({ left: el.scrollLeft - min > 1, right: max - el.scrollLeft > 1 });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);
  const from = edges.left ? `transparent 0, black ${FADE}` : "black 0";
  const to = edges.right ? `black calc(100% - ${FADE}), transparent 100%` : "black 100%";
  const mask = `linear-gradient(to right, ${from}, ${to})`;
  return { ref, style: edges.left || edges.right ? { maskImage: mask, WebkitMaskImage: mask } : undefined };
}

export function NavTabs({
  items,
  label,
  className,
}: {
  items: { to: string; label: string; current: boolean }[];
  label: string;
  className?: string;
}) {
  const { ref, style } = useEdgeFade<HTMLDivElement>();
  return (
    <nav aria-label={label} className={clsx("min-w-0 border-b border-line", className)}>
      <div ref={ref} style={style} className="scrollbar-none -mb-px flex gap-1 overflow-x-auto overflow-y-hidden">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            current={it.current}
            className={clsx(
              "flex min-h-11 shrink-0 items-center border-b-2 px-3 text-[0.8rem] font-medium transition md:min-h-9",
              it.current ? "border-brand text-brand-700" : "border-transparent text-content-muted hover:border-line-strong hover:text-content",
            )}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
