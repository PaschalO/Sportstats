/** Basketball FastAPI transport (NBA, NCAAB, WNBA, NBL), types and query definitions. */
import { queryOptions } from "@tanstack/react-query";
import { envBaseUrl, envSeasonId, envString } from "../lib/env";
import { competitionParams, getJSON, requireArray } from "../lib/http";
import { findCompetition, type Competition, type Location } from "../lib/types";

export type BasketballLeague = Competition<"nba" | "ncaab" | "wnba" | "nbl">;

const BASE = envBaseUrl("VITE_BASKETBALL_API_BASE_URL", "http://localhost:8000/api");
// Verify these against your FastAPI /docs; both are configurable in .env.
const SUMMARY_PATH = envString("VITE_BASKETBALL_SUMMARY_PATH", "/basketball/teams/summary");
const RANKINGS_PATH = envString("VITE_BASKETBALL_RANKINGS_PATH", "/basketball/teams/rankings");

export const BASKETBALL_LEAGUES: BasketballLeague[] = [
  {
    key: "nba",
    label: "NBA",
    competitionName: envString("VITE_BASKETBALL_NBA_NAME", "NBA"),
    seasonId: envSeasonId("VITE_BASKETBALL_NBA_SEASON_ID", 34),
  },
  {
    key: "ncaab",
    label: "NCAAB",
    competitionName: envString("VITE_BASKETBALL_NCAAB_NAME", "NCAAB"),
    seasonId: envSeasonId("VITE_BASKETBALL_NCAAB_SEASON_ID"),
  },
  {
    key: "wnba",
    label: "WNBA",
    competitionName: envString("VITE_BASKETBALL_WNBA_NAME", "WNBA"),
    seasonId: envSeasonId("VITE_BASKETBALL_WNBA_SEASON_ID"),
  },
  {
    key: "nbl",
    label: "NBL",
    competitionName: envString("VITE_BASKETBALL_NBL_NAME", "NBL"),
    seasonId: envSeasonId("VITE_BASKETBALL_NBL_SEASON_ID"),
  },
];

export const getBasketballLeague = (key: string) => findCompetition(BASKETBALL_LEAGUES, key);

export interface BasketballPeriod {
  team_points: number;
  opponent_points: number;
}

export interface BasketballMatch {
  game_pk: number;
  game_date: string;
  location: "home" | "away";
  opponent_pk: number;
  opponent_name: string;
  team_score: number;
  opponent_score: number;
  score_line: string;
  result: "W" | "L" | "D";
  total_points: number;
  periods: Record<string, BasketballPeriod | undefined>;
}

export interface BasketballSplit {
  games_played: number;
  games_with_stats: number;
  wins: number;
  losses: number;
  win_pct: number;
  loss_pct: number;
  points_for: number;
  points_for_per_game: number;
  points_against: number;
  points_against_per_game: number;
  total_points: number;
  total_points_per_game: number;
  field_goal_pct: number | null;
  three_point_pct: number | null;
  three_points_made_per_game: number | null;
  total_rebounds_per_game: number | null;
  assists_per_game: number | null;
  turnovers_per_game: number | null;
  personal_fouls_per_game: number | null;
  biggest_lead_average: number | null;
  biggest_lead: number | null;
  matches: BasketballMatch[];
  [key: string]: unknown;
}

export interface BasketballTeam {
  team_pk: number;
  team_name: string;
  overall: BasketballSplit;
  home: BasketballSplit;
  away: BasketballSplit;
}

export interface BasketballSummaryResponse {
  competition_name: string;
  competition_season_id: number;
  last_n: number;
  selected: Location;
  teams_found: number;
  teams: BasketballTeam[];
}

interface RankBase {
  games_with_data: number;
  coverage_pct: number;
  rank: number | null;
}

/** Count stats carry average; percentage stats carry percentage; max stats carry max + average. */
export type BasketballRankMetric = RankBase & {
  total?: number | null;
  average?: number | null;
  made?: number | null;
  attempted?: number | null;
  percentage?: number | null;
  max?: number | null;
};

export interface BasketballRankTeam {
  team_pk: number;
  team_name: string;
  games_played: number;
  [metric: string]: number | string | BasketballRankMetric;
}

export interface BasketballRankingsResponse {
  competition_name: string;
  competition_season_id: number;
  last_n: number;
  selected: Location;
  teams_found: number;
  teams: BasketballRankTeam[];
}

export type BasketballFilters = { league: BasketballLeague; location: Location; lastN: number };

export async function fetchBasketballSummary(filters: BasketballFilters, signal?: AbortSignal) {
  const data = await getJSON<BasketballSummaryResponse>(
    BASE,
    SUMMARY_PATH,
    competitionParams(filters.league, filters.location, filters.lastN),
    "Basketball",
    signal,
  );
  requireArray(data.teams, "Basketball summary response is missing teams[].");
  return data;
}

