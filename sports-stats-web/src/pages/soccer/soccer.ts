import { byNewest, toNumber } from "../../lib/format";
import { resultTone, type FormResult } from "../../lib/results";
import type {
  SoccerLocationSummary,
  SoccerMatch,
  SoccerResult,
  SoccerSummaryMatch,
} from "../../services/soccerService";

export const SPORT = "soccer";

export const LAST_N_OPTIONS = [
  { value: 100, label: "All games" },
  { value: 5, label: "Last 5" },
  { value: 10, label: "Last 10" },
  { value: 15, label: "Last 15" },
];

/** 3 points for a win, 1 for a draw, unless the API supplies points. */
export const points = (s: SoccerLocationSummary) => toNumber(s.points) ?? s.wins * 3 + s.draws;
export const goalsFor = (s: SoccerLocationSummary) =>
  toNumber(s.goals) ?? (toNumber(s.goals_per_game) ?? 0) * s.games_played;
export const goalsAgainst = (s: SoccerLocationSummary) =>
  toNumber(s.goals_against) ?? (toNumber(s.goals_against_per_game) ?? 0) * s.games_played;
export const goalDifference = (s: SoccerLocationSummary) =>
  Math.round(goalsFor(s) - goalsAgainst(s));

/** League table order: points, goal difference, goals scored, name. */
export function tableOrder<T extends { team_name: string }>(
  get: (team: T) => SoccerLocationSummary,
) {
  return (a: T, b: T) =>
    points(get(b)) - points(get(a)) ||
    goalDifference(get(b)) - goalDifference(get(a)) ||
    goalsFor(get(b)) - goalsFor(get(a)) ||
    a.team_name.localeCompare(b.team_name);
}

/** Share of games over a total-goals line; uses the API threshold when it matches. */
export function overRate(s: SoccerLocationSummary, line: number): number | null {
  if (s.total_goals_over?.line === line) return toNumber(s.total_goals_over.percentage);
  const totals = (s.matches ?? []).map(
    (m) => toNumber(m.total_goals) ?? m.team_score + m.opponent_score,
  );
  return totals.length
    ? (totals.filter((total) => total > line).length / totals.length) * 100
    : null;
}

export function bttsRate(s: SoccerLocationSummary): number | null {
  const given = toNumber(s.btts_pct);
  if (given !== null) return given;
  const count = toNumber(s.btts);
  return s.games_played && count !== null ? (count / s.games_played) * 100 : null;
}

export function cleanSheetRate(s: SoccerLocationSummary): number | null {
  const given = toNumber(s.clean_sheets_pct);
  if (given !== null) return given;
  const count = toNumber(s.clean_sheets);
  if (count !== null && s.games_played) return (count / s.games_played) * 100;
  const matches = s.matches ?? [];
  return matches.length
    ? (matches.filter((m) => m.opponent_score === 0).length / matches.length) * 100
    : null;
}

export function matchResult(
  match: Pick<SoccerSummaryMatch, "result" | "team_score" | "opponent_score">,
): SoccerResult {
  if (match.result === "W" || match.result === "D" || match.result === "L") return match.result;
  return match.team_score > match.opponent_score
    ? "W"
    : match.team_score < match.opponent_score
      ? "L"
      : "D";
}

const RESULT_NAMES: Record<SoccerResult, string> = { W: "Win", D: "Draw", L: "Loss" };

export function soccerResult(match: SoccerSummaryMatch | SoccerMatch): FormResult {
  const result = matchResult(match);
  return {
    key: match.game_pk,
    label: result,
    tone: resultTone(result),
    title: `${RESULT_NAMES[result]} ${match.score_line} vs ${match.opponent_name}`,
  };
}

/** Last five results, oldest first so the newest sits on the right. */
export const soccerForm = (matches: Array<SoccerSummaryMatch | SoccerMatch> = []) =>
  byNewest(matches).slice(0, 5).reverse().map(soccerResult);

/** Yellow + red, or null when either is missing. */
export function cards(stats: SoccerMatch["team_stats"]): number | null {
  const yellow = toNumber(stats?.yellow_cards);
  const red = toNumber(stats?.red_cards);
  return yellow === null || red === null ? null : yellow + red;
}
