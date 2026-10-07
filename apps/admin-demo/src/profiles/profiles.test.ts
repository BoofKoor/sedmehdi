/**
 * The profiles' own promises: five figures each, levels read from lifetimes that agree with the
 * windowed figures to the unit, the hosting business's KPIs computed from one another, the old
 * business id still opening the one that replaced it, and none of the retired VPN vocabulary left
 * in any word of copy.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildDashboard } from "@/data/dashboard";
import { buildRows } from "@/data/entities";
import { windowStats } from "@/data/model";
import { DATACENTERS } from "@/data/names";
import { UI } from "@/i18n/ui";

import { LEGACY_PROFILES, PROFILE_IDS, PROFILE_LIST, PROFILES, resolveProfileId, type BusinessProfile } from ".";

const NOW = new Date(2026, 9, 3, 14, 5);
const RANGES = [7, 14, 30, 90] as const;

/** Words from the business the demo no longer models, in both languages (whole words only). */
export const RETIRED = /\b(vpn|configs?|claim(s|ed|ing)?|squads?|trials?)\b|کانفیگ|آزمایشی|وی‌پی‌ان|فیلترشکن|اسکواد/i;

/** Every string anywhere inside a value, with the path it was found at. */
function strings(v: unknown, path = "", out: [string, string][] = []): [string, string][] {
  if (typeof v === "string") out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) strings(x, `${path}.${k}`, out);
  return out;
}

describe.each(PROFILE_LIST.map((p) => [p.id, p] as [string, BusinessProfile]))("%s", (_id, p) => {
  it("has a hero and four windowed figures, each with copy in both languages", () => {
    expect(p.kpis).toHaveLength(5);
    for (const k of p.kpis) {
      expect(k.label.en.trim()).not.toBe("");
      expect(k.label.fa.trim()).not.toBe("");
    }
    expect(new Set(p.kpis.map((k) => k.id)).size).toBe(5);
  });

  it("peels each window off the lifetime exactly", () => {
    for (const r of RANGES) {
      const s = windowStats(p, r, NOW);
      const sums = ["primary", "secondary", ...Object.entries(p.streams).filter(([, d]) => d.kind !== "level").map(([n]) => n)];
      for (const name of sums) {
        // Exact to the unit while the lifetime is a safe integer; a byte count (bandwidth) is past
        // 2^53 after a few years, so there the peel is exact to doubles' precision instead.
        const same = (x: number, y: number) => (Math.abs(s.life(name)) < Number.MAX_SAFE_INTEGER ? expect(x).toBe(y) : expect(Math.abs(x - y)).toBeLessThanOrEqual(Math.abs(s.life(name)) * 1e-14));
        same(s.life(name) - s.life(name, 1), s.cur(name));
        same(s.life(name, 1) - s.life(name, 2), s.prev(name));
      }
      expect(s.total).toBe(s.life("secondary"));
    }
  });

  it("keeps the retired vocabulary out of every word", () => {
    const found = strings(p).filter(([, s]) => RETIRED.test(s));
    expect(found).toEqual([]);
  });

  it("names a due date so it reads on either side of the day: \"Due 3 days ago\", never \"Renews 3 weeks ago\"", () => {
    // A due column prints a date ahead ("in 2 weeks") or one passed ("3 weeks ago", a lapsed renewal): its label
    // has to be a noun that both read after, not a verb in the present tense.
    for (const c of p.entities.flatMap((e) => e.columns).filter((c) => c.kind === "due")) {
      expect(c.label.en).toMatch(/\bdue$/i);
      expect(c.label.fa.trim()).not.toBe("");
    }
  });
});

