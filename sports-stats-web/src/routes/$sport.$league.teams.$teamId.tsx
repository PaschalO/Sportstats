import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SoccerTeamStats from "../pages/soccer/SoccerTeamStats";
import {
    Bar,
    BarChart,
    Brush,
    CartesianGrid,
    Cell,
    LabelList,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    fetchNHLTeamSummary,
    NHL_COMPETITION_NAME,
    NHL_SEASON_ID,
    type Location,
    type NHLAPITeam,
    type NHLLocationSummary,
    type NHLMatchSummary,
    type NHLMatchResult,
    describeNHLResult,
    isNHLWin,
    type TeamSummaryFilters,
} from "../services/nhlService";
import BasketballTeamDetail from "../pages/basketball/BasketballTeamDetail.tsx";
import FootballTeamDetail from "../pages/american-football/FootballTeamDetail.tsx";

/*
 * NHL team detail page: /hockey/nhl/teams/<team_pk>
 * All display logic stays in this page. Network requests/types stay in nhlService.tsx.
 * Requires: npm install recharts @tanstack/react-query
 * Uses the existing global QueryClientProvider from main.tsx.
 */

export const Route = createFileRoute("/$sport/$league/teams/$teamId")({
    component: NHLTeamDetailRoute,
});

type ChartMetric =
    | "total_goals"
    | "team_goals"
    | "opponent_goals"
    | "first_period"
    | "second_period"
    | "third_period"
    | "shots";

type GamesShown = 5 | 10 | 15 | "season";

type ChartEntry = {
    id: number;
    label: string;
    date: string;
    opponent: string;
    location: "home" | "away";
    result: NHLMatchResult;
    score: string;
    value: number | null;
};

type ChartConfig = {
    name: string;
    description: string;
    defaultLine: number;
    step: number;
};

const CHART_METRICS: { key: ChartMetric; label: string }[] = [
    { key: "total_goals", label: "Total goals" },
    { key: "team_goals", label: "Team goals" },
    { key: "opponent_goals", label: "Opp goals" },
    { key: "first_period", label: "1st period" },
    { key: "second_period", label: "2nd period" },
    { key: "third_period", label: "3rd period" },
    { key: "shots", label: "Shots" },
];

const CONFIG: Record<ChartMetric, ChartConfig> = {
    total_goals: { name: "Total goals", description: "Combined goals by both teams", defaultLine: 6.5, step: 1 },
    team_goals: { name: "Team goals", description: "Goals scored by the selected team", defaultLine: 3.5, step: 1 },
    opponent_goals: { name: "Opponent goals", description: "Goals allowed by the selected team", defaultLine: 3.5, step: 1 },
    first_period: { name: "1st period total goals", description: "Combined goals in the first period", defaultLine: 1.5, step: 1 },
    second_period: { name: "2nd period total goals", description: "Combined goals in the second period", defaultLine: 1.5, step: 1 },
    third_period: { name: "3rd period total goals", description: "Combined goals in the third period", defaultLine: 1.5, step: 1 },
    shots: { name: "Team shots", description: "Shots taken by the selected team", defaultLine: 29.5, step: 1 },
};

const teamAbbreviations: Record<string, string> = {
    "Toronto Maple Leafs": "TOR", "Boston Bruins": "BOS", "Carolina Hurricanes": "CAR",
    "Montréal Canadiens": "MTL", "Montreal Canadiens": "MTL", "New Jersey Devils": "NJD",
    "Tampa Bay Lightning": "TBL", "Utah Mammoth": "UTA", "Edmonton Oilers": "EDM",
    "Washington Capitals": "WSH", "Ottawa Senators": "OTT", "Seattle Kraken": "SEA",
    "Colorado Avalanche": "COL", "Minnesota Wild": "MIN", "Buffalo Sabres": "BUF",
    "Florida Panthers": "FLA", "Vegas Golden Knights": "VGK", "Dallas Stars": "DAL",
    "Nashville Predators": "NSH", "New York Rangers": "NYR", "New York Islanders": "NYI",
    "San Jose Sharks": "SJS", "Calgary Flames": "CGY", "Vancouver Canucks": "VAN",
    "Anaheim Ducks": "ANA", "Chicago Blackhawks": "CHI", "Columbus Blue Jackets": "CBJ",
    "Detroit Red Wings": "DET", "Los Angeles Kings": "LAK", "Philadelphia Flyers": "PHI",
    "Pittsburgh Penguins": "PIT", "St. Louis Blues": "STL", "Winnipeg Jets": "WPG",
};

