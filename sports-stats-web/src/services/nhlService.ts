/** NHL FastAPI transport, response types and query definitions. No UI code here. */
import { queryOptions } from "@tanstack/react-query";
import { envBaseUrl } from "../lib/env";
import { getJSON, requireArray } from "../lib/http";
import type { Location } from "../lib/types";

export type PeriodLine = 0.5 | 1.5 | 2.5;
export type LastGames = 5 | 10 | 20 | 50 | 100;
export type NHLFilters = { location: Location; periodLine: PeriodLine; lastGames: LastGames };

export const DEFAULT_NHL_FILTERS: NHLFilters = {
  location: "overall",
  periodLine: 1.5,
  lastGames: 100,
};

export type NHLThresholdSummary = {
  line: number | null;
  operator: "overall" | "over" | "under";
  hits: number;
  misses: number;
  pushes: number;
  percentage: number;
};

export type NHLMatchPeriod = {
  team_goals: number;
  opponent_goals: number;
  total_goals: number;
  team_shots: number | null;
  opponent_shots: number | null;
  threshold_result: "hit" | "miss" | "push" | null;
};

/** W/L are regulation results; OTW/OTL and SOW/SOL keep how the game ended. */
export type NHLMatchResult = "W" | "L" | "OTW" | "OTL" | "SOW" | "SOL";

const RESULT_DESCRIPTIONS: Record<NHLMatchResult, string> = {
  W: "Regulation win",
  L: "Regulation loss",
  OTW: "Overtime win",
  OTL: "Overtime loss",
  SOW: "Shootout win",
  SOL: "Shootout loss",
};

export const isNHLWin = (result: NHLMatchResult) =>
  result === "W" || result === "OTW" || result === "SOW";
export const describeNHLResult = (result: NHLMatchResult) => RESULT_DESCRIPTIONS[result];
export const nhlFinish = (result: NHLMatchResult) =>
  result.startsWith("OT") ? "OT" : result.startsWith("SO") ? "SO" : undefined;

export type NHLMatchSummary = {
  game_pk: number;
  game_date: string;
  location: "home" | "away";
  opponent_pk: number;
  opponent_name: string;
  team_score: number;
  opponent_score: number;
  score_line: string;
  total_goals: number;
  result: NHLMatchResult;
  btts: boolean;
  total_goals_over_hit: boolean | null;
  team_total_goals_over_hit: boolean | null;
  shots: number | null;
  shots_against: number | null;
  periods: Record<string, NHLMatchPeriod | undefined>;
};

export type NHLLocationSummary = {
  games_played: number;
  games_with_stats: number;
  wins: number;
  losses: number;
  win_pct: number;
  loss_pct: number;
  goals: number;
  goals_per_game: number;
  goals_against: number;
  goals_against_per_game: number;
  total_goals: number;
  total_goals_per_game: number;
  shots: number;
  shots_per_game: number;
  shots_against: number;
  shots_against_per_game: number;
  btts: number;
  btts_pct: number;
  total_goals_over: NHLThresholdSummary | null;
  team_total_goals_over: NHLThresholdSummary | null;
  first_period: NHLThresholdSummary | null;
  second_period: NHLThresholdSummary | null;
  third_period: NHLThresholdSummary | null;
  matches: NHLMatchSummary[];
};

export type NHLTeam = {
  team_pk: number;
  team_name: string;
  overall: NHLLocationSummary;
  home: NHLLocationSummary;
  away: NHLLocationSummary;
};

export type NHLSummaryResponse = {
  competition_name: string;
  competition_season_id: number;
  last_n: number;
  selected: Location;
  teams_found: number;
  filters: Record<string, string | number | null>;
  teams: NHLTeam[];
};

/** Set VITE_API_BASE_URL in .env, e.g. http://localhost:8000/api. */
const BASE = envBaseUrl("VITE_API_BASE_URL", "http://localhost:8000");
export const NHL_COMPETITION_NAME = "NHL";
export const NHL_SEASON_ID = 33;

/** Overtime losses: games that were neither wins nor regulation losses. */
export const nhlOtLosses = (summary: NHLLocationSummary) =>
  Math.max(0, summary.games_played - summary.wins - summary.losses);

export async function fetchNHLSummary(
  filters: NHLFilters,
  signal?: AbortSignal,
): Promise<NHLSummaryResponse> {
  const data = await getJSON<NHLSummaryResponse>(
    BASE,
    "/nhl/teams/summary",
    {
      competition_name: NHL_COMPETITION_NAME,
      competition_season_id: NHL_SEASON_ID,
      location: filters.location,
      last_n: filters.lastGames,
      period_threshold: filters.periodLine,
      period_operator: "over",
    },
    "NHL",
    signal,
  );
  requireArray(data.teams, "NHL API response is missing the teams array.");
  return data;
}

export const nhlSummaryQuery = (filters: NHLFilters) =>
  queryOptions({
    queryKey: ["nhl", "summary", NHL_SEASON_ID, filters],
    queryFn: ({ signal }) => fetchNHLSummary(filters, signal),
  });
