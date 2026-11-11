import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    fetchNHLTeamSummary,
    NHL_COMPETITION_NAME,
    NHL_SEASON_ID,
    type NHLAPITeam,
    type Location,
    type LastGames,
    type PeriodLine,
    type TeamSummaryFilters,
} from "../../services/nhlService";

/**
 * Responsive NHL rankings dashboard, based on the Team Stats Rankings mockup.
 * Place in: src/components/nhl/NHLTeamRankings.tsx
 * Requests and response types are reused from src/services/nhlService.tsx.
 * Route registration lives in src/routes/$sport.$league.$section.tsx.
 */

type RankingId =
    | "goals-for"
    | "fewest-goals-against"
    | "total-goals"
    | "first-period"
    | "second-period"
    | "third-period"
    | "shots-for"
    | "shots-against"
    | "best-home-record"
    | "best-away-record";

type RankingConfig = {
    id: RankingId;
    title: string;
    unit: string;
    sort: "asc" | "desc";
    tone: "navy" | "blue" | "orange";
    format: "average" | "percentage" | "shots";
    getValue: (team: NHLAPITeam, location: Location) => number | null;
};

type RankedTeam = {
    teamPk: number;
    teamName: string;
    value: number;
    winPct: number;
    gamesPlayed: number;
};

// API values are already per-game averages / period threshold percentages.
// Home/away record cards ALWAYS use home/away, independent of the location filter.
const RANKINGS: RankingConfig[] = [
    {
        id: "goals-for", title: "Goals for", unit: "per game", sort: "desc", tone: "navy", format: "average",
        getValue: (team, location) => team[location].games_played > 0 ? team[location].goals_per_game : null,
    },
    {
        id: "fewest-goals-against", title: "Fewest goals against", unit: "per game", sort: "asc", tone: "navy", format: "average",
        getValue: (team, location) => team[location].games_played > 0 ? team[location].goals_against_per_game : null,
    },
    {
        id: "total-goals", title: "Highest total goals", unit: "per game", sort: "desc", tone: "orange", format: "average",
        getValue: (team, location) => team[location].games_played > 0 ? team[location].total_goals_per_game : null,
    },
    {
        id: "first-period", title: "1st period", unit: "hit rate", sort: "desc", tone: "blue", format: "percentage",
        getValue: (team, location) => team[location].first_period?.percentage ?? null,
    },
    {
        id: "second-period", title: "2nd period", unit: "hit rate", sort: "desc", tone: "blue", format: "percentage",
        getValue: (team, location) => team[location].second_period?.percentage ?? null,
    },
    {
        id: "third-period", title: "3rd period", unit: "hit rate", sort: "desc", tone: "blue", format: "percentage",
        getValue: (team, location) => team[location].third_period?.percentage ?? null,
    },
    {
        id: "shots-for", title: "Shots for", unit: "per game", sort: "desc", tone: "navy", format: "shots",
        getValue: (team, location) => team[location].games_with_stats > 0 ? team[location].shots_per_game : null,
    },
    {
        id: "shots-against", title: "Shots against", unit: "per game · most allowed", sort: "desc", tone: "orange", format: "shots",
        getValue: (team, location) => team[location].games_with_stats > 0 ? team[location].shots_against_per_game : null,
    },
    {
        id: "best-home-record", title: "Best home record", unit: "win %", sort: "desc", tone: "navy", format: "percentage",
        getValue: (team) => team.home.games_played > 0 ? team.home.win_pct : null,
    },
    {
        id: "best-away-record", title: "Best away record", unit: "win %", sort: "desc", tone: "navy", format: "percentage",
        getValue: (team) => team.away.games_played > 0 ? team.away.win_pct : null,
    },
];

const BAR_COLORS: Record<RankingConfig["tone"], string> = {
    navy: "bg-ink",
    blue: "bg-accent",
    orange: "bg-opponent",
};

function formatValue(value: number, format: RankingConfig["format"]): string {
    if (format === "percentage") return `${Math.round(value)}%`;
    if (format === "shots") return value.toFixed(1);
    return value.toFixed(2);
}

