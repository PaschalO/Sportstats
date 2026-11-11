export type Location = "overall" | "home" | "away";
export type Venue = "home" | "away";

export const LOCATIONS: Location[] = ["overall", "home", "away"];

export const LOCATION_LABELS: Record<Location, string> = {
  overall: "All games",
  home: "Home",
  away: "Away",
};

/** A competition the FastAPI backend knows by name and season ID. */
export type Competition<K extends string = string> = {
  key: K;
  label: string;
  competitionName: string;
  seasonId: number | null;
};

export function findCompetition<C extends Competition>(list: C[], key: string): C | null {
  return list.find((item) => item.key === key) ?? null;
}
