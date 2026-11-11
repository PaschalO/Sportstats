import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StatsTable, { type StatsColumn } from "../../component/shared/StatsTable";
import {
    FootballBadge,
    FootballError,
    FootballForm,
    FootballLineSelect,
    FootballLoading,
    FootballLocationSwitch,
    FootballPanel,
    FootballRatePill,
    FootballStatCard,
} from "../../component/american-football/FootballUI";
import {
    betSummary,
    fetchFootballSummary,
    footballNumber,
    footballPercent,
    getFootballLeague,
    INITIAL_LINES,
    orderedMatches,
    quarterSummary,
    teamConference,
    type FootballLines,
    type FootballLocation,
    type FootballTeam,
} from "../../services/americanFootballService";

const EMPTY_TEAMS: FootballTeam[] = [];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

const ranges = (start: number, end: number, step = 1): number[] =>
    Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, i) =>
        Number((start + i * step).toFixed(1)),
    );

const record = (team: FootballTeam, location: FootballLocation): string => {
    const stats = team[location];
    return `${stats.wins}–${stats.losses}${stats.ties ? `–${stats.ties}` : ""}`;
};

const hitRate = (
    team: FootballTeam,
    location: FootballLocation,
    kind: keyof FootballLines,
    line: number,
): number | null => betSummary(team[location].matches, kind, line).pct;

function leader(
    teams: FootballTeam[],
    key: "win_pct" | "points_for_per_game" | "points_against_per_game" | "total_points_per_game",
    location: FootballLocation,
    highest = true,
): FootballTeam | undefined {
    return [...teams].sort((a, b) =>
        highest ? b[location][key] - a[location][key] : a[location][key] - b[location][key],
    )[0];
}

