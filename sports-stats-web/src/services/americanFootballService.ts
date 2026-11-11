/** American football FastAPI transport (NFL, NCAAF), types and query definitions. */
import { queryOptions } from "@tanstack/react-query";
import { envBaseUrl, envSeasonId, envString } from "../lib/env";
import { competitionParams, getJSON, requireArray } from "../lib/http";
import { findCompetition, type Competition, type Location } from "../lib/types";

export type FootballLeague = Competition;
export type BetResult = "hit" | "miss" | "push";
export type FootballBetKind = "gameTotal" | "teamTotal" | "teamSpread" | "opponentSpread";
export type FootballPeriodKey = "Q1" | "Q2" | "Q3" | "Q4" | "1H" | "2H";

export type FootballThreshold = {
  line: number;
  hits: number;
  misses: number;
  pushes: number;
  percentage: number;
  operator?: string;
};

export type FootballPeriod = { team_score: number; opponent_score: number };

export type FootballMatch = {
  game_pk: number;
  game_date: string;
  location: "home" | "away";
  opponent_pk: number;
  opponent_name: string;
  team_score: number;
  opponent_score: number;
  score_line: string;
  result: "W" | "L" | "T";
  total_points: number;
  periods: Record<string, FootballPeriod | undefined>;
};

export type FootballSplit = {
  games_played: number;
  games_with_stats: number;
  wins: number;
  losses: number;
  ties: number;
  win_pct: number;
  points_for_per_game: number;
  points_against_per_game: number;
  total_points_per_game: number;
  passing_yards_per_game: number;
  passing_touchdowns_per_game: number;
  rushing_yards_per_game: number;
  turnovers_per_game: number;
  interceptions_per_game: number;
  touch_down_per_game: number;
  punts_per_game: number;
  field_goals_per_game: number;
  matches: FootballMatch[];
};

export type FootballTeam = {
  team_pk: number;
  team_name: string;
  conference?: string | null;
  overall: FootballSplit;
  home: FootballSplit;
  away: FootballSplit;
};

export type FootballSummaryResponse = {
  competition_name: string;
  competition_season_id: number;
  last_n: number;
  selected: Location;
  teams_found: number;
  teams: FootballTeam[];
};

export const FOOTBALL_RANK_METRICS = [
  "points_for",
  "points_against",
  "total_points",
  "passing_yards",
  "passing_touchdowns",
  "rushing_yards",
  "rushing_attempts",
  "touch_down",
  "field_goals",
  "turnovers",
  "interceptions_thrown",
  "punts",
] as const;

export type FootballRankKey = (typeof FOOTBALL_RANK_METRICS)[number];

export type FootballRankMetric = {
  total: number | null;
  average: number | null;
  games_with_data: number;
  coverage_pct: number;
  rank: number | null;
};

export type FootballRankedTeam = {
  team_pk: number;
  team_name: string;
  games_played: number;
  conference?: string | null;
} & Record<FootballRankKey, FootballRankMetric>;

export type FootballRankingsResponse = Omit<FootballSummaryResponse, "teams"> & {
  teams: FootballRankedTeam[];
};

export type FootballLines = {
  gameTotal: number;
  teamTotal: number;
  teamSpread: number;
  opponentSpread: number;
};
export const INITIAL_LINES: FootballLines = {
  gameTotal: 47.5,
  teamTotal: 24.5,
  teamSpread: -5,
  opponentSpread: 10,
};

export type FootballFilters = { league: FootballLeague; location: Location; lastN: number };

const BASE = envBaseUrl("VITE_FOOTBALL_API_BASE_URL", "http://localhost:8000/api");
const SUMMARY_PATH = envString("VITE_FOOTBALL_SUMMARY_PATH", "/american-football/teams/summary");
const RANKINGS_PATH = envString("VITE_FOOTBALL_RANKINGS_PATH", "/american-football/teams/rankings");

export const FOOTBALL_LEAGUES: FootballLeague[] = [
  {
    key: "nfl",
    label: "NFL",
    competitionName: envString("VITE_FOOTBALL_NFL_NAME", "NFL"),
    seasonId: envSeasonId("VITE_FOOTBALL_NFL_SEASON_ID", 30),
  },
  {
    key: "ncaaf",
    label: "NCAAF",
    competitionName: envString("VITE_FOOTBALL_NCAAF_NAME", "NCAAF"),
    seasonId: envSeasonId("VITE_FOOTBALL_NCAAF_SEASON_ID"),
  },
];

export const getFootballLeague = (key: string) => findCompetition(FOOTBALL_LEAGUES, key);

export async function fetchFootballSummary(
  filters: FootballFilters & { lines: FootballLines },
  signal?: AbortSignal,
) {
  const { lines } = filters;
  const data = await getJSON<FootballSummaryResponse>(
    BASE,
    SUMMARY_PATH,
    {
      ...competitionParams(filters.league, filters.location, filters.lastN),
      total_points: lines.gameTotal,
      total_points_operator: "over",
      team_total_points: lines.teamTotal,
      team_total_points_operator: "over",
      team_spread_line: lines.teamSpread,
      opponent_spread_line: lines.opponentSpread,
    },
    "Football",
    signal,
  );
  requireArray(data.teams, "Football summary API response has no teams[].");
  return data;
}