describe("hosting", () => {
  const p = PROFILES.hosting;

  it("reads every figure from the same streams", () => {
    for (const r of RANGES) {
      const s = windowStats(p, r, NOW);
      const d = buildDashboard(p, r, NOW);
      const running = s.life("primary") - s.life("deleted");
      const before = s.life("primary", 1) - s.life("deleted", 1);
      // The servers running now are the ones at the window's start plus what the window added.
      expect(running - before).toBe(s.cur("primary") - s.cur("deleted"));
      expect(d.hero.kpi.value).toBe(running);
      expect(d.hero.kpi.scope).toBe("now");
      const k = Object.fromEntries(d.kpis.map((x) => [x.id, x]));
      expect(k.orders.value).toBe(s.cur("orders"));
      expect(k.mrr.value).toBeCloseTo(running * s.cur("price"), 6);
      expect(k.mrr.previous).toBeCloseTo(before * s.prev("price"), 6);
      expect(k.aov.value).toBeCloseTo(s.cur("revenue") / s.cur("orders"), 9);
      const kept = s.life("secondary", 1) - s.life("lost", 1);
      expect(k.churn.value).toBeCloseTo((s.cur("lost") / kept) * (30 / r) * 100, 9);
      expect(k.churn.upIsGood).toBe(false);
      // Plausible for a host: thousands of servers, a few percent of churn a month.
      expect(running).toBeGreaterThan(5000);
      expect(running).toBeLessThan(40000);
      expect(k.churn.value).toBeGreaterThan(1);
      expect(k.churn.value).toBeLessThan(6);
      expect(k.aov.value).toBeGreaterThan(20);
      expect(k.aov.value).toBeLessThan(80);
    }
  });

  it("counts servers online out of the servers running, and today's orders out of the week's", () => {
    const d = buildDashboard(p, 7, NOW);
    expect(d.live.onlineOf).toBe(d.hero.kpi.value);
    expect(d.live.online / d.live.onlineOf).toBeCloseTo(0.986, 3);
    const s = windowStats(p, 7, NOW);
    expect(d.live.todayOf).toBe(s.cur("orders"));
    expect(d.live.today).toBeLessThanOrEqual(d.live.todayOf);
  });

  it("lets a rate that lives above 99 show above 99", () => {
    const sla = buildDashboard(p, 14, NOW).rates.find((x) => x.label.en === "SLA met")!;
    expect(sla.value!).toBeGreaterThan(98);
    expect(sla.value!).toBeLessThanOrEqual(99.9);
  });

  it("gives every server and customer a status its own row agrees with", () => {
    const now = NOW.getTime();
    const [servers, customers] = p.entities;
    for (const e of [servers, customers]) expect(e.count).toBeGreaterThan(25);
    for (const row of buildRows(p, servers, NOW)) {
      const c = row.cells, created = c.created as number, renews = c.renews as number;
      expect(created).toBeLessThanOrEqual(now);
      // Suspended: the renewal lapsed. Anything else renews ahead, every 30 days from its creation.
      if (c.status === "suspended") expect(renews).toBeLessThan(now);
      else expect(renews).toBeGreaterThan(now);
      if (c.status === "provisioning") expect(now - created).toBeLessThan(2 * 3_600_000);
      // The name says where the server is: "fra-0142" is in Frankfurt.
      const dc = DATACENTERS.find((d) => d.name.en === (c.datacenter as { en: string }).en)!;
      expect(String(c.server).startsWith(`${dc.code.toLowerCase()}-`)).toBe(true);
    }
    for (const row of buildRows(p, customers, NOW)) {
      const c = row.cells;
      if (c.status === "cancelled") expect([c.servers, c.spend]).toEqual([0, 0]);
      else expect(c.servers as number).toBeGreaterThan(0);
      expect(c.last as number).toBeGreaterThanOrEqual(c.since as number);
    }
  });
});

describe("the retired business id", () => {
  it("opens the hosting business, and only real ids resolve otherwise", () => {
    expect(resolveProfileId("vpn")).toBe("hosting");
    for (const id of PROFILE_IDS) expect(resolveProfileId(id)).toBe(id);
    for (const junk of ["", "VPN", "toString", "__proto__", null, 3]) expect(resolveProfileId(junk)).toBeNull();
  });

  it("is mapped the same way by the pre-paint script in index.html", () => {
    const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
    const ids = JSON.parse(html.match(/var ids = (\[[^\]]*\])/)![1]);
    const legacy = Object.fromEntries([...html.match(/legacy = \{([^}]*)\}/)![1].matchAll(/(\w+):\s*"(\w+)"/g)].map((m) => [m[1], m[2]]));
    expect(ids).toEqual([...PROFILE_IDS]);
    expect(legacy).toEqual({ ...LEGACY_PROFILES });
    expect(html).toContain(`data-profile="${PROFILE_IDS[0]}"`);
    expect(html).toContain(`|| "${PROFILE_IDS[0]}"`);
  });
});

describe("the interface copy", () => {
  it("keeps the retired vocabulary out of every word", () => {
    expect(strings(UI).filter(([, s]) => RETIRED.test(s))).toEqual([]);
  });
});
