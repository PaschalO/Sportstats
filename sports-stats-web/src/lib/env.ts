const env = import.meta.env as Record<string, string | undefined>;

export function envString(key: string, fallback: string): string {
  const value = env[key]?.trim();
  return value ? value : fallback;
}

/** Positive integer season ID, or the fallback when the variable is missing or invalid. */
export function envSeasonId(key: string, fallback: number | null = null): number | null {
  const value = Number(env[key]?.trim());
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function envBaseUrl(key: string, fallback: string): string {
  return envString(key, fallback).replace(/\/+$/, "");
}