export async function fetchFootballRankings(filters: FootballFilters, signal?: AbortSignal) {
  const data = await getJSON<FootballRankingsResponse>(
    BASE,
    RANKINGS_PATH,
    competitionParams(filters.league, filters.location, filters.lastN),
    "Football",
    signal,
  );
  requireArray(data.teams, "Football rankings API response has no teams[].");
  return data;
}

export const footballSummaryQuery = (filters: FootballFilters & { lines: FootballLines }) =>
  queryOptions({
    queryKey: [
      "football",
      "summary",
      filters.league.key,
      filters.league.seasonId,
      filters.location,
      filters.lastN,
      filters.lines,
    ],
    queryFn: ({ signal }) => fetchFootballSummary(filters, signal),
    enabled: filters.league.seasonId != null,
  });

export const footballRankingsQuery = ({ league, location, lastN }: FootballFilters) =>
  queryOptions({
    queryKey: ["football", "rankings", league.key, league.seasonId, location, lastN],
    queryFn: ({ signal }) => fetchFootballRankings({ league, location, lastN }, signal),
    enabled: league.seasonId != null,
  });

/** Hit, miss or push for one game against a line. */
export function matchBetResult(
  match: FootballMatch,
  kind: FootballBetKind,
  line: number,
): BetResult {
  const diff =
    kind === "gameTotal"
      ? match.total_points - line
      : kind === "teamTotal"
        ? match.team_score - line
        : kind === "teamSpread"
          ? match.team_score + line - match.opponent_score
          : match.opponent_score + line - match.team_score;
  return diff > 1e-6 ? "hit" : diff < -1e-6 ? "miss" : "push";
}

/** Pushes are excluded from the hit-rate denominator. */
export function betSummary(matches: FootballMatch[], kind: FootballBetKind, line: number) {
  const results = matches.map((match) => matchBetResult(match, kind, line));
  const hits = results.filter((result) => result === "hit").length;
  const pushes = results.filter((result) => result === "push").length;
  const decided = results.length - pushes;
  return {
    hits,
    pushes,
    misses: decided - hits,
    decided,
    pct: decided ? (hits / decided) * 100 : null,
    results,
  };
}

/** Quarter or half score; halves fall back to summing their two quarters. */
export function periodScore(
  match: FootballMatch,
  period: FootballPeriodKey,
): FootballPeriod | null {
  const direct = match.periods?.[period];
  if (direct && Number.isFinite(direct.team_score) && Number.isFinite(direct.opponent_score))
    return direct;
  if (period !== "1H" && period !== "2H") return null;
  const [a, b] = (period === "1H" ? ["Q1", "Q2"] : ["Q3", "Q4"]).map((key) => match.periods?.[key]);
  return a && b
    ? {
        team_score: a.team_score + b.team_score,
        opponent_score: a.opponent_score + b.opponent_score,
      }
    : null;
}

// NFL conference membership is stable; NCAAF conferences need API metadata.
const AFC = new Set([
  "Baltimore Ravens",
  "Buffalo Bills",
  "Cincinnati Bengals",
  "Cleveland Browns",
  "Denver Broncos",
  "Houston Texans",
  "Indianapolis Colts",
  "Jacksonville Jaguars",
  "Kansas City Chiefs",
  "Las Vegas Raiders",
  "Los Angeles Chargers",
  "Miami Dolphins",
  "New England Patriots",
  "New York Jets",
  "Pittsburgh Steelers",
  "Tennessee Titans",
]);
const NFC = new Set([
  "Arizona Cardinals",
  "Atlanta Falcons",
  "Carolina Panthers",
  "Chicago Bears",
  "Dallas Cowboys",
  "Detroit Lions",
  "Green Bay Packers",
  "Los Angeles Rams",
  "Minnesota Vikings",
  "New Orleans Saints",
  "New York Giants",
  "Philadelphia Eagles",
  "San Francisco 49ers",
  "Seattle Seahawks",
  "Tampa Bay Buccaneers",
  "Washington Commanders",
]);

export function teamConference(
  team: { team_name: string; conference?: string | null },
  leagueKey: string,
): string | null {
  if (team.conference) return team.conference;
  if (leagueKey !== "nfl") return null;
  return AFC.has(team.team_name) ? "AFC" : NFC.has(team.team_name) ? "NFC" : null;
}

export function conferencesOf(
  teams: { team_name: string; conference?: string | null }[],
  leagueKey: string,
): string[] {
  return [
    ...new Set(
      teams.map((team) => teamConference(team, leagueKey)).filter((c): c is string => !!c),
    ),
  ].sort();
}
