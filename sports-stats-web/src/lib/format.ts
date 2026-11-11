import type { Venue } from "./types";

export const DASH = "—";

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function fmtNum(value: unknown, digits = 1): string {
  const n = toNumber(value);
  return n === null ? DASH : n.toFixed(digits);
}

export function fmtPct(value: unknown, digits = 0): string {
  const n = toNumber(value);
  return n === null ? DASH : `${n.toFixed(digits)}%`;
}

export function fmtSigned(value: unknown, digits = 1): string {
  const n = toNumber(value);
  if (n === null) return DASH;
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
}

export function fmtRecord(...parts: number[]): string {
  return parts.join("–");
}

/** "2024-10-31" -> "Oct 31", without timezone shifts. */
export function fmtDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export const venuePrefix = (venue: Venue) => (venue === "home" ? "vs" : "@");
export const clampPct = (value: number) => Math.max(0, Math.min(100, value));

export function numbers(values: Array<number | null | undefined>): number[] {
  return values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

export function average(values: Array<number | null | undefined>): number | null {
  const list = numbers(values);
  return list.length ? list.reduce((sum, v) => sum + v, 0) / list.length : null;
}

export function median(values: Array<number | null | undefined>): number | null {
  const list = numbers(values).sort((a, b) => a - b);
  if (!list.length) return null;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

export type HitRate = { hits: number; total: number; pct: number | null };

/** Share of available values strictly above the line. Missing values are excluded. */
export function hitRate(values: Array<number | null | undefined>, line: number): HitRate {
  const list = numbers(values);
  const hits = list.filter((v) => v > line).length;
  return { hits, total: list.length, pct: list.length ? (hits / list.length) * 100 : null };
}

/** Newest first; ties broken by game ID. */
export function byNewest<T extends { game_date: string; game_pk: number }>(items: T[] = []): T[] {
  return [...items].sort((a, b) => b.game_date.localeCompare(a.game_date) || b.game_pk - a.game_pk);
}

export function range(start: number, end: number, step = 1): number[] {
  const count = Math.floor((end - start) / step + 1e-9) + 1;
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    Number((start + i * step).toFixed(2)),
  );
}

export function overOptions(values: number[]): { value: number; label: string }[] {
  return values.map((value) => ({ value, label: `Over ${value.toFixed(1)}` }));
}

export function bestBy<T>(
  items: T[],
  get: (item: T) => number | null,
  lowest = false,
): T | undefined {
  let best: T | undefined;
  let bestValue: number | null = null;
  for (const item of items) {
    const value = get(item);
    if (value == null || !Number.isFinite(value)) continue;
    if (bestValue === null || (lowest ? value < bestValue : value > bestValue)) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}