export async function fetchBasketballRankings(filters: BasketballFilters, signal?: AbortSignal) {
  const data = await getJSON<BasketballRankingsResponse>(
    BASE,
    RANKINGS_PATH,
    competitionParams(filters.league, filters.location, filters.lastN),
    "Basketball",
    signal,
  );
  requireArray(data.teams, "Basketball rankings response is missing teams[].");
  return data;
}

export const basketballSummaryQuery = ({ league, location, lastN }: BasketballFilters) =>
  queryOptions({
    queryKey: ["basketball", "summary", league.key, league.seasonId, location, lastN],
    queryFn: ({ signal }) => fetchBasketballSummary({ league, location, lastN }, signal),
    enabled: league.seasonId != null,
  });

export const basketballRankingsQuery = ({ league, location, lastN }: BasketballFilters) =>
  queryOptions({
    queryKey: ["basketball", "rankings", league.key, league.seasonId, location, lastN],
    queryFn: ({ signal }) => fetchBasketballRankings({ league, location, lastN }, signal),
    enabled: league.seasonId != null,
  });

export function rankMetric(team: BasketballRankTeam, key: string): BasketballRankMetric | null {
  const value = team[key];
  return value != null && typeof value === "object" && "rank" in value ? value : null;
}

/** Default combined-points line for each competition. */
export const basketballTotalLine = (key: string) =>
  key === "nba" ? 229.5 : key === "ncaab" ? 149.5 : 169.5;
export const basketballHalfLine = (key: string) =>
  key === "nba" ? 114.5 : key === "ncaab" ? 74.5 : key === "wnba" ? 79.5 : 89.5;
export const basketballPeriodLine = (key: string) =>
  key === "nba" ? 57.5 : key === "ncaab" ? 74.5 : key === "wnba" ? 39.5 : 44.5;

/** Complete numeric period score, or null. Missing periods are never zero. */
export function periodScore(match: BasketballMatch, key: string): BasketballPeriod | null {
  const value = match.periods?.[key];
  if (!value || value.team_points == null || value.opponent_points == null) return null;
  const team = Number(value.team_points);
  const opponent = Number(value.opponent_points);
  return Number.isFinite(team) && Number.isFinite(opponent)
    ? { team_points: team, opponent_points: opponent }
    : null;
}

const add = (a: BasketballPeriod, b: BasketballPeriod): BasketballPeriod => ({
  team_points: a.team_points + b.team_points,
  opponent_points: a.opponent_points + b.opponent_points,
});

/**
 * Halves by competition convention. Explicit 1H/H1/1ST keys win; NCAAB feeds label the
 * two halves Q1/Q2; everyone else sums Q1+Q2 and Q3+Q4. OT is excluded.
 */
export function halfScore(
  match: BasketballMatch,
  half: "1H" | "2H",
  leagueKey: string,
): BasketballPeriod | null {
  for (const key of half === "1H" ? ["1H", "H1", "1ST"] : ["2H", "H2", "2ND"]) {
    const direct = periodScore(match, key);
    if (direct) return direct;
  }
  const [q1, q2, q3, q4] = ["Q1", "Q2", "Q3", "Q4"].map((key) => periodScore(match, key));
  if (leagueKey === "ncaab" && q1 && q2 && !q3 && !q4) return half === "1H" ? q1 : q2;
  const [a, b] = half === "1H" ? [q1, q2] : [q3, q4];
  return a && b ? add(a, b) : null;
}

export type PeriodDefinition = { key: string; title: string };

/** Which periods this feed reports: quarters, NCAAB halves, or explicit halves. */
export function periodDefinitions(
  matches: BasketballMatch[],
  leagueKey: string,
): PeriodDefinition[] {
  const keys = new Set(matches.flatMap((match) => Object.keys(match.periods ?? {})));
  const quarters = ["Q1", "Q2", "Q3", "Q4"].filter((key) => keys.has(key));
  if (leagueKey === "ncaab" && quarters.join() === "Q1,Q2") {
    return [
      { key: "Q1", title: "1st half" },
      { key: "Q2", title: "2nd half" },
    ];
  }
  if (quarters.length) return quarters.map((key) => ({ key, title: key }));
  for (const [first, second] of [
    ["1H", "2H"],
    ["H1", "H2"],
    ["1ST", "2ND"],
  ]) {
    if (keys.has(first) && keys.has(second)) {
      return [
        { key: first, title: "1st half" },
        { key: second, title: "2nd half" },
      ];
    }
  }
  return [];
}

export const isHalvesFeed = (periods: PeriodDefinition[]) =>
  periods.length === 2 && periods.every((period) => period.title.endsWith("half"));
