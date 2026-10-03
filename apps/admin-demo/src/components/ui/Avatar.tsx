import { clsx } from "clsx";

import { hash32 } from "@/data/prng";

/**
 * An identity circle whose colour follows the person, never one shared grey: a column of identical
 * circles carries no information. Four deep shades of the business's own hue, each carrying white
 * initials at 4.5:1 or better in both themes (src/theme/palette.test.ts).
 */
const TONES = ["bg-hero-a", "bg-brand-800", "bg-hero-b", "bg-brand-900"];

export function Avatar({ initials, seed, className }: { initials: string; seed: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("grid shrink-0 place-items-center rounded-full text-[0.68rem] font-bold text-white", TONES[hash32(seed) % TONES.length], className ?? "h-8 w-8")}
      style={{ unicodeBidi: "isolate" }}
    >
      {initials}
    </span>
  );
}
