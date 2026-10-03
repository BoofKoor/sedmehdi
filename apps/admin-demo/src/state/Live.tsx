/**
 * The live figures: who is online and how the services answer, moving every few seconds.
 *
 * One ticker for the whole app, so the top bar's live dot, the dashboard's side panel and the
 * Health page always show the same reading. It stops while the tab is hidden (nothing is watching,
 * so nothing should run) and never starts when Reduce Motion is on, where the figures stay put
 * and the panel says why.
 *
 * Each step is drawn from the business's seed and the step number, mean-reverting around the
 * figure the generator gives for this hour, so the numbers wander like real readings without
 * drifting away from the rest of the dashboard.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { buildDashboard } from "@/data/dashboard";
import { hash32, unit } from "@/data/prng";
import { useDocumentVisible, useReducedMotion } from "@/hooks/media";
import type { HealthDef } from "@/profiles";

import { useAppState } from "./AppState";

export type LiveStatus = "running" | "paused" | "still";

export interface LiveState {
  status: LiveStatus;
  online: number;
  onlineOf: number;
  today: number;
  todayOf: number;
  lifetime: number;
  /** Current reading per health check id (ms, nodes up, queue depth or percent). */
  readings: Record<string, number>;
  /** The last readings per check (and "online"), oldest first, for the probe sparklines. */
  history: Record<string, number[]>;
  resources: { cpu: number; memory: number; disk: number };
  updatedAt: Date;
}

const HISTORY = 24;
const Ctx = createContext<LiveState | null>(null);

export function useLive(): LiveState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLive outside LiveProvider");
  return v;
}

/** Whether a reading is in its degraded band. */
export function isDegraded(def: HealthDef, value: number): boolean {
  if (def.kind === "percent" || def.kind === "nodes") return value < def.warn;
  return value > def.warn;
}

function step(def: HealthDef, base: number, prev: number, seed: number, tick: number): number {
  const u = unit(seed, tick);
  const v = unit(seed + 1, tick);
  switch (def.kind) {
    case "latency": {
      // Mean-reverting jitter, with a rare spike that can cross the warning line for a tick or two.
      const target = base * (1 + 0.16 * (u * 2 - 1));
      const spike = v < 0.035 ? def.warn * (1.02 + u * 0.2) : 0;
      return Math.round(spike || prev + (target - prev) * 0.6);
    }
    case "nodes":
      return v < 0.06 ? base - 1 : base;
    case "queue":
      return Math.max(0, Math.round(base * (0.4 + u * 1.2) + (v < 0.04 ? def.warn * 0.6 : 0)));
    case "percent":
      return prev;
  }
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { profile: p, mode, epoch } = useAppState();
  const visible = useDocumentVisible();
  const still = useReducedMotion();
  const empty = mode === "empty";

  // The figures the generator gives for now: what every step wanders around.
  const base = useMemo(() => {
    const d = buildDashboard(p, 7, new Date(), empty);
    const readings: Record<string, number> = {};
    for (const h of d.health) readings[h.def.id] = h.value;
    return { live: d.live, readings };
    // `epoch`: a reset starts the readings over.
  }, [p, empty, epoch]); // eslint-disable-line react-hooks/exhaustive-deps

  const seed = (p.seed ^ hash32("live")) >>> 0;

  const initial = useMemo((): LiveState => {
    const history: Record<string, number[]> = { online: [] };
    const readings = { ...base.readings };
    // Seeded with the minutes before the page opened, so a sparkline has a shape from the start.
    for (const def of p.health) {
      let prev = readings[def.id];
      const series: number[] = [];
      for (let k = -HISTORY; k < 0; k++) series.push((prev = step(def, base.readings[def.id], prev, seed + hash32(def.id), k)));
      history[def.id] = series;
    }
    for (let k = -HISTORY; k < 0; k++) history.online.push(Math.round(base.live.online * (1 + 0.05 * (unit(seed, k) * 2 - 1))));
    return {
      status: "running",
      ...base.live,
      readings,
      history,
      resources: { cpu: 34 + Math.round(unit(seed, 3) * 16), memory: 58 + Math.round(unit(seed, 4) * 8), disk: 41 + Math.round(unit(seed, 5) * 12) },
      updatedAt: new Date(),
    };
  }, [base, p.health, seed]);

  const [state, setState] = useState<LiveState>(initial);
  const tick = useRef(0);

  // A new business (or a reset) starts from its own figures.
  useEffect(() => {
    setState(initial);
    tick.current = 0;
  }, [initial]);

  const running = visible && !still;

  useEffect(() => {
    if (!running) return;
    let id = 0;
    const schedule = () => {
      // Every three to five seconds: a fixed beat reads as a metronome, not as traffic.
      const wait = 3000 + Math.round(unit(seed + 9, tick.current) * 2000);
      id = window.setTimeout(() => {
        const k = ++tick.current;
        setState((s) => {
          const readings = { ...s.readings };
          const history = { ...s.history };
          for (const def of p.health) {
            readings[def.id] = step(def, base.readings[def.id], s.readings[def.id], seed + hash32(def.id), k);
            history[def.id] = [...(s.history[def.id] ?? []), readings[def.id]].slice(-HISTORY);
          }
          // Online: a random walk pulled back towards the generator's figure for this hour.
          const target = base.live.online;
          const drift = (unit(seed, k) * 2 - 1) * Math.max(1, target * 0.03);
          const online = empty ? 0 : Math.max(0, Math.round(s.online + drift + (target - s.online) * 0.25));
          history.online = [...s.history.online, online].slice(-HISTORY);
          const cpu = Math.round(Math.min(92, Math.max(12, s.resources.cpu + (unit(seed + 2, k) * 2 - 1) * 6)));
          return {
            ...s,
            status: "running",
            online,
            readings,
            history,
            resources: { ...s.resources, cpu },
            updatedAt: new Date(),
          };
        });
        schedule();
      }, wait);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, [running, p.health, base, seed, empty]);

  const status: LiveStatus = still ? "still" : visible ? "running" : "paused";
  const value = useMemo(() => ({ ...state, status }), [state, status]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
