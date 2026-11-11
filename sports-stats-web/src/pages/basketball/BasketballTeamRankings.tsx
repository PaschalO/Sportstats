import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchBasketballTeamRankings, getBasketballLeague, numeric, type BasketballLocation, type BasketballRankMetric, type BasketballRankTeam } from "../../services/basketballService";
import { ErrorCard, Loading, LocationSwitch, MiniInitials, SmallSelect } from "../../component/basketball/BasketballUI";

type MetricConfig = { key: string; label: string; short: string; percent?: boolean };
const METRICS: MetricConfig[] = [
    { key: "points_for", label: "Points", short: "PTS" },
    { key: "points_against", label: "Points allowed", short: "OPP" },
    { key: "total_points", label: "Total points", short: "TOTAL" },
    { key: "field_goal_pct", label: "Field goal %", short: "FG%", percent: true },
    { key: "three_points_made", label: "3PT made", short: "3PM" },
    { key: "three_point_pct", label: "3PT %", short: "3P%", percent: true },
    { key: "free_throw_pct", label: "Free throw %", short: "FT%", percent: true },
    { key: "offensive_rebounds", label: "Off. rebounds", short: "OREB" },
    { key: "defensive_rebounds", label: "Def. rebounds", short: "DREB" },
    { key: "total_rebounds", label: "Rebounds", short: "REB" },
    { key: "assists", label: "Assists", short: "AST" },
    { key: "turnovers", label: "Turnovers", short: "TOV" },
    { key: "steals", label: "Steals", short: "STL" },
    { key: "blocks", label: "Blocks", short: "BLK" },
    { key: "personal_fouls", label: "Fouls", short: "PF" },
    { key: "biggest_lead", label: "Biggest lead", short: "LEAD" },
];
function rankMetric(team: BasketballRankTeam, key: string): BasketballRankMetric | null {
    const value = team[key];
    return value != null && typeof value === "object" && "rank" in value ? value as BasketballRankMetric : null;
}
function valueOf(team: BasketballRankTeam, config: MetricConfig): number | null {
    const metric = rankMetric(team, config.key);
    if (!metric) return null;
    if ("percentage" in metric) return metric.percentage;
    if ("average" in metric) return metric.average;
    return null;
}
function formatted(team: BasketballRankTeam, config: MetricConfig) {
    const val = valueOf(team, config);
    return val === null ? "—" : `${numeric(val)}${config.percent ? "%" : ""}`;
}
function byRank(teams: BasketballRankTeam[], key: string) {
    return [...teams].sort((a, b) => (rankMetric(a, key)?.rank ?? 999) - (rankMetric(b, key)?.rank ?? 999) || a.team_name.localeCompare(b.team_name));
}
function rankClass(rank: number | null, count: number): string {
    if (rank == null) return "bg-surface-soft text-muted";
    if (rank <= Math.ceil(count * 0.2)) return "bg-accent text-white";
    if (rank <= Math.ceil(count * 0.4)) return "bg-accent-soft text-accent-strong";
    if (rank <= Math.ceil(count * 0.6)) return "bg-[#EAF0FF] text-accent-strong";
    return "bg-surface text-muted";
}
export default function BasketballTeamRankings({ leagueKey }: { leagueKey: string }) {
    const league = getBasketballLeague(leagueKey);
    const [location, setLocation] = useState<BasketballLocation>("overall");
    const [lastN, setLastN] = useState(5);
    const [metricKey, setMetricKey] = useState("points_for");
    const [showAll, setShowAll] = useState(true);
    const query = useQuery({
        queryKey: ["basketball", "rankings", leagueKey, league?.seasonId, location, lastN],
        queryFn: ({ signal }) => fetchBasketballTeamRankings({ league: league!, location, lastN }, signal),
        enabled: !!league, staleTime: 60_000, retry: 1,
    });
    const config = METRICS.find((item) => item.key === metricKey) ?? METRICS[0];
    const ranked = useMemo(() => byRank(query.data?.teams ?? [], config.key), [query.data, config.key]);
    const available = ranked.map((team) => valueOf(team, config)).filter((num): num is number => num != null && Number.isFinite(num));
    const leagueAvg = available.length ? available.reduce((a, b) => a + b, 0) / available.length : null;
    const max = available.length ? Math.max(...available) : 1;
    const min = available.length ? Math.min(...available) : 0;
    if (!league) return <ErrorCard error={`Unknown basketball competition: ${leagueKey}`} />;
    return <div className="w-full min-w-0 space-y-7 pb-12">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-widest text-accent">{league.label} · Season {league.seasonId ?? "not configured"} · Last {lastN} games</p><h1 className="mt-2 text-3xl font-semibold">Team stats rankings</h1><p className="mt-1 max-w-xl text-sm text-muted">Per-game averages and league rank across 16 stats. Select a metric to see the full order.</p></div><div className="flex flex-wrap items-end gap-3"><LocationSwitch value={location} onChange={setLocation} /><SmallSelect label="Last" value={lastN} onChange={setLastN} options={[5, 10, 15, 100].map((n) => ({ value: n, label: n === 100 ? "Season" : `${n} games` }))} /></div></header>
        <nav aria-label="Ranking statistic" className="flex flex-wrap gap-2">{METRICS.map((item) => <button type="button" key={item.key} aria-pressed={config.key === item.key} onClick={() => setMetricKey(item.key)} className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${config.key === item.key ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-accent"}`}>{item.label}</button>)}</nav>
        {query.isPending ? <Loading /> : query.isError ? <ErrorCard error={query.error} retry={() => void query.refetch()} /> : <>
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.4fr)]">
                <section className="min-w-0 rounded-xl border border-line p-4"><h2 className="text-base font-semibold">{config.label}</h2><p className="mt-1 text-[11px] text-muted">{config.percent ? "Percentage" : "Per game"} · league average {leagueAvg !== null ? numeric(leagueAvg) : "—"}</p><div className="mt-4 space-y-2">{ranked.map((team, index) => { const value = valueOf(team, config); const rank = rankMetric(team, config.key)?.rank; const width = value === null ? 0 : Math.max(2, 100 * (value - Math.min(0, min)) / Math.max(1, max - Math.min(0, min))); return <Link key={team.team_pk} to="/$sport/$league/teams/$teamId" params={{ sport: "basketball", league: leagueKey, teamId: String(team.team_pk) }} className="grid grid-cols-[18px_42px_minmax(0,1fr)_48px] items-center gap-2 rounded p-1 text-[11px] hover:bg-surface-soft" title={`${team.team_name}: ${formatted(team, config)}`}><span className="text-muted">{rank ?? index + 1}</span><span className="truncate font-semibold">{team.team_name.split(" ").map((word) => word[0]).join("").slice(0, 4).toUpperCase()}</span><div className="relative h-2 rounded-full bg-surface"><div className={`h-full rounded-full ${rank !== null && rank !== undefined && rank <= 10 ? "bg-accent" : "bg-line-strong"}`} style={{ width: `${width}%` }} />{leagueAvg != null && <span className="absolute inset-y-[-3px] w-px bg-ink/60" style={{ left: `${Math.max(0, Math.min(100, 100 * (leagueAvg - Math.min(0, min)) / Math.max(1, max - Math.min(0, min))))}%` }} />}</div><span className="text-right font-semibold tabular-nums">{formatted(team, config)}</span></Link>; })}</div><p className="mt-3 text-[10px] text-muted">Marker indicates league average. Bars use a zero baseline for count-based metrics.</p></section>
                <section className="min-w-0 space-y-3"><h2 className="text-base font-semibold">Category leaders</h2><div className="grid gap-3 sm:grid-cols-2">{[
                    { label: "Fewest allowed", metric: "points_against" },
                    { label: "Highest totals", metric: "total_points" },
                    { label: "Three-point %", metric: "three_point_pct" },
                    { label: "Rebounds", metric: "total_rebounds" },
                    { label: "Assists", metric: "assists" },
                    { label: "Fewest turnovers", metric: "turnovers" },
                ].map((category) => { const conf = METRICS.find((m) => m.key === category.metric)!; const ordered = byRank(query.data?.teams ?? [], category.metric).slice(0, 3); const top = ordered[0]; return <article key={category.metric} className="rounded-xl border border-line p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{category.label}</h3><span className="text-[10px] text-muted">{conf.percent ? "percentage" : "per game"}</span></div>{top && <div className="mt-3 flex flex-wrap items-baseline gap-2"><strong className="text-2xl">{formatted(top, conf)}</strong><Link className="text-[11px] font-semibold hover:text-accent-strong" to="/$sport/$league/teams/$teamId" params={{ sport: "basketball", league: leagueKey, teamId: String(top.team_pk) }}>{top.team_name}</Link></div>}<div className="mt-3 border-t border-line-soft pt-2">{ordered.slice(1).map((team) => <div key={team.team_pk} className="flex justify-between gap-2 py-1 text-[11px]"><span className="truncate text-muted">{rankMetric(team, category.metric)?.rank ?? "—"} · {team.team_name}</span><span className="shrink-0 font-semibold">{formatted(team, conf)}</span></div>)}</div></article>; })}</div></section>
            </div>
            <section className="min-w-0 space-y-3"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="text-xl font-semibold">Rank map</h2><p className="mt-1 text-xs text-muted">Each team's league rank in all 16 stats. Lower rank numbers are better.</p></div><button type="button" className="rounded-lg border border-line px-3 py-2 text-xs font-semibold" onClick={() => setShowAll((n) => !n)}>{showAll ? "Show top 15" : `Show all ${ranked.length} teams`}</button></div><div className="overflow-x-auto rounded-xl border border-line p-2 sm:p-4"><table className="w-full min-w-[1040px] border-separate border-spacing-1 text-center text-[10px] tabular-nums"><thead><tr><th className="sticky left-0 z-10 bg-white px-2 py-2 text-left">TEAM</th>{METRICS.map((m) => <th key={m.key} className="px-0.5 py-2" title={m.label}>{m.short}</th>)}</tr></thead><tbody>{ranked.slice(0, showAll ? undefined : 15).map((team) => <tr key={team.team_pk}><th className="sticky left-0 z-10 min-w-[150px] bg-white px-1 py-1 text-left font-semibold"><Link to="/$sport/$league/teams/$teamId" params={{ sport: "basketball", league: leagueKey, teamId: String(team.team_pk) }} className="flex items-center gap-1 hover:text-accent-strong"><MiniInitials name={team.team_name} /><span className="truncate">{team.team_name}</span></Link></th>{METRICS.map((m) => { const data = rankMetric(team, m.key); return <td key={m.key} title={`${team.team_name} · ${m.label}: ${formatted(team, m)} · Rank ${data?.rank ?? "unknown"} · Coverage ${data?.coverage_pct ?? "—"}%`} className={`rounded-md px-0.5 py-2 font-semibold ${rankClass(data?.rank ?? null, ranked.length)}`}>{data?.rank ?? "—"}</td>; })}</tr>)}</tbody></table></div><p className="text-[11px] text-muted">The rank values come directly from your FastAPI response. Percentages use made / attempted data, and missing ranks remain unavailable.</p></section>
        </>}
    </div>;
}
