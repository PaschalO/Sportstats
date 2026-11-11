import { useMemo, useState } from "react";
import {
    Bar, BarChart, Brush, CartesianGrid, Cell, LabelList, ReferenceLine,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
    type SoccerLocation, type SoccerMatch, fmt, matchSorted, n,
} from "../../services/soccerService";

export type SoccerChartMetric = "goals" | "total_goals" | "shots" | "on_target" | "corners" | "cards" | "total_corners";
type Source = "team" | "opponent" | "total";
type GamesShown = 5 | 10 | 15 | "season";
type MetricDefinition = { label: string; short: string; lines: number[]; defaultLine: number; defaultSource: Source };

const METRICS: Record<SoccerChartMetric, MetricDefinition> = {
    goals: { label: "Goals", short: "Goals", lines: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5], defaultLine: 1.5, defaultSource: "team" },
    total_goals: { label: "Total goals", short: "Total goals", lines: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5], defaultLine: 2.5, defaultSource: "total" },
    shots: { label: "Shots", short: "Shots", lines: [5.5, 7.5, 9.5, 11.5, 13.5, 15.5, 17.5, 19.5, 24.5], defaultLine: 11.5, defaultSource: "team" },
    on_target: { label: "On target", short: "Shots on target", lines: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 9.5], defaultLine: 3.5, defaultSource: "team" },
    corners: { label: "Corners", short: "Corners", lines: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 9.5], defaultLine: 3.5, defaultSource: "team" },
    cards: { label: "Cards", short: "Cards (yellow + red)", lines: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5], defaultLine: 1.5, defaultSource: "team" },
    total_corners: { label: "Total corners", short: "Match total corners", lines: [5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 14.5], defaultLine: 9.5, defaultSource: "total" },
};
const METRIC_TABS = (Object.entries(METRICS) as [SoccerChartMetric, MetricDefinition][]);
function statValue(match: SoccerMatch, metric: SoccerChartMetric, source: Source): number | null {
    if (metric === "goals" || metric === "total_goals") {
        const team = n(match.team_score);
        const opp = n(match.opponent_score);
        if (source === "team") return team;
        if (source === "opponent") return opp;
        return team === null || opp === null ? null : team + opp;
    }
    const field: keyof NonNullable<SoccerMatch["team_stats"]> = metric === "shots" ? "shots_total" : metric === "on_target" ? "shots_on_target" : metric === "cards" ? "yellow_cards" : "corners";
    function read(side: SoccerMatch["team_stats"]): number | null {
        if (!side) return null;
        if (metric === "cards") {
            const yellow = n(side.yellow_cards);
            const red = n(side.red_cards);
            return yellow === null || red === null ? null : yellow + red;
        }
        return n(side[field]);
    }
    const team = read(match.team_stats);
    const opponent = read(match.opponent_stats);
    if (source === "team") return team;
    if (source === "opponent") return opponent;
    return team === null || opponent === null ? null : team + opponent;
}
type ChartRow = {
    key: number; opponent: string; date: string; result: string; score: string;
    label: string; value: number | null; hit: boolean;
};
function fmtDate(date: string) {
    const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
// Never use this human-readable label as the chart's X-axis data key:
// Manchester United and Leeds United would otherwise both be "vs United".
function opponentAxisLabel(name: string): string {
    const clean = name.replace(/^(?:FC|AFC)\s+/i, "").replace(/\s+(?:FC|AFC)$/i, "").trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const suffix = words[words.length - 1]?.toLowerCase();
    let short: string;

    if (suffix === "united" || suffix === "city") {
        const place = words.slice(0, -1).join(" ");
        const placeLabel = place === "Manchester" ? "Man" : place;
        short = suffix === "united" ? `${placeLabel} Utd` : place === "Manchester" ? "Man City" : placeLabel;
    } else {
        short = words.length ? words[words.length - 1] : "Opponent";
    }

    return `vs ${short.length > 14 ? `${short.slice(0, 13)}…` : short}`;
}
function chartRows(matches: SoccerMatch[], metric: SoccerChartMetric, source: Source, line: number): ChartRow[] {
    return [...matches].reverse().map((match) => {
        const value = statValue(match, metric, source);
        return {
            // game_pk uniquely identifies the match. Display labels may repeat.
            key: match.game_pk, opponent: match.opponent_name, date: fmtDate(match.game_date),
            result: match.result, score: match.score_line,
            label: opponentAxisLabel(match.opponent_name),
            value, hit: value !== null && value > line,
        };
    });
}
function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> }) {
    const row = payload?.[0]?.payload;
    if (!active || !row) return null;
    return (
        <div className="rounded-lg border border-line bg-white p-3 text-xs shadow-lg">
            <p className="font-semibold text-ink">{row.opponent}</p>
            <p className="mt-1 text-muted">{row.date} · {row.score} · {row.result}</p>
            <p className="mt-1 font-semibold text-accent-strong">Value: {row.value ?? "Not available"}</p>
        </div>
    );
}
function Chart({ rows, line, season, mobile }: { rows: ChartRow[]; line: number; season: boolean; mobile: boolean }) {
    const max = Math.max(line + 2, ...rows.map((r) => r.value ?? 0));
    const labelByMatchId = new Map(rows.map((row) => [row.key, row.label]));
    const displayMatchLabel = (id: string | number) => labelByMatchId.get(Number(id)) ?? "";
    return (
        <div className="h-[290px] min-w-0 sm:h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} barCategoryGap={mobile ? "20%" : "28%"} margin={{ top: 21, right: 12, bottom: season ? 0 : 8, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="#eef0f3" />
                    <XAxis dataKey="key" type="category" tickFormatter={displayMatchLabel} tick={{ fill: "#5B6474", fontSize: mobile ? 9 : 10 }} tickLine={false} axisLine={false} interval={0} height={35} />
                    <YAxis domain={[0, Math.ceil(max * 1.14)]} allowDecimals={false} tick={{ fontSize: 10, fill: "#8A93A3" }} tickLine={false} axisLine={false} width={35} />
                    <Tooltip cursor={{ fill: "#f1f3f7" }} content={<ChartTip />} />
                    <ReferenceLine y={line} stroke="#111827" strokeDasharray="5 4" strokeWidth={1.4} />
                    <Bar dataKey="value" maxBarSize={44} radius={[3, 3, 0, 0]}>
                        {rows.map((r, i) => <Cell key={`${r.key}-${i}`} fill={r.value === null ? "transparent" : r.hit ? "#1F4FE0" : "#d5d9e0"} />)}
                        <LabelList dataKey="value" position="top" style={{ fill: "#3B4352", fontSize: mobile ? 10 : 11, fontWeight: 600 }} formatter={(value: unknown) => value == null ? "" : String(value)}/>
                    </Bar>
                    {season && !mobile && rows.length > 15 ? (
                        <Brush dataKey="key" tickFormatter={displayMatchLabel} height={26} travellerWidth={11} startIndex={Math.max(0, rows.length - 12)} endIndex={rows.length - 1} stroke="#1F4FE0" />
                    ) : null}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function SoccerGameByGame({
                                             matches, location, onLocationChange,
                                         }: {
    matches: SoccerMatch[];
    location: SoccerLocation;
    onLocationChange: (location: SoccerLocation) => void;
}) {
    const [metric, setMetric] = useState<SoccerChartMetric>("goals");
    const [source, setSource] = useState<Source>("team");
    const [gamesShown, setGamesShown] = useState<GamesShown>(5);
    const [mobilePage, setMobilePage] = useState(0);
    const [lines, setLines] = useState<Record<SoccerChartMetric, number>>(() =>
        Object.fromEntries(METRIC_TABS.map(([key, data]) => [key, data.defaultLine])) as Record<SoccerChartMetric, number>
    );
    const line = lines[metric];
    const selected = useMemo(() => {
        const sorted = matchSorted(matches);
        return gamesShown === "season" ? sorted : sorted.slice(0, gamesShown);
    }, [matches, gamesShown]);
    const stats = useMemo(() => selected.map((match) => statValue(match, metric, source)).filter((v): v is number => v !== null), [selected, metric, source]);
    const rate = stats.length ? Math.round(stats.filter((v) => v > line).length / stats.length * 100) : null;
    const average = stats.length ? stats.reduce((sum, v) => sum + v, 0) / stats.length : null;
    const min = stats.length ? Math.min(...stats) : null;
    const max = stats.length ? Math.max(...stats) : null;
    const desktopRows = useMemo(() => chartRows(selected, metric, source, line), [selected, metric, source, line]);
    const maxMobilePage = Math.max(0, Math.ceil(desktopRows.length / 5) - 1);
    const activePage = Math.min(mobilePage, maxMobilePage);
    // Newest five on page 0. In each page bars still run oldest -> newest.
    const mobileRows = desktopRows.slice(Math.max(0, desktopRows.length - (activePage + 1) * 5), desktopRows.length - activePage * 5);
    function selectMetric(next: SoccerChartMetric) {
        setMetric(next);
        setSource(METRICS[next].defaultSource);
        setMobilePage(0);
    }
    return (
        <section aria-label="Game-by-game metric chart" className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-ink">Game by game</h2>
                    <p className="mt-1 text-xs text-muted">Change the statistic and goal or stat line. Bars show available match values.</p>
                </div>
                <span className="rounded-lg bg-accent-tint px-2 py-1 text-xs font-semibold text-accent-strong">{METRICS[metric].short}</span>
            </div>
            <div role="tablist" aria-label="Soccer chart statistics" className="mt-5 hidden max-w-full gap-1 overflow-x-auto rounded-xl bg-surface p-1 sm:flex">
                {METRIC_TABS.map(([key, data]) => <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={metric === key}
                    onClick={() => selectMetric(key)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${metric === key ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                >{data.label}</button>)}
            </div>
            <div className="mt-3 grid gap-3 rounded-xl bg-surface-soft p-3 sm:grid-cols-3 lg:gap-4">
                <label className="min-w-0 text-xs text-muted sm:hidden">Stat
                    <select aria-label="Chart statistic" value={metric} onChange={(e: { target: { value: string } }) => selectMetric(e.target.value as SoccerChartMetric)} className="mt-1 w-full min-w-0 rounded-lg border border-line-strong bg-white px-3 py-2 font-semibold text-ink">
                        {METRIC_TABS.map(([key, data]) => <option key={key} value={key}>{data.label}</option>)}
                    </select>
                </label>
                <label className="min-w-0 text-xs text-muted">Whose numbers
                    <select value={source} onChange={(e: { target: { value: string } }) => { setSource(e.target.value as Source); setMobilePage(0); }} className="mt-1 w-full min-w-0 rounded-lg border border-line-strong bg-white px-3 py-2 font-semibold text-ink">
                        <option value="team">Team</option><option value="opponent">Opponent</option><option value="total">Match total</option>
                    </select>
                </label>
                <label className="min-w-0 text-xs text-muted">Games shown
                    <select value={gamesShown} onChange={(e: { target: { value: string } }) => { setGamesShown(e.target.value === "season" ? "season" : Number(e.target.value) as GamesShown); setMobilePage(0); }} className="mt-1 w-full min-w-0 rounded-lg border border-line-strong bg-white px-3 py-2 font-semibold text-ink">
                        <option value={5}>Last 5</option><option value={10}>Last 10</option><option value={15}>Last 15</option><option value="season">Season</option>
                    </select>
                </label>
                <label className="min-w-0 text-xs text-muted">Location
                    <select value={location} onChange={(e: { target: { value: string } }) => { onLocationChange(e.target.value as SoccerLocation); setMobilePage(0); }} className="mt-1 w-full min-w-0 rounded-lg border border-line-strong bg-white px-3 py-2 font-semibold text-ink">
                        <option value="overall">All games</option><option value="home">Home</option><option value="away">Away</option>
                    </select>
                </label>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div className="grid flex-1 grid-cols-3 gap-2 sm:max-w-md">
                    <div className="rounded-lg bg-ink p-3 text-white"><p className="text-[10px] text-white/70">Over {line.toFixed(1)}</p><p className="text-xl font-bold">{rate === null ? "—" : `${rate}%`}</p><p className="text-[10px] text-white/70">{stats.filter((v) => v > line).length} / {stats.length} available</p></div>
                    <div className="rounded-lg bg-surface p-3"><p className="text-[10px] text-muted">Average</p><p className="text-xl font-bold text-ink">{average === null ? "—" : fmt(average)}</p><p className="text-[10px] text-muted">per game</p></div>
                    <div className="rounded-lg bg-surface p-3"><p className="text-[10px] text-muted">Range</p><p className="text-xl font-bold text-ink">{min === null ? "—" : `${min}–${max}`}</p><p className="text-[10px] text-muted">low – high</p></div>
                </div>
                <label className="text-xs font-medium text-muted">Threshold
                    <select aria-label="Over threshold" value={line} onChange={(e: { target: { value: string } }) => setLines((previous) => ({ ...previous, [metric]: Number(e.target.value) }))} className="mt-1 block w-32 rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-semibold text-ink">
                        {METRICS[metric].lines.map((value) => <option value={value} key={value}>Over {value.toFixed(1)}</option>)}
                    </select>
                </label>
            </div>
            {selected.length === 0 ? <p className="mt-6 rounded-lg bg-surface-soft p-6 text-center text-sm text-muted">No completed matches for this selection.</p> : (
                <>
                    <div className="mt-3 md:hidden"><Chart rows={mobileRows} line={line} season={false} mobile /></div>
                    <div className="mt-3 hidden md:block"><Chart key={`${metric}-${source}-${location}-${gamesShown}`} rows={desktopRows} line={line} season={gamesShown === "season"} mobile={false} /></div>
                    {maxMobilePage > 0 && (
                        <div className="mt-2 flex items-center justify-between gap-3 md:hidden">
                            <button type="button" disabled={activePage >= maxMobilePage} onClick={() => setMobilePage((p) => Math.min(maxMobilePage, p + 1))} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold disabled:opacity-40">← Older</button>
                            <span className="text-xs text-muted">{activePage + 1} / {maxMobilePage + 1}</span>
                            <button type="button" disabled={activePage === 0} onClick={() => setMobilePage((p) => Math.max(0, p - 1))} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold disabled:opacity-40">Newer →</button>
                        </div>
                    )}
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
                        <span>Blue: over {line.toFixed(1)} · Grey: under or equal</span>
                        <span>{selected.length - stats.length > 0 ? `${selected.length - stats.length} missing ${source} values (excluded from hit rate)` : `${selected.length} games`}</span>
                    </div>
                    {gamesShown === "season" && desktopRows.length > 15 && <p className="mt-1 hidden text-[11px] text-muted md:block">Drag the navigator beneath the chart to explore earlier games.</p>}
                </>
            )}
        </section>
    );
}
