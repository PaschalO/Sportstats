import { createFileRoute, Link } from "@tanstack/react-router";
import NHLTeamRankings from "../pages/hockey/NHLTeamRankings";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SoccerTeamSummary from "../pages/soccer/SoccerTeamSummary";
import SoccerTeamRankings from "../pages/soccer/SoccerTeamRankings";
import SoccerTeamStatsIndex from "../pages/soccer/SoccerTeamStatsIndex";

import {
    createSortedRowModel,
    columnVisibilityFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_text,
    sortFn_datetime,
    tableFeatures,
    useTable,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import {
    fetchNHLTeamSummary,
    NHL_COMPETITION_NAME,
    NHL_SEASON_ID,
    type Location,
    type PeriodLine,
    type LastGames,
    type TeamSummaryFilters,
    type NHLCompetitionSummaryResponse,
    type NHLMatchResult,
    describeNHLResult,
    isNHLWin,
} from "../services/nhlService";
import BasketballTeamSummary from "../pages/basketball/BasketballTeamSummary.tsx";
import BasketballTeamRankings from "../pages/basketball/BasketballTeamRankings.tsx";
import BasketballQuarterStats  from "../pages/basketball/BasketballQuarterStats.tsx";
import BasketballTeamStatsIndex from "../pages/basketball/BasketballTeamStatsIndex.tsx";
import FootballTeamSummary from "../pages/american-football/FootballTeamSummary.tsx";
import FootballTeamRankings from "../pages/american-football/FootballTeamRankings.tsx";


// NHL presentation and table logic stay here; requests and API types live in ../services/nhlService.

type Result = NHLMatchResult;

export type NHLTeamRow = {
    id: string;
    abbreviation: string;
    team: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    otLosses: number;
    winPct: number;
    goalsForPerGame: number;
    goalsAgainstPerGame: number;
    totalGoalsPerGame: number;
    shotsPerGame: number;
    bothTeamsScoredPct: number;
    period1OverPct: number | null;
    period2OverPct: number | null;
    period3OverPct: number | null;
    lastFive: Result[];
};

type Highlight = {
    label: string;
    value: string;
    detail: string;
};

const teamAbbreviations: Record<string, string> = {
    "Boston Bruins": "BOS", "Carolina Hurricanes": "CAR", "Montréal Canadiens": "MTL",
    "Montreal Canadiens": "MTL", "New Jersey Devils": "NJD", "Tampa Bay Lightning": "TBL",
    "Utah Mammoth": "UTA", "Edmonton Oilers": "EDM", "Washington Capitals": "WSH",
    "Ottawa Senators": "OTT", "Seattle Kraken": "SEA", "Colorado Avalanche": "COL",
    "Minnesota Wild": "MIN", "Buffalo Sabres": "BUF", "Florida Panthers": "FLA",
    "Toronto Maple Leafs": "TOR", "Vegas Golden Knights": "VGK", "Dallas Stars": "DAL",
    "Nashville Predators": "NSH", "New York Rangers": "NYR", "New York Islanders": "NYI",
    "San Jose Sharks": "SJS", "Calgary Flames": "CGY", "Vancouver Canucks": "VAN",
    "Anaheim Ducks": "ANA", "Chicago Blackhawks": "CHI", "Columbus Blue Jackets": "CBJ",
    "Detroit Red Wings": "DET", "Los Angeles Kings": "LAK", "Philadelphia Flyers": "PHI",
    "Pittsburgh Penguins": "PIT", "St. Louis Blues": "STL", "Winnipeg Jets": "WPG",
};

function mapTeamRows(api: NHLCompetitionSummaryResponse, location: Location): NHLTeamRow[] {
    return api.teams.map((team) => {
        const summary = team[location];
        const recent = [...(summary.matches ?? [])]
            .sort((a, b) => b.game_date.localeCompare(a.game_date))
            .slice(0, 5)
            .map((match) => match.result);

        return {
            id: String(team.team_pk),
            abbreviation: teamAbbreviations[team.team_name] ?? team.team_name.split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase(),
            team: team.team_name,
            gamesPlayed: summary.games_played,
            wins: summary.wins,
            losses: summary.losses,
            // API "losses" counts regulation losses; the remainder are OT/SO losses.
            otLosses: Math.max(0, summary.games_played - summary.wins - summary.losses),
            winPct: summary.win_pct,
            goalsForPerGame: summary.goals_per_game,
            goalsAgainstPerGame: summary.goals_against_per_game,
            totalGoalsPerGame: summary.total_goals_per_game,
            shotsPerGame: summary.shots_per_game,
            bothTeamsScoredPct: summary.btts_pct,
            period1OverPct: summary.first_period?.percentage ?? null,
            period2OverPct: summary.second_period?.percentage ?? null,
            period3OverPct: summary.third_period?.percentage ?? null,
            lastFive: recent,
        };
    });
}

function percent(value: number) {
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function rateStyle(value: number | null) {
    if (value === null) return "bg-surface text-muted";
    if (value >= 75) return "bg-accent text-white";
    if (value >= 60) return "bg-accent-soft text-accent-strong";
    if (value >= 50) return "bg-surface text-ink-soft";
    return "bg-surface-soft text-muted";
}

function RatePill({ value }: { value: number | null }) {
    return (
        <span className={`inline-flex min-w-13 items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums xl:min-w-0 xl:px-1 xl:text-[10px] 2xl:min-w-12 2xl:px-2 2xl:text-[11px] ${rateStyle(value)}`}>
      {value === null ? "—" : percent(value)}
    </span>
    );
}

function FormPills({ results }: { results: Result[] }) {
    return (
        <span
            className="inline-flex max-w-full shrink-0 items-center justify-center gap-1"
            aria-label={`Recent results: ${results.map(describeNHLResult).join(", ")}`}
        >
      {results.map((result, index) => {
          const win = isNHLWin(result);
          const finish = result.startsWith("OT") ? "OT" : result.startsWith("SO") ? "SO" : null;

          return (
              <span
                  key={`${result}-${index}`}
                  title={describeNHLResult(result)}
                  aria-hidden="true"
                  className={`inline-flex h-[27px] w-[24px] shrink-0 flex-col items-center justify-center rounded-[5px] border leading-none ${
                      result === "W"
                          ? "border-ink bg-ink text-white"
                          : win
                              ? "border-accent bg-accent-soft text-accent-strong"
                              : result === "L"
                                  ? "border-line-strong bg-white text-muted"
                                  : "border-line-strong bg-surface text-ink-soft"
                  }`}
              >
            <span className="text-[10px] font-bold leading-none">{win ? "W" : "L"}</span>
                  {finish && (
                      <span className="mt-[2px] text-[7px] font-bold leading-none">
                {finish}
              </span>
                  )}
          </span>
          );
      })}
    </span>
    );
}

function deriveHighlights(teams: NHLTeamRow[], periodLine: PeriodLine): Highlight[] {
    if (!teams.length) return [];

    const best = [...teams].sort((a, b) => b.winPct - a.winPct)[0];
    const bestTies = teams.filter((team) => team.winPct === best.winPct);
    const mostGoals = [...teams].sort((a, b) => b.goalsForPerGame - a.goalsForPerGame)[0];
    const fewestGoals = [...teams].sort((a, b) => a.goalsAgainstPerGame - b.goalsAgainstPerGame)[0];
    const bestFirstPeriod = [...teams].filter((team) => team.period1OverPct !== null)
        .sort((a, b) => (b.period1OverPct ?? -1) - (a.period1OverPct ?? -1))[0];

    return [
        { label: "Best record", value: `${best.wins}–${best.losses}–${best.otLosses}`, detail: bestTies.map((t) => t.team).join(" · ") },
        { label: "Most goals per game", value: mostGoals.goalsForPerGame.toFixed(2), detail: mostGoals.team },
        { label: "Fewest goals allowed", value: fewestGoals.goalsAgainstPerGame.toFixed(2), detail: fewestGoals.team },
        { label: `Top 1st-period Over ${periodLine}`, value: bestFirstPeriod && bestFirstPeriod.period1OverPct !== null ? percent(bestFirstPeriod.period1OverPct) : "—", detail: bestFirstPeriod?.team ?? "No period stats" },
    ];
}

// TanStack Table v9: only register the features this table needs.
// The core row model is created automatically.
const features = tableFeatures({
    columnVisibilityFeature,
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: {
        alphanumeric: sortFn_alphanumeric,
        text: sortFn_text,
        datetime: sortFn_datetime,
    },
});

// Tablet visibility and positioning are shared by header cells and body cells.
// Team is the first visible column on tablets and sticks to the left during scrolling.
const responsiveColumnClasses: Record<string, string> = {
    rank: "hidden xl:table-cell",
    team: "md:sticky md:left-0 md:z-10 xl:static",
    gamesPlayed: "",
    record: "",
    winPct: "",
    goalsForPerGame: "hidden xl:table-cell",
    goalsAgainstPerGame: "hidden xl:table-cell",
    totalGoalsPerGame: "hidden xl:table-cell",
    shotsPerGame: "hidden xl:table-cell",
    bothTeamsScoredPct: "hidden xl:table-cell",
    period1OverPct: "",
    period2OverPct: "hidden xl:table-cell",
    period3OverPct: "hidden xl:table-cell",
    lastFive: "hidden xl:table-cell",
};

// Desktop columns receive proportional widths, so all 14 columns fit inside
// the page rather than forcing the table to be 1,340px wide.
// The Last 5 column is 13% to fit five readable 24px outcome badges.
// On 1024–1279px screens the compact tablet columns remain for readability.
const desktopColumnWidths: Record<string, string> = {
    rank: "xl:w-[3%]",
    team: "xl:w-[16%]",
    gamesPlayed: "xl:w-[4%]",
    record: "xl:w-[5%]",
    winPct: "xl:w-[6%]",
    goalsForPerGame: "xl:w-[6%]",
    goalsAgainstPerGame: "xl:w-[6%]",
    totalGoalsPerGame: "xl:w-[7%]",
    shotsPerGame: "xl:w-[7%]",
    bothTeamsScoredPct: "xl:w-[6%]",
    period1OverPct: "xl:w-[7%]",
    period2OverPct: "xl:w-[7%]",
    period3OverPct: "xl:w-[7%]",
    lastFive: "xl:w-[13%]",
};

export default function NHLTeamSummary() {
    const [filters, setFilters] = useState<TeamSummaryFilters>({
        location: "overall",
        periodLine: 1.5,
        lastGames: 100,
    });
    const [sorting, setSorting] = useState<SortingState>([{ id: "winPct", desc: true }]);
    const [showAll, setShowAll] = useState(false);

    const query = useQuery({
        queryKey: ["nhl", "team-summary", NHL_COMPETITION_NAME, NHL_SEASON_ID, filters],
        queryFn: ({ signal }) => fetchNHLTeamSummary(filters, signal),
        staleTime: 60_000,
        retry: 1,
    });

    const data = useMemo(() => query.data ? mapTeamRows(query.data, filters.location) : [], [query.data, filters.location]);

    function changeFilters(next: Partial<TeamSummaryFilters>) {
        setFilters((current) => ({ ...current, ...next }));
        setShowAll(false);
    }

    const columns = useMemo<ColumnDef<typeof features, NHLTeamRow>[]>(() => [
        { id: "rank", header: "#", enableSorting: false, cell: () => null },
        {
            accessorKey: "team",
            header: "Team",
            cell: ({ row }) => (
                <Link
                    to="/$sport/$league/teams/$teamId"
                    params={{ sport: "hockey", league: "nhl", teamId: row.original.id }}
                    className="flex w-full min-w-0 items-center gap-2 xl:gap-1.5 2xl:gap-2.5 hover:text-accent-strong"
                    title={`View ${row.original.team} game-by-game statistics`}
                >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-[10px] font-semibold text-ink-soft xl:size-6 2xl:size-7">
            {row.original.abbreviation}
          </span>
                    <span className="min-w-0 truncate text-[12px] font-semibold underline-offset-2 hover:underline xl:text-[11px] 2xl:text-[12px]">{row.original.team}</span>
                </Link>
            ),
        },
        { accessorKey: "gamesPlayed", header: "GP" },
        {
            id: "record",
            accessorFn: (team) => team.wins,
            header: "W–L–OT",
            cell: ({ row }) => `${row.original.wins}–${row.original.losses}–${row.original.otLosses}`,
        },
        {
            accessorKey: "winPct",
            header: "Win %",
            cell: ({ getValue }) => <span className="font-semibold text-ink">{percent(getValue<number>())}</span>,
        },
        { accessorKey: "goalsForPerGame", header: "GF / G", cell: ({ getValue }) => getValue<number>().toFixed(2) },
        { accessorKey: "goalsAgainstPerGame", header: "GA / G", cell: ({ getValue }) => getValue<number>().toFixed(2) },
        { accessorKey: "totalGoalsPerGame", header: "Total / G", cell: ({ getValue }) => getValue<number>().toFixed(2) },
        { accessorKey: "shotsPerGame", header: "Shots / G", cell: ({ getValue }) => getValue<number>().toFixed(1) },
        { accessorKey: "bothTeamsScoredPct", header: "BTTS", cell: ({ getValue }) => percent(getValue<number>()) },
        { accessorKey: "period1OverPct", header: `P1 O${filters.periodLine}`, cell: ({ getValue }) => <RatePill value={getValue<number>()} /> },
        { accessorKey: "period2OverPct", header: `P2 O${filters.periodLine}`, cell: ({ getValue }) => <RatePill value={getValue<number>()} /> },
        { accessorKey: "period3OverPct", header: `P3 O${filters.periodLine}`, cell: ({ getValue }) => <RatePill value={getValue<number>()} /> },
        { id: "lastFive", accessorFn: (team) => team.lastFive.join(""), header: "Last 5", enableSorting: false, cell: ({ row }) => <FormPills results={row.original.lastFive} /> },
    ], [filters.periodLine]);

    const table = useTable({
        features,
        data,
        columns,
        getRowId: (row) => row.id,
        state: { sorting },
        onSortingChange: setSorting,
    });

    const sortedRows = table.getRowModel().rows;
    const displayedRows = showAll ? sortedRows : sortedRows.slice(0, 16);
    const expectedTotal = query.data?.teams_found ?? data.length;
    const stats = deriveHighlights(data, filters.periodLine);

    return (
        <div className="w-full">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="eyebrow">{query.data?.competition_name ?? "NHL"} · SEASON {query.data?.competition_season_id ?? NHL_SEASON_ID}</p>
                    <h1 className="mt-2 text-ink">Team summary</h1>
                    <p className="mt-2 max-w-xl text-caption text-muted">
                        Results, scoring and period-line hit rates for all {expectedTotal} teams across their last {filters.lastGames} games.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[12px]">
                    <Link
                        to="/$sport/$league/$section"
                        params={{ sport: "hockey", league: "nhl", section: "rankings" }}
                        className="rounded-lg border border-accent-soft bg-white px-3 py-2 font-semibold text-accent-strong hover:bg-accent-tint"
                    >
                        View rankings →
                    </Link>
                    <div className="inline-flex rounded-lg bg-surface p-1" role="group" aria-label="Game location">
                        {(["overall", "home", "away"] as const).map((location) => (
                            <button
                                key={location}
                                type="button"
                                onClick={() => changeFilters({ location })}
                                aria-pressed={filters.location === location}
                                className={`rounded-md px-3 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                                    filters.location === location ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                                }`}
                            >
                                {location === "overall" ? "All games" : location === "home" ? "Home" : "Away"}
                            </button>
                        ))}
                    </div>

                    <label className="flex items-center gap-2 text-muted">
                        <span>Period line</span>
                        <select
                            value={filters.periodLine}
                            onChange={(event) => changeFilters({ periodLine: Number(event.target.value) as PeriodLine })}
                            className="rounded-lg border border-line-strong bg-white px-3 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <option value={0.5}>Over 0.5</option>
                            <option value={1.5}>Over 1.5</option>
                            <option value={2.5}>Over 2.5</option>
                        </select>
                    </label>

                    <label className="flex items-center gap-2 text-muted">
                        <span>Last</span>
                        <select
                            value={filters.lastGames}
                            onChange={(event) => changeFilters({ lastGames: Number(event.target.value) as LastGames })}
                            className="rounded-lg border border-line-strong bg-white px-3 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} games</option>)}
                        </select>
                    </label>
                </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat, index) => (
                    <article
                        key={stat.label}
                        className={`min-h-28 rounded-xl border p-5 ${
                            index === 3 ? "border-accent-soft bg-accent-tint" : "border-line bg-white"
                        }`}
                    >
                        <p className={`text-[11px] font-medium ${index === 3 ? "text-accent-strong" : "text-muted"}`}>{stat.label}</p>
                        <p className={`stat mt-1 text-stat ${index === 3 ? "text-accent-strong" : "text-ink"}`}>{stat.value}</p>
                        <p className="mt-1 text-xs text-ink-soft">{stat.detail}</p>
                    </article>
                ))}
            </div>

            <div className="mt-9 mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-h3">All teams</h2>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span className="mr-1">Period hit rate</span>
                    <span className="rounded-full bg-accent px-2 py-1 font-semibold text-white">75%+</span>
                    <span className="rounded-full bg-accent-soft px-2 py-1 font-semibold text-accent-strong">60–74%</span>
                    <span className="rounded-full bg-surface px-2 py-1 font-semibold text-ink-soft">50–59%</span>
                    <span className="rounded-full border border-line px-2 py-1 font-semibold text-muted">under 50%</span>
                </div>
            </div>

            {query.isError && (
                <div role="alert" className="mb-4 rounded-lg border border-danger bg-surface-soft p-4 text-sm text-danger">
                    <p className="font-semibold">Could not load NHL statistics.</p>
                    <p className="mt-1 break-words">{query.error.message}</p>
                    <button type="button" onClick={() => void query.refetch()} className="mt-2 underline">Retry</button>
                </div>
            )}
            {query.isFetching && <p role="status" className="mb-3 text-caption text-muted">Loading NHL team statistics…</p>}

            {/* Phone: responsive cards, using TanStack's same sorted row model. */}
            <div className="grid gap-3 md:hidden">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-xs text-muted">
                    Sort teams
                    <select
                        value={`${sorting[0]?.id ?? "winPct"}:${sorting[0]?.desc ? "desc" : "asc"}`}
                        onChange={(event) => {
                            const [id, direction] = event.target.value.split(":");
                            setSorting([{ id, desc: direction === "desc" }]);
                        }}
                        className="rounded-md bg-surface px-2 py-1.5 font-medium text-ink"
                    >
                        <option value="winPct:desc">Highest win %</option>
                        <option value="goalsForPerGame:desc">Most goals / game</option>
                        <option value="goalsAgainstPerGame:asc">Fewest goals allowed</option>
                        <option value="period1OverPct:desc">Highest P1 hit rate</option>
                    </select>
                </label>

                {displayedRows.map((row, index) => {
                    const team = row.original;
                    return (
                        <article key={row.id} className="rounded-xl border border-line bg-white p-4">
                            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface text-xs font-semibold text-ink-soft">
                  {team.abbreviation}
                </span>
                                <div className="min-w-0 flex-1">
                                    <Link
                                        to="/$sport/$league/teams/$teamId"
                                        params={{ sport: "hockey", league: "nhl", teamId: team.id }}
                                        className="block truncate text-sm font-semibold text-ink underline-offset-2 hover:text-accent-strong hover:underline"
                                    >
                                        {team.team}
                                    </Link>
                                    <p className="text-xs text-muted">#{index + 1} · {team.gamesPlayed} GP · {team.wins}–{team.losses}–{team.otLosses}</p>
                                </div>
                                <strong className="text-sm tabular-nums text-ink">{percent(team.winPct)}</strong>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface-soft p-3 text-center">
                                {([
                                    ["GF / G", team.goalsForPerGame.toFixed(2)],
                                    ["GA / G", team.goalsAgainstPerGame.toFixed(2)],
                                    ["Total / G", team.totalGoalsPerGame.toFixed(2)],
                                    ["Shots / G", team.shotsPerGame.toFixed(1)],
                                    ["BTTS", percent(team.bothTeamsScoredPct)],
                                    ["Win %", percent(team.winPct)],
                                ] as [string, string][]).map(([label, value]) => (
                                    <div key={label}>
                                        <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
                                        <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                {([
                                    ["1st period", team.period1OverPct],
                                    ["2nd period", team.period2OverPct],
                                    ["3rd period", team.period3OverPct],
                                ] as [string, number | null][]).map(([label, value]) => (
                                    <div key={label}>
                                        <p className="mb-1.5 text-[10px] text-muted">{label}</p>
                                        <RatePill value={value} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3">
                                <span className="text-xs text-muted">Last 5 games</span>
                                <FormPills results={team.lastFive} />
                            </div>
                        </article>
                    );
                })}
            </div>

            {/* Tablets may scroll horizontally; desktops have no horizontal table scroll.
          At 1024–1279px we retain the compact view for readable columns.
          At 1280px and up, all columns fit within the page width. */}
            <div className="hidden w-full overflow-hidden rounded-xl border border-line md:block">
                <div className="overflow-x-auto xl:overflow-x-hidden">
                    <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-[12px] tabular-nums xl:table-fixed xl:min-w-0 xl:text-[11px] 2xl:text-[12px]">
                        <thead className="bg-surface-soft">
                        {table.getHeaderGroups().map((group) => (
                            <tr key={group.id} className="border-b border-line">
                                {group.headers.map((header) => {
                                    const columnId = header.column.id;
                                    const stickyTeam = columnId === "team";
                                    return (
                                        <th
                                            key={header.id}
                                            scope="col"
                                            aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none"}
                                            className={`whitespace-nowrap px-2.5 py-3.5 text-[10px] font-semibold uppercase tracking-wide text-muted xl:whitespace-normal xl:break-words xl:px-1 xl:text-[9px] 2xl:px-2 2xl:text-[10px] ${responsiveColumnClasses[columnId] ?? ""} ${desktopColumnWidths[columnId] ?? ""} ${stickyTeam ? "bg-surface-soft text-left" : "text-center"}`}
                                        >
                                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                                <button
                                                    type="button"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className="inline-flex cursor-pointer items-center gap-1 hover:text-accent-strong"
                                                >
                                                    <table.FlexRender header={header} />
                                                    {header.column.getIsSorted() === "asc" ? "↑" : header.column.getIsSorted() === "desc" ? "↓" : null}
                                                </button>
                                            ) : <table.FlexRender header={header} />}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                        </thead>
                        <tbody>
                        {displayedRows.map((row, displayIndex) => (
                            <tr key={row.id} className="group border-b border-line-soft last:border-b-0 hover:bg-surface-soft">
                                {row.getVisibleCells().map((cell) => {
                                    const columnId = cell.column.id;
                                    const stickyTeam = columnId === "team";
                                    return (
                                        <td
                                            key={cell.id}
                                            className={`whitespace-nowrap px-2.5 py-3 text-center text-ink-soft xl:overflow-hidden xl:text-ellipsis xl:px-1 xl:py-2.5 2xl:px-2 ${responsiveColumnClasses[columnId] ?? ""} ${stickyTeam ? "bg-white text-left group-hover:bg-surface-soft" : ""}`}
                                        >
                                            {columnId === "rank"
                                                ? displayIndex + 1
                                                : <table.FlexRender cell={cell} />}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {!query.isPending && !query.isError && data.length === 0 && <p role="status" className="mt-3 text-caption text-muted">No completed NHL games found for these filters.</p>}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                <span>Showing {displayedRows.length} of {expectedTotal} teams · sorted by {sorting[0]?.id === "winPct" ? "win %" : sorting[0]?.id ?? "default"}</span>
                {sortedRows.length > 16 && (
                    <button
                        type="button"
                        onClick={() => setShowAll((current) => !current)}
                        className="rounded-lg border border-accent-soft bg-white px-3 py-2 font-semibold text-accent-strong hover:bg-accent-tint"
                    >
                        {showAll ? "Show first 16" : `Show all ${sortedRows.length} teams`}
                    </button>
                )}
            </div>
            <p className="mt-4 text-[11px] text-muted">
                Record = wins–regulation losses–OT/SO losses. Recent results: W/L (regulation), OTW/OTL (overtime), SOW/SOL (shootout). GF / GA = goals for / against per game. BTTS = both teams scored. P1–P3 O{filters.periodLine} = share of games with more than {filters.periodLine} total goals in that period.
            </p>
        </div>
    );
}


// TanStack Router route for NHL Team Summary and other sport sections.
export const Route = createFileRoute("/$sport/$league/$section")({
    component: StatisticsRoute,
});

function StatisticsRoute() {
    const { sport, league, section } = Route.useParams();

    if (sport === "hockey" && league === "nhl" && section === "team-summary") {
        return <NHLTeamSummary />;
    }

    if (sport === "hockey" && league === "nhl" && section === "rankings") {
        return <NHLTeamRankings />;
    }

    if (sport === "soccer" && section === "team-summary")
        return <SoccerTeamSummary key={league} leagueKey={league} />;

    if (sport === "soccer" && section === "rankings")
        return <SoccerTeamRankings key={league} leagueKey={league} />;

    if (sport === 'soccer' && section === 'team-stats')
        return <SoccerTeamStatsIndex key={league} leagueKey={league} />

    if (sport === 'basketball' && section === 'team-summary')
        return <BasketballTeamSummary key={league} leagueKey={league} />

    if (sport === 'basketball' && section === 'rankings')
        return <BasketballTeamRankings key={league} leagueKey={league} />

    if (sport === 'basketball' && section === 'quarter-stats')
        return <BasketballQuarterStats key={league} leagueKey={league} />

    if (sport === "basketball" && section === "team-stats")
        return <BasketballTeamStatsIndex key={league} leagueKey={league} />

    if (sport === 'football' && section == 'team-summary') {
        return <FootballTeamSummary key={league} leagueKey={league} />
    }

    if (sport === 'football' && section == 'rankings') {
        return <FootballTeamRankings key={league} leagueKey={league} />
    }
    // Replace this placeholder with the corresponding typed sport page later.
    return (
        <section>
            <p className="eyebrow">{sport} · {league}</p>
            <h1 className="mt-2 text-ink">{section.replaceAll("-", " ")}</h1>
            <p className="mt-3 text-muted">
                This statistics page is ready for its FastAPI data and components.
            </p>
        </section>
    );
}
