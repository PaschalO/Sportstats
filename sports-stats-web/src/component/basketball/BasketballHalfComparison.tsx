import { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
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
    numeric,
    type BasketballMatch,
} from "../../services/basketballService";
import { getBasketballHalfScore, getBasketballHalfDefaultLine } from "./basketballPeriods";

type Half = "1H" | "2H";
type Score = { team_points: number; opponent_points: number };
type ChartRow = {
    game_pk: number;
    game_date: string;
    opponent_name: string;
    location: "home" | "away";
    first: number | null;
    second: number | null;
};
type HalfSummary = {
    average: number | null;
    scored: number | null;
    allowed: number | null;
    wins: number;
    games: number;
    hits: number;
    margin: number | null;
};

const COLORS = {
    first: "#2452E6",
    firstFaded: "#C4D1F9",
    second: "#EC813D",
    secondFaded: "#F4CFB6",
};

// Only presentation abbreviations. Every game is still identified by game_pk.
const NBA_SHORT: Record<string, string> = {
    "Atlanta Hawks": "ATL",
    "Boston Celtics": "BOS",
    "Brooklyn Nets": "BKN",
    "Charlotte Hornets": "CHA",
    "Chicago Bulls": "CHI",
    "Cleveland Cavaliers": "CLE",
    "Dallas Mavericks": "DAL",
    "Denver Nuggets": "DEN",
    "Detroit Pistons": "DET",
    "Golden State Warriors": "GSW",
    "Houston Rockets": "HOU",
    "Indiana Pacers": "IND",
    "Los Angeles Clippers": "LAC",
    "LA Clippers": "LAC",
    "Los Angeles Lakers": "LAL",
    "Memphis Grizzlies": "MEM",
    "Miami Heat": "MIA",
    "Milwaukee Bucks": "MIL",
    "Minnesota Timberwolves": "MIN",
    "New Orleans Pelicans": "NOP",
    "New York Knicks": "NYK",
    "Oklahoma City Thunder": "OKC",
    "Orlando Magic": "ORL",
    "Philadelphia 76ers": "PHI",
    "Phoenix Suns": "PHX",
    "Portland Trail Blazers": "POR",
    "Sacramento Kings": "SAC",
    "San Antonio Spurs": "SAS",
    "Toronto Raptors": "TOR",
    "Utah Jazz": "UTA",
    "Washington Wizards": "WAS",
};

function abbr(name: string) {
    return NBA_SHORT[name] ?? name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 4).toUpperCase();
}
function dateLabel(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) return date;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function HalfXAxisTick({x, y, payload, dataById}: {
    x?: number | string;
    y?: number | string;
    payload?: {value?: string | number};
    dataById: Map<number, ChartRow>;
}) {
    const row = dataById.get(Number(payload?.value));
    if (!row) return <g />;
    return (
        <g transform={`translate(${x ?? 0},${y ?? 0})`}>
            <text textAnchor="middle" fill="#1E293B" fontSize={10} fontWeight={600} y={10}>
                {row.location === "home" ? "vs" : "@"}{abbr(row.opponent_name)}
            </text>
            <text textAnchor="middle" fill="#8993A4" fontSize={9} y={24}>{dateLabel(row.game_date)}</text>
        </g>
    );
}

function summarize(matches: BasketballMatch[], half: Half, line: number, leagueKey: string): HalfSummary {
    const scores = matches.map((match) => getBasketballHalfScore(match, half, leagueKey)).filter((score): score is Score => score !== null);
    const games = scores.length;
    if (!games) return { average: null, scored: null, allowed: null, wins: 0, games: 0, hits: 0, margin: null };
    const scored = scores.reduce((total, score) => total + score.team_points, 0) / games;
    const allowed = scores.reduce((total, score) => total + score.opponent_points, 0) / games;
    return {
        average: scored + allowed,
        scored,
        allowed,
        margin: scored - allowed,
        wins: scores.filter((score) => score.team_points > score.opponent_points).length,
        hits: scores.filter((score) => score.team_points + score.opponent_points > line).length,
        games,
    };
}
function averageQuarter(matches: BasketballMatch[], name: string): number | null {
    const scores = matches.map((match) => match.periods?.[name]?.team_points).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
}
function HalfTooltip({ active, payload }: {
    active?: boolean;
    payload?: readonly { payload?: ChartRow }[];
}) {
    const row = payload?.[0]?.payload;
    if (!active || !row) return null;
    return (
        <div className="rounded-lg border border-line bg-white p-3 text-xs shadow-lg">
            <p className="font-semibold text-ink">{row.location === "home" ? "vs" : "@"} {row.opponent_name}</p>
            <p className="mt-1 text-muted">{dateLabel(row.game_date)}</p>
            <p className="mt-2 font-semibold" style={{ color: COLORS.first }}>1st half: {row.first ?? "—"} combined points</p>
            <p className="mt-1 font-semibold" style={{ color: COLORS.second }}>2nd half: {row.second ?? "—"} combined points</p>
        </div>
    );
}

