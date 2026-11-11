import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
    Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import SoccerGameByGame from "./SoccerGameByGame";
import {
    fetchSoccerTeamMatches, fetchSoccerTeamSummary, fmt, getSoccerLeague, matchResult,
    matchSorted, n, percent, type SoccerLocation, type SoccerMatch, type SoccerMatchStats,
} from "../../services/soccerService";

function avg(matches: SoccerMatch[], field: keyof SoccerMatchStats): number | null {
    const list = matches.map((m) => n(m.team_stats?.[field])).filter((value): value is number => value !== null);
    return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
}
function ResultBadge({ match }: { match: SoccerMatch }) {
    const result = matchResult(match);
    return <span className={`inline-grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold ${result === "W" ? "bg-ink text-white" : result === "D" ? "bg-surface text-ink-soft" : "border border-line-strong bg-white text-muted"}`} title={result === "W" ? "Win" : result === "D" ? "Draw" : "Loss"}>{result}</span>;
}
function PairBar({ value, opponent, label, format }: { value: number | null; opponent: number | null; label: string; format?: (n: number) => string }) {
    const shown = (v: number | null) => v === null ? "—" : (format ? format(v) : Number.isInteger(v) ? String(v) : v.toFixed(2));
    const known = value !== null && opponent !== null;
    const total = Math.max((value ?? 0) + (opponent ?? 0), 1);
    return <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2 text-[11px]">
        <span className="font-semibold tabular-nums text-ink">{shown(value)}</span>
        <div className="min-w-0">
            <p className="mb-1 text-center text-[10px] text-muted">{label}</p>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-surface">
                {known ? <><div style={{ width: `${(value! / total) * 100}%` }} className="bg-accent" /><div style={{ width: `${(opponent! / total) * 100}%` }} className="bg-opponent" /></> : null}
            </div>
        </div>
        <span className="text-right tabular-nums text-muted">{shown(opponent)}</span>
    </div>;
}
function cards(stats: SoccerMatchStats | null): number | null {
    if (!stats) return null;
    const y = n(stats.yellow_cards), r = n(stats.red_cards);
    return y === null || r === null ? null : y + r;
}
function PairCard({ match }: { match: SoccerMatch }) {
    const t = match.team_stats, o = match.opponent_stats;
    const metrics: Array<{ label: string; first: number | null; second: number | null; format?: (x: number) => string }> = [
        { label: "Possession", first: n(t?.possession_pct), second: n(o?.possession_pct), format: (x) => `${Math.round(x)}%` },
        { label: "Shots", first: n(t?.shots_total), second: n(o?.shots_total) },
        { label: "On target", first: n(t?.shots_on_target), second: n(o?.shots_on_target) },
        { label: "Expected goals", first: n(t?.expected_goals), second: n(o?.expected_goals) },
        { label: "Corners", first: n(t?.corners), second: n(o?.corners) },
        { label: "Fouls", first: n(t?.fouls), second: n(o?.fouls) },
        { label: "Cards", first: cards(t), second: cards(o) },
        { label: "Tackles", first: n(t?.tackles), second: n(o?.tackles) },
    ];
    return (
        <article className="min-w-0 overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-line-soft p-4">
                <div className="min-w-0"><p className="text-[11px] text-muted">{match.game_date} · {match.location === "home" ? "Home" : "Away"}</p><p className="mt-1 truncate text-sm font-semibold text-ink" title={match.opponent_name}>vs {match.opponent_name}</p></div>
                <div className="flex shrink-0 items-center gap-2"><strong className="text-lg tabular-nums text-ink">{match.team_score}–{match.opponent_score}</strong><ResultBadge match={match} /></div>
            </div>
            <div className="space-y-3 p-4">{metrics.map((m) => <PairBar key={m.label} value={m.first} opponent={m.second} label={m.label} format={m.format} />)}</div>
            {!o && <p className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">Opponent stats not available for this match.</p>}
        </article>
    );
}
function GoalVsXG({ matches }: { matches: SoccerMatch[] }) {
    const rows = useMemo(() => matches.slice(0, 5).reverse().map((m) => ({
        id: m.game_pk, label: m.opponent_name.length > 13 ? `${m.opponent_name.slice(0, 12)}…` : m.opponent_name,
        goals: m.team_score, xg: n(m.team_stats?.expected_goals), date: m.game_date,
    })), [matches]);
    return <section className="min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-ink">Goals vs expected goals</h2><div className="flex gap-3 text-[11px] text-muted"><span><span className="mr-1 inline-block size-2 rounded bg-ink" />Goals</span><span><span className="mr-1 inline-block size-2 rounded bg-accent-mid" />xG</span></div></div>
        <div className="mt-3 h-[250px] min-w-0 sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 14, bottom: 12, right: 10, left: -20 }} barCategoryGap="24%">
                    <CartesianGrid vertical={false} stroke="#eef0f3" />
                    <XAxis dataKey="label" tick={{ fill: "#5B6474", fontSize: 10 }} interval={0} tickLine={false} axisLine={false} height={42} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8A93A3" }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: unknown, name: unknown): [string, string] => [String(value ?? "—"), String(name)]} />
                    <Bar dataKey="goals" name="Goals" fill="#0B1220" maxBarSize={32} radius={[3,3,0,0]}><LabelList dataKey="goals" position="top" style={{ fontSize: 10, fill: "#0B1220" }}/></Bar>
                    <Bar dataKey="xg" name="xG" fill="#9DB5F7" maxBarSize={32} radius={[3,3,0,0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted">Showing up to 5 latest matches, oldest to newest. xG bars are omitted when data is unavailable.</p>
    </section>;
}
function Standout({ matches }: { matches: SoccerMatch[] }) {
    const withXg = matches.filter((m) => n(m.team_stats?.expected_goals) !== null);
    const xgTotal = withXg.reduce((sum, m) => sum + (n(m.team_stats?.expected_goals) ?? 0), 0);
    const scored = withXg.reduce((sum, m) => sum + m.team_score, 0);
    const btts = matches.filter((m) => m.team_score > 0 && m.opponent_score > 0).length;
    const over = matches.filter((m) => m.team_score + m.opponent_score > 2.5).length;
    const reds = matches.reduce((sum, m) => sum + (n(m.team_stats?.red_cards) ?? 0), 0);
    const possess = matches.map((m) => n(m.team_stats?.possession_pct)).filter((v): v is number => v !== null);
    const minPos = possess.length ? Math.min(...possess) : null;
    return <aside className="min-w-0 rounded-xl border border-line bg-surface-soft p-4 sm:p-5">
        <h2 className="text-lg font-bold text-ink">What stands out</h2>
        <div className="mt-4 space-y-5 text-sm">
            {withXg.length > 0 && <div className="flex gap-4"><strong className="w-18 shrink-0 text-lg text-accent-strong tabular-nums">{scored - xgTotal >= 0 ? "+" : ""}{(scored - xgTotal).toFixed(2)}</strong><p className="text-ink-soft">Goals minus expected goals across {withXg.length} matches with available xG.</p></div>}
            <div className="flex gap-4"><strong className="w-18 shrink-0 text-lg text-ink tabular-nums">{btts}/{matches.length}</strong><p className="text-ink-soft">Both teams scored in {btts} matches. {over} matches finished over 2.5 total goals.</p></div>
            {minPos !== null && <div className="flex gap-4"><strong className="w-18 shrink-0 text-lg text-ink tabular-nums">{minPos.toFixed(0)}%</strong><p className="text-ink-soft">Lowest possession share among matches with available possession data.</p></div>}
            <div className="flex gap-4"><strong className="w-18 shrink-0 text-lg text-danger tabular-nums">{reds}</strong><p className="text-ink-soft">Red cards recorded across the selected matches.</p></div>
        </div>
    </aside>;
}
export default function SoccerTeamStats({ leagueKey, teamId }: { leagueKey: string; teamId: string }) {
    const league = getSoccerLeague(leagueKey);
    const [location, setLocation] = useState<SoccerLocation>("overall");
    const [lastN, setLastN] = useState(5);
    const summaries = useQuery({
        queryKey: ["soccer", "summary", leagueKey, league?.seasonId, 100],
        queryFn: ({ signal }) => fetchSoccerTeamSummary({ league: league!, location: "overall", lastN: 100 }, signal),
        enabled: !!league?.seasonId, staleTime: 60_000, retry: 1,
    });
    const team = summaries.data?.teams.find((t) => String(t.team_pk) === teamId);
    const history = useQuery({
        queryKey: ["soccer", "matches", leagueKey, league?.seasonId, team?.team_name, location],
        queryFn: ({ signal }) => fetchSoccerTeamMatches({ league: league!, teamName: team!.team_name, location, lastN: 100 }, signal),
        enabled: !!league?.seasonId && !!team, staleTime: 60_000, retry: 1,
    });
    const allMatches = useMemo(() => matchSorted(history.data?.matches ?? []), [history.data]);
    const matches = useMemo(() => lastN === 100 ? allMatches : allMatches.slice(0, lastN), [allMatches, lastN]);
    const results = matches.slice(0, 5);
    const goals = matches.reduce((sum, m) => sum + m.team_score, 0);
    const goalsAgainst = matches.reduce((sum, m) => sum + m.opponent_score, 0);
    const wins = matches.filter((m) => matchResult(m) === "W").length;
    const draws = matches.filter((m) => matchResult(m) === "D").length;
    const losses = matches.filter((m) => matchResult(m) === "L").length;
    const xg = avg(matches, "expected_goals");
    const possession = avg(matches, "possession_pct");
    const shots = avg(matches, "shots_total");
    const onTarget = avg(matches, "shots_on_target");
    const corners = avg(matches, "corners");
    const tackles = avg(matches, "tackles");
    const yellows = matches.reduce((sum, m) => sum + (n(m.team_stats?.yellow_cards) ?? 0), 0);
    const reds = matches.reduce((sum, m) => sum + (n(m.team_stats?.red_cards) ?? 0), 0);
    if (!league) return <p className="p-6">Unknown league: {leagueKey}</p>;
    return <div className="page min-w-0 space-y-6 pb-16">
        <div className="pt-6 text-xs text-muted"><Link to="/$sport/$league/$section" params={{ sport: "soccer", league: leagueKey, section: "team-summary" }} className="text-muted hover:text-accent">Soccer / {league.label} / Team summary</Link> / <span className="text-ink">{team?.team_name ?? `Team ${teamId}`}</span></div>
        {!league.seasonId && <p className="rounded-xl border border-line bg-surface-soft p-4 text-sm text-muted">Configure the internal season ID for {league.label} in your <code>.env</code>.</p>}
        {summaries.isError && <p role="alert" className="rounded-xl border border-line p-4 text-danger">Could not load team summary: {summaries.error.message}</p>}
        {summaries.isPending && !!league.seasonId && <p role="status" className="text-muted">Loading soccer team…</p>}
        {!summaries.isPending && summaries.data && !team && <p role="alert" className="rounded-xl border border-line p-5 text-muted">Team ID {teamId} was not found in {league.label} for this season.</p>}
        {team && <>
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="grid size-14 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">{team.team_name.split(" ").map((s) => s[0]).join("").slice(0, 3).toUpperCase()}</div>
                    <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-widest text-accent">{league.label} · Season {league.seasonId} · {location === "overall" ? "All games" : `${location} games`}</p><h1 className="mt-1 break-words text-3xl font-bold text-ink sm:text-4xl">{team.team_name}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">Last {Math.min(5, matches.length)} {location === "overall" ? "games" : location} {results.map((m) => <ResultBadge key={m.game_pk} match={m} />)}</div></div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div aria-label="Location" className="inline-flex gap-0.5 rounded-lg bg-surface p-1">{(["overall", "home", "away"] as const).map((key) => <button type="button" key={key} aria-pressed={location === key} onClick={() => setLocation(key)} className={`rounded-md px-3 py-2 text-xs font-semibold ${location === key ? "bg-white text-ink shadow-sm" : "text-muted"}`}>{key === "overall" ? "All games" : key === "home" ? "Home" : "Away"}</button>)}</div>
                    <label className="text-[11px] text-muted">Last<select value={lastN} onChange={(e: { target: { value: string } }) => setLastN(Number(e.target.value))} className="mt-1 block rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-ink"><option value={5}>5 games</option><option value={10}>10 games</option><option value={15}>15 games</option><option value={100}>Season</option></select></label>
                </div>
            </div>
            {history.isError && <div role="alert" className="rounded-xl border border-line bg-surface-soft p-4 text-sm text-danger">Could not load match statistics: {history.error.message}<button type="button" className="ml-2 underline" onClick={() => void history.refetch()}>Retry</button></div>}
            {history.isFetching && <p className="text-xs text-muted">Updating {team.team_name} match statistics…</p>}
            {history.data && <>
                <section aria-label="Soccer KPIs" className="grid overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
                    {([
                        { label: "Record", value: `${wins}–${draws}–${losses}`, foot: "W–D–L" },
                        { label: "Goals", value: `${goals}–${goalsAgainst}`, foot: `${fmt(matches.length ? goals / matches.length : null)} for · ${fmt(matches.length ? goalsAgainst / matches.length : null)} against` },
                        { label: "xG per game", value: fmt(xg), foot: "Expected goals", accent: true },
                        { label: "Possession", value: percent(possession, 1), foot: "Average share" },
                        { label: "Shots", value: fmt(shots, 1), foot: `${fmt(onTarget, 1)} on target` },
                        { label: "Corners", value: fmt(corners, 1), foot: "Per game" },
                        { label: "Tackles", value: fmt(tackles, 1), foot: `${yellows} yellow · ${reds} red` },
                    ] as Array<{label: string; value: string; foot: string; accent?: boolean}>).map((card) => <article key={card.label} className={`min-w-0 border-b border-r border-line-soft p-4 last:border-r-0 lg:border-b-0 ${card.accent ? "bg-accent-tint" : ""}`}><p className={`text-[11px] font-semibold ${card.accent ? "text-accent-strong" : "text-muted"}`}>{card.label}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${card.accent ? "text-accent-strong" : "text-ink"}`}>{card.value}</p><p className="mt-1 text-[11px] text-muted">{card.foot}</p></article>)}
                </section>
                <div className="grid min-w-0 gap-4 lg:grid-cols-[1.25fr_1fr]"><GoalVsXG matches={matches} /><Standout matches={matches} /></div>
                <div id="game-by-game"><SoccerGameByGame key={`${team.team_pk}-${location}`} matches={allMatches} location={location} onLocationChange={setLocation} /></div>
                <section>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-ink">Match by match</h2><div className="flex gap-3 text-[11px] text-muted"><span><span className="mr-1 inline-block size-2 rounded bg-accent" />{team.team_name}</span><span><span className="mr-1 inline-block size-2 rounded bg-opponent" />Opponent</span></div></div>
                    <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">{matches.map((match) => <PairCard key={match.game_pk} match={match} />)}</div>
                    {!matches.length && <p className="rounded-xl border border-line p-5 text-sm text-muted">No completed games for the selected filters.</p>}
                </section>
                <p className="text-[11px] text-muted">All per-game averages use only matches with that statistic available. Opponent values shown as — indicate missing data. No substitute zeros are used.</p>
            </>}
        </>}
    </div>;
}
