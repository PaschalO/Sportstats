/** Soccer FastAPI transport, response types and query definitions. No UI code here. */
import { queryOptions } from "@tanstack/react-query";
import { envBaseUrl, envSeasonId, envString } from "../lib/env";
import { competitionParams, getJSON, requireArray } from "../lib/http";
import { findCompetition, type Competition, type Location } from "../lib/types";

export type SoccerResult = "W" | "D" | "L";
export type SoccerLeague = Competition;

const BASE = envBaseUrl("VITE_SOCCER_API_BASE_URL", "http://localhost:8000/api");
const RANKINGS_PATH = envString("VITE_SOCCER_RANKINGS_PATH", "/soccer/teams/rankings");

const league = (
  key: string,
  label: string,
  nameVar: string,
  name: string,
  seasonVar: string,
  season?: number,
) => ({
  key,
  label,
  competitionName: envString(nameVar, name),
  seasonId: envSeasonId(seasonVar, season ?? null),
});

export const SOCCER_LEAGUES: SoccerLeague[] = [
  league(
    "premier-league",
    "Premier League",
    "VITE_SOCCER_EPL_COMPETITION_NAME",
    "Premier League",
    "VITE_SOCCER_EPL_SEASON_ID",
    25,
  ),
  league(
    "laliga",
    "LaLiga",
    "VITE_SOCCER_LALIGA_COMPETITION_NAME",
    "LaLiga",
    "VITE_SOCCER_LALIGA_SEASON_ID",
    23,
  ),
  league(
    "serie-a",
    "Serie A",
    "VITE_SOCCER_SERIE_A_COMPETITION_NAME",
    "Serie A",
    "VITE_SOCCER_SERIE_A_SEASON_ID",
  ),
  league(
    "bundesliga",
    "Bundesliga",
    "VITE_SOCCER_BUNDESLIGA_COMPETITION_NAME",
    "Bundesliga",
    "VITE_SOCCER_BUNDESLIGA_SEASON_ID",
  ),
  league(
    "ligue-1",
    "Ligue 1",
    "VITE_SOCCER_LIGUE_1_COMPETITION_NAME",
    "Ligue 1",
    "VITE_SOCCER_LIGUE_1_SEASON_ID",
  ),
  league("mls", "MLS", "VITE_SOCCER_MLS_COMPETITION_NAME", "MLS", "VITE_SOCCER_MLS_SEASON_ID"),
  league(
    "championship",
    "Championship",
    "VITE_SOCCER_CHAMPIONSHIP_COMPETITION_NAME",
    "Championship",
    "VITE_SOCCER_CHAMPIONSHIP_SEASON_ID",
  ),
  league(
    "uefa-champions-league",
    "Champions League",
    "VITE_SOCCER_CHAMPIONS_LEAGUE_COMPETITION_NAME",
    "Uefa Champions League",
    "VITE_SOCCER_UEFA_CHAMPIONS_LEAGUE_SEASON_ID",
  ),
  league(
    "uefa-europa-league",
    "Europa League",
    "VITE_SOCCER_EUROPA_LEAGUE_COMPETITION_NAME",
    "UEFA Europa League",
    "VITE_SOCCER_UEFA_EUROPA_LEAGUE_SEASON_ID",
  ),
  league(
    "uefa-conference-league",
    "Conference League",
    "VITE_SOCCER_CONFERENCE_LEAGUE_COMPETITION_NAME",
    "UEFA Conference League",
    "VITE_SOCCER_UEFA_CONFERENCE_LEAGUE_SEASON_ID",
  ),
];

export const getSoccerLeague = (key: string) => findCompetition(SOCCER_LEAGUES, key);

export interface SoccerThreshold {
  line: number | null;
  operator: string;
  hits: number;
  misses: number;
  pushes: number;
  percentage: number;
}

export interface SoccerMatchStats {
  possession_pct?: number | null;
  shots_total?: number | null;
  shots_on_target?: number | null;
  expected_goals?: number | null;
  corners?: number | null;
  fouls?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
  tackles?: number | null;
  offsides?: number | null;
  interceptions?: number | null;
  throw_ins?: number | null;
  free_kicks?: number | null;
  [other: string]: unknown;
}

/** Compact match nested under each team's overall/home/away summary. */
export interface SoccerSummaryMatch {
  game_pk: number;
  game_date: string;
  location: "home" | "away";
  opponent_pk: number;
  opponent_name: string;
  team_score: number;
  opponent_score: number;
  score_line: string;
  total_goals: number;
  result: SoccerResult;
  btts: boolean;
  total_goals_over_hit: boolean | null;
  team_total_goals_over_hit: boolean | null;
}

/** Full match from /soccer/teams/matches, with both sides' stats. */
export interface SoccerMatch extends Omit<SoccerSummaryMatch, "opponent_pk"> {
  team_pk: number;
  team_name: string;
  opponent_pk?: number | null;
  team_stats: SoccerMatchStats | null;
  opponent_stats: SoccerMatchStats | null;
}

export interface SoccerResponseFilters {
  competition_name: string;
  competition_season_id: number;
  last_n: number;
  location: Location | null;
  total_goals_over: number | null;
  team_total_goals_over: number | null;
}

