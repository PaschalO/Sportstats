/** Shared API layer for NBA, NCAAB, WNBA and NBL. No mock data is used. */
export type BasketballLocation = "overall" | "home" | "away";
export type BasketballLeagueKey = "nba" | "ncaab" | "wnba" | "nbl";
export type BasketballLeague = {
    key: BasketballLeagueKey;
    label: string;
    competitionName: string;
    seasonId: number | null;
};

function envString(name: string, fallback: string): string {
    return String(import.meta.env[name] || fallback);
}
function envSeason(name: string): number | null {
    const value = import.meta.env[name];
    const n = Number(value);
    return value !== undefined && String(value).trim() !== "" && Number.isInteger(n) && n > 0 ? n : null;
}

export const BASKETBALL_LEAGUES: BasketballLeague[] = [
    { key: "nba", label: "NBA", competitionName: envString("VITE_BASKETBALL_NBA_NAME", "NBA"), seasonId: envSeason("VITE_BASKETBALL_NBA_SEASON_ID") ?? 34 },
    { key: "ncaab", label: "NCAAB", competitionName: envString("VITE_BASKETBALL_NCAAB_NAME", "NCAAB"), seasonId: envSeason("VITE_BASKETBALL_NCAAB_SEASON_ID") },
    { key: "wnba", label: "WNBA", competitionName: envString("VITE_BASKETBALL_WNBA_NAME", "WNBA"), seasonId: envSeason("VITE_BASKETBALL_WNBA_SEASON_ID") },
    { key: "nbl", label: "NBL", competitionName: envString("VITE_BASKETBALL_NBL_NAME", "NBL"), seasonId: envSeason("VITE_BASKETBALL_NBL_SEASON_ID") },
];
export function getBasketballLeague(key: string): BasketballLeague | null {
    return BASKETBALL_LEAGUES.find((league) => league.key === key) ?? null;
}
export function seasonOf(league: BasketballLeague): number {
    if (league.seasonId == null) throw new Error(`Set the season ID for ${league.label} in your Vite .env file.`);
    return league.seasonId;
}

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
    periods: Record<string, BasketballPeriod>;
    total_points_threshold_result?: unknown;
    team_total_points_threshold_result?: unknown;
    team_spread_result?: unknown;
    opponent_spread_result?: unknown;
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
    field_goals_made: number;
    field_goals_attempted: number;
    three_points_made: number;
    three_points_attempted: number;
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
    selected: BasketballLocation;
    teams_found: number;
    teams: BasketballTeam[];
    filters: Record<string, unknown>;
}
export interface BasketballRankBase {
    games_with_data: number;
    coverage_pct: number;
    rank: number | null;
}
export interface BasketballRankCount extends BasketballRankBase {
    total: number | null;
    average: number | null;
}
export interface BasketballRankPct extends BasketballRankBase {
    made: number | null;
    attempted: number | null;
    percentage: number | null;
}
export interface BasketballRankMax extends BasketballRankBase {
    max: number | null;
    average: number | null;
}
export type BasketballRankMetric = BasketballRankCount | BasketballRankPct | BasketballRankMax;
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
    selected: BasketballLocation;
    teams_found: number;
    teams: BasketballRankTeam[];
    filters: Record<string, unknown>;
}

const BASE = String(import.meta.env.VITE_BASKETBALL_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");
// Custom backend paths are configurable; verify these against your FastAPI /docs.
const SUMMARY_PATH = envString("VITE_BASKETBALL_SUMMARY_PATH", "/basketball/teams/summary");
const RANKINGS_PATH = envString("VITE_BASKETBALL_RANKINGS_PATH", "/basketball/teams/rankings");

async function getJSON<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
    const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}?${params}`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Basketball API ${response.status} at ${url}: ${(await response.text()).slice(0, 350)}`);
    return (await response.json()) as T;
}

export type BasketballSummaryFilters = {
    league: BasketballLeague;
    location?: BasketballLocation;
    lastN?: number;
    totalPointsLine?: number | null;
};
export async function fetchBasketballTeamSummary(
    { league, location = "overall", lastN = 100, totalPointsLine = null }: BasketballSummaryFilters,
    signal?: AbortSignal
): Promise<BasketballSummaryResponse> {
    const params = new URLSearchParams({
        competition_name: league.competitionName,
        competition_season_id: String(seasonOf(league)),
        last_n: String(lastN),
        location,
    });
    if (totalPointsLine != null) {
        params.set("total_points", String(totalPointsLine));
        params.set("total_points_operator", "over");
    }
    const data = await getJSON<BasketballSummaryResponse>(SUMMARY_PATH, params, signal);
    if (!Array.isArray(data.teams)) throw new Error("Unexpected basketball summary JSON: missing teams array.");
    return data;
}
export async function fetchBasketballTeamRankings(
    { league, location = "overall", lastN = 5 }: Omit<BasketballSummaryFilters, "totalPointsLine">,
    signal?: AbortSignal
): Promise<BasketballRankingsResponse> {
    const params = new URLSearchParams({
        competition_name: league.competitionName,
        competition_season_id: String(seasonOf(league)),
        last_n: String(lastN),
        location,
    });
    const data = await getJSON<BasketballRankingsResponse>(RANKINGS_PATH, params, signal);
    if (!Array.isArray(data.teams)) throw new Error("Unexpected basketball rankings JSON: missing teams array.");
    return data;
}
export function basketballMatches(matches: BasketballMatch[]): BasketballMatch[] {
    return [...matches].sort((a, b) => b.game_date.localeCompare(a.game_date) || b.game_pk - a.game_pk);
}
export function overHit(matches: BasketballMatch[], line: number): { hits: number; total: number; pct: number | null } {
    const values = matches.map((m) => m.total_points).filter((n) => Number.isFinite(n));
    const hits = values.filter((value) => value > line).length;
    return { hits, total: values.length, pct: values.length ? (hits / values.length) * 100 : null };
}
export function periodNames(matches: BasketballMatch[]): string[] {
    const keys = new Set(matches.flatMap((m) => Object.keys(m.periods ?? {})));
    const primary = ["Q1", "Q2", "Q3", "Q4", "1H", "2H", "1ST", "2ND", "H1", "H2"];
    const result = primary.filter((key) => keys.has(key));
    // Ignore OT periods for the quarter/half comparison; show OT in the match log.
    return result.length ? result : [...keys].filter((key) => !/^OT/i.test(key)).sort();
}
export function periodTotals(match: BasketballMatch, key: string): BasketballPeriod | null {
    if (match.periods?.[key]) return match.periods[key];
    // Some NCAA feeds label halves as 1ST/2ND or H1/H2.
    const aliases = key === "Q1" ? ["1ST", "H1"] : key === "Q2" ? ["2ND", "H2"] : [];
    for (const alias of aliases) if (match.periods?.[alias]) return match.periods[alias];
    const pair = key === "Q1" ? ["Q1", "Q2"] : key === "Q2" ? ["Q3", "Q4"] : null;
    if (!pair || !pair.every((part) => match.periods?.[part])) return null;
    return pair.reduce((acc, part) => ({
        team_points: acc.team_points + match.periods[part].team_points,
        opponent_points: acc.opponent_points + match.periods[part].opponent_points,
    }), { team_points: 0, opponent_points: 0 });
}
export function numeric(n: number | null | undefined, digits = 1): string {
    return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "—";
}
export function percentage(n: number | null | undefined, digits = 0): string {
    return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(digits)}%` : "—";
}
