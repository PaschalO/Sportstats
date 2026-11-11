/**
 * NHL FastAPI service.
 * Place this file at src/services/nhlService.tsx
 * All NHL team-summary request types and network code live here.
 */

export type Location = "overall" | "home" | "away";
export type PeriodLine = 0.5 | 1.5 | 2.5;
export type LastGames = 5 | 10 | 20 | 50 | 100;

export type TeamSummaryFilters = {
    location: Location;
    periodLine: PeriodLine;
    lastGames: LastGames;
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

// NHL result codes returned by the current FastAPI team-summary endpoint.
// W/L are regulation results; OTW/OTL and SOW/SOL retain how the game ended.
export type NHLMatchResult = "W" | "L" | "OTW" | "OTL" | "SOW" | "SOL";

export function isNHLWin(result: NHLMatchResult): boolean {
    return result === "W" || result === "OTW" || result === "SOW";
}

const NHL_RESULT_DESCRIPTIONS: Record<NHLMatchResult, string> = {
    W: "Regulation win",
    L: "Regulation loss",
    OTW: "Overtime win",
    OTL: "Overtime loss",
    SOW: "Shootout win",
    SOL: "Shootout loss",
};

export function describeNHLResult(result: NHLMatchResult): string {
    return NHL_RESULT_DESCRIPTIONS[result];
}

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
    periods: Record<string, NHLMatchPeriod>;
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

export type NHLAPITeam = {
    team_pk: number;
    team_name: string;
    overall: NHLLocationSummary;
    home: NHLLocationSummary;
    away: NHLLocationSummary;
};

export type NHLCompetitionSummaryResponse = {
    competition_name: string;
    competition_season_id: number;
    last_n: number;
    selected: Location;
    teams_found: number;
    filters: Record<string, string | number | null>;
    teams: NHLAPITeam[];
};

/**
 * Set VITE_API_BASE_URL in your .env if FastAPI has an /api prefix.
 * Example: VITE_API_BASE_URL=http://localhost:8000/api
 */
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const NHL_COMPETITION_NAME = "NHL";
export const NHL_SEASON_ID = 33;

export async function fetchNHLTeamSummary(filters: TeamSummaryFilters, signal?: AbortSignal): Promise<NHLCompetitionSummaryResponse> {
    const params = new URLSearchParams({
        competition_name: NHL_COMPETITION_NAME,
        competition_season_id: String(NHL_SEASON_ID),
        location: filters.location,
        last_n: String(filters.lastGames),
        period_threshold: String(filters.periodLine),
        period_operator: "over",
    });

    const response = await fetch(`${API_BASE_URL}/nhl/teams/summary?${params}`, { signal });
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`NHL API error ${response.status}: ${detail.slice(0, 300)}`);
    }

    const body: NHLCompetitionSummaryResponse = await response.json();
    if (!Array.isArray(body.teams)) throw new Error("NHL API response is missing the teams array.");
    return body;
}