function buildRanking(
    teams: NHLAPITeam[],
    config: RankingConfig,
    location: Location,
): RankedTeam[] {
    return teams
        .map((team) => {
            const value = config.getValue(team, location);
            const split = config.id === "best-home-record" ? team.home
                : config.id === "best-away-record" ? team.away
                    : team[location];
            return value === null || !Number.isFinite(value)
                ? null
                : {
                    teamPk: team.team_pk,
                    teamName: team.team_name,
                    value,
                    winPct: split.win_pct,
                    gamesPlayed: split.games_played,
                };
        })
        .filter((item): item is RankedTeam => item !== null)
        .sort((a, b) => {
            const primary = config.sort === "desc" ? b.value - a.value : a.value - b.value;
            if (Math.abs(primary) > 0.00001) return primary;
            // Match the mockup note: percentage of wins breaks a tied metric.
            if (a.winPct !== b.winPct) return b.winPct - a.winPct;
            // When win % is tied, favor teams with a larger sample of games.
            if (a.gamesPlayed !== b.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
            return a.teamName.localeCompare(b.teamName);
        });
}

function widthForBar(value: number, bestValue: number, sort: RankingConfig["sort"]): string {
    if (bestValue <= 0 || value <= 0) return "0%";
    // For fewer-goals-against, a lower number should produce a longer (better) bar.
    const ratio = sort === "asc" ? bestValue / value : value / bestValue;
    return `${Math.max(4, Math.min(100, ratio * 100))}%`;
}

function RankingRows({
                         config,
                         items,
                         isFull,
                     }: {
    config: RankingConfig;
    items: RankedTeam[];
    isFull: boolean;
}) {
    const bestValue = items[0]?.value ?? 0;
    return (
        <ol className={isFull ? "divide-y divide-line-soft" : "space-y-4"}>
            {items.map((team, index) => (
                <li
                    key={team.teamPk}
                    className={`grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2.5 ${isFull ? "py-3 sm:gap-x-4" : "gap-y-1"}`}
                >
          <span className="self-center text-[11px] font-semibold tabular-nums text-muted sm:text-xs">
            {index + 1}
          </span>
                    {isFull ? (
                        <Link
                            to="/$sport/$league/teams/$teamId"
                            params={{ sport: "hockey", league: "nhl", teamId: String(team.teamPk) }}
                            title={`View ${team.teamName} team details`}
                            className="min-w-0 truncate text-xs font-semibold text-ink hover:text-accent-strong hover:underline sm:text-sm"
                        >
                            {team.teamName}
                        </Link>
                    ) : (
                        <span title={team.teamName} className="min-w-0 truncate text-xs font-semibold text-ink">
              {team.teamName}
            </span>
                    )}
                    <strong className="text-right text-xs font-bold tabular-nums text-ink sm:text-sm">
                        {formatValue(team.value, config.format)}
                    </strong>
                    <div className="col-start-2 col-span-1 mt-1 h-[5px] min-w-0 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                        <div
                            className={`h-full rounded-full ${BAR_COLORS[config.tone]}`}
                            style={{ width: widthForBar(team.value, bestValue, config.sort) }}
                        />
                    </div>
                    {isFull && (
                        <span className="col-start-3 mt-1 text-right text-[10px] tabular-nums text-muted">
              {team.gamesPlayed} GP
            </span>
                    )}
                </li>
            ))}
        </ol>
    );
}

function RankingCard({
                         config,
                         items,
                         periodLine,
                         onOpen,
                     }: {
    config: RankingConfig;
    items: RankedTeam[];
    periodLine: PeriodLine;
    onOpen: () => void;
}) {
    const title = config.id.endsWith("-period")
        ? `${config.title} Over ${periodLine}`
        : config.title;

    return (
        <button
            type="button"
            onClick={onOpen}
            title={`View all ${items.length} teams ranked by ${title}`}
            aria-label={`Open full ranking for ${title}`}
            className="group flex w-full min-w-0 flex-col rounded-2xl border border-line bg-white p-4 text-left transition-shadow hover:border-line-strong hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-5"
        >
            <div className="mb-5 flex min-w-0 items-start justify-between gap-2">
                <h2 className="min-w-0 text-[15px] leading-5 font-semibold text-ink sm:text-base">{title}</h2>
                <span className="shrink-0 pt-0.5 text-[10px] text-muted">{config.unit}</span>
            </div>

            <div className="min-h-[210px] flex-1">
                {items.length === 0 ? (
                    <p className="py-6 text-xs text-muted">No statistics available.</p>
                ) : (
                    <RankingRows config={config} items={items.slice(0, 5)} isFull={false} />
                )}
            </div>

            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent group-hover:text-accent-strong">
        Full ranking <span aria-hidden="true">→</span>
      </span>
        </button>
    );
}

function Selector({
                      label,
                      value,
                      onChange,
                      options,
                  }: {
    label: string;
    value: string | number;
    onChange: (next: string) => void;
    options: { value: string | number; label: string }[];
}) {
    return (
        <label className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <span className="shrink-0">{label}</span>
            <select
                aria-label={label}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="min-w-0 rounded-lg border border-line-strong bg-white px-2.5 py-2 text-xs font-semibold text-ink"
            >
                {options.map((option) => (
                    <option key={String(option.value)} value={option.value}>{option.label}</option>
                ))}
            </select>
        </label>
    );
}

export default function NHLTeamRankings() {
    const [filters, setFilters] = useState<TeamSummaryFilters>({
        location: "overall",
        periodLine: 1.5,
        lastGames: 100,
    });
    const [selectedId, setSelectedId] = useState<RankingId | null>(null);

    const query = useQuery({
        queryKey: ["nhl", "team-summary", NHL_COMPETITION_NAME, NHL_SEASON_ID, filters],
        queryFn: ({ signal }) => fetchNHLTeamSummary(filters, signal),
        staleTime: 60_000,
        retry: 1,
    });

    const rankings = useMemo(() => {
        const teams = query.data?.teams ?? [];
        return RANKINGS.map((config) => ({
            config,
            items: buildRanking(teams, config, filters.location),
        }));
    }, [query.data, filters.location]);

    const selected = rankings.find(({ config }) => config.id === selectedId) ?? null;
    const competitionName = query.data?.competition_name ?? NHL_COMPETITION_NAME;
    const seasonId = query.data?.competition_season_id ?? NHL_SEASON_ID;
    const locationLabel = filters.location === "overall" ? "All games" : filters.location === "home" ? "Home" : "Away";

    function updateFilters(change: Partial<TeamSummaryFilters>) {
        setFilters((previous) => ({ ...previous, ...change }));
    }

    return (
        <section className="w-full min-w-0 pb-10">
            <nav className="mb-7 flex flex-wrap items-center gap-2 text-xs text-muted" aria-label="Breadcrumb">
                <Link
                    to="/$sport/$league/$section"
                    params={{ sport: "hockey", league: "nhl", section: "team-summary" }}
                    className="text-muted hover:text-accent-strong"
                >
                    NHL Team summary
                </Link>
                <span aria-hidden="true">/</span>
                <span className="font-semibold text-ink">Rankings</span>
            </nav>

            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <p className="eyebrow">{competitionName} · Season {seasonId} · {locationLabel}</p>
                    <h1 className="mt-2 text-ink">Team stats rankings</h1>
                    <p className="mt-2 max-w-xl text-caption text-muted">
                        Top five teams in each category. Select a card to see the full {query.data?.teams_found ?? 32}-team ranking.
                    </p>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                    <div className="inline-flex shrink-0 rounded-lg bg-surface p-1" role="group" aria-label="Game location">
                        {(["overall", "home", "away"] as const).map((loc) => (
                            <button
                                key={loc}
                                type="button"
                                aria-pressed={filters.location === loc}
                                onClick={() => updateFilters({ location: loc })}
                                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:px-3 ${filters.location === loc ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                            >
                                {loc === "overall" ? "All" : loc === "home" ? "Home" : "Away"}
                            </button>
                        ))}
                    </div>
                    <Selector
                        label="Last"
                        value={filters.lastGames}
                        onChange={(value) => updateFilters({ lastGames: Number(value) as LastGames })}
                        options={[5, 10, 20, 50, 100].map((n) => ({ value: n, label: String(n) }))}
                    />
                    <Selector
                        label="Period line"
                        value={filters.periodLine}
                        onChange={(value) => updateFilters({ periodLine: Number(value) as PeriodLine })}
                        options={[0.5, 1.5, 2.5].map((n) => ({ value: n, label: `Over ${n}` }))}
                    />
                </div>
            </div>

            {query.isError && (
                <div role="alert" className="mt-6 rounded-xl border border-danger bg-surface-soft p-4 text-sm text-danger">
                    <p className="font-semibold">Could not load NHL rankings.</p>
                    <p className="mt-1 break-words">{query.error.message}</p>
                    <button type="button" className="mt-2 underline" onClick={() => void query.refetch()}>Try again</button>
                </div>
            )}

            {query.isPending ? (
                <div aria-label="Loading rankings" role="status" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {RANKINGS.map(({ id }) => (
                        <div key={id} className="h-[315px] animate-pulse rounded-2xl border border-line bg-surface-soft" />
                    ))}
                </div>
            ) : query.isError ? null : selected ? (
                <div className="mt-8 min-w-0">
                    <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-strong"
                    >
                        <span aria-hidden="true">←</span> All ranking categories
                    </button>
                    <div className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-6">
                        <div className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-2 border-b border-line-soft pb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-ink sm:text-2xl">
                                    {selected.config.id.endsWith("-period")
                                        ? `${selected.config.title} Over ${filters.periodLine}`
                                        : selected.config.title}
                                </h2>
                                <p className="mt-1 text-xs text-muted">
                                    {selected.config.unit} · {selected.items.length} teams ranked
                                </p>
                            </div>
                            <span className="rounded-full bg-surface px-3 py-1.5 text-xs text-muted">{locationLabel}</span>
                        </div>
                        {selected.items.length === 0 ? (
                            <p className="py-6 text-sm text-muted">No team statistics available for this selection.</p>
                        ) : (
                            <RankingRows config={selected.config} items={selected.items} isFull />
                        )}
                        <p className="mt-5 text-xs text-muted">Select a team name to view its game-by-game statistics.</p>
                    </div>
                </div>
            ) : (
                <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                    {rankings.map(({ config, items }) => (
                        <RankingCard
                            key={config.id}
                            config={config}
                            items={items}
                            periodLine={filters.periodLine}
                            onOpen={() => setSelectedId(config.id)}
                        />
                    ))}
                </div>
            )}

            {query.isFetching && !query.isPending && (
                <p role="status" className="mt-3 text-xs text-muted">Updating rankings…</p>
            )}
            <p className="mt-8 text-[11px] leading-relaxed text-muted">
                Ties share a displayed value; order within ties follows win %. Period rankings measure the share of games exceeding the selected combined-goals line in that period. "Shots against" ranks teams conceding the most shots per game. Home and away record cards always use the corresponding split. All figures come from your NHL FastAPI service.
            </p>
        </section>
    );
}