function SummaryCard({
                         title, stats, line, color, description,
                     }: {
    title: string;
    stats: HalfSummary;
    line: number;
    color: string;
    description: string;
}) {
    return (
        <article className="rounded-xl border border-line bg-white p-4 sm:p-5" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-ink">{title}</h3>
                <span className="text-[11px] font-semibold text-ink-soft">{stats.hits} of {stats.games} over {line.toFixed(1)}</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
                <div><p className="text-[11px] text-muted">Total</p><p className="text-xl font-bold tabular-nums text-ink">{numeric(stats.average)}</p></div>
                <div><p className="text-[11px] text-muted">Scored</p><p className="text-xl font-bold tabular-nums text-ink">{numeric(stats.scored)}</p></div>
                <div><p className="text-[11px] text-muted">Allowed</p><p className="text-xl font-bold tabular-nums text-ink">{numeric(stats.allowed)}</p></div>
                <div><p className="text-[11px] text-muted">Won</p><p className="text-xl font-bold tabular-nums text-ink">{stats.wins}/{stats.games}</p></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-ink-soft">{description}</p>
        </article>
    );
}

/** The reusable First half vs second half panel from the basketball team-detail mockup. */
export default function BasketballHalfComparison({
                                                     matches,
                                                     leagueKey,
                                                     teamName,
                                                 }: {
    matches: BasketballMatch[];
    leagueKey: string;
    teamName: string;
}) {
    const startingLine = getBasketballHalfDefaultLine(leagueKey);
    const [line, setLine] = useState(startingLine);
    const lines = useMemo(() => Array.from({ length: 23 }, (_, index) => startingLine - 55 + index * 5).filter((value) => value > 0), [startingLine]);
    const first = summarize(matches, "1H", line, leagueKey);
    const second = summarize(matches, "2H", line, leagueKey);
    const data = useMemo<ChartRow[]>(() => [...matches].reverse().map((match) => {
        const q1 = getBasketballHalfScore(match, "1H", leagueKey);
        const q2 = getBasketballHalfScore(match, "2H", leagueKey);
        return {
            game_pk: match.game_pk,
            game_date: match.game_date,
            opponent_name: match.opponent_name,
            location: match.location,
            first: q1 ? q1.team_points + q1.opponent_points : null,
            second: q2 ? q2.team_points + q2.opponent_points : null,
        };
    }).filter((row) => row.first !== null || row.second !== null), [matches]);
    const dataById = useMemo(() => new Map(data.map((row) => [row.game_pk, row])), [data]);
    const chartValues = data.flatMap((row) => [row.first, row.second]).filter((value): value is number => value !== null);
    const low = chartValues.length ? Math.min(...chartValues) : 0;
    const high = chartValues.length ? Math.max(...chartValues) : 0;
    // Match the NBA mockup's 80-point baseline, but do not clip shorter NCAAB/WNBA games.
    const yMin = Math.max(0, Math.min(80, Math.floor(low / 10) * 10 - 5));
    const yMax = Math.max(yMin + 20, Math.ceil((Math.max(high, line) + 5) / 5) * 5);
    const chartWidth = Math.max(540, data.length * 70);
    const firstWonPct = first.games ? Math.round(first.wins / first.games * 100) : 0;
    const secondWonPct = second.games ? Math.round(second.wins / second.games * 100) : 0;
    const q2Average = averageQuarter(matches, "Q2");
    const firstText = `Won ${first.wins} of ${first.games} first halves${q2Average !== null && leagueKey !== "ncaab" ? `, with ${numeric(q2Average)} points per game in Q2.` : "."}`;
    const secondText = `Won ${second.wins} of ${second.games} second halves (${secondWonPct}% of available games).`;
    const margin = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;

    return (
        <section className="w-full min-w-0 space-y-4" aria-label="First half vs second half">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-ink">First half vs second half</h2>
                    <p className="mt-1 text-xs text-muted">Combined points in each half, every game. Dashed line = Over {line.toFixed(1)}.</p>
                </div>
                <label className="flex items-center gap-3 text-xs text-muted">
                    <span>Half line</span>
                    <select
                        className="rounded-lg border border-line bg-white px-3 py-2.5 font-semibold text-ink"
                        value={line}
                        onChange={(event) => setLine(Number(event.target.value))}
                    >
                        {lines.map((value) => <option key={value} value={value}>Over {value.toFixed(1)}</option>)}
                    </select>
                </label>
            </header>

            {data.length === 0 ? (
                <div className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
                    <p className="font-semibold text-ink">Half scores are not available in the returned matches.</p>
                    <p className="mt-2">Expected Q1–Q4 (NBA/WNBA/NBL), Q1/Q2 for the two NCAAB halves, or explicit 1H/2H. Received {matches.length} matches.</p>
                    <p className="mt-1 break-all text-xs">Period keys: {Array.from(new Set(matches.flatMap((match) => Object.keys(match.periods ?? {})))).join(", ") || "none"}</p>
                </div>
            ) : (
                <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(310px,1fr)]">
                    <div className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-6">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-ink">Half totals by game</h3>
                            <div className="flex gap-4 text-xs text-ink-soft">
                                <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-[3px]" style={{ background: COLORS.first }} />1st half</span>
                                <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-[3px]" style={{ background: COLORS.second }} />2nd half</span>
                            </div>
                        </div>
                        <div className="min-w-0 overflow-x-auto pb-2">
                            <div style={{ minWidth: chartWidth }} className="h-[285px] w-full">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <BarChart data={data} margin={{ top: 20, right: 5, bottom: 27, left: -24 }} barCategoryGap="24%" barGap={3}>
                                        <CartesianGrid vertical={false} stroke="#E9ECF1" />
                                        <XAxis
                                            dataKey="game_pk"
                                            tickLine={false}
                                            axisLine={false}
                                            interval={0}
                                            height={49}
                                            tick={<HalfXAxisTick dataById={dataById} />}
                                        />
                                        <YAxis
                                            domain={[yMin, yMax]}
                                            allowDataOverflow={false}
                                            tick={{ fontSize: 10, fill: "#8993A4" }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={44}
                                        />
                                        <Tooltip content={<HalfTooltip />} cursor={{ fill: "#F1F4F9" }} />
                                        <ReferenceLine y={line} stroke="#1E293B" strokeWidth={1.5} strokeDasharray="5 4" ifOverflow="visible" />
                                        <Bar dataKey="first" name="1st half" maxBarSize={28} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                                            {data.map((row) => <Cell key={row.game_pk} fill={row.first !== null && row.first > line ? COLORS.first : COLORS.firstFaded} />)}
                                            <LabelList dataKey="first" position="top" fill="#1F2937" fontSize={10} fontWeight={700} />
                                        </Bar>
                                        <Bar dataKey="second" name="2nd half" maxBarSize={28} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                                            {data.map((row) => <Cell key={row.game_pk} fill={row.second !== null && row.second > line ? COLORS.second : COLORS.secondFaded} />)}
                                            <LabelList dataKey="second" position="top" fill="#1F2937" fontSize={10} fontWeight={700} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <p className="mt-2 text-[11px] text-muted">Faded bars are under or equal to the line. Axis starts at {yMin} to keep gaps visible. Overtime is excluded.</p>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3">
                        <SummaryCard title="1st half" stats={first} line={line} color={COLORS.first} description={firstText} />
                        <SummaryCard title="2nd half" stats={second} line={line} color={COLORS.second} description={secondText} />
                        <div className="flex-1 rounded-xl border border-line-soft bg-surface-soft p-4 text-xs leading-6 text-ink-soft">
                            {teamName} averages <strong className="text-ink">{margin(first.margin)}</strong> points of margin in the first half and <strong className="text-ink">{margin(second.margin)}</strong> in the second half.
                            <span className="block text-muted">First-half win rate: {firstWonPct}% · Second-half win rate: {secondWonPct}%.</span>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