function QuarterOverview({
                             teams,
                             location,
                             lastN,
                         }: {
    teams: FootballTeam[];
    location: FootballLocation;
    lastN: number;
}) {
    const [line, setLine] = useState(14.5);
    const subset = teams.slice(0, 10);

    return (
        <FootballPanel
            title="Quarter by quarter"
            description="Period totals and hit rates (Q1–Q4 only; overtime excluded)."
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted">Change the quarter total line to compare results.</span>
                <FootballLineSelect
                    label="Quarter total"
                    value={line}
                    onChange={setLine}
                    options={ranges(4.5, 30.5)}
                />
            </div>
            <div className="overflow-x-auto rounded-xl border border-line bg-white">
                <table className="w-full min-w-[690px] text-left text-xs">
                    <thead className="bg-surface-soft">
                    <tr>
                        <th className="px-4 py-3 text-[10px] font-semibold text-muted">TEAM</th>
                        {QUARTERS.map((quarter) => (
                            <th key={quarter} className="px-3 py-3 text-center text-[10px] font-semibold text-muted">
                                {quarter}
                            </th>
                        ))}
                        <th className="px-3 py-3 text-center text-[10px] font-semibold text-muted">BEST QUARTER</th>
                    </tr>
                    </thead>
                    <tbody>
                    {subset.map((team) => {
                        const matches = orderedMatches(team[location].matches).slice(0, lastN);
                        const summaries = QUARTERS.map((quarter) => quarterSummary(matches, quarter, line));
                        const bestIndex = summaries.reduce((best, current, index) => {
                            const currentRate = current.n ? current.wins / current.n : -1;
                            const bestRate = summaries[best].n ? summaries[best].wins / summaries[best].n : -1;
                            return currentRate > bestRate ? index : best;
                        }, 0);
                        const best = summaries[bestIndex];

                        return (
                            <tr key={team.team_pk} className="border-t border-line-soft">
                                <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-ink">
                                    {team.team_name}
                                </td>
                                {summaries.map((summary, index) => (
                                    <td key={QUARTERS[index]} className="px-3 py-2 text-center">
                                        <FootballRatePill rate={summary.n ? (summary.over / summary.n) * 100 : null} />
                                        <p className="mt-1 whitespace-nowrap text-[10px] text-muted">
                                            {footballNumber(summary.scored)} pts · won {summary.n ? Math.round((summary.wins / summary.n) * 100) : 0}%
                                        </p>
                                    </td>
                                ))}
                                <td className="px-3 py-2 text-center text-[11px] text-muted">
                                    {best.n ? `${QUARTERS[bestIndex]} · won ${Math.round((best.wins / best.n) * 100)}%` : "—"}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                <p className="border-t border-line-soft px-3 py-2 text-[11px] text-muted">
                    Showing up to 10 teams · four regulation quarters only
                </p>
            </div>
        </FootballPanel>
    );
}

export default function FootballTeamSummary({ leagueKey }: { leagueKey: string }) {
    const league = getFootballLeague(leagueKey);
    const [location, setLocation] = useState<FootballLocation>("overall");
    const [lastN, setLastN] = useState(10);
    const [lines, setLines] = useState<FootballLines>(INITIAL_LINES);
    const [conference, setConference] = useState("All");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("winPct");
    const [desc, setDesc] = useState(true);
    const [showAll, setShowAll] = useState(false);

    const query = useQuery({
        queryKey: ["football", "summary", leagueKey, league?.seasonId, location, lastN, lines],
        queryFn: ({ signal }) => fetchFootballSummary({ league: league!, location, lastN, lines }, signal),
        enabled: !!league?.seasonId,
        staleTime: 60_000,
        retry: 1,
    });

    const teams = query.data?.teams ?? EMPTY_TEAMS;
    const conferences = useMemo(
        () => [...new Set(teams.map((team) => teamConference(team, leagueKey)).filter((x): x is string => !!x))].sort(),
        [teams, leagueKey],
    );
    const filtered = useMemo(
        () => teams.filter((team) =>
            team.team_name.toLowerCase().includes(search.toLowerCase()) &&
            (conference === "All" || teamConference(team, leagueKey) === conference),
        ),
        [teams, search, conference, leagueKey],
    );

    const sorted = useMemo(() => {
        const metric = (team: FootballTeam): number => {
            const stats = team[location];
            switch (sort) {
                case "pf": return stats.points_for_per_game;
                case "pa": return stats.points_against_per_game;
                case "total": return stats.total_points_per_game;
                case "passing": return stats.passing_yards_per_game;
                case "rushing": return stats.rushing_yards_per_game;
                case "gameTotal": return hitRate(team, location, "gameTotal", lines.gameTotal) ?? -1;
                case "winPct":
                default: return stats.win_pct;
            }
        };
        return [...filtered].sort((a, b) =>
            (metric(a) - metric(b)) * (desc ? -1 : 1) || a.team_name.localeCompare(b.team_name),
        );
    }, [filtered, location, sort, desc, lines]);

    const columns = useMemo<StatsColumn<FootballTeam>[]>(() => [
        { key: "gp", label: "GP", render: (t) => t[location].games_played, priority: "main" },
        { key: "record", label: "W–L", render: (t) => record(t, location), priority: "main" },
        { key: "winPct", label: "WIN %", render: (t) => <strong>{footballPercent(t[location].win_pct, 1)}</strong>, sortValue: (t) => t[location].win_pct, priority: "main" },
        { key: "pf", label: "PF", render: (t) => footballNumber(t[location].points_for_per_game), sortValue: (t) => t[location].points_for_per_game, priority: "main" },
        { key: "pa", label: "PA", render: (t) => footballNumber(t[location].points_against_per_game), sortValue: (t) => t[location].points_against_per_game, priority: "medium" },
        { key: "net", label: "NET", render: (t) => {
                const net = t[location].points_for_per_game - t[location].points_against_per_game;
                return <span className={net > 0 ? "font-semibold text-accent-strong" : ""}>{net > 0 ? "+" : ""}{footballNumber(net)}</span>;
            }, priority: "main" },
        { key: "total", label: "TOTAL", render: (t) => footballNumber(t[location].total_points_per_game), sortValue: (t) => t[location].total_points_per_game, priority: "main" },
        { key: "passing", label: "PASS YDS", render: (t) => footballNumber(t[location].passing_yards_per_game), sortValue: (t) => t[location].passing_yards_per_game, priority: "all" },
        { key: "rushing", label: "RUSH YDS", render: (t) => footballNumber(t[location].rushing_yards_per_game), sortValue: (t) => t[location].rushing_yards_per_game, priority: "all" },
        { key: "turnovers", label: "TO", render: (t) => footballNumber(t[location].turnovers_per_game, 2), priority: "all" },
        { key: "gameTotal", label: `O${lines.gameTotal}`, render: (t) => <FootballRatePill rate={hitRate(t, location, "gameTotal", lines.gameTotal)} />, sortValue: (t) => hitRate(t, location, "gameTotal", lines.gameTotal) ?? -1, priority: "main" },
        { key: "teamTotal", label: `TT O${lines.teamTotal}`, render: (t) => <FootballRatePill rate={hitRate(t, location, "teamTotal", lines.teamTotal)} />, priority: "medium" },
        { key: "teamSpread", label: `COVER ${lines.teamSpread}`, render: (t) => <FootballRatePill rate={hitRate(t, location, "teamSpread", lines.teamSpread)} />, priority: "medium" },
        { key: "oppSpread", label: `OPP ${lines.opponentSpread > 0 ? "+" : ""}${lines.opponentSpread}`, render: (t) => <FootballRatePill rate={hitRate(t, location, "opponentSpread", lines.opponentSpread)} />, priority: "medium" },
        { key: "form", label: "LAST 5", render: (t) => <FootballForm results={orderedMatches(t[location].matches).slice(0, 5).map((m) => m.result)} />, priority: "main" },
    ], [location, lines]);

    // Hooks must run before conditional returns.
    if (!league) return <FootballError message={`Unknown football league: ${leagueKey}`} />;
    if (!league.seasonId) return <FootballError message={`Set VITE_FOOTBALL_${leagueKey.toUpperCase()}_SEASON_ID in your .env file.`} />;
    if (query.isPending) return <FootballLoading />;
    if (query.isError) return <FootballError message={query.error.message} retry={() => void query.refetch()} />;

    const best = leader(teams, "win_pct", location);
    const offense = leader(teams, "points_for_per_game", location);
    const defense = leader(teams, "points_against_per_game", location, false);
    const totals = leader(teams, "total_points_per_game", location);
    const topOver = [...teams].sort((a, b) =>
        (hitRate(b, location, "gameTotal", lines.gameTotal) ?? -1) - (hitRate(a, location, "gameTotal", lines.gameTotal) ?? -1),
    )[0];
    const setLine = (field: keyof FootballLines, value: number) => {
        setLines((previous) => ({ ...previous, [field]: value }));
        setShowAll(false);
    };

    return (
        <main className="w-full min-w-0 space-y-7 pb-12">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="eyebrow">{league.label} · SEASON {query.data?.competition_season_id ?? league.seasonId}</p>
                    <h1 className="mt-1 text-3xl font-bold text-ink">Team summary</h1>
                    <p className="mt-2 text-sm text-muted">Scoring, offense and line hit rates for {teams.length} teams.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <FootballLocationSwitch value={location} onChange={(value) => { setLocation(value); setShowAll(false); }} />
                    {conferences.length > 0 && (
                        <label className="flex items-center gap-2 text-xs text-muted">
                            Conference
                            <select
                                value={conference}
                                onChange={(event) => { setConference(event.target.value); setShowAll(false); }}
                                className="rounded-lg border border-line bg-white px-2 py-2 text-ink"
                            >
                                <option value="All">All</option>
                                {conferences.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="flex items-center gap-2 text-xs text-muted">
                        Last
                        <select
                            value={lastN}
                            onChange={(event) => { setLastN(Number(event.target.value)); setShowAll(false); }}
                            className="rounded-lg border border-line bg-white px-2 py-2 font-semibold text-ink"
                        >
                            {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} games</option>)}
                        </select>
                    </label>
                </div>
            </header>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-soft p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Lines</span>
                <FootballLineSelect label="Game total" value={lines.gameTotal} onChange={(n) => setLine("gameTotal", n)} options={ranges(29.5, 69.5)} />
                <FootballLineSelect label="Team total" value={lines.teamTotal} onChange={(n) => setLine("teamTotal", n)} options={ranges(12.5, 39.5)} />
                <label className="flex items-center gap-2 text-xs text-muted">
                    Team spread
                    <select value={lines.teamSpread} onChange={(e) => setLine("teamSpread", Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-2 font-semibold text-ink">
                        {ranges(-20, 20, 0.5).map((n) => <option key={n} value={n}>{n > 0 ? "+" : ""}{n.toFixed(1)}</option>)}
                    </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-muted">
                    Opponent spread
                    <select value={lines.opponentSpread} onChange={(e) => setLine("opponentSpread", Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-2 font-semibold text-ink">
                        {ranges(-20, 20, 0.5).map((n) => <option key={n} value={n}>{n > 0 ? "+" : ""}{n.toFixed(1)}</option>)}
                    </select>
                </label>
                <p className="basis-full text-[11px] text-muted">Line-hit rates recalculate when values change. Pushes do not count toward hit-rate denominators.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {best && <FootballStatCard label="Best record" value={record(best, location)} detail={best.team_name} />}
                {offense && <FootballStatCard label="Best offense" value={footballNumber(offense[location].points_for_per_game)} detail={`${offense.team_name} · points / game`} />}
                {defense && <FootballStatCard label="Best defense" value={footballNumber(defense[location].points_against_per_game)} detail={`${defense.team_name} · allowed / game`} />}
                {totals && <FootballStatCard label="Highest totals" value={footballNumber(totals[location].total_points_per_game)} detail={`${totals.team_name} · combined / game`} />}
                {topOver && <FootballStatCard label={`Top Over ${lines.gameTotal}`} value={footballPercent(hitRate(topOver, location, "gameTotal", lines.gameTotal))} detail={topOver.team_name} accent />}
            </div>

            <FootballPanel title="All teams">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <input
                        aria-label="Search teams"
                        value={search}
                        placeholder="Search teams"
                        onChange={(event) => { setSearch(event.target.value); setShowAll(false); }}
                        className="w-56 rounded-lg border border-line bg-white px-3 py-2 text-xs"
                    />
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                        Hit rate <FootballRatePill rate={75} /><FootballRatePill rate={55} /><FootballRatePill rate={40} />
                    </div>
                </div>
                <StatsTable
                    rows={sorted}
                    columns={columns}
                    sportSlug="football"
                    leagueKey={leagueKey}
                    badge={(team) => <FootballBadge name={team.team_name} />}
                    sortKey={sort}
                    desc={desc}
                    onSort={(key) => {
                        if (sort === key) setDesc(!desc);
                        else { setSort(key); setDesc(true); }
                    }}
                    shown={showAll ? sorted.length : 16}
                    onShowAll={() => setShowAll((previous) => !previous)}
                />
                <p className="mt-3 text-[11px] text-muted">
                    PF / PA = points scored / allowed per game. TO = turnovers per game.
                </p>
            </FootballPanel>

            <QuarterOverview teams={sorted} location={location} lastN={lastN} />
        </main>
    );
}
