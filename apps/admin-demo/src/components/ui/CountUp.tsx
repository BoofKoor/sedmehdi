/**
 * A number that counts to its value: from zero when it first appears, from the old value when it
 * changes. Reduce Motion shows the value at once.
 *
 * The final value is laid out as an invisible GHOST and the moving figure is drawn over it. The
 * demo's Latin face has proportional digits only (DM Sans ships no `tnum` in its latin subset), so
 * a counter laid out normally changes width on every frame and drags whatever sits beside it; the
 * ghost reserves the final width up front, and nothing around the number moves.
 *
 * The moving figure is pinned to the box's LEFT edge in both directions. Layout-shift scoring places
 * a text box by its top-left corner, so a Persian figure, right-aligned and growing leftwards, moved
 * that corner every frame and scored as a shift (0.011 on a phone) though nothing else moved. Pinned
 * left it grows rightwards into the ghost's box and ends exactly on the ghost.
 */
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/hooks/media";
import { dirFor } from "@/i18n";

const DURATION = 650;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const still = useReducedMotion();
  const [shown, setShown] = useState(still ? value : 0);
  const from = useRef(still ? value : 0);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (still || !Number.isFinite(value)) {
      setShown(value);
      return;
    }
    from.current = shownRef.current;
    if (from.current === value) return;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setShown(from.current + (value - from.current) * ease(t));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [value, still]);

  const final = format(value);
  const moving = shown !== value;
  return (
    <span className={`relative inline-block whitespace-nowrap ${className ?? ""}`} data-value={value}>
      {/* The ghost: reserves the final width, and stays what assistive technology reads (transparent
          ink keeps it in the accessibility tree, where `visibility: hidden` would drop it). */}
      <span className={moving ? "text-transparent" : undefined}>{final}</span>
      {moving && (
        <span aria-hidden className="absolute inset-0 flex justify-start" dir="ltr">
          <span dir={dirFor()}>{format(Math.round(shown * 100) / 100)}</span>
        </span>
      )}
    </span>
  );
}
