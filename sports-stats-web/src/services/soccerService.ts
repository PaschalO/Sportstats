/** Soccer FastAPI transport and response types. No UI code belongs here. */
export type SoccerLocation = "overall" | "home" | "away";
export type SoccerResult = "W" | "D" | "L";
export type SoccerLeagueKey = "premier-league" | "laliga" | "serie-a" | "bundesliga" | "ligue-1" | "mls" | "championship" | "uefa-champions-league" | "uefa-europa-league" | "uefa-conference-league";
export type SoccerLeagueConfig = { key: SoccerLeagueKey; label: string; competitionName: string; seasonId: number | null };

const BASE = String(import.meta.env.VITE_SOCCER_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");
const envNumber = (name: string): number | null => {
    const value = import.meta.env[name] as string | undefined;
    if (!value) return null;
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};
const envName = (key: string, fallback: string) => String(import.meta.env[key] || fallback);

export const SOCCER_LEAGUES: SoccerLeagueConfig[] = [
    { key: "premier-league", label: "Premier League", competitionName: envName("VITE_SOCCER_EPL_COMPETITION_NAME", "Premier League"), seasonId: envNumber("VITE_SOCCER_EPL_SEASON_ID") ?? 25 },
    { key: "laliga", label: "LaLiga", competitionName: envName("VITE_SOCCER_LALIGA_COMPETITION_NAME", "LaLiga"), seasonId: envNumber("VITE_SOCCER_LALIGA_SEASON_ID") ?? 23 },
    { key: "serie-a", label: "Serie A", competitionName: envName("VITE_SOCCER_SERIE_A_COMPETITION_NAME", "Serie A"), seasonId: envNumber("VITE_SOCCER_SERIE_A_SEASON_ID") },
    { key: "bundesliga", label: "Bundesliga", competitionName: envName("VITE_SOCCER_BUNDESLIGA_COMPETITION_NAME", "Bundesliga"), seasonId: envNumber("VITE_SOCCER_BUNDESLIGA_SEASON_ID") },
    { key: "ligue-1", label: "Ligue 1", competitionName: envName("VITE_SOCCER_LIGUE_1_COMPETITION_NAME", "Ligue 1"), seasonId: envNumber("VITE_SOCCER_LIGUE_1_SEASON_ID") },
    { key: "mls", label: "MLS", competitionName: envName("VITE_SOCCER_MLS_COMPETITION_NAME", "MLS"), seasonId: envNumber("VITE_SOCCER_MLS_SEASON_ID") },
    { key: "championship", label: "Championship", competitionName: envName("VITE_SOCCER_CHAMPIONSHIP_COMPETITION_NAME", "Championship"), seasonId: envNumber("VITE_SOCCER_CHAMPIONSHIP_SEASON_ID") },
    { key: "uefa-champions-league", label: "Champions League", competitionName: envName("VITE_SOCCER_CHAMPIONS_LEAGUE_COMPETITION_NAME", "Uefa Champions League"), seasonId: envNumber("VITE_SOCCER_UEFA_CHAMPIONS_LEAGUE_SEASON_ID") },
    { key: "uefa-europa-league", label: "Europa League", competitionName: envName("VITE_SOCCER_EUROPA_LEAGUE_COMPETITION_NAME", "UEFA Europa League"), seasonId: envNumber("VITE_SOCCER_UEFA_EUROPA_LEAGUE_SEASON_ID") },
    { key: "uefa-conference-league", label: "Conference League", competitionName: envName("VITE_SOCCER_CONFERENCE_LEAGUE_COMPETITION_NAME", "UEFA Conference League"), seasonId: envNumber("VITE_SOCCER_UEFA_CONFERENCE_LEAGUE_SEASON_ID") },
];

export function getSoccerLeague(key: string): SoccerLeagueConfig | null {
    return SOCCER_LEAGUES.find((league) => league.key === key) ?? null;
}

export interface SoccerThreshold { line: number | null; operator: string; hits: number; misses: number; pushes: number; percentage: number; }

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
/** Individual match in /soccer/teams/matches. */
export interface SoccerMatch {
    game_pk: number;
    game_date: string;
    team_pk: number;
    team_name: string;
    location: "home" | "away";
    opponent_name: string;
    opponent_pk?: number | null;
    team_score: number;
    opponent_score: number;
    score_line: string;
    total_goals: number;
    result: SoccerResult;
    team_stats: SoccerMatchStats | null;
    opponent_stats: SoccerMatchStats | null;
    btts: boolean;
    total_goals_over_hit: boolean | null;
    team_total_goals_over_hit: boolean | null;
}
/** The compact match records nested under each team's overall/home/away summary. */
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
export interface SoccerResponseFilters {
    competition_name: string;
    competition_season_id: number;
    last_n: number;
    location: SoccerLocation | null;
    total_goals_over: number | null;
    team_total_goals_over: number | null;
}
export interface SoccerLocationSummary {
    games_played: number;
    games_with_stats: number;
    wins: number;
    draws: number;
    losses: number;
    // Points are not sent by this API: the league table derives 3*wins + draws.
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
export interface SoccerTeamSummaryResponse {
    competition_name: string;
    competition_season_id: number;
    last_n: number;
    selected: SoccerLocation;
    /** Soccer summary uses singular team_found (rankings uses teams_found). */
    team_found: number;
    filters: SoccerResponseFilters;
    teams: SoccerTeam[];
}
export interface SoccerTeamMatchesResponse {
    team_pk: number;
    team_name: string;
    competition_name: string;
    competition_season_id: number;
    last_n: number;
    selected: SoccerLocation;
    filters: SoccerResponseFilters & { team_name: string };
    games_played: number;
    total_goals_over: SoccerThreshold | null;
    team_total_goals_over: SoccerThreshold | null;
    matches: SoccerMatch[];
}
export interface SummaryFilters {
    league: SoccerLeagueConfig;
    location: SoccerLocation;
    lastN: number;
    totalGoalsOver?: number | null;
    teamGoalsOver?: number | null;
}
export interface MatchFilters {
    league: SoccerLeagueConfig;
    teamName: string;
    location: SoccerLocation;
    lastN: number;
}

async function getJSON(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(`${BASE}${path}?${params.toString()}`, { signal });
    if (!response.ok) {
        const error = (await response.text()).slice(0, 500);
        throw new Error(`Soccer API ${response.status}: ${error}`);
    }
    return response.json() as Promise<unknown>;
}
function season(league: SoccerLeagueConfig): number {
    if (league.seasonId == null) throw new Error(`Set the season ID for ${league.label} in your .env file.`);
    return league.seasonId;
}

export async function fetchSoccerTeamSummary(filters: SummaryFilters, signal?: AbortSignal): Promise<SoccerTeamSummaryResponse> {
    const params = new URLSearchParams({
        competition_name: filters.league.competitionName,
        competition_season_id: String(season(filters.league)),
        last_n: String(filters.lastN),
        location: filters.location,
    });
    if (filters.totalGoalsOver != null) params.set("total_goals_over", String(filters.totalGoalsOver));
    if (filters.teamGoalsOver != null) params.set("team_total_goals_over", String(filters.teamGoalsOver));
    const raw = await getJSON("/soccer/teams/summary", params, signal) as SoccerTeamSummaryResponse;
    if (!Array.isArray(raw?.teams)) throw new Error("Soccer summary response is missing teams[].");
    if (typeof raw.team_found !== "number") throw new Error("Soccer summary response must include team_found (singular).");
    return raw;
}

/* The matches endpoint returns separate team and opponent full-game stats.
   Missing opponent stats are kept as null, NEVER converted to zero. */
export async function fetchSoccerTeamMatches(filters: MatchFilters, signal?: AbortSignal): Promise<SoccerTeamMatchesResponse> {
    const params = new URLSearchParams({
        team_name: filters.teamName,
        competition_name: filters.league.competitionName,
        competition_season_id: String(season(filters.league)),
        last_n: String(filters.lastN),
        location: filters.location,
    });
    const raw = await getJSON("/soccer/teams/matches", params, signal) as SoccerTeamMatchesResponse;
    if (!Array.isArray(raw?.matches)) throw new Error("Soccer matches response is missing matches[].");
    return raw;
}

/** Rankings API format (soccer_team_ranking.json): nested metric objects, NOT numbers. */
export interface SoccerRankingMetric {
    total: number | null;
    average: number | null;
    games_with_data: number;
    coverage_pct: number;
    rank: number | null;
}
export const SOCCER_RANK_METRICS = [
    "fouls_committed", "shots_total", "shots_on_target", "cards", "tackles",
    "corners", "possession_pct", "throw_ins", "free_kicks", "offsides",
] as const;
export type SoccerRankingMetricKey = (typeof SOCCER_RANK_METRICS)[number];
export type SoccerRankedTeam = {
    team_pk: number;
    team_name: string;
    games_played: number;
} & Record<SoccerRankingMetricKey, SoccerRankingMetric>;
export interface SoccerTeamRankingsResponse {
    sport: string; // "Soccer" in the supplied response
    competition_name: string;
    competition_season_id: number;
    last_n: number;
    selected: SoccerLocation;
    filters: {
        sport: string;
        competition_name: string;
        competition_season_id: number;
        last_n: number;
        location: SoccerLocation | null;
    };
    teams_found: number;
    teams: SoccerRankedTeam[];
}
export interface RankingFilters {
    league: SoccerLeagueConfig;
    location: SoccerLocation;
    lastN: number;
}
/** Check the rankings endpoint path in FastAPI Swagger. This is configurable in .env. */
export async function fetchSoccerTeamRankings(filters: RankingFilters, signal?: AbortSignal): Promise<SoccerTeamRankingsResponse> {
    const path = String(import.meta.env.VITE_SOCCER_RANKINGS_PATH ?? "/soccer/teams/rankings");
    const params = new URLSearchParams({
        sport: "Soccer",
        competition_name: filters.league.competitionName,
        competition_season_id: String(season(filters.league)),
        last_n: String(filters.lastN),
        location: filters.location,
    });
    const raw = await getJSON(path, params, signal) as SoccerTeamRankingsResponse;
    if (!Array.isArray(raw?.teams)) throw new Error("Soccer rankings response is missing teams[].");
    return raw;
}

export function n(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
    return null;
}
export function fmt(value: unknown, digits = 2): string { const num = n(value); return num === null ? "—" : num.toFixed(digits); }
export function percent(value: unknown, digits = 0): string { const num = n(value); return num === null ? "—" : `${num.toFixed(digits)}%`; }
export function matchResult(match: SoccerMatch): SoccerResult {
    if (match.result === "W" || match.result === "D" || match.result === "L") return match.result;
    return match.team_score > match.opponent_score ? "W" : match.team_score < match.opponent_score ? "L" : "D";
}
export function matchSorted(matches: SoccerMatch[]): SoccerMatch[] {
    return [...matches].sort((a, b) => b.game_date.localeCompare(a.game_date));
}
