/**
 * Deterministic randomness. Every synthetic number in the demo comes from a seeded generator, so
 * the same business shows the same figures to every visitor, and a test can assert them.
 */

/** FNV-1a: a stable 32-bit hash of a string, for deriving seeds from names. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mixes integers into one 32-bit value (a cheap avalanche, enough for picking noise). */
export function mix(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h = Math.imul(h ^ (p >>> 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** A value in [0, 1) that depends only on its inputs. */
export function unit(...parts: number[]): number {
  return mix(...parts) / 4294967296;
}

export interface Rng {
  /** [0, 1) */
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** A log-normal draw around `median`; `spread` 0.5 keeps most values within about ×0.4…×2.5. */
  lognormal(median: number, spread: number): number;
  chance(p: number): boolean;
}

/** mulberry32, a small fast seeded generator. */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted(items, weight) {
      const total = items.reduce((s, it) => s + weight(it), 0);
      let x = next() * total;
      for (const it of items) {
        x -= weight(it);
        if (x < 0) return it;
      }
      return items[items.length - 1];
    },
    lognormal(median, spread) {
      // Box-Muller from two uniforms; clamp the tails so one row never dwarfs a table.
      const u = Math.max(1e-9, next());
      const v = next();
      const z = Math.max(-2.4, Math.min(2.4, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
      return median * Math.exp(z * spread);
    },
    chance: (p) => next() < p,
  };
  return r;
}

/**
 * Smooth noise over integers (days): hashed values at knots `scale` apart, cosine-interpolated
 * between them, in [-1, 1]. A given day always gets the same value, whatever window it is shown in.
 */
export function valueNoise(seed: number, x: number, scale: number): number {
  const p = x / scale;
  const i = Math.floor(p);
  const f = p - i;
  const a = unit(seed, i) * 2 - 1;
  const b = unit(seed, i + 1) * 2 - 1;
  const w = (1 - Math.cos(f * Math.PI)) / 2;
  return a * (1 - w) + b * w;
}