const ALL_GAMES_FILTERS: TeamSummaryFilters = {
    location: "overall",
    periodLine: 1.5,
    lastGames: 100,
};

function shortTeam(name: string): string {
    return teamAbbreviations[name] ?? name.split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function formatPct(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return "—";
    return `${Math.round(value)}%`;
}

function fmt(value: number | null | undefined, digits = 2): string {
    return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function dateLabel(date: string): string {
    // Dates returned by FastAPI are YYYY-MM-DD. Avoid timezone shifts from Date(string).
    const [year, month, day] = date.split("-").map(Number);
    const label = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return label.format(new Date(Date.UTC(year, month - 1, day)));
}

function orderMatches(matches: NHLMatchSummary[]): NHLMatchSummary[] {
    return [...matches].sort((a, b) =>
        b.game_date.localeCompare(a.game_date) || b.game_pk - a.game_pk
    );
}

function getMetricValue(match: NHLMatchSummary, metric: ChartMetric): number | null {
    switch (metric) {
        case "total_goals": return match.total_goals;
        case "team_goals": return match.team_score;
        case "opponent_goals": return match.opponent_score;
        case "first_period": return match.periods?.["1ST"]?.total_goals ?? null;
        case "second_period": return match.periods?.["2ND"]?.total_goals ?? null;
        case "third_period": return match.periods?.["3RD"]?.total_goals ?? null;
        case "shots": return match.shots;
    }
}

function toChartData(matches: NHLMatchSummary[], metric: ChartMetric): ChartEntry[] {
    return [...matches].reverse().map((match) => ({
        id: match.game_pk,
        date: match.game_date,
        label: `${match.location === "home" ? "vs" : "@"}${shortTeam(match.opponent_name)}`,
        opponent: match.opponent_name,
        location: match.location,
        result: match.result,
        score: match.score_line,
        value: getMetricValue(match, metric),
    }));
}

function getRate(matches: NHLMatchSummary[], metric: ChartMetric, line: number): { hits: number; total: number; pct: number | null } {
    const values = matches.map((match) => getMetricValue(match, metric)).filter((value): value is number => value !== null && Number.isFinite(value));
    const hits = values.filter((value) => value > line).length;
    return {
        hits,
        total: values.length,
        pct: values.length ? (hits / values.length) * 100 : null,
    };
}

function getAverageMedian(matches: NHLMatchSummary[], metric: ChartMetric): { average: number | null; median: number | null } {
    const values = matches.map((match) => getMetricValue(match, metric))
        .filter((value): value is number => value !== null && Number.isFinite(value))
        .sort((a, b) => a - b);
    if (!values.length) return { average: null, median: null };
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const middle = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    return { average, median };
}

function Segment<T extends string | number>({
                                                label,
                                                value,
                                                options,
                                                onChange,
                                            }: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
            <div role="group" aria-label={label} className="flex w-fit max-w-full gap-0.5 rounded-lg bg-surface p-1">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={value === option.value}
                        onClick={() => onChange(option.value)}
                        className={`whitespace-nowrap rounded-md px-2.5 py-2 text-[11px] font-semibold transition-colors sm:px-3 ${
                            value === option.value
                                ? "bg-white text-ink shadow-sm"
                                : "text-muted hover:bg-white/70 hover:text-ink"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function HitRateTiles({
                          matches,
                          metric,
                          line,
                          gamesShown,
                      }: {
    matches: NHLMatchSummary[];
    metric: ChartMetric;
    line: number;
    gamesShown: GamesShown;
}) {
    const windows = [5, 10, 15, "season"] as const;
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {windows.map((window) => {
                const windowMatches = window === "season" ? matches : matches.slice(0, window);
                const rate = getRate(windowMatches, metric, line);
                const selected = gamesShown === window;
                return (
                    <article
                        key={window}
                        className={`min-w-0 rounded-lg border px-3 py-3 ${selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}
                    >
                        <p className={`text-[10px] ${selected ? "text-slate-300" : "text-muted"}`}>
                            {window === "season" ? "Season" : `Last ${window}`}
                        </p>
                        <p className="mt-0.5 text-xl font-bold tabular-nums">{formatPct(rate.pct)}</p>
                        <p className={`mt-0.5 text-[10px] ${selected ? "text-slate-300" : "text-muted"}`}>
                            {rate.hits} of {rate.total} over {line}
                        </p>
                    </article>
                );
            })}
        </div>
    );
}

