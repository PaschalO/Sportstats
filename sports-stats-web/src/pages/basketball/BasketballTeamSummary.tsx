import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
    basketballMatches, fetchBasketballTeamSummary, getBasketballLeague, numeric, overHit, percentage,
    periodNames, periodTotals, type BasketballLocation, type BasketballMatch, type BasketballTeam,
} from "../../services/basketballService";
import { ErrorCard, FormPills, Loading, LocationSwitch, MiniInitials, SmallSelect, StatCard } from "../../component/basketball/BasketballUI";

function quarterStats(matches: BasketballMatch[], period: string) {
    const found = matches.map((match) => periodTotals(match, period)).filter((item): item is NonNullable<typeof item> => item != null);
    return found.length ? {
        average: found.reduce((acc, p) => acc + p.team_points + p.opponent_points, 0) / found.length,
        scored: found.reduce((acc, p) => acc + p.team_points, 0) / found.length,
        winPct: 100 * found.filter((p) => p.team_points > p.opponent_points).length / found.length,
        games: found.length,
    } : null;
}
export default function BasketballTeamSummary({ leagueKey }: { leagueKey: string }) {
    const navigate = useNavigate();
    const league = getBasketballLeague(leagueKey);
    const [location, setLocation] = useState<BasketballLocation>("overall");
    const [lastN, setLastN] = useState(100);
    const [line, setLine] = useState(leagueKey === "nba" ? 229.5 : leagueKey === "ncaab" ? 149.5 : 169.5);
    const [showAll, setShowAll] = useState(false);
    const query = useQuery({
        queryKey: ["basketball", "summary", leagueKey, league?.seasonId, location, lastN],
        queryFn: ({ signal }) => fetchBasketballTeamSummary({ league: league!, location, lastN }, signal),
        enabled: !!league,
        staleTime: 60_000,
        retry: 1,
    });
    const rows = useMemo(() => [...(query.data?.teams ?? [])].sort((a, b) => {
        const x = a[location], y = b[location];
        return y.win_pct - x.win_pct || y.wins - x.wins || (y.points_for_per_game - y.points_against_per_game) - (x.points_for_per_game - x.points_against_per_game) || a.team_name.localeCompare(b.team_name);
    }), [query.data, location]);
    const periods = useMemo(() => periodNames(rows.flatMap((team) => team[location].matches)), [rows, location]);
    const highlights = useMemo(() => {
        const active = rows.filter((team) => team[location].games_played > 0);
        if (!active.length) return null;
        const sorted = (get: (team: BasketballTeam) => number, descending = true) => [...active].sort((a, b) => (descending ? get(b) - get(a) : get(a) - get(b)))[0];
        const best = sorted((team) => team[location].win_pct);
        const offense = sorted((team) => team[location].points_for_per_game);
        const defense = sorted((team) => team[location].points_against_per_game, false);
        const margin = sorted((team) => team[location].points_for_per_game - team[location].points_against_per_game);
        const hit = sorted((team) => overHit(team[location].matches, line).pct ?? -1);
        return { best, offense, defense, margin, hit };
    }, [rows, location, line]);
    if (!league) return <ErrorCard error={`Unknown basketball competition: ${leagueKey}`} />;
    const matches = (team: BasketballTeam) => basketballMatches(team[location].matches);
    const openTeam = (team: BasketballTeam) => void navigate({ to: "/$sport/$league/teams/$teamId", params: { sport: "basketball", league: leagueKey, teamId: String(team.team_pk) } });
    return <div className="w-full min-w-0 space-y-8 pb-12">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent">{league.label} · Season {league.seasonId ?? "not configured"}</p><h1 className="mt-2 text-3xl font-bold text-ink">Team summary</h1><p className="mt-1 text-sm text-muted">Scoring, shooting and period-by-period totals across the selected competition.</p></div>
            <div className="flex flex-wrap items-end gap-3"><LocationSwitch value={location} onChange={setLocation} /><SmallSelect label="Game total" value={line} onChange={setLine} options={[129.5, 149.5, 169.5, 179.5, 199.5, 209.5, 219.5, 229.5, 239.5, 249.5].map((value) => ({ value, label: `Over ${value}` }))} /><SmallSelect label="Last" value={lastN} onChange={setLastN} options={[5, 10, 15, 100].map((value) => ({ value, label: value === 100 ? "All available" : `Last ${value}` }))} /></div>
        </div>
        {query.isPending ? <Loading /> : query.isError ? <ErrorCard error={query.error} retry={() => void query.refetch()} /> : <>
            {highlights && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="League highlights">
                <StatCard label="Best record" value={`${highlights.best[location].wins}–${highlights.best[location].losses}`} detail={highlights.best.team_name} />
                <StatCard label="Best offense" value={numeric(highlights.offense[location].points_for_per_game)} detail={`${highlights.offense.team_name} · pts / game`} />
                <StatCard label="Best defense" value={numeric(highlights.defense[location].points_against_per_game)} detail={`${highlights.defense.team_name} · allowed / game`} />
                <StatCard label="Best net rating" value={`${highlights.margin[location].points_for_per_game - highlights.margin[location].points_against_per_game >= 0 ? "+" : ""}${numeric(highlights.margin[location].points_for_per_game - highlights.margin[location].points_against_per_game)}`} detail={`${highlights.margin.team_name} · pts margin`} />
                <StatCard label={`Top Over ${line}`} value={percentage(overHit(matches(highlights.hit), line).pct)} detail={`${highlights.hit.team_name} · ${overHit(matches(highlights.hit), line).hits} of ${overHit(matches(highlights.hit), line).total}`} accent />
            </section>}
            <section className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">All teams</h2><p className="text-[11px] text-muted">Win % · points per game · Over {line} hit rate</p></div>
                <div className="grid gap-2 md:hidden">{rows.slice(0, showAll ? undefined : 15).map((team, index) => {
                    const stats = team[location]; const rate = overHit(matches(team), line);
                    return <Link key={team.team_pk} to="/$sport/$league/teams/$teamId" params={{ sport: "basketball", league: leagueKey, teamId: String(team.team_pk) }} className="rounded-xl border border-line bg-white p-4 transition-colors hover:bg-surface-soft">
                        <div className="flex items-center gap-3"><span className="w-5 text-xs text-muted">{index + 1}</span><MiniInitials name={team.team_name} /><span className="min-w-0 flex-1 font-semibold">{team.team_name}</span><span className="text-sm font-bold">{percentage(stats.win_pct, 1)}</span></div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]"><div><p className="text-muted">W–L</p><strong>{stats.wins}–{stats.losses}</strong></div><div><p className="text-muted">PTS</p><strong>{numeric(stats.points_for_per_game)}</strong></div><div><p className="text-muted">OPP</p><strong>{numeric(stats.points_against_per_game)}</strong></div><div><p className="text-muted">Over {line}</p><strong>{percentage(rate.pct)}</strong></div></div>
                    </Link>;
                })}</div>
                <div className="hidden overflow-x-auto rounded-xl border border-line md:block"><table className="w-full min-w-[1100px] border-collapse text-left text-[11px] tabular-nums"><thead className="bg-surface-soft text-[10px] font-semibold uppercase tracking-wide text-muted"><tr>{["#", "Team", "GP", "W–L", "Win %", "PTS", "OPP", "Net", "Total", "FG%", "3P%", "REB", "AST", "TOV", `O${line}`, "Last 5"].map((h) => <th key={h} className={`px-2.5 py-3 ${h === "Team" ? "min-w-[188px]" : ""}`}>{h}</th>)}</tr></thead>
                    <tbody>{rows.slice(0, showAll ? undefined : 15).map((team, index) => { const stats = team[location]; const rate = overHit(matches(team), line); const net = stats.points_for_per_game - stats.points_against_per_game; return <tr key={team.team_pk} tabIndex={0} role="link" aria-label={`View ${team.team_name} team statistics`} onClick={() => openTeam(team)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTeam(team); } }} className="cursor-pointer border-t border-line-soft text-ink-soft transition-colors hover:bg-accent-tint focus:bg-accent-tint focus:outline-accent">
                        <td className="px-2.5 py-3 text-muted">{index + 1}</td><td className="px-2.5 py-3"><span className="flex items-center gap-2"><MiniInitials name={team.team_name} /><span className="font-semibold text-ink">{team.team_name}</span></span></td><td className="px-2.5 py-3">{stats.games_played}</td><td className="px-2.5 py-3 font-semibold">{stats.wins}–{stats.losses}</td><td className="px-2.5 py-3 font-semibold">{percentage(stats.win_pct, 1)}</td><td className="px-2.5 py-3">{numeric(stats.points_for_per_game)}</td><td className="px-2.5 py-3">{numeric(stats.points_against_per_game)}</td><td className={`px-2.5 py-3 font-semibold ${net > 0 ? "text-accent-strong" : ""}`}>{net > 0 ? "+" : ""}{numeric(net)}</td><td className="px-2.5 py-3">{numeric(stats.total_points_per_game)}</td><td className="px-2.5 py-3">{numeric(stats.field_goal_pct)}</td><td className="px-2.5 py-3">{numeric(stats.three_point_pct)}</td><td className="px-2.5 py-3">{numeric(stats.total_rebounds_per_game)}</td><td className="px-2.5 py-3">{numeric(stats.assists_per_game)}</td><td className="px-2.5 py-3">{numeric(stats.turnovers_per_game)}</td><td className="px-2.5 py-3"><span className="rounded-full bg-accent-soft px-2 py-1 font-bold text-accent-strong">{percentage(rate.pct)}</span></td><td className="px-2.5 py-3"><FormPills matches={matches(team)} /></td>
                    </tr>; })}</tbody></table></div>
                {rows.length > 15 && <div className="flex items-center justify-between rounded-lg border border-line p-3 text-xs text-muted"><span>Showing {showAll ? rows.length : 15} of {rows.length} teams</span><button type="button" className="rounded-lg border border-accent-soft px-3 py-2 font-semibold text-accent-strong hover:bg-accent-tint" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show fewer" : `Show all ${rows.length} teams`}</button></div>}
                <p className="text-[11px] text-muted">PTS / OPP = scored / allowed per game. Net = average margin. The Over rate is calculated from the matches included in this response. Click a team to open its detail page.</p>
            </section>
            {periods.length > 0 && <section className="space-y-3"><div><h2 className="text-xl font-semibold">{periods.some((p) => p.startsWith("Q")) ? "Quarter by quarter" : "Period by period"}</h2><p className="mt-1 text-xs text-muted">Average combined points per period, with the team's scoring and period win rate.</p></div>
                <div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-surface-soft text-[11px] uppercase text-muted"><tr><th className="px-4 py-3">Team</th>{periods.map((p) => <th className="px-4 py-3 text-center" key={p}>{p}</th>)}<th className="px-4 py-3">Best period</th></tr></thead><tbody>{rows.slice(0, 10).map((team) => {
                    const pStats = periods.map((p) => ({ name: p, value: quarterStats(matches(team), p) })); const best = [...pStats].filter((p) => !!p.value).sort((a, b) => (b.value?.winPct ?? 0) - (a.value?.winPct ?? 0))[0];
                    return <tr key={team.team_pk} className="border-t border-line-soft"><td className="px-4 py-3 font-semibold">{team.team_name}</td>{pStats.map(({ name, value }) => <td key={name} className="px-4 py-3 text-center"><span className="inline-flex min-w-12 justify-center rounded-full bg-accent-soft px-2 py-1 font-bold text-accent-strong">{numeric(value?.average)}</span><p className="mt-1 text-[10px] text-muted">{value ? `${numeric(value.scored)} pts · won ${percentage(value.winPct)}` : "No data"}</p></td>)}<td className="px-4 py-3 text-ink-soft">{best ? `${best.name} · won ${percentage(best.value?.winPct)}` : "—"}</td></tr>;
                })}</tbody></table></div>
            </section>}
        </>}
    </div>;
}
