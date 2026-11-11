import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
    basketballMatches,
    fetchBasketballTeamSummary,
    getBasketballLeague,
    numeric,
    percentage,
    type BasketballLocation,
    type BasketballTeam,
} from "../../services/basketballService";
import {
    ErrorCard,
    FormPills,
    Loading,
    LocationSwitch,
    MiniInitials,
} from "../../component/basketball/BasketballUI";

type SortOption = "win" | "points" | "allowed" | "name";

/** Basketball team picker shared by NBA, NCAAB, WNBA and NBL. */
export default function BasketballTeamStatsIndex({ leagueKey }: { leagueKey: string }) {
    const league = getBasketballLeague(leagueKey);
    const [search, setSearch] = useState("");
    const [location, setLocation] = useState<BasketballLocation>("overall");
    const [sortBy, setSortBy] = useState<SortOption>("win");

    const query = useQuery({
        queryKey: ["basketball", "summary", leagueKey, league?.seasonId, "overall", 100],
        queryFn: ({ signal }) => fetchBasketballTeamSummary({ league: league!, location: "overall", lastN: 100 }, signal),
        enabled: league != null && league.seasonId != null,
        staleTime: 60_000,
        retry: 1,
    });

    const teams = useMemo(() => {
        const list = (query.data?.teams ?? []).filter((team) =>
            team.team_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
        );
        const split = (team: BasketballTeam) => team[location];
        return [...list].sort((a, b) => {
            if (sortBy === "name") return a.team_name.localeCompare(b.team_name);
            if (sortBy === "allowed") {
                return split(a).points_against_per_game - split(b).points_against_per_game || a.team_name.localeCompare(b.team_name);
            }
            if (sortBy === "points") {
                return split(b).points_for_per_game - split(a).points_for_per_game || a.team_name.localeCompare(b.team_name);
            }
            return split(b).win_pct - split(a).win_pct || a.team_name.localeCompare(b.team_name);
        });
    }, [query.data?.teams, search, location, sortBy]);

    if (!league) return <ErrorCard error={`Unsupported basketball competition: ${leagueKey}`} />;
    if (league.seasonId == null) {
        return <ErrorCard error={`Set VITE_BASKETBALL_${league.key.toUpperCase()}_SEASON_ID in your .env to load ${league.label} teams.`} />;
    }

    return (
        <div className="w-full min-w-0 space-y-6 pb-12">
            <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <p className="eyebrow">{league.label} · SEASON {league.seasonId}</p>
                    <h1 className="mt-2 text-3xl font-bold text-ink">Team stats</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted">
                        Select a team to explore its game-by-game scoring, quarters or halves, home and away splits, and match history.
                    </p>
                </div>
                <LocationSwitch value={location} onChange={setLocation} />
            </header>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted sm:max-w-md">
                    Search teams
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={`Search ${league.label} teams`}
                        className="w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                    Sort by
                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value as SortOption)}
                        className="rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm font-semibold text-ink"
                    >
                        <option value="win">Highest win %</option>
                        <option value="points">Most points / game</option>
                        <option value="allowed">Fewest points allowed / game</option>
                        <option value="name">Team name</option>
                    </select>
                </label>
            </div>

            {query.isPending ? <Loading /> : query.isError ? (
                <ErrorCard error={query.error} retry={() => void query.refetch()} />
            ) : (
                <>
                    <p className="text-xs text-muted">
                        Showing {teams.length} of {query.data?.teams.length ?? 0} teams · {location === "overall" ? "All games" : location === "home" ? "Home games" : "Away games"}
                    </p>
                    {teams.length === 0 ? (
                        <div className="rounded-xl border border-line bg-white px-4 py-10 text-center text-sm text-muted">
                            No teams match your search.
                        </div>
                    ) : (
                        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {teams.map((team) => {
                                const stats = team[location];
                                const recent = basketballMatches(stats.matches ?? []).slice(0, 5);
                                return (
                                    <Link
                                        key={team.team_pk}
                                        to="/$sport/$league/teams/$teamId"
                                        params={{ sport: "basketball", league: leagueKey, teamId: String(team.team_pk) }}
                                        aria-label={`Open ${team.team_name} team statistics`}
                                        className="group block min-w-0 rounded-xl border border-line bg-white p-4 transition-colors hover:border-accent hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MiniInitials name={team.team_name} />
                                            <div className="min-w-0 flex-1">
                                                <h2 className="truncate text-sm font-semibold text-ink group-hover:text-accent-strong">{team.team_name}</h2>
                                                <p className="mt-1 text-[11px] text-muted">{stats.wins}–{stats.losses} · {stats.games_played} games</p>
                                            </div>
                                            <span aria-hidden="true" className="text-accent-strong">→</span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface-soft p-3">
                                            <div><p className="text-[10px] text-muted">Win %</p><p className="mt-1 text-base font-bold tabular-nums text-ink">{percentage(stats.win_pct)}</p></div>
                                            <div><p className="text-[10px] text-muted">PTS / game</p><p className="mt-1 text-base font-bold tabular-nums text-ink">{numeric(stats.points_for_per_game)}</p></div>
                                            <div><p className="text-[10px] text-muted">OPP / game</p><p className="mt-1 text-base font-bold tabular-nums text-ink">{numeric(stats.points_against_per_game)}</p></div>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line-soft pt-3">
                                            <span className="text-[11px] text-muted">Last {recent.length} games</span>
                                            <FormPills matches={recent} />
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
