import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
    fetchSoccerTeamSummary,
    getSoccerLeague,
    type SoccerTeam,
} from "../../services/soccerService";

type TeamRow = {
    team: SoccerTeam;
    points: number;
    goalDifference: number;
};

function abbreviation(name: string) {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 1) return name.slice(0, 3).toUpperCase();
    return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}

function formatNumber(value: number | null | undefined, digits = 1) {
    return typeof value === "number" && Number.isFinite(value)
        ? value.toFixed(digits)
        : "—";
}

export default function SoccerTeamStatsIndex({ leagueKey }: { leagueKey: string }) {
    const league = getSoccerLeague(leagueKey);
    const [search, setSearch] = useState("");

    const query = useQuery({
        queryKey: ["soccer", "team-stats-index", leagueKey, league?.seasonId],
        queryFn: ({ signal }) =>
            fetchSoccerTeamSummary(
                { league: league!, location: "overall", lastN: 100 },
                signal,
            ),
        enabled: Boolean(league?.seasonId),
        staleTime: 60_000,
        retry: 1,
    });

    const teams = useMemo<TeamRow[]>(() => {
        const values = (query.data?.teams ?? []).map((team) => {
            const s = team.overall;
            return {
                team,
                points: s.wins * 3 + s.draws,
                goalDifference: (s.goals ?? 0) - (s.goals_against ?? 0),
            };
        });

        values.sort(
            (a, b) =>
                b.points - a.points ||
                b.goalDifference - a.goalDifference ||
                (b.team.overall.goals ?? 0) - (a.team.overall.goals ?? 0) ||
                a.team.team_name.localeCompare(b.team.team_name),
        );

        return values.filter(({ team }) =>
            team.team_name.toLowerCase().includes(search.trim().toLowerCase()),
        );
    }, [query.data, search]);

    if (!league) {
        return <p className="py-6 text-sm text-muted">This soccer competition is not configured.</p>;
    }

    return (
        <div className="w-full min-w-0 pb-16">
            <header className="flex flex-col justify-between gap-5 pt-6 sm:flex-row sm:items-end">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
                        {league.label} · Season {league.seasonId ?? "not configured"}
                    </p>
                    <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">Team stats</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted">
                        Select a club to see goals, expected goals, shots, corners, cards,
                        and game-by-game charts.
                    </p>
                </div>
                <label className="block w-full shrink-0 text-xs font-semibold text-muted sm:w-64">
                    Find a club
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search teams..."
                        className="mt-1 block w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-accent"
                    />
                </label>
            </header>

            {!league.seasonId && (
                <p className="mt-6 rounded-xl border border-line bg-white p-4 text-sm text-muted">
                    Add the competition season ID for {league.label} in your Vite .env configuration.
                </p>
            )}
            {query.isPending && Boolean(league.seasonId) && (
                <p role="status" className="mt-8 text-sm text-muted">Loading clubs…</p>
            )}
            {query.isError && (
                <div role="alert" className="mt-6 rounded-xl border border-line p-4 text-sm text-danger">
                    Could not load teams: {query.error.message}
                    <button type="button" className="ml-3 font-semibold underline" onClick={() => void query.refetch()}>
                        Retry
                    </button>
                </div>
            )}

            {query.data && (
                <>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span>Showing {teams.length} of {query.data.teams.length} clubs</span>
                        <span>Sorted by points, goal difference and goals scored</span>
                    </div>

                    {teams.length === 0 ? (
                        <p role="status" className="mt-5 rounded-xl border border-line bg-white p-6 text-sm text-muted">
                            No clubs match “{search}”.
                        </p>
                    ) : (
                        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {teams.map(({ team, points }) => {
                                const s = team.overall;
                                return (
                                    <Link
                                        key={team.team_pk}
                                        to="/$sport/$league/teams/$teamId"
                                        params={{ sport: "soccer", league: leagueKey, teamId: String(team.team_pk) }}
                                        className="group min-w-0 rounded-xl border border-line bg-white p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-5"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-ink">
                                                {abbreviation(team.team_name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h2 className="truncate text-sm font-bold text-ink group-hover:text-accent-strong sm:text-base" title={team.team_name}>
                                                    {team.team_name}
                                                </h2>
                                                <p className="mt-1 text-xs text-muted">
                                                    {s.games_played} GP · {s.wins}W {s.draws}D {s.losses}L · {points} pts
                                                </p>
                                            </div>
                                            <span aria-hidden="true" className="shrink-0 text-accent-strong">→</span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-3 text-center">
                                            <div>
                                                <p className="text-[10px] text-muted">Goals / game</p>
                                                <p className="mt-1 text-sm font-bold tabular-nums text-ink">
                                                    {formatNumber(s.goals_per_game, 2)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted">xG / game</p>
                                                <p className="mt-1 text-sm font-bold tabular-nums text-ink">
                                                    {formatNumber(s.xg_per_game, 2)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted">Shots / game</p>
                                                <p className="mt-1 text-sm font-bold tabular-nums text-ink">
                                                    {formatNumber(s.shots_per_game)}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
