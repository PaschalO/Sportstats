import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
    fetchSoccerTeamRankings, getSoccerLeague, SOCCER_RANK_METRICS,
    fmt, type SoccerLocation, type SoccerRankedTeam, type SoccerRankingMetricKey,
} from "../../services/soccerService";

const LABELS: Record<SoccerRankingMetricKey, string> = {
    fouls_committed: "Fouls committed", shots_total: "Shots", shots_on_target: "Shots on target",
    cards: "Cards", tackles: "Tackles", corners: "Corners", possession_pct: "Possession",
    throw_ins: "Throw-ins", free_kicks: "Free kicks", offsides: "Offsides",
};
function formatMetric(key: SoccerRankingMetricKey, value: number | null): string {
    return value == null ? "—" : key === "possession_pct" ? `${fmt(value, 1)}%` : fmt(value, 2);
}
function SortedFor({ teams, metric }: { teams: SoccerRankedTeam[]; metric: SoccerRankingMetricKey }) {
    return [...teams]
        .filter((t) => t[metric].rank != null && t[metric].average != null)
        .sort((a, b) => (a[metric].rank! - b[metric].rank!) || a.team_name.localeCompare(b.team_name));
}
export default function SoccerTeamRankings({ leagueKey }: { leagueKey: string }) {
    const league = getSoccerLeague(leagueKey);
    const [location, setLocation] = useState<SoccerLocation>("overall");
    const [lastN, setLastN] = useState(100);
    const [expanded, setExpanded] = useState<SoccerRankingMetricKey | null>(null);
    const query = useQuery({
        queryKey: ["soccer", "rankings", leagueKey, league?.seasonId, location, lastN],
        queryFn: ({ signal }) => fetchSoccerTeamRankings({ league: league!, location, lastN }, signal),
        enabled: !!league?.seasonId,
        staleTime: 60_000,
        retry: 1,
    });
    const teams = query.data?.teams ?? [];
    const full = useMemo(() => expanded ? SortedFor({ teams, metric: expanded }) : [], [teams, expanded]);
    if (!league) return <p className="p-6 text-muted">Unknown soccer league.</p>;
    return (
        <main className="page min-w-0 pb-16">
            <div className="mt-6 text-xs text-muted"><Link to="/$sport/$league/$section" params={{sport:"soccer",league:leagueKey,section:"team-summary"}} className="hover:text-accent">{league.label} / Team summary</Link> / Rankings</div>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-widest text-accent">{league.label} · Season {league.seasonId ?? "not configured"}</p>
                    <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">Team stats rankings</h1>
                    <p className="mt-2 max-w-xl text-sm text-muted">Per-game averages from FastAPI, with API rank and data coverage. Select a card for the full ranking.</p></div>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs text-muted">Location
                        <select value={location} onChange={e => setLocation(e.target.value as SoccerLocation)} className="mt-1 block rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-semibold text-ink">
                            <option value="overall">All games</option><option value="home">Home</option><option value="away">Away</option>
                        </select>
                    </label>
                    <label className="text-xs text-muted">Last
                        <select value={lastN} onChange={e => setLastN(Number(e.target.value))} className="mt-1 block rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-semibold text-ink">
                            <option value={100}>All games</option><option value={5}>5 games</option><option value={10}>10 games</option><option value={15}>15 games</option>
                        </select>
                    </label>
                </div>
            </div>
            {!league.seasonId && <p className="mt-6 rounded-lg border border-line p-4 text-sm text-muted">Configure {league.label}'s competition season ID in your .env.</p>}
            {query.isPending && !!league.seasonId && <p role="status" className="mt-6 text-sm text-muted">Loading rankings…</p>}
            {query.isError && <div role="alert" className="mt-6 rounded-lg border border-line p-4 text-sm text-danger">Could not load rankings: {query.error.message} <button type="button" onClick={()=>void query.refetch()} className="ml-2 underline">Retry</button></div>}
            {query.data && <>
                <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {SOCCER_RANK_METRICS.map(metric => {
                        const top = SortedFor({ teams, metric }).slice(0, 5);
                        const max = Math.max(1, ...top.map(t => t[metric].average ?? 0));
                        return <article key={metric} className={`min-w-0 rounded-2xl border bg-white p-4 sm:p-5 ${expanded===metric ? "border-accent" : "border-line"}`}>
                            <div className="flex items-center justify-between gap-2"><h2 className="text-base font-bold text-ink">{LABELS[metric]}</h2><span className="text-[11px] text-muted">{metric === "possession_pct" ? "average %" : "per game"}</span></div>
                            <div className="mt-5 space-y-4">{top.map((t) => <div key={t.team_pk} className="grid grid-cols-[20px_minmax(0,1fr)_60px] items-center gap-2 text-xs">
                                <span className="text-muted">{t[metric].rank}</span><div className="min-w-0"><Link to="/$sport/$league/teams/$teamId" params={{sport:"soccer",league:leagueKey,teamId:String(t.team_pk)}} className="block truncate font-medium text-ink hover:text-accent-strong" title={t.team_name}>{t.team_name}</Link>
                                <div className="mt-1 h-1.5 rounded-full bg-surface"><div className="h-full rounded-full bg-accent" style={{width:`${Math.max(0,Math.min(100,((t[metric].average??0)/max)*100))}%`}} /></div></div>
                                <span className="text-right font-bold tabular-nums text-ink">{formatMetric(metric,t[metric].average)}</span>
                            </div>)}</div>
                            <button type="button" className="mt-6 text-xs font-semibold text-accent-strong hover:underline" onClick={() => setExpanded(expanded===metric?null:metric)}>{expanded===metric?"Hide full ranking":"Full ranking"} →</button>
                        </article>;
                    })}
                </div>
                {expanded && <section className="mt-6 min-w-0 rounded-xl border border-line bg-white p-4 sm:p-5" aria-label={`Full ${LABELS[expanded]} ranking`}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-ink">{LABELS[expanded]} — all {full.length} ranked teams</h2><button type="button" className="text-sm font-semibold text-accent-strong" onClick={()=>setExpanded(null)}>Close</button></div>
                    <div className="space-y-2">{full.map(team => {
                        const m=team[expanded];
                        return <div key={team.team_pk} className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)_75px] items-center gap-2 rounded-lg border-b border-line-soft py-2 text-sm sm:grid-cols-[36px_minmax(0,1fr)_96px_90px]">
                            <strong className="text-muted">{m.rank}</strong><Link to="/$sport/$league/teams/$teamId" params={{sport:"soccer",league:leagueKey,teamId:String(team.team_pk)}} className="min-w-0 truncate font-semibold text-ink hover:text-accent-strong">{team.team_name}</Link>
                            <strong className="text-right tabular-nums text-ink">{formatMetric(expanded,m.average)}</strong><span className="hidden text-right text-xs tabular-nums text-muted sm:block">{m.games_with_data}/{team.games_played} games</span>
                        </div>;
                    })}</div>
                </section>}
                <p className="mt-5 text-xs text-muted">Average and rank come from the API. Games with data and coverage can vary by statistic; missing data is not treated as zero.</p>
            </>}
        </main>
    );
}
