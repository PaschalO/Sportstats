import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { basketballMatches, fetchBasketballTeamSummary, getBasketballLeague, numeric, periodNames, periodTotals, percentage, type BasketballLocation, type BasketballMatch } from "../../services/basketballService";
import BasketballGameByGame from "../../component/basketball/BasketballGameByGame";
import BasketballHalfComparison from "../../component/basketball/BasketballHalfComparison";
import BasketballQuarterComparison from "../../component/basketball/BasketballQuarterComparison";
import { ErrorCard, Loading, LocationSwitch, MiniInitials } from "../../component/basketball/BasketballUI";

function MatchLog({ matches }: { matches: BasketballMatch[] }) {
    const [shown, setShown] = useState(10);
    const names = periodNames(matches);
    const records = matches.slice(0, shown);
    return <section className="space-y-3"><h2 className="text-xl font-semibold">Match log</h2><div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-surface-soft text-[10px] uppercase text-muted"><tr>{["Date", "Opponent", "Result", ...names, "Margin", "Total"].map((name) => <th key={name} className="px-3 py-3">{name}</th>)}</tr></thead><tbody>{records.map((match) => <tr key={match.game_pk} className="border-t border-line-soft"><td className="px-3 py-3 text-muted">{match.game_date}</td><td className="px-3 py-3 font-semibold">{match.location === "home" ? "vs" : "@"} {match.opponent_name}</td><td className="px-3 py-3"><span className={`mr-2 inline-block rounded px-1.5 py-1 text-[10px] font-bold ${match.result === "W" ? "bg-ink text-white" : "bg-surface text-ink-soft"}`}>{match.result}</span>{match.score_line}</td>{names.map((name) => { const p = periodTotals(match, name); return <td className="px-3 py-3" key={name}><span className="rounded bg-accent-tint px-2 py-1">{p ? `${p.team_points}–${p.opponent_points}` : "—"}</span></td>; })}<td className={`px-3 py-3 font-semibold ${match.team_score > match.opponent_score ? "text-accent-strong" : ""}`}>{match.team_score > match.opponent_score ? "+" : ""}{match.team_score - match.opponent_score}</td><td className="px-3 py-3 font-semibold">{match.total_points}</td></tr>)}</tbody></table></div>{shown < matches.length && <button type="button" className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-accent-strong" onClick={() => setShown((n) => n + 10)}>Show more matches ({Math.min(shown, matches.length)} of {matches.length})</button>}</section>;
}
export default function BasketballTeamDetail({ leagueKey, teamId }: { leagueKey: string; teamId: string }) {
    const league = getBasketballLeague(leagueKey);
    const [location, setLocation] = useState<BasketballLocation>("overall");
    const query = useQuery({ queryKey: ["basketball", "summary", leagueKey, league?.seasonId, "overall", 100], queryFn: ({ signal }) => fetchBasketballTeamSummary({ league: league!, location: "overall", lastN: 100 }, signal), enabled: !!league, staleTime: 60_000, retry: 1 });
    const team = query.data?.teams.find((row) => String(row.team_pk) === String(teamId));
    const stats = team?.[location];
    const matches = useMemo(() => basketballMatches(stats?.matches ?? []), [stats]);
    if (!league) return <ErrorCard error={`Unknown basketball competition: ${leagueKey}`} />;
    if (query.isPending) return <Loading />;
    if (query.isError) return <ErrorCard error={query.error} retry={() => void query.refetch()} />;
    if (!team || !stats) return <ErrorCard error={`Team ID ${teamId} was not found in ${league.label} season ${league.seasonId}.`} />;
    const net = stats.points_for_per_game - stats.points_against_per_game;
    return <div className="w-full min-w-0 space-y-8 pb-12">
        <nav className="text-xs text-muted"><Link to="/$sport/$league/$section" params={{ sport: "basketball", league: leagueKey, section: "team-summary" }} className="font-semibold text-accent-strong hover:underline">{league.label} / Team summary</Link> <span className="mx-2">/</span> {team.team_name}</nav>
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><MiniInitials name={team.team_name} /><div><h1 className="text-3xl font-bold">{team.team_name}</h1><p className="text-xs text-muted">{stats.wins}–{stats.losses} record · {percentage(stats.win_pct, 1)} wins · {stats.games_played} games · {league.label}</p></div></div><LocationSwitch value={location} onChange={setLocation} /></div>
        <section className="grid overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{[
            ["Points / game", numeric(stats.points_for_per_game), `${numeric(stats.points_against_per_game)} allowed`],
            ["Net margin", `${net >= 0 ? "+" : ""}${numeric(net)}`, "per game"],
            ["Total points / game", numeric(stats.total_points_per_game), "both teams combined"],
            ["Shooting", percentage(stats.field_goal_pct, 1), `FG · ${percentage(stats.three_point_pct, 1)} from three`],
            ["Assists", numeric(stats.assists_per_game), `${numeric(stats.turnovers_per_game)} turnovers`],
            ["Avg biggest lead", numeric(stats.biggest_lead_average), "points"],
        ].map(([label, value, detail], index) => <article key={label} className={`min-w-0 border-b border-line-soft p-4 sm:border-r ${index === 2 ? "bg-accent-tint" : ""}`}><p className="text-[10px] text-muted">{label}</p><p className={`mt-1 text-2xl font-bold tabular-nums ${index === 2 ? "text-accent-strong" : ""}`}>{value}</p><p className="mt-1 text-[10px] text-muted">{detail}</p></article>)}</section>
        <BasketballGameByGame key={`${leagueKey}-${teamId}-${location}`} matches={matches} teamName={team.team_name} leagueKey={leagueKey} />
        <BasketballHalfComparison key={`${leagueKey}-${teamId}-${location}`} matches={matches} leagueKey={leagueKey} teamName={team.team_name} />
        <BasketballQuarterComparison key={`${leagueKey}-${teamId}-${location}`} matches={matches} leagueKey={leagueKey} teamName={team.team_name} />
        <section className="space-y-3"><h2 className="text-xl font-semibold">Home vs away</h2><div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-surface-soft text-[10px] uppercase text-muted"><tr>{["Split", "GP", "W–L", "PTS", "OPP", "Total", "FG%", "3PM / 3P%", "AST", "TOV"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{(["home", "away"] as const).map((loc) => { const s = team[loc]; return <tr key={loc} className="border-t border-line-soft"><td className="px-3 py-3 font-semibold capitalize">{loc}</td><td className="px-3 py-3">{s.games_played}</td><td className="px-3 py-3">{s.wins}–{s.losses}</td><td className="px-3 py-3">{numeric(s.points_for_per_game)}</td><td className="px-3 py-3">{numeric(s.points_against_per_game)}</td><td className="px-3 py-3 font-semibold text-accent-strong">{numeric(s.total_points_per_game)}</td><td className="px-3 py-3">{percentage(s.field_goal_pct, 1)}</td><td className="px-3 py-3">{numeric(s.three_points_made_per_game)} / {percentage(s.three_point_pct, 1)}</td><td className="px-3 py-3">{numeric(s.assists_per_game)}</td><td className="px-3 py-3">{numeric(s.turnovers_per_game)}</td></tr>; })}</tbody></table></div></section>
        <MatchLog key={location} matches={matches} />
    </div>;
}