export interface SoccerLocationSummary {
  games_played: number;
  games_with_stats: number;
  wins: number;
  draws: number;
  losses: number;
  /** Not sent by the API today; the table derives 3 × wins + draws. */
  points?: number | null;
  goals?: number | null;
  goals_against?: number | null;
  goals_per_game?: number | null;
  goals_against_per_game?: number | null;
  xg?: number | null;
  xg_per_game?: number | null;
  xg_against?: number | null;
  xg_against_per_game?: number | null;
  shots_per_game?: number | null;
  shots_on_target_per_game?: number | null;
  btts?: number | null;
  btts_pct?: number | null;
  clean_sheets?: number | null;
  clean_sheets_pct?: number | null;
  total_goals_over?: SoccerThreshold | null;
  team_total_goals_over?: SoccerThreshold | null;
  matches: SoccerSummaryMatch[];
  [other: string]: unknown;
}

export interface SoccerTeam {
  team_pk: number;
  team_name: string;
  overall: SoccerLocationSummary;
  home: SoccerLocationSummary;
  away: SoccerLocationSummary;
}

export interface SoccerSummaryResponse {
  competition_name: string;
  competition_season_id: number;
  last_n: number;
  selected: Location;
  /** Summary uses singular team_found; rankings uses teams_found. */
  team_found: number;
  filters: SoccerResponseFilters;
  teams: SoccerTeam[];
}

export interface SoccerMatchesResponse {
  team_pk: number;
  team_name: string;
  competition_name: string;
  competition_season_id: number;
  last_n: number;
  selected: Location;
  filters: SoccerResponseFilters & { team_name: string };
  games_played: number;
  total_goals_over: SoccerThreshold | null;
  team_total_goals_over: SoccerThreshold | null;
  matches: SoccerMatch[];
}

/** Rankings return nested metric objects, not plain numbers. */
export interface SoccerRankingMetric {
  total: number | null;
  average: number | null;
  games_with_data: number;
  coverage_pct: number;
  rank: number | null;
}

export const SOCCER_RANK_METRICS = [
  "possession_pct",
  "shots_total",
  "shots_on_target",
  "corners",
  "tackles",
  "fouls_committed",
  "cards",
  "offsides",
  "free_kicks",
  "throw_ins",
] as const;

export type SoccerRankKey = (typeof SOCCER_RANK_METRICS)[number];

export type SoccerRankedTeam = {
  team_pk: number;
  team_name: string;
  games_played: number;
} & Record<SoccerRankKey, SoccerRankingMetric>;

export interface SoccerRankingsResponse {
  sport: string;
  competition_name: string;
  competition_season_id: number;
  last_n: number;
  selected: Location;
  teams_found: number;
  teams: SoccerRankedTeam[];
}

export type SoccerSummaryFilters = {
  league: SoccerLeague;
  location: Location;
  lastN: number;
  totalGoalsOver?: number | null;
  teamGoalsOver?: number | null;
};

export async function fetchSoccerSummary(filters: SoccerSummaryFilters, signal?: AbortSignal) {
  const data = await getJSON<SoccerSummaryResponse>(
    BASE,
    "/soccer/teams/summary",
    {
      ...competitionParams(filters.league, filters.location, filters.lastN),
      total_goals_over: filters.totalGoalsOver,
      team_total_goals_over: filters.teamGoalsOver,
    },
    "Soccer",
    signal,
  );
  requireArray(data.teams, "Soccer summary response is missing teams[].");
  return data;
}

/** Missing opponent stats stay null; they are never converted to zero. */
export async function fetchSoccerMatches(
  filters: { league: SoccerLeague; teamName: string; location: Location; lastN: number },
  signal?: AbortSignal,
) {
  const data = await getJSON<SoccerMatchesResponse>(
    BASE,
    "/soccer/teams/matches",
    {
      team_name: filters.teamName,
      ...competitionParams(filters.league, filters.location, filters.lastN),
    },
    "Soccer",
    signal,
  );
  requireArray(data.matches, "Soccer matches response is missing matches[].");
  return data;
}

export async function fetchSoccerRankings(
  filters: { league: SoccerLeague; location: Location; lastN: number },
  signal?: AbortSignal,
) {
  const data = await getJSON<SoccerRankingsResponse>(
    BASE,
    RANKINGS_PATH,
    { sport: "Soccer", ...competitionParams(filters.league, filters.location, filters.lastN) },
    "Soccer",
    signal,
  );
  requireArray(data.teams, "Soccer rankings response is missing teams[].");
  return data;
}

export const soccerSummaryQuery = (filters: SoccerSummaryFilters) =>
  queryOptions({
    queryKey: [
      "soccer",
      "summary",
      filters.league.key,
      filters.league.seasonId,
      { ...filters, league: undefined },
    ],
    queryFn: ({ signal }) => fetchSoccerSummary(filters, signal),
    enabled: filters.league.seasonId != null,
  });

export const soccerMatchesQuery = (
  league: SoccerLeague,
  teamName: string | undefined,
  location: Location,
) =>
  queryOptions({
    queryKey: ["soccer", "matches", league.key, league.seasonId, teamName, location],
    queryFn: ({ signal }) =>
      fetchSoccerMatches({ league, teamName: teamName!, location, lastN: 100 }, signal),
    enabled: league.seasonId != null && !!teamName,
  });

export const soccerRankingsQuery = (league: SoccerLeague, location: Location, lastN: number) =>
  queryOptions({
    queryKey: ["soccer", "rankings", league.key, league.seasonId, location, lastN],
    queryFn: ({ signal }) => fetchSoccerRankings({ league, location, lastN }, signal),
    enabled: league.seasonId != null,
  });
