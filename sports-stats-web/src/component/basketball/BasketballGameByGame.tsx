import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { basketballMatches, numeric, periodNames, periodTotals, percentage, type BasketballMatch } from "../../services/basketballService";
import { SmallSelect } from "./BasketballUI";
import { getBasketballHalfScore, getBasketballHalfDefaultLine, getBasketballPeriodDefaultLine } from "./basketballPeriods";

type Metric = "total_points" | "team_points" | "opponent_points" | "1H" | "2H" | string;
type ChartRow = { game_pk: number; opponent: string; label: string; date: string; location: string; score: string; value: number | null };
const METRICS = [
    { key: "total_points", title: "Total points", line: 229.5 },
    { key: "team_points", title: "Team points", line: 109.5 },
    { key: "opponent_points", title: "Opp points", line: 109.5 },
    { key: "1H", title: "1st half", line: 114.5 },
    { key: "2H", title: "2nd half", line: 114.5 },
];
function metricValue(match: BasketballMatch, metric: Metric, leagueKey: string): number | null {
    if (metric === "total_points") return match.total_points;
    if (metric === "team_points") return match.team_score;
    if (metric === "opponent_points") return match.opponent_score;
    const item = metric === "1H" || metric === "2H"
        ? getBasketballHalfScore(match, metric, leagueKey)
        : periodTotals(match, metric);
    return item ? item.team_points + item.opponent_points : null;
}
function TooltipCard({ active, payload }: { active?: boolean; payload?: readonly { payload?: ChartRow }[] }) {
    const item = payload?.[0]?.payload;
    if (!active || !item) return null;
    return <div className="rounded-xl border border-line bg-white p-3 text-xs shadow-lg">
        <p className="font-bold">{item.location === "home" ? "vs" : "@"} {item.opponent}</p>
        <p className="mt-1 text-muted">{item.date} · {item.score}</p>
        <p className="mt-1 font-semibold text-accent-strong">Value: {item.value ?? "Not available"}</p>
    </div>;
}
export default function BasketballGameByGame({ matches, teamName, leagueKey }: { matches: BasketballMatch[]; teamName: string; leagueKey: string }) {
    const periods = useMemo(() => periodNames(matches), [matches]);
    const [metric, setMetric] = useState<Metric>("total_points");
    const [shown, setShown] = useState<3 | 5 | 10 | 100>(100);
    const [threshold, setThreshold] = useState(leagueKey === "nba" ? 229.5 : leagueKey === "ncaab" ? 149.5 : 169.5);
    const ncaabTwoHalves = leagueKey === "ncaab" && periods.includes("Q1") && periods.includes("Q2") && !periods.includes("Q3") && !periods.includes("Q4");
    const halfLine = getBasketballHalfDefaultLine(leagueKey);
    const periodLine = getBasketballPeriodDefaultLine(leagueKey);
    const activeMetrics = [
        ...METRICS.map((item) => ({ ...item, line: item.key === "1H" || item.key === "2H" ? halfLine : item.line })),
        ...periods.filter((name) => !["1H", "2H"].includes(name) && !(ncaabTwoHalves && ["Q1", "Q2"].includes(name)))
            .map((name) => ({ key: name, title: name, line: periodLine })),
    ];
    const selectedMatches = useMemo(() => basketballMatches(matches).slice(0, shown), [matches, shown]);
    const ordered = useMemo(() => [...selectedMatches].reverse(), [selectedMatches]);
    const data = useMemo<ChartRow[]>(() => ordered.map((match) => ({
        game_pk: match.game_pk,
        opponent: match.opponent_name,
        label: `${match.location === "home" ? "vs" : "@"}${match.opponent_name}`,
        date: match.game_date,
        location: match.location,
        score: match.score_line,
        value: metricValue(match, metric, leagueKey),
    })), [ordered, metric, leagueKey]);
    const values = data.map((row) => row.value).filter((n): n is number => n != null && Number.isFinite(n));
    const hits = values.filter((n) => n > threshold).length;
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues.length ? (sortedValues[Math.floor((sortedValues.length - 1) / 2)] + sortedValues[Math.floor(sortedValues.length / 2)]) / 2 : null;
    const tickMap = new Map(data.map((row) => [row.game_pk, row]));
    const smallThresholds = [0.5, 1.5, 2.5, 19.5, 29.5, 39.5, 49.5, 54.5, 55.5, 59.5, 69.5, 79.5, 89.5, 99.5, 109.5, 114.5, 119.5, 129.5, 139.5, 149.5, 159.5, 169.5, 179.5, 189.5, 199.5, 209.5, 219.5, 229.5, 239.5, 249.5, 259.5];
    const thresholds = [...new Set([...smallThresholds, threshold])].sort((a, b) => a - b);
    return <section className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Game by game</h2><p className="mt-1 text-xs text-muted">{teamName} vs opponent · oldest to newest · only available match values are counted</p></div><div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface p-1">{activeMetrics.map((option) => <button key={option.key} type="button" aria-pressed={metric === option.key} onClick={() => { setMetric(option.key); setThreshold(option.key === "total_points" ? (leagueKey === "nba" ? 229.5 : leagueKey === "ncaab" ? 149.5 : 169.5) : option.line); }} className={`shrink-0 rounded-md px-2.5 py-2 text-[11px] font-semibold whitespace-nowrap ${metric === option.key ? "bg-white shadow-sm" : "text-muted hover:text-ink"}`}>{option.title}</button>)}</div></div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5"><div className="grid grid-cols-3 gap-2">{([3, 5, 100] as const).map((window) => { const rateMatches = basketballMatches(matches).slice(0, window); const count = rateMatches.map((m) => metricValue(m, metric, leagueKey)).filter((n): n is number => n != null && Number.isFinite(n)); const nHits = count.filter((n) => n > threshold).length; return <button type="button" key={window} onClick={() => setShown(window)} className={`min-w-20 rounded-lg border p-3 text-left ${shown === window ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}><span className="block text-[10px] opacity-70">{window === 100 ? "Season" : `Last ${window}`}</span><strong className="mt-1 block text-lg">{percentage(count.length ? nHits * 100 / count.length : null)}</strong><span className="block text-[10px] opacity-70">{nHits} of {count.length} over</span></button>; })}</div>
            <div className="flex flex-wrap items-end gap-4"><div className="text-xs"><p className="text-[10px] text-muted">Average</p><strong className="text-base">{numeric(average)}</strong></div><div className="text-xs"><p className="text-[10px] text-muted">Median</p><strong className="text-base">{numeric(median)}</strong></div><div className="text-xs"><p className="text-[10px] text-muted">Range</p><strong className="text-base">{values.length ? `${Math.min(...values)}–${Math.max(...values)}` : "—"}</strong></div><SmallSelect label="Over line" value={threshold} onChange={setThreshold} options={thresholds.map((n) => ({ value: n, label: `Over ${n}` }))} /></div>
        </div>
        <div className="mt-5"><p className="mb-3 text-[11px] text-muted">{hits} of {values.length} available games exceeded {threshold} ({percentage(values.length ? (hits / values.length) * 100 : null)})</p>
            {values.length ? <div className="h-[310px] w-full min-w-0 sm:h-[350px]"><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={data} margin={{ top: 25, right: 8, bottom: 15, left: -15 }} barCategoryGap="30%">
                    <CartesianGrid stroke="#EEF0F3" vertical={false} />
                    <XAxis dataKey="game_pk" axisLine={false} tickLine={false} interval={0} tick={{ fill: "#5B6474", fontSize: 10 }} tickFormatter={(id: number) => { const match = tickMap.get(Number(id)); const code = match?.opponent.split(" ").map((v) => v[0]).join("").slice(0, 4).toUpperCase() ?? "?"; return `${match?.location === "home" ? "vs" : "@"}${code}`; }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8A93A3", fontSize: 10 }} width={55} domain={[(min: number) => Math.max(0, Math.floor((min - 12) / 10) * 10), (max: number) => Math.ceil((Math.max(max, threshold) + 5) / 10) * 10]} allowDecimals={false} />
                    <Tooltip content={<TooltipCard />} cursor={{ fill: "#F1F3F7" }} />
                    <ReferenceLine y={threshold} stroke="#0B1220" strokeWidth={1.4} strokeDasharray="4 4" label={{ value: threshold, position: "right", fontSize: 10 }} />
                    <Bar dataKey="value" maxBarSize={46} radius={[4, 4, 0, 0]} minPointSize={3} isAnimationActive={false}>{data.map((row) => <Cell key={row.game_pk} fill={row.value !== null && row.value > threshold ? "#1F4FE0" : "#D5D9E0"} />)}<LabelList dataKey="value" position="top" fontSize={10} fill="#172033" /></Bar>
                </BarChart>
            </ResponsiveContainer></div> : <div className="grid h-48 place-items-center text-sm text-muted">No values available for this metric.</div>}
        </div>
        <p className="mt-3 text-[11px] text-muted">Blue: over {threshold} · Grey: under or equal. The tooltip uses each unique game ID and full opponent name, including repeated opponents.</p>
    </section>;
}
