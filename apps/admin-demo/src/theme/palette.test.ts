import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// @ts-expect-error -- a plain ESM script shared with the generator; it has no type declarations
import { SHARED, buildAll, contrast, over, toCss } from "../../scripts/palette.mjs";
import { BRANDS, PROFILE_IDS } from "../profiles/brands";

type Theme = Record<string, string>;
const all = buildAll() as Record<string, { light: Theme; dark: Theme }>;

/**
 * Every pair a component draws, with the WCAG threshold it must clear: 4.5:1 for text, 3:1 for
 * graphics and control boundaries. The grounds are the surfaces each ink actually lands on.
 */
function pairs(t: Theme): [string, string, string, number][] {
  const p: [string, string, string, number][] = [];
  const grounds = ["bg", "surface", "surface-sunken", "surface-raised", "nav"];
  for (const ink of ["text", "text-muted", "text-subtle"])
    for (const g of grounds) p.push([`${ink} on ${g}`, t[ink], t[g], 4.5]);
  for (const g of ["surface", "surface-sunken", "surface-raised"])
    p.push([`brand-700 on ${g}`, t["brand-700"], t[g], 4.5]);
  p.push(["brand-700 on a brand/15 badge", t["brand-700"], over(t["brand-500"], 0.15, t.surface), 4.5]);
  p.push(["button ink on the button", t["btn-primary-ink"], t["btn-primary"], 4.5]);
  p.push(["button against the card", t["btn-primary"], t.surface, 3]);
  p.push(["white on hero-a", "#FFFFFF", t["hero-a"], 4.5]);
  p.push(["white on hero-b", "#FFFFFF", t["hero-b"], 4.5]);
  p.push(["hero pill ink on white", t["hero-ink"], "#FFFFFF", 4.5]);
  for (const fill of ["brand-800", "brand-900"]) p.push([`avatar initials on ${fill}`, "#FFFFFF", t[fill], 4.5]);
  // The retention table's lighter cells carry body ink on brand tints.
  for (const a of [0.15, 0.3, 0.4]) p.push([`text on a brand/${a * 100} cell`, t.text, over(t["brand-500"], a, t.surface), 4.5]);
  for (const g of ["surface", "surface-sunken"]) {
    p.push([`control border on ${g}`, t["line-control"], t[g], 3]);
    p.push([`chart-1 on ${g}`, t["chart-1"], t[g], 3]);
    p.push([`chart-2 on ${g}`, t["chart-2"], t[g], 3]);
    p.push([`focus ring on ${g}`, t.ring, t[g], 3]);
    p.push([`brand icon on ${g}`, t["brand-500"], t[g], 3]);
  }
  for (const s of ["success", "warning", "danger", "info"]) {
    p.push([`${s} ink on the card`, t[`${s}-700`], t.surface, 4.5]);
    // A badge sits on a card or on a raised plate inside one (the health page's incidents).
    for (const g of ["surface", "surface-raised"]) p.push([`${s} ink on its tinted badge on ${g}`, t[`${s}-700`], over(t[`${s}-500`], 0.15, t[g]), 4.5]);
    p.push([`${s} dot on the card`, t[`${s}-500`], t.surface, 3]);
  }
  return p;
}

describe("business palettes", () => {
  for (const id of PROFILE_IDS) {
    for (const mode of ["light", "dark"] as const) {
      it(`${BRANDS[id].name} ${mode}: every drawn pair clears WCAG AA`, () => {
        const theme = { ...SHARED[mode], ...all[id][mode] } as Theme;
        const failures = pairs(theme)
          .map(([name, fg, bg, need]) => ({ name, ratio: contrast(fg, bg) as number, need }))
          .filter((r) => r.ratio < r.need)
          .map((r) => `${r.name}: ${r.ratio.toFixed(2)} < ${r.need}`);
        expect(failures).toEqual([]);
      });
    }
  }

  it("the committed stylesheet is what the generator writes", () => {
    const committed = readFileSync(fileURLToPath(new URL("./palettes.css", import.meta.url)), "utf8");
    expect(committed).toBe(toCss());
  });

  it("the five businesses have five different brand colours", () => {
    const fills = PROFILE_IDS.map((id) => all[id].light["brand-500"]);
    expect(new Set(fills).size).toBe(PROFILE_IDS.length);
  });
});