function GraphTooltip({ active, payload }: {
    active?: boolean;
    payload?: readonly { payload?: ChartEntry }[];
}) {
    const item = payload?.[0]?.payload;
    if (!active || !item) return null;
    return (
        <div className="rounded-lg border border-line bg-white p-3 text-xs shadow-lg">
            <p className="font-semibold text-ink">{item.location === "home" ? "vs" : "@"} {item.opponent}</p>
            <p className="mt-1 text-muted">{dateLabel(item.date)} · {describeNHLResult(item.result)} ({item.result}) · {item.score}</p>
            <p className="mt-1 font-bold text-accent-strong">Value: {item.value ?? "Not available"}</p>
        </div>
    );
}

function GameBarChart({
                          data,
                          line,
                          showSeasonBrush,
                          isMobile,
                      }: {
    data: ChartEntry[];
    line: number;
    showSeasonBrush: boolean;
    isMobile: boolean;
}) {
    const positive = data.some((entry) => entry.value !== null);
    if (!positive) return <p className="grid h-60 place-items-center text-sm text-muted">No statistics available for these games.</p>;

    return (
        <div className="w-full min-w-0" aria-label="Game-by-game statistics bar chart">
            <ResponsiveContainer width="100%" height={isMobile ? 290 : 335} minWidth={0}>
                <BarChart
                    data={data}
                    margin={{ top: 32, right: isMobile ? 4 : 16, bottom: 10, left: isMobile ? -26 : -12 }}
                    barCategoryGap={isMobile ? "20%" : "24%"}
                >
                    <CartesianGrid stroke="#EEF0F3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#5B6474", fontSize: isMobile ? 9 : 10 }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fill: "#8A93A3", fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} width={40} domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, line) * 1.15 + 1)]} />
                    <Tooltip content={<GraphTooltip />} cursor={{ fill: "#F1F3F7" }} />
                    <ReferenceLine y={line} stroke="#0B1220" strokeDasharray="5 4" strokeWidth={1.5} />
                    <Bar dataKey="value" maxBarSize={42} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {data.map((entry) => (
                            <Cell key={entry.id} fill={entry.value !== null && entry.value > line ? "#1F4FE0" : "#D5D9E0"} />
                        ))}
                        {/* Show each game's exact score/goals/shots above its bar. */}
                        <LabelList
                            dataKey="value"
                            position="top"
                            fill="#172033"
                            fontSize={isMobile ? 10 : 11}
                            fontWeight={700}
                        />
                    </Bar>
                    {showSeasonBrush && data.length > 15 ? (
                        <Brush
                            dataKey="label"
                            height={30}
                            stroke="#1F4FE0"
                            fill="#F1F3F7"
                            travellerWidth={9}
                            startIndex={Math.max(0, data.length - 15)}
                            endIndex={data.length - 1}
                        />
                    ) : null}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function PeriodComparison({ team }: { team: NHLAPITeam }) {
    const rows = [
        { label: "1st", key: "first_period" as const },
        { label: "2nd", key: "second_period" as const },
        { label: "3rd", key: "third_period" as const },
    ];
    const locations = [
        { label: "All", key: "overall" as const, color: "bg-ink" },
        { label: "Home", key: "home" as const, color: "bg-accent" },
        { label: "Away", key: "away" as const, color: "bg-opponent" },
    ];

    return (
        <section className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">Period Over 1.5 hit rate</h2>
                <div className="flex flex-wrap gap-3 text-[10px] text-muted">
                    {locations.map((location) => (
                        <span key={location.key} className="inline-flex items-center gap-1.5">
              <span className={`size-2 rounded-sm ${location.color}`} />{location.label}
            </span>
                    ))}
                </div>
            </div>
            <div className="space-y-5">
                {rows.map((row) => (
                    <div key={row.key} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3">
                        <span className="text-xs font-semibold text-ink">{row.label}</span>
                        <div className="space-y-2">
                            {locations.map((location) => {
                                const pct = team[location.key][row.key]?.percentage ?? null;
                                return (
                                    <div className="flex items-center gap-2" key={location.key}>
                                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface">
                                            <div className={`h-full rounded-full ${location.color}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
                                        </div>
                                        <span className="w-11 shrink-0 text-right text-[11px] font-semibold tabular-nums text-ink-soft">{formatPct(pct)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <p className="mt-5 text-[11px] text-muted">The three comparisons use Over 1.5 and the API's most recent {ALL_GAMES_FILTERS.lastGames} games.</p>
        </section>
    );
}

function GoalsByPeriod({ summary }: { summary: NHLLocationSummary }) {
    const periods = [
        { key: "1ST", label: "1st" },
        { key: "2ND", label: "2nd" },
        { key: "3RD", label: "3rd" },
        { key: "OT1", label: "OT" },
    ];
    const data = useMemo(() => periods.map((period) => {
        const values = summary.matches.flatMap((match) => {
            const item = match.periods?.[period.key];
            return item ? [item] : [];
        });
        return {
            period: period.label,
            scored: values.reduce((total, item) => total + item.team_goals, 0),
            allowed: values.reduce((total, item) => total + item.opponent_goals, 0),
            games: values.length,
        };
    }).filter((row) => row.games > 0), [summary.matches]);

    return (
        <section className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-ink">Goals by period</h2>
                <div className="flex items-center gap-3 text-[10px] text-muted">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-accent" />Scored</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-opponent" />Allowed</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={250} minWidth={0}>
                <BarChart data={data} margin={{ left: -20, top: 28, right: 6, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid stroke="#EEF0F3" vertical={false} />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "#5B6474", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8A93A3", fontSize: 10 }} allowDecimals={false} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15 + 1)]} />
                    <Tooltip />
                    <Bar dataKey="scored" name="Goals scored" fill="#1F4FE0" maxBarSize={36} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="scored" position="top" fill="#172033" fontSize={10} fontWeight={700} />
                    </Bar>
                    <Bar dataKey="allowed" name="Goals allowed" fill="#E8833A" maxBarSize={36} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="allowed" position="top" fill="#172033" fontSize={10} fontWeight={700} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[11px] text-muted">OT shows the first overtime period when recorded. Shootout deciding goals are not included in the period totals. SOW/SOL identify the match result.</p>
        </section>
    );
}

function HomeAwayTable({ team }: { team: NHLAPITeam }) {
    return (
        <section className="min-w-0">
            <h2 className="mb-3 text-xl font-semibold text-ink">Home vs away</h2>
            <div className="grid gap-3 md:hidden">
                {(["home", "away"] as const).map((location) => {
                    const summary = team[location];
                    return (
                        <article key={location} className="rounded-xl border border-line bg-white p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-base font-semibold capitalize text-ink">{location}</h3>
                                <span className="text-xs text-muted">{summary.games_played} GP · {summary.wins}–{summary.losses}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                {([
                                    ["GF/G", fmt(summary.goals_per_game)],
                                    ["GA/G", fmt(summary.goals_against_per_game)],
                                    ["Total/G", fmt(summary.total_goals_per_game)],
                                    ["P1 O1.5", formatPct(summary.first_period?.percentage ?? null)],
                                    ["P2 O1.5", formatPct(summary.second_period?.percentage ?? null)],
                                    ["P3 O1.5", formatPct(summary.third_period?.percentage ?? null)],
                                ] as [string, string][]).map(([label, value]) => (
                                    <div key={label}><p className="text-[10px] text-muted">{label}</p><strong className="tabular-nums">{value}</strong></div>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </div>
            <div className="hidden overflow-hidden rounded-xl border border-line md:block">
                <table className="w-full table-fixed border-collapse text-left text-xs tabular-nums">
                    <thead className="bg-surface-soft text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                        {(["Split", "GP", "W–L", "GF/G", "GA/G", "Total/G", "Shots/G", "P1", "P2", "P3"] as const).map((label) => (
                            <th key={label} className="px-2 py-3 font-semibold lg:px-3">{label}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {(["home", "away"] as const).map((location) => {
                        const summary = team[location];
                        return (
                            <tr key={location} className="border-t border-line-soft text-ink-soft">
                                <th scope="row" className="px-2 py-3 text-left font-semibold capitalize text-ink lg:px-3">{location}</th>
                                <td className="px-2 py-3 lg:px-3">{summary.games_played}</td>
                                <td className="px-2 py-3 lg:px-3">{summary.wins}–{summary.losses}</td>
                                <td className="px-2 py-3 lg:px-3">{fmt(summary.goals_per_game)}</td>
                                <td className="px-2 py-3 lg:px-3">{fmt(summary.goals_against_per_game)}</td>
                                <td className="px-2 py-3 lg:px-3">{fmt(summary.total_goals_per_game)}</td>
                                <td className="px-2 py-3 lg:px-3">{fmt(summary.shots_per_game, 1)}</td>
                                <td className="px-2 py-3 lg:px-3">{formatPct(summary.first_period?.percentage ?? null)}</td>
                                <td className="px-2 py-3 lg:px-3">{formatPct(summary.second_period?.percentage ?? null)}</td>
                                <td className="px-2 py-3 lg:px-3">{formatPct(summary.third_period?.percentage ?? null)}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/**
 * NHL match log result layout mirrors the design mockup:
 * [W] 3–2 SO, [L] 4–5 OT, [W] 5–3 (regulation).
 * Keep the original API code for the full tooltip and chart details.
 */
function ScoreBadge({ match }: { match: NHLMatchSummary }) {
    const win = isNHLWin(match.result);
    const finish = match.result.startsWith("OT")
        ? "OT"
        : match.result.startsWith("SO")
            ? "SO"
            : null;
    const resultLabel = win ? "W" : "L";

    return (
        <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap"
            title={describeNHLResult(match.result)}
            aria-label={`${describeNHLResult(match.result)}, ${match.score_line}`}
        >
      <span
          aria-hidden="true"
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold leading-none ${
              win
                  ? "bg-ink text-white"
                  : "border border-line-strong bg-white text-muted"
          }`}
      >
        {resultLabel}
      </span>
      <span className="font-semibold tabular-nums text-ink">
        {match.score_line.replace("-", "–")}
      </span>
            {finish && (
                <span
                    aria-hidden="true"
                    className="text-[10px] font-medium tracking-wide text-muted"
                >
          {finish}
        </span>
            )}
    </span>
    );
}

function PeriodBadge({ match, period, line = 1.5 }: { match: NHLMatchSummary; period: string; line?: number }) {
    const score = match.periods?.[period];
    if (!score) return <span className="text-muted">—</span>;
    return (
        <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold tabular-nums ${score.total_goals > line ? "bg-accent-soft text-accent-strong" : "bg-surface text-muted"}`}>
      {score.team_goals}–{score.opponent_goals}
    </span>
    );
}

function MatchLog({ matches }: { matches: NHLMatchSummary[] }) {
    const [visible, setVisible] = useState(10);
    const records = matches.slice(0, visible);
    return (
        <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-ink">Match log</h2>
                <p className="text-[11px] text-muted">Period score: team–opponent · blue = Over 1.5 · OT/SO appear beside the final score</p>
            </div>
            <div className="grid gap-3 md:hidden">
                {records.map((match) => (
                    <article key={match.game_pk} className="rounded-xl border border-line bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-[11px] text-muted">{dateLabel(match.game_date)} · {match.location === "home" ? "Home" : "Away"}</p>
                                <p className="mt-1 text-sm font-semibold text-ink">{match.location === "home" ? "vs" : "@"} {match.opponent_name}</p>
                            </div>
                            <ScoreBadge match={match} />
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line-soft pt-3 text-center">
                            {(["1ST", "2ND", "3RD"] as const).map((period, index) => (
                                <div key={period}>
                                    <p className="mb-1.5 text-[10px] text-muted">{index + 1}{index === 0 ? "st" : index === 1 ? "nd" : "rd"}</p>
                                    <PeriodBadge match={match} period={period} />
                                </div>
                            ))}
                            <div>
                                <p className="mb-1.5 text-[10px] text-muted">Shots</p>
                                <p className="text-xs font-semibold tabular-nums">{match.shots ?? "—"}–{match.shots_against ?? "—"}</p>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
            <div className="hidden overflow-hidden rounded-xl border border-line md:block">
                <table className="w-full table-fixed border-collapse text-left text-xs">
                    <thead className="bg-surface-soft text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                        <th className="w-[12%] px-3 py-3 font-semibold">Date</th>
                        <th className="w-[28%] px-3 py-3 font-semibold">Opponent</th>
                        <th className="w-[15%] px-3 py-3 font-semibold">Result</th>
                        <th className="px-2 py-3 text-center font-semibold">1st</th>
                        <th className="px-2 py-3 text-center font-semibold">2nd</th>
                        <th className="px-2 py-3 text-center font-semibold">3rd</th>
                        <th className="px-2 py-3 text-center font-semibold">Total</th>
                        <th className="px-2 py-3 text-center font-semibold">Shots</th>
                    </tr>
                    </thead>
                    <tbody>
                    {records.map((match) => (
                        <tr key={match.game_pk} className="border-t border-line-soft text-ink-soft hover:bg-surface-soft">
                            <td className="px-3 py-3 text-muted">{dateLabel(match.game_date)}</td>
                            <td className="px-3 py-3 font-semibold text-ink"><span className="mr-1 text-muted">{match.location === "home" ? "vs" : "@"}</span> {match.opponent_name}</td>
                            <td className="px-3 py-3"><ScoreBadge match={match} /></td>
                            <td className="px-2 py-3 text-center"><PeriodBadge match={match} period="1ST" /></td>
                            <td className="px-2 py-3 text-center"><PeriodBadge match={match} period="2ND" /></td>
                            <td className="px-2 py-3 text-center"><PeriodBadge match={match} period="3RD" /></td>
                            <td className="px-2 py-3 text-center font-semibold tabular-nums">{match.total_goals}</td>
                            <td className="px-2 py-3 text-center tabular-nums">{match.shots ?? "—"}–{match.shots_against ?? "—"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-0 flex items-center justify-between gap-3 rounded-b-xl border border-t-0 border-line px-4 py-3 text-[11px] text-muted">
                <span>Showing {records.length} of {matches.length} games</span>
                {visible < matches.length ? (
                    <button type="button" onClick={() => setVisible((n) => n + 10)} className="rounded-lg border border-accent-soft px-3 py-2 font-semibold text-accent-strong hover:bg-accent-tint">
                        Load more games
                    </button>
                ) : null}
            </div>
        </section>
    );
}

function NHLTeamDetailRoute() {
    const { sport, league, teamId } = Route.useParams();
    const [location, setLocation] = useState<Location>("overall");
    const [metric, setMetric] = useState<ChartMetric>("total_goals");
    const [gamesShown, setGamesShown] = useState<GamesShown>(10);
    const [lines, setLines] = useState<Record<ChartMetric, number>>(() =>
        Object.fromEntries(Object.entries(CONFIG).map(([key, value]) => [key, value.defaultLine])) as Record<ChartMetric, number>
    );
    const [mobileOffset, setMobileOffset] = useState(0);

    const query = useQuery({
        // Same key/filters as the initial NHL summary page: lets TanStack Query reuse cached data.
        queryKey: ["nhl", "team-summary", NHL_COMPETITION_NAME, NHL_SEASON_ID, ALL_GAMES_FILTERS],
        queryFn: ({ signal }) => fetchNHLTeamSummary(ALL_GAMES_FILTERS, signal),
        staleTime: 60_000,
        retry: 1,
        enabled: sport === "hockey" && league === "nhl",
    });

    const team = query.data?.teams.find((record) => String(record.team_pk) === teamId);
    const summary = team?.[location];
    const matches = useMemo(() => orderMatches(summary?.matches ?? []), [summary]);
    const line = lines[metric];
    const chartMatches = useMemo(
        () => gamesShown === "season" ? matches : matches.slice(0, gamesShown),
        [matches, gamesShown]
    );
    const chartData = useMemo(() => toChartData(chartMatches, metric), [chartMatches, metric]);
    // Never squash 10, 15 or 82 bars onto a phone: page through five at a time.
    const mobileData = chartData.slice(
        Math.max(0, chartData.length - mobileOffset - 5),
        Math.max(0, chartData.length - mobileOffset)
    );
    const { average, median } = getAverageMedian(chartMatches, metric);
    const config = CONFIG[metric];
    const mobilePageTotal = Math.max(1, Math.ceil(chartData.length / 5));
    const mobilePageCurrent = Math.floor(mobileOffset / 5) + 1;

    const selectLocation = (next: Location) => {
        setLocation(next);
        setMobileOffset(0);
    };

    const selectMetric = (next: ChartMetric) => {
        setMetric(next);
        setMobileOffset(0);
    };

    const selectWindow = (next: GamesShown) => {
        setGamesShown(next);
        setMobileOffset(0);
    };

    const changeLine = (delta: number) => {
        setLines((current) => ({ ...current, [metric]: Math.max(0.5, current[metric] + delta * config.step) }));
    };

    if (sport === "soccer") {
        return <SoccerTeamStats key={`${league}-${teamId}`} leagueKey={league} teamId={teamId}/>
    }

    if (sport === "basketball") {
        return <BasketballTeamDetail key={`${league}-${teamId}`} leagueKey={league} teamId={teamId}/>
    }

    if (sport === 'football') {
        return <FootballTeamDetail key={`${league}-${teamId}`} leagueKey={league} teamId={teamId}/>
    }

    if (sport !== "hockey" || league !== "nhl") {
        return <p className="rounded-xl border border-line p-5 text-sm text-muted">This team-detail page currently supports NHL teams.</p>;
    }

    if (query.isPending) {
        return <div role="status" className="py-16 text-center text-muted">Loading NHL team statistics…</div>;
    }

    if (query.isError) {
        return (
            <section role="alert" className="rounded-xl border border-line p-6">
                <h1 className="text-xl">Could not load team data</h1>
                <p className="mt-2 break-words text-sm text-muted">{query.error.message}</p>
                <button type="button" onClick={() => void query.refetch()} className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Retry</button>
            </section>
        );
    }

    if (!team || !summary) {
        return (
            <section className="rounded-xl border border-line p-6">
                <h1 className="text-xl">Team not found</h1>
                <p className="mt-2 text-sm text-muted">No NHL team has ID {teamId} in competition season {NHL_SEASON_ID}.</p>
                <Link to="/$sport/$league/$section" params={{ sport: "hockey", league: "nhl", section: "team-summary" }} className="mt-3 inline-block text-sm font-semibold">Back to team summary</Link>
            </section>
        );
    }

    return (
        <div className="min-w-0 w-full space-y-7 pb-10 lg:space-y-9">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <Link to="/$sport/$league/$section" params={{ sport: "hockey", league: "nhl", section: "team-summary" }} className="font-semibold text-accent-strong hover:underline">NHL / Team summary</Link>
                <span>/</span><span>{team.team_name}</span>
            </nav>

            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface text-sm font-bold text-ink-soft sm:size-14">
                        {shortTeam(team.team_name)}
                    </div>
                    <div className="min-w-0">
                        <p className="eyebrow text-[10px]">NHL · Season {query.data?.competition_season_id ?? NHL_SEASON_ID}</p>
                        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl lg:text-4xl">{team.team_name}</h1>
                        <p className="mt-1 text-xs text-muted sm:text-sm">
                            {summary.wins}–{summary.losses}–{Math.max(0, summary.games_played - summary.wins - summary.losses)} (W–L–OT/SO) · {formatPct(summary.win_pct)} wins · {summary.games_played} games
                        </p>
                    </div>
                </div>
                <Segment
                    label="Game location"
                    value={location}
                    options={[{ value: "overall", label: "All games" }, { value: "home", label: "Home" }, { value: "away", label: "Away" }]}
                    onChange={selectLocation}
                />
            </header>

            <section aria-label="Team summary statistics" className="grid overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-2 lg:grid-cols-5">
                {([
                    ["Goals for / game", fmt(summary.goals_per_game), `${summary.goals} scored`],
                    ["Goals against / game", fmt(summary.goals_against_per_game), `${summary.goals_against} allowed`],
                    ["Total goals / game", fmt(summary.total_goals_per_game), `${summary.total_goals} total`],
                    ["Shots for / against", `${fmt(summary.shots_per_game, 1)} / ${fmt(summary.shots_against_per_game, 1)}`, "per game"],
                    ["Both teams scored", formatPct(summary.btts_pct), `${summary.btts} of ${summary.games_played} games`],
                ] as [string, string, string][]).map(([label, value, detail], index) => (
                    <article key={label} className={`min-w-0 border-b border-line-soft p-4 last:border-b-0 sm:p-5 lg:border-b-0 lg:border-r lg:last:border-r-0 ${index === 4 ? "bg-accent-tint" : ""}`}>
                        <p className={`text-[11px] font-semibold ${index === 4 ? "text-accent-strong" : "text-muted"}`}>{label}</p>
                        <p className={`mt-1 break-words text-[clamp(1.3rem,2vw,1.9rem)] font-bold tabular-nums ${index === 4 ? "text-accent-strong" : "text-ink"}`}>{value}</p>
                        <p className="mt-1 text-[11px] text-muted">{detail}</p>
                    </article>
                ))}
            </section>

            <section className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-ink">Game by game</h2>
                        <p className="mt-1 text-xs text-muted">{config.description} · oldest on the left, newest on the right</p>
                    </div>
                    <div className="max-w-full overflow-x-auto pb-1">
                        <div className="flex w-max gap-0.5 rounded-lg bg-surface p-1" role="group" aria-label="Chart statistic">
                            {CHART_METRICS.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    aria-pressed={item.key === metric}
                                    onClick={() => selectMetric(item.key)}
                                    className={`rounded-md px-3 py-2 text-[11px] font-semibold whitespace-nowrap ${item.key === metric ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <Segment
                        label="Games shown"
                        value={gamesShown}
                        options={[{ value: 5, label: "Last 5" }, { value: 10, label: "Last 10" }, { value: 15, label: "Last 15" }, { value: "season", label: "Season" }]}
                        onChange={selectWindow}
                    />
                    <div className="flex flex-wrap items-end gap-5">
                        <div className="flex gap-4">
                            <div><p className="text-[10px] text-muted">Average</p><p className="text-lg font-bold tabular-nums text-ink">{fmt(average)}</p></div>
                            <div><p className="text-[10px] text-muted">Median</p><p className="text-lg font-bold tabular-nums text-ink">{fmt(median, 1)}</p></div>
                        </div>
                        <div>
                            <p className="mb-1 text-[10px] text-muted">Goal / shot line</p>
                            <div role="group" aria-label="Chart threshold" className="inline-flex overflow-hidden rounded-lg border border-line">
                                <button type="button" onClick={() => changeLine(-1)} disabled={line <= 0.5} aria-label="Decrease threshold" className="px-3 py-2 text-sm hover:bg-surface disabled:opacity-40">−</button>
                                <span className="border-x border-line px-3 py-2 text-xs font-semibold tabular-nums text-ink">Over {line.toFixed(1)}</span>
                                <button type="button" onClick={() => changeLine(1)} aria-label="Increase threshold" className="px-3 py-2 text-sm hover:bg-surface">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4"><HitRateTiles matches={matches} metric={metric} line={line} gamesShown={gamesShown} /></div>

                {/* Mobile: five bars at a time, all windows provide Older/Newer navigation. */}
                <div className="mt-4 md:hidden">
                    <GameBarChart data={mobileData} line={line} showSeasonBrush={false} isMobile />
                    {chartData.length > 5 ? (
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <button type="button" disabled={mobileOffset + 5 >= chartData.length} onClick={() => setMobileOffset((n) => Math.min(Math.floor((chartData.length - 1) / 5) * 5, n + 5))} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink disabled:opacity-35">← Older</button>
                            <span className="text-[11px] text-muted">Page {mobilePageCurrent} of {mobilePageTotal}</span>
                            <button type="button" disabled={mobileOffset === 0} onClick={() => setMobileOffset((n) => Math.max(0, n - 5))} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink disabled:opacity-35">Newer →</button>
                        </div>
                    ) : null}
                </div>

                {/* Tablet and desktop: the whole selected 5/10/15 window fits. Season uses Brush. */}
                <div className="mt-4 hidden md:block">
                    <GameBarChart key={`${metric}-${location}-${gamesShown}`} data={chartData} line={line} showSeasonBrush={gamesShown === "season"} isMobile={false} />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                    <div className="flex gap-4">
                        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-accent" />Over {line.toFixed(1)}</span>
                        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-line-strong" />Under / equal</span>
                    </div>
                    <span>{gamesShown === "season" ? "Season: use Brush on desktop or Older/Newer on mobile" : `Selected: last ${Math.min(gamesShown, matches.length)} games`}</span>
                </div>
            </section>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <PeriodComparison team={team} />
                <GoalsByPeriod summary={summary} />
            </div>

            <HomeAwayTable team={team} />
            <MatchLog key={location} matches={matches} />
        </div>
    );
}
