/**
 * The demo's stand-in for a network request. Nothing is fetched: the data is generated in the
 * browser. What it simulates is the TIMING a real panel has, so the states a real panel needs are
 * all reachable and all designed:
 *
 * - switching business, range or tab shows skeletons for a moment, then the data;
 * - "Slow network" (Demo menu) stretches that moment to 1.6 s;
 * - "Error responses" ends every request in the error state, with a working Retry;
 * - "Empty workspace" builds the same screens with nothing in them.
 *
 * The very first render does not wait: a visitor opening the page sees the dashboard at once, and
 * the skeleton is something a SWITCH shows, which is when a real panel shows one.
 */
import { useEffect, useRef, useState } from "react";

import { useAppState, type DataMode } from "@/state/AppState";

export type QueryStatus = "loading" | "ready" | "error";

export interface DemoQuery<T> {
  status: QueryStatus;
  data: T | undefined;
  retry(): void;
}

export const DELAY = { normal: 380, slow: 1600 } as const;

interface Settled<T> {
  key: string;
  status: "ready" | "error";
  data?: T;
}

export function useDemoQuery<T>(key: string, build: (mode: DataMode) => T): DemoQuery<T> {
  const { mode, epoch } = useAppState();
  const full = `${key}|${mode}|${epoch}`;
  const buildRef = useRef(build);
  buildRef.current = build;
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(() =>
    mode === "live" ? { key: full, status: "ready", data: build(mode) } : null,
  );

  const current = settled?.key === full ? settled : null;

  useEffect(() => {
    if (current) return;
    const id = window.setTimeout(
      () =>
        setSettled(
          mode === "error" ? { key: full, status: "error" } : { key: full, status: "ready", data: buildRef.current(mode) },
        ),
      mode === "slow" ? DELAY.slow : DELAY.normal,
    );
    return () => window.clearTimeout(id);
    // `current` is derived from `settled` and `full`; re-running on `attempt` is what makes Retry
    // ask again after an error.
  }, [full, mode, attempt, current]);

  return {
    status: current ? current.status : "loading",
    data: current?.status === "ready" ? current.data : undefined,
    retry: () => {
      setSettled(null);
      setAttempt((n) => n + 1);
    },
  };
}
