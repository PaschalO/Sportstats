import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
    basketballMatches, fetchBasketballTeamSummary, getBasketballLeague, numeric, periodNames,
    periodTotals, percentage, type BasketballLocation, type BasketballMatch,
} from "../../services/basketballService";
import { ErrorCard, Loading, LocationSwitch, MiniInitials, SmallSelect } from "../../component/basketball/BasketballUI";

function summarize(matches: BasketballMatch[], code: string, line: number) {
    const rows = matches.map((match) => periodTotals(match, code)).filter((row): row is NonNullable<typeof row> => row !== null);
    const count = rows.length;
    if (!count) return { avg: null, scored: null, allowed: null, win: null, hit: null, count: 0 };
    return {
        avg: rows.reduce((a, b) => a + b.team_points + b.opponent_points, 0) / count,
        scored: rows.reduce((a, b) => a + b.team_points, 0) / count,
        allowed: rows.reduce((a, b) => a + b.opponent_points, 0) / count,
        win: rows.filter((p) => p.team_points > p.opponent_points).length * 100 / count,
        hit: rows.filter((p) => p.team_points + p.opponent_points > line).length * 100 / count,
        count,
    };
}
export default function BasketballQuarterStats({ leagueKey }: { leagueKey: string }) {
    const league = getBasketballLeague(leagueKey);
    const [location, setLocation] = useState<BasketballLocation>("overall");
    const [lastN, setLastN] = useState(100);
    const [period, setPeriod] = useState("");
    const [threshold, setThreshold] = useState(57.5);
    const query = useQuery({
        queryKey: ["basketball", "summary", leagueKey, league?.seasonId, location, lastN],
        queryFn: ({ signal }) => fetchBasketballTeamSummary({ league: league!, location, lastN }, signal),
        enabled: !!league, staleTime: 60_000, retry: 1,
    });
    const all = query.data?.teams ?? [];
    const periodKeys = useMemo(() => periodNames(all.flatMap((team) => team[location].matches)), [all, location]);
    const chosen = periodKeys.includes(period) ? period : periodKeys[0] ?? "";
    const isNcaabHalves = leagueKey === "ncaab" && periodKeys.includes("Q1") && periodKeys.includes("Q2") && !periodKeys.includes("Q3") && !periodKeys.includes("Q4");
    const displayPeriod = (key: string) => isNcaabHalves ? (key === "Q1" ? "Q1 · 1st half" : key === "Q2" ? "Q2 · 2nd half" : key) : key;
    const summaries = useMemo(() => all.map((team) => ({ team, stats: summarize(basketballMatches(team[location].matches), chosen, threshold) })).sort((a, b) => (b.stats.avg ?? -1) - (a.stats.avg ?? -1)), [all, location, chosen, threshold]);
    if (!league) return <ErrorCard error={`Unknown basketball competition: ${leagueKey}`} />;
    return <div className="w-full min-w-0 space-y-6 pb-12">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-widest text-accent">{league.label} · Season {league.seasonId ?? "not configured"}</p><h1 className="mt-2 text-3xl font-semibold">{isNcaabHalves ? "Half stats" : periodKeys.some((s) => s.startsWith("Q")) ? "Quarter stats" : "Period stats"}</h1><p className="mt-1 text-sm text-muted">Compare combined scoring, team points, points allowed and winning periods across the league.</p></div><div className="flex flex-wrap items-end gap-3"><LocationSwitch value={location} onChange={setLocation}/><SmallSelect label="Last" value={lastN} onChange={setLastN} options={[5, 10, 15, 100].map((n) => ({ value: n, label: n === 100 ? "Season" : `Last ${n}` }))} /></div></header>
        {query.isPending ? <Loading /> : query.isError ? <ErrorCard error={query.error} retry={() => void query.refetch()} /> : <>
            {periodKeys.length ? <><div className="flex flex-wrap items-end justify-between gap-3"><div className="flex flex-wrap gap-2">{periodKeys.map((key) => <button type="button" key={key} aria-pressed={chosen === key} onClick={() => setPeriod(key)} className={`rounded-lg border px-4 py-2 text-xs font-semibold ${chosen === key ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft"}`}>{displayPeriod(key)}</button>)}</div><SmallSelect label="Combined points line" value={threshold} onChange={setThreshold} options={[39.5, 44.5, 49.5, 54.5, 57.5, 59.5, 64.5, 69.5, 79.5, 89.5, 109.5, 114.5].map((n) => ({ value: n, label: `Over ${n}` }))} /></div>
                <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[750px] text-left text-xs"><thead className="bg-surface-soft text-[11px] uppercase text-muted"><tr>{["#", "Team", "Games", "Combined / game", "Scored", "Allowed", "Period win %", `Over ${threshold}`].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{summaries.map(({ team, stats }, index) => <tr key={team.team_pk} className="border-t border-line-soft"><td className="px-3 py-3 text-muted">{index + 1}</td><td className="px-3 py-3"><Link to="/$sport/$league/teams/$teamId" params={{ sport: "basketball", league: leagueKey, teamId: String(team.team_pk) }} className="flex items-center gap-2 font-semibold hover:text-accent-strong"><MiniInitials name={team.team_name} />{team.team_name}</Link></td><td className="px-3 py-3">{stats.count}</td><td className="px-3 py-3 font-bold text-accent-strong">{numeric(stats.avg)}</td><td className="px-3 py-3">{numeric(stats.scored)}</td><td className="px-3 py-3">{numeric(stats.allowed)}</td><td className="px-3 py-3">{percentage(stats.win)}</td><td className="px-3 py-3"><span className="rounded-full bg-accent-soft px-2 py-1 font-semibold text-accent-strong">{percentage(stats.hit)}</span></td></tr>)}</tbody></table></div>
                <p className="text-xs text-muted">A period is won when the selected team outscores its opponent during that period. For NCAAB in your API, Q1 and Q2 represent the first and second halves. Tied periods are not wins; unavailable period records are excluded from denominators.</p></> : <p className="rounded-xl border border-line p-6 text-sm text-muted">The API response does not contain any recognizable period codes for this league.</p>}
        </>}
    </div>;
}
