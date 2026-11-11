/** One API adapter for NFL and NCAAF (college football). No React/UI code here. */
export type FootballLocation = "overall" | "home" | "away";
export type FootballLeague = { key: string; label: string; competitionName: string; seasonId: number | null };
export type BetResult = "hit" | "miss" | "push";
export type FootballBetKind = "gameTotal" | "teamTotal" | "teamSpread" | "opponentSpread";
export type FootballThreshold = { line: number; hits: number; misses: number; pushes: number; percentage: number; operator?: string };
export type FootballPeriod = { team_score: number; opponent_score: number };
export type FootballMatch = {
    game_pk: number; game_date: string; location: "home" | "away";
    opponent_pk: number; opponent_name: string; team_score: number; opponent_score: number;
    score_line: string; result: "W" | "L" | "T"; total_points: number;
    total_points_threshold_result: BetResult | null; team_total_points_threshold_result: BetResult | null;
    team_spread_result: BetResult | null; opponent_spread_result: BetResult | null;
    periods: Record<string, FootballPeriod | undefined>;
};
export type FootballLocationStats = {
    games_played: number; games_with_stats: number; wins: number; losses: number; ties: number; win_pct: number;
    points_for: number; points_for_per_game: number; points_against: number; points_against_per_game: number;
    total_points: number; total_points_per_game: number; passing_yards: number; passing_yards_per_game: number;
    passing_touchdowns: number; passing_touchdowns_per_game: number; rushing_yards: number; rushing_yards_per_game: number;
    turnovers: number; turnovers_per_game: number; interceptions: number; interceptions_per_game: number;
    touch_down: number; touch_down_per_game: number; punts: number; punts_per_game: number;
    field_goals: number; field_goals_per_game: number;
    total_points_threshold: FootballThreshold; team_total_points_threshold: FootballThreshold;
    team_spread: FootballThreshold; opponent_spread: FootballThreshold; matches: FootballMatch[];
};
export type FootballTeam = {
    team_pk: number; team_name: string; conference?: string | null;
    overall: FootballLocationStats; home: FootballLocationStats; away: FootballLocationStats;
};
export type FootballSummaryResponse = { competition_name: string; competition_season_id: number; last_n: number; selected: FootballLocation; teams_found: number; teams: FootballTeam[] };
export const FOOTBALL_RANK_METRICS = [
    "points_for", "points_against", "total_points", "passing_yards", "passing_touchdowns",
    "rushing_yards", "rushing_attempts", "touch_down", "field_goals", "turnovers",
    "interceptions_thrown", "punts",
] as const;
export type FootballRankKey = typeof FOOTBALL_RANK_METRICS[number];
export type FootballRankMetric = { total: number | null; average: number | null; games_with_data: number; coverage_pct: number; rank: number | null };
export type FootballRankedTeam = { team_pk: number; team_name: string; games_played: number } & Record<FootballRankKey, FootballRankMetric>;
export type FootballRankingsResponse = { competition_name: string; competition_season_id: number; last_n: number; selected: FootballLocation; teams_found: number; teams: FootballRankedTeam[] };
export type FootballFilters = { league: FootballLeague; location: FootballLocation; lastN: number };
export type FootballLines = { gameTotal: number; teamTotal: number; teamSpread: number; opponentSpread: number };
export const INITIAL_LINES: FootballLines = { gameTotal: 47.5, teamTotal: 24.5, teamSpread: -5, opponentSpread: 10 };
const configNumber = (key: string, fallback: number | null = null): number | null => {
    const value = import.meta.env[key] as string | undefined;
    if (value == null || value.trim() === "") return fallback;
    const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null;
};
const configName = (key: string, fallback: string) => String(import.meta.env[key] || fallback);
export const FOOTBALL_LEAGUES: FootballLeague[] = [
    { key: "nfl", label: "NFL", competitionName: configName("VITE_FOOTBALL_NFL_NAME", "NFL"), seasonId: configNumber("VITE_FOOTBALL_NFL_SEASON_ID", 30) },
    { key: "ncaaf", label: "NCAAF", competitionName: configName("VITE_FOOTBALL_NCAAF_NAME", "NCAAF"), seasonId: configNumber("VITE_FOOTBALL_NCAAF_SEASON_ID") },
];
export const getFootballLeague = (key: string) => FOOTBALL_LEAGUES.find((entry) => entry.key === key) ?? null;
const base = String(import.meta.env.VITE_FOOTBALL_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");
const summaryPath = String(import.meta.env.VITE_FOOTBALL_SUMMARY_PATH ?? "/american-football/teams/summary");
const rankingsPath = String(import.meta.env.VITE_FOOTBALL_RANKINGS_PATH ?? "/american-football/teams/rankings");
async function getData<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
    const res = await fetch(`${base}${path}?${params.toString()}`, { signal });
    if (!res.ok) throw new Error(`Football API ${res.status}: ${(await res.text()).slice(0, 350)}`);
    return res.json() as Promise<T>;
}
function baseParams({ league, location, lastN }: FootballFilters) {
    if (league.seasonId == null) throw new Error(`Configure the season ID for ${league.label} in your .env file.`);
    return new URLSearchParams({ competition_name: league.competitionName, competition_season_id: String(league.seasonId), last_n: String(lastN), location });
}
export async function fetchFootballSummary(filters: FootballFilters & { lines?: FootballLines }, signal?: AbortSignal) {
    const params = baseParams(filters);
    if (filters.lines) {
        params.set("total_points", String(filters.lines.gameTotal));
        params.set("total_points_operator", "over");
        params.set("team_total_points", String(filters.lines.teamTotal));
        params.set("team_total_points_operator", "over");
        params.set("team_spread_line", String(filters.lines.teamSpread));
        params.set("opponent_spread_line", String(filters.lines.opponentSpread));
    }
    const data = await getData<FootballSummaryResponse>(summaryPath, params, signal);
    if (!Array.isArray(data.teams)) throw new Error("Football summary API response has no teams[].");
    return data;
}
export async function fetchFootballRankings(filters: FootballFilters, signal?: AbortSignal) {
    const data = await getData<FootballRankingsResponse>(rankingsPath, baseParams(filters), signal);
    if (!Array.isArray(data.teams)) throw new Error("Football rankings API response has no teams[].");
    return data;
}
export const orderedMatches = (matches: FootballMatch[] = []) => [...matches].sort((a,b) => b.game_date.localeCompare(a.game_date) || b.game_pk - a.game_pk);
export function matchBetResult(match: FootballMatch, kind: FootballBetKind, line: number): BetResult {
    const diff = kind === "gameTotal" ? match.total_points - line
        : kind === "teamTotal" ? match.team_score - line
            : kind === "teamSpread" ? match.team_score + line - match.opponent_score
                : match.opponent_score + line - match.team_score;
    return diff > 1e-6 ? "hit" : diff < -1e-6 ? "miss" : "push";
}
export function betSummary(matches: FootballMatch[], kind: FootballBetKind, line: number) {
    const results = matches.map((m) => matchBetResult(m, kind, line));
    const hits = results.filter((s) => s === "hit").length;
    const pushes = results.filter((s) => s === "push").length;
    const misses = results.length - hits - pushes;
    return { hits, misses, pushes, available: results.length, pct: hits + misses ? hits / (hits + misses) * 100 : null, results };
}
export function periodScore(match: FootballMatch, period: "Q1" | "Q2" | "Q3" | "Q4" | "1H" | "2H"): FootballPeriod | null {
    const direct = match.periods?.[period];
    if (direct && Number.isFinite(direct.team_score) && Number.isFinite(direct.opponent_score)) return direct;
    if (period === "1H" || period === "2H") {
        const pair = period === "1H" ? (["Q1","Q2"] as const) : (["Q3","Q4"] as const);
        const first = match.periods?.[pair[0]], second = match.periods?.[pair[1]];
        if (first && second) return { team_score: first.team_score + second.team_score, opponent_score: first.opponent_score + second.opponent_score };
    }
    return null;
}
export function quarterSummary(matches: FootballMatch[], period: "Q1" | "Q2" | "Q3" | "Q4", line = 14.5) {
    const values = matches.map((match) => periodScore(match, period)).filter((value): value is FootballPeriod => value != null);
    const n = values.length;
    const combined = values.map((v) => v.team_score + v.opponent_score);
    return { n, combined, total: n ? combined.reduce((a,b) => a+b,0) / n : null,
        scored: n ? values.reduce((a,b) => a+b.team_score,0) / n : null,
        wins: values.filter((v) => v.team_score > v.opponent_score).length,
        over: combined.filter((v) => v > line).length,
    };
}
// NFL conference membership is stable; NCAAF conference requires API metadata.
const AFC = new Set(["Baltimore Ravens","Buffalo Bills","Cincinnati Bengals","Cleveland Browns","Denver Broncos","Houston Texans","Indianapolis Colts","Jacksonville Jaguars","Kansas City Chiefs","Las Vegas Raiders","Los Angeles Chargers","Miami Dolphins","New England Patriots","New York Jets","Pittsburgh Steelers","Tennessee Titans"]);
const NFC = new Set(["Arizona Cardinals","Atlanta Falcons","Carolina Panthers","Chicago Bears","Dallas Cowboys","Detroit Lions","Green Bay Packers","Los Angeles Rams","Minnesota Vikings","New Orleans Saints","New York Giants","Philadelphia Eagles","San Francisco 49ers","Seattle Seahawks","Tampa Bay Buccaneers","Washington Commanders"]);
export function teamConference(team: { team_name: string; conference?: string | null }, leagueKey: string): string | null {
    if (team.conference) return team.conference;
    if (leagueKey !== "nfl") return null;
    return AFC.has(team.team_name) ? "AFC" : NFC.has(team.team_name) ? "NFC" : null;
}
export const footballNumber = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
export const footballPercent = (value: number | null | undefined, digits = 0) => value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(digits)}%`;
