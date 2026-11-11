import type { Competition } from "./types";

type Params = Record<string, string | number | null | undefined>;

export function toSearchParams(params: Params): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) search.set(key, String(value));
  }
  return search;
}

/** GET a JSON document; non-2xx responses throw with a short body excerpt. */
export async function getJSON<T>(
  base: string,
  path: string,
  params: Params,
  label: string,
  signal?: AbortSignal,
): Promise<T> {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}?${toSearchParams(params)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 350);
    throw new Error(`${label} API ${response.status}: ${detail}`);
  }
  return (await response.json()) as T;
}

export function requireArray<T>(value: T[] | undefined, message: string): T[] {
  if (!Array.isArray(value)) throw new Error(message);
  return value;
}

export function requireSeason(league: Competition): number {
  if (league.seasonId == null) {
    throw new Error(`Set the season ID for ${league.label} in your .env file.`);
  }
  return league.seasonId;
}

/** Shared params every competition endpoint takes. */
export function competitionParams(league: Competition, location: string, lastN: number): Params {
  return {
    competition_name: league.competitionName,
    competition_season_id: requireSeason(league),
    last_n: lastN,
    location,
  };
}
