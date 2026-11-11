import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
    fetchSoccerTeamSummary, fmt, getSoccerLeague, n, percent,
    type SoccerLocation,
    type SoccerLocationSummary, type SoccerTeam,
} from "../../services/soccerService";

const badge = (name: string) => name.split(" ").filter(Boolean).map((s) => s[0]).join("").slice(0, 3).toUpperCase();
const getPoints = (s: SoccerLocationSummary) => n(s.points) ?? s.wins * 3 + s.draws;
const getGoals = (s: SoccerLocationSummary) => n(s.goals) ?? ((n(s.goals_per_game) ?? 0) * s.games_played);
const getAgainst = (s: SoccerLocationSummary) => n(s.goals_against) ?? ((n(s.goals_against_per_game) ?? 0) * s.games_played);
function hitRate(s: SoccerLocationSummary, line: number): number | null {
    if (s.total_goals_over && s.total_goals_over.line === line) return n(s.total_goals_over.percentage);
    const matches = s.matches ?? [];
    const available = matches.filter((m) => n(m.total_goals) !== null || (n(m.team_score) !== null && n(m.opponent_score) !== null));
    if (!available.length) return null;
    const hits = available.filter((m) => ((n(m.total_goals) ?? ((n(m.team_score) ?? 0) + (n(m.opponent_score) ?? 0)))) > line);
    return hits.length / available.length * 100;
}
function bttsRate(s: SoccerLocationSummary): number | null {
    const given = n(s.btts_pct);
    if (given !== null) return given;
    const count = n(s.btts);
    return s.games_played && count !== null ? count / s.games_played * 100 : null;
}
function cleanRate(s: SoccerLocationSummary): number | null {
    const given = n(s.clean_sheets_pct);
    if (given !== null) return given;
    if (n(s.clean_sheets) !== null && s.games_played) return Number(s.clean_sheets) / s.games_played * 100;
    const matches = s.matches ?? [];
    if (matches.length) return matches.filter((m) => m.opponent_score === 0).length / matches.length * 100;
    return null;
}
function pctPill(rate: number | null) {
    if (rate == null) return "bg-surface text-muted";
    if (rate >= 65) return "bg-accent text-white";
    if (rate >= 50) return "bg-accent-soft text-accent-strong";
    return "bg-surface text-ink-soft";
}
function Form({ s }: { s: SoccerLocationSummary }) {
    const recent = (s.matches ?? []).slice().sort((a, b) => b.game_date.localeCompare(a.game_date)).slice(0, 5);
    return <span className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">{recent.map((m, i) => {
        const value = m.result === "W" || m.result === "D" || m.result === "L" ? m.result : n(m.team_score) === n(m.opponent_score) ? "D" : (n(m.team_score) ?? 0) > (n(m.opponent_score) ?? 0) ? "W" : "L";
        return <span title={m.game_date} key={`${m.game_date}-${i}`} className={`grid h-5 w-5 place-items-center rounded-[4px] border text-[9px] font-bold ${value === "W" ? "border-ink bg-ink text-white" : value === "D" ? "border-line-strong bg-surface text-ink-soft" : "border-line-strong bg-white text-muted"}`}>{value}</span>;
    })}</span>;
}
function SelectionButtons({ value, onChange }: { value: SoccerLocation; onChange: (value: SoccerLocation) => void }) {
    return <div className="inline-flex gap-0.5 rounded-lg bg-surface p-1" aria-label="Location filter">
        {(["overall", "home", "away"] as const).map((key) => <button type="button" key={key} aria-pressed={value === key} onClick={() => onChange(key)} className={`rounded-md px-3 py-2 text-xs font-semibold ${value === key ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{key === "overall" ? "All games" : key === "home" ? "Home" : "Away"}</button>)}
    </div>;
}
export default function SoccerTeamSummary({ leagueKey }: { leagueKey: string }) {
    const league = getSoccerLeague(leagueKey);
    const navigate = useNavigate();
    const openTeam = (teamPk: number) =>
        navigate({
            to: "/$sport/$league/teams/$teamId",
            params: { sport: "soccer", league: leagueKey, teamId: String(teamPk) },
        });
    const [location, setLocation] = useState<SoccerLocation>("overall");
    const [lastN, setLastN] = useState(100);
    const [totalLine, setTotalLine] = useState<number | null>(2.5);
    const [teamLine, setTeamLine] = useState<number | null>(null);
    const query = useQuery({
        queryKey: ["soccer", "team-summary", leagueKey, league?.seasonId, location, lastN, totalLine, teamLine],
        queryFn: ({ signal }) => fetchSoccerTeamSummary({ league: league!, location, lastN, totalGoalsOver: totalLine, teamGoalsOver: teamLine }, signal),
        enabled: !!league?.seasonId,
        staleTime: 60_000,
        retry: 1,
    });
    const ranked = useMemo(() => (query.data?.teams ?? []).slice().sort((a, b) => {
        const aa = a[location]; const bb = b[location];
        const diffPoints = getPoints(bb) - getPoints(aa);
        const diffGoals = (getGoals(bb) - getAgainst(bb)) - (getGoals(aa) - getAgainst(aa));
        return diffPoints || diffGoals || (getGoals(bb) - getGoals(aa)) || a.team_name.localeCompare(b.team_name);
    }), [query.data, location]);
    const leaders = useMemo(() => {
        if (!ranked.length) return null;
        const sorted = (key: (t: SoccerTeam) => number | null, ascending = false) => ranked.filter((t) => key(t) !== null).sort((a, b) => (ascending ? 1 : -1) * ((key(a) ?? 0) - (key(b) ?? 0)));
        const mostGoals = sorted((t) => n(t[location].goals_per_game))[0];
        const fewest = sorted((t) => n(t[location].goals_against_per_game), true)[0];
        const mostXg = sorted((t) => n(t[location].xg_per_game))[0];
        const mostBtts = sorted((t) => bttsRate(t[location]))[0];
        return { top: ranked[0], next: ranked[1], mostGoals, fewest, mostXg, mostBtts };
    }, [ranked, location]);
    if (!league) return <p className="p-6 text-muted">Unknown soccer competition: {leagueKey}</p>;
    return (
        <div className="w-full min-w-0 pb-12">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{league.label} · Season {league.seasonId ?? "not set"}</p>
                    <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">Team summary</h1>
                    <p className="mt-2 max-w-xl text-sm text-muted">Results, goals, expected goals and market hit rates for clubs in the selected competition.</p>
                </div>
                <div className="flex min-w-0 flex-wrap items-end gap-3">
                    <SelectionButtons value={location} onChange={setLocation} />
                    <label className="text-[11px] text-muted">Total goals
                        <select value={totalLine ?? "any"} onChange={(e: { target: { value: string } }) => setTotalLine(e.target.value === "any" ? null : Number(e.target.value))} className="mt-1 block rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-ink">
                            <option value="any">Any</option>{[0.5, 1.5, 2.5, 3.5, 4.5].map((x) => <option key={x} value={x}>Over {x}</option>)}
                        </select>
                    </label>
                    <label className="text-[11px] text-muted">Team goals
                        <select value={teamLine ?? "any"} onChange={(e: { target: { value: string } }) => setTeamLine(e.target.value === "any" ? null : Number(e.target.value))} className="mt-1 block rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-ink">
                            <option value="any">Any</option>{[0.5, 1.5, 2.5, 3.5].map((x) => <option key={x} value={x}>Over {x}</option>)}
                        </select>
                    </label>
                    <label className="text-[11px] text-muted">Last
                        <select value={lastN} onChange={(e: { target: { value: string } }) => setLastN(Number(e.target.value))} className="mt-1 block rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-ink">
                            <option value={100}>All games</option><option value={5}>Last 5</option><option value={10}>Last 10</option><option value={15}>Last 15</option>
                        </select>
                    </label>
                </div>
            </div>
            {!league.seasonId && <div className="mt-6 rounded-xl border border-line bg-surface-soft p-4 text-sm text-ink">Set <code>VITE_SOCCER_{leagueKey === "premier-league" ? "EPL" : leagueKey.replace(/-/g, "_").toUpperCase()}_SEASON_ID</code> to your internal competition-season ID in <code>.env</code>, then restart Vite.</div>}
            {query.isError && <div role="alert" className="mt-5 rounded-xl border border-line bg-surface-soft p-4 text-sm text-danger">Could not load soccer teams: {query.error.message} <button type="button" onClick={() => void query.refetch()} className="ml-2 underline">Retry</button></div>}
            {query.isFetching && <p role="status" className="mt-4 text-xs text-muted">Updating soccer statistics…</p>}
            {leaders && (
                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {([
                        { label: "Top of the table", value: String(getPoints(leaders.top[location])), detail: leaders.top.team_name, sub: leaders.next ? `${getPoints(leaders.top[location]) - getPoints(leaders.next[location])} pts clear of ${leaders.next.team_name}` : "Points · 3 for a win", dark: true },
                        { label: "Best attack", value: leaders.mostGoals ? fmt(leaders.mostGoals[location].goals_per_game) : "—", detail: leaders.mostGoals?.team_name ?? "No data", sub: "Goals / game" },
                        { label: "Best defence", value: leaders.fewest ? fmt(leaders.fewest[location].goals_against_per_game) : "—", detail: leaders.fewest?.team_name ?? "No data", sub: "Conceded / game" },
                        { label: "Highest xG", value: leaders.mostXg ? fmt(leaders.mostXg[location].xg_per_game) : "—", detail: leaders.mostXg?.team_name ?? "No data", sub: "Expected goals / game" },
                        { label: "Most BTTS", value: leaders.mostBtts ? percent(bttsRate(leaders.mostBtts[location])) : "—", detail: leaders.mostBtts?.team_name ?? "No data", sub: "Both teams scored", accent: true },
                    ] as Array<{label:string;value:string;detail:string;sub:string;dark?:boolean;accent?:boolean}>).map((card) => <article key={card.label} className={`min-w-0 rounded-xl border p-4 sm:p-5 ${card.dark ? "border-ink bg-ink text-white" : card.accent ? "border-accent-soft bg-accent-tint" : "border-line bg-white"}`}>
                        <p className={`text-[11px] font-semibold ${card.dark ? "text-white/75" : card.accent ? "text-accent-strong" : "text-muted"}`}>{card.label}</p>
                        <p className={`mt-2 text-3xl font-bold tabular-nums ${card.accent ? "text-accent-strong" : ""}`}>{card.value}</p>
                        <p className="mt-1 truncate text-xs font-medium">{card.detail}</p><p className={`mt-2 text-[11px] ${card.dark ? "text-white/70" : "text-muted"}`}>{card.sub}</p>
                    </article>)}
                </div>
            )}
            <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-ink">League table</h2>
                <p className="text-[11px] text-muted">Rank by points, goal difference and goals scored · All numbers respect your filters</p>
            </div>
            {/* Phones: accessible, readable club cards instead of shrinking a large table. */}
            <div className="grid gap-3 md:hidden">
                {ranked.map((team, index) => { const s = team[location]; return <Link
                    key={team.team_pk}
                    to="/$sport/$league/teams/$teamId"
                    params={{ sport: "soccer", league: leagueKey, teamId: String(team.team_pk) }}
                    aria-label={`View ${team.team_name} team statistics`}
                    className="block rounded-xl border border-line bg-white p-4 transition-colors hover:border-accent hover:bg-surface-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                    <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-ink-soft">{badge(team.team_name)}</span><div className="min-w-0 flex-1"><span className="font-semibold text-ink">#{index + 1} {team.team_name}</span><p className="text-xs text-muted">{s.games_played} GP · {s.wins} W · {s.draws} D · {s.losses} L</p></div><strong className="text-2xl text-ink">{getPoints(s)} <span className="text-[10px] font-normal text-muted">PTS</span></strong></div>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-soft p-3 text-center text-xs"><div><p className="text-muted">GF / G</p><b>{fmt(s.goals_per_game)}</b></div><div><p className="text-muted">GA / G</p><b>{fmt(s.goals_against_per_game)}</b></div><div><p className="text-muted">xG / G</p><b>{fmt(s.xg_per_game)}</b></div><div><p className="text-muted">BTTS</p><b>{percent(bttsRate(s))}</b></div><div><p className="text-muted">Over {totalLine ?? 2.5}</p><b>{percent(hitRate(s, totalLine ?? 2.5))}</b></div><div><p className="text-muted">SOT / G</p><b>{fmt(s.shots_on_target_per_game, 1)}</b></div></div>
                </Link>; })}
            </div>
            {/* Mobile: team cards. Tablets scroll inside the table only. Desktop: the full-width table uses balanced columns without page scrolling. */}
            <div className="hidden w-full overflow-hidden rounded-xl border border-line md:block">
                <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-[12px] tabular-nums xl:table-fixed xl:min-w-0 xl:text-[11px] 2xl:text-[12px]">
                        <thead className="bg-surface-soft text-left text-[10px] uppercase tracking-wide text-muted"><tr>
                            <th className="px-2 py-4 xl:w-[2.5%]">#</th><th className="px-3 py-4 xl:w-[18%]">Club</th><th className="px-1 py-4 text-center xl:w-[3.5%]">GP</th><th className="px-1 py-4 text-center xl:w-[3.5%]">W</th><th className="px-1 py-4 text-center xl:w-[3.5%]">D</th><th className="px-1 py-4 text-center xl:w-[3.5%]">L</th><th className="px-1 py-4 text-center xl:w-[4%]">GD</th><th className="px-1 py-4 text-center xl:w-[4%]">PTS</th>
                            <th className="hidden px-1 py-4 text-center xl:table-cell xl:w-[5%]">GF/G</th><th className="hidden px-1 py-4 text-center xl:table-cell xl:w-[5%]">GA/G</th><th className="hidden px-1 py-4 text-center lg:table-cell xl:w-[10%]">xG / xGA</th><th className="hidden px-1 py-4 text-center lg:table-cell xl:w-[5%]">SOT/G</th><th className="px-1 py-4 text-center xl:w-[6%]">BTTS</th><th className="px-1 py-4 text-center xl:w-[6%]">O{totalLine ?? 2.5}</th><th className="hidden px-1 py-4 text-center xl:table-cell xl:w-[7%]">Clean sheet</th><th className="px-1 py-4 text-center xl:w-[12.5%]">Form</th>
                        </tr></thead>
                        <tbody>{ranked.map((team, index) => { const s = team[location]; const gf = getGoals(s); const ga = getAgainst(s); return <tr
                            key={team.team_pk}
                            role="link"
                            tabIndex={0}
                            aria-label={`View ${team.team_name} team statistics`}
                            title={`View ${team.team_name} team statistics`}
                            onClick={(event) => {
                                if (!(event.target as HTMLElement).closest("a")) void openTeam(team.team_pk);
                            }}
                            onKeyDown={(event) => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    void openTeam(team.team_pk);
                                }
                            }}
                            className="group cursor-pointer border-t border-line-soft text-ink-soft transition-colors hover:bg-surface-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                        >
                            <td className="px-2 py-3">{index + 1}</td><td className="min-w-44 px-3 py-3.5 xl:min-w-0"><Link to="/$sport/$league/teams/$teamId" params={{ sport: "soccer", league: leagueKey, teamId: String(team.team_pk) }} className="flex min-w-0 items-center gap-2 text-ink hover:text-accent-strong group-hover:text-accent-strong focus-visible:underline"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-[10px] font-semibold">{badge(team.team_name)}</span><span className="min-w-0 truncate font-semibold" title={team.team_name}>{team.team_name}</span></Link></td>
                            <td className="px-1 py-3.5 text-center">{s.games_played}</td><td className="px-1 py-3.5 text-center">{s.wins}</td><td className="px-1 py-3.5 text-center">{s.draws}</td><td className="px-1 py-3.5 text-center">{s.losses}</td><td className="px-1 py-3.5 text-center">{gf >= ga ? "+" : ""}{Math.round(gf - ga)}</td><td className="px-1 py-3.5 text-center font-bold text-ink">{getPoints(s)}</td>
                            <td className="hidden px-1 py-3.5 text-center xl:table-cell">{fmt(s.goals_per_game)}</td><td className="hidden px-1 py-3.5 text-center xl:table-cell">{fmt(s.goals_against_per_game)}</td><td className="hidden px-1 py-3.5 text-center lg:table-cell">{fmt(s.xg_per_game)} / {fmt(s.xg_against_per_game)}</td><td className="hidden px-1 py-3.5 text-center lg:table-cell">{fmt(s.shots_on_target_per_game, 1)}</td>
                            <td className="px-1 py-3.5 text-center"><span className={`inline-flex rounded-full px-2 py-1 font-semibold ${pctPill(bttsRate(s))}`}>{percent(bttsRate(s))}</span></td><td className="px-1 py-3.5 text-center"><span className={`inline-flex rounded-full px-2 py-1 font-semibold ${pctPill(hitRate(s, totalLine ?? 2.5))}`}>{percent(hitRate(s, totalLine ?? 2.5))}</span></td><td className="hidden px-1 py-3.5 text-center xl:table-cell">{percent(cleanRate(s))}</td><td className="px-1 py-3.5 text-center"><Form s={s} /></td>
                        </tr>; })}</tbody>
                    </table>
                </div>
            </div>
            {query.data && !ranked.length && <p className="mt-5 text-sm text-muted">No teams returned for these filters.</p>}
            <p className="mt-4 text-[11px] text-muted">Points = 3 × wins + draws unless returned by your API. xG/xGA, clean sheets and form show — when the response does not supply those values. Missing metrics are never treated as zero.</p>
        </div>
    );
}
