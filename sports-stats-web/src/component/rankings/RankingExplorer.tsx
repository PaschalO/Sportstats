import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "../../lib/cn";
import { average, DASH } from "../../lib/format";
import { teamAbbr } from "../../lib/teams";
import { Card, ChipTabs, Footnote, MetricBar, SectionHeader, TeamLink, TextButton } from "../ui";

export type RankMetric<T> = {
  key: string;
  label: string;
  /** Column header in the rank map. */
  short: string;
  /** "per game", "average %", … */
  unit: string;
  value: (team: T) => number | null;
  /** API-supplied rank; computed from value when omitted. */
  rank?: (team: T) => number | null;
  lowerIsBetter?: boolean;
  format: (value: number) => string;
  /** 0–100 share of games with data; under 100 shows a dot in the rank map. */
  coverage?: (team: T) => number | null;
  /** Fixed bar scale (e.g. 100 for percentages); defaults to the largest value. */
  scaleMax?: number;
  /** Vertical marker on the bars; defaults to the league average. */
  marker?: number;
};

type Leader = { label: string; metric: string };

type RankingExplorerProps<T> = {
  teams: T[];
  metrics: RankMetric<T>[];
  getId: (team: T) => number;
  getName: (team: T) => string;
  sport: string;
  league: string;
  /** Optional "Category leaders" cards under the explorer. */
  leaders?: Leader[];
  note?: ReactNode;
};

type Ranked<T> = { team: T; id: number; value: number; rank: number };

function rankTeams<T>(
  teams: T[],
  metric: RankMetric<T>,
  getId: (team: T) => number,
  getName: (team: T) => string,
) {
  const direction = metric.lowerIsBetter ? 1 : -1;
  const withValues = teams
    .map((team) => ({
      team,
      id: getId(team),
      value: metric.value(team),
      api: metric.rank?.(team) ?? null,
    }))
    .filter(
      (item): item is { team: T; id: number; value: number; api: number | null } =>
        item.value != null,
    );
  const sorted = withValues.sort(
    (a, b) =>
      (metric.rank ? (a.api ?? 9999) - (b.api ?? 9999) : 0) ||
      (a.value - b.value) * direction ||
      getName(a.team).localeCompare(getName(b.team)),
  );
  return sorted.map((item, index): Ranked<T> => ({ ...item, rank: item.api ?? index + 1 }));
}

const BAND_CLASSES = [
  "bg-accent text-white",
  "bg-accent-mid text-ink",
  "bg-accent-soft text-accent-strong",
  "bg-surface text-muted",
];

function bandSize(count: number) {
  return Math.max(1, Math.ceil(count / 4));
}

/** Metric chips, a ranked bar list and a league-wide rank map (mockup: Team stats rankings). */
export function RankingExplorer<T>({
  teams,
  metrics,
  getId,
  getName,
  sport,
  league,
  leaders,
  note,
}: RankingExplorerProps<T>) {
  const [metricKey, setMetricKey] = useState(metrics[0].key);
  const [showAll, setShowAll] = useState(false);
  const metric = metrics.find((item) => item.key === metricKey) ?? metrics[0];

  const rankings = useMemo(
    () => new Map(metrics.map((item) => [item.key, rankTeams(teams, item, getId, getName)])),
    [teams, metrics, getId, getName],
  );
  const ranks = useMemo(
    () =>
      new Map(
        [...rankings].map(([key, list]) => [
          key,
          new Map(list.map((item) => [item.id, item.rank])),
        ]),
      ),
    [rankings],
  );

  const ranked = rankings.get(metric.key) ?? [];
  const leagueAverage = average(ranked.map((item) => item.value));
  const scale = metric.scaleMax ?? Math.max(1, ...ranked.map((item) => item.value));
  const marker = metric.marker ?? leagueAverage;
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  // Label the extremes by their actual values, whichever way the ranking runs.
  const descending = !best || !worst || best.value >= worst.value;
  const band = bandSize(teams.length);
  const mapRows = ranked.length ? ranked : teams.map((team) => ({ team, id: getId(team) }));
  const visibleRows = showAll ? mapRows : mapRows.slice(0, 20);
  const isBetter = (value: number) =>
    leagueAverage == null ||
    (metric.lowerIsBetter ? value <= leagueAverage : value >= leagueAverage);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ChipTabs
        label="Ranking statistic"
        value={metric.key}
        options={metrics.map((item) => ({ value: item.key, label: item.label }))}
        onChange={setMetricKey}
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)] lg:items-start">
        <Card>
          <SectionHeader
            level={3}
            title={metric.label}
            description={`${metric.unit} · league average ${leagueAverage == null ? DASH : metric.format(leagueAverage)}`}
          />
          {best && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="min-w-0 rounded-lg bg-ink p-3 text-white">
                <p className="text-2xs text-white/70">{descending ? "Most" : "Fewest"}</p>
                <p className="stat text-2xl">{metric.format(best.value)}</p>
                <p className="truncate text-xs">{getName(best.team)}</p>
              </div>
              {worst && (
                <div className="min-w-0 rounded-lg bg-surface p-3">
                  <p className="text-2xs text-muted">{descending ? "Least" : "Most"}</p>
                  <p className="stat text-2xl text-ink">{metric.format(worst.value)}</p>
                  <p className="truncate text-xs text-ink-soft">{getName(worst.team)}</p>
                </div>
              )}
            </div>
          )}
          <ol className="mt-4 flex flex-col gap-1">
            {ranked.map((item) => (
              <li key={item.id}>
                <Link
                  to="/$sport/$league/teams/$teamId"
                  params={{ sport, league, teamId: String(item.id) }}
                  title={`${getName(item.team)}: ${metric.format(item.value)}`}
                  className="grid grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_3.75rem] items-center gap-2 rounded px-1 py-1 text-caption hover:bg-row-hover"
                >
                  <span className="text-muted tabular-nums">{item.rank}</span>
                  <span className="font-semibold text-ink">{teamAbbr(getName(item.team))}</span>
                  <MetricBar
                    pct={(item.value / scale) * 100}
                    marker={marker == null ? null : (marker / scale) * 100}
                    tone={isBetter(item.value) ? "accent" : "muted"}
                  />
                  <span className="text-right font-semibold tabular-nums text-ink">
                    {metric.format(item.value)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {!ranked.length && (
            <p className="mt-4 text-caption text-muted">No data for this statistic.</p>
          )}
          <Footnote className="mt-3">
            Line marks {metric.marker != null ? metric.format(metric.marker) : "the league average"}
            . Missing values are excluded, never treated as zero.
          </Footnote>
        </Card>

        <Card>
          <SectionHeader
            level={3}
            title="Rank map"
            description="League rank in every statistic. 1 = best."
            actions={
              <div className="flex flex-wrap gap-1">
                {BAND_CLASSES.map((classes, index) => (
                  <span key={classes} className={cn("pill min-w-0", classes)}>
                    {index * band + 1}–{Math.min(teams.length, (index + 1) * band)}
                  </span>
                ))}
              </div>
            }
          />
          <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
            <table className="w-full min-w-[720px] border-separate border-spacing-1 text-center text-caption tabular-nums">
              <thead>
                <tr>
                  <th className="label-caps sticky left-0 z-10 bg-white py-2 pr-2 text-left">
                    Club
                  </th>
                  {metrics.map((item) => (
                    <th
                      key={item.key}
                      title={item.label}
                      className="label-caps px-1 py-2 leading-tight"
                    >
                      {item.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ team, id }) => (
                  <tr key={id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 max-w-48 bg-white pr-2 text-left font-medium"
                    >
                      <TeamLink
                        sport={sport}
                        league={league}
                        teamId={id}
                        name={getName(team)}
                        badge={false}
                      />
                    </th>
                    {metrics.map((item) => {
                      const rank = ranks.get(item.key)?.get(id) ?? null;
                      const coverage = item.coverage?.(team);
                      const value = item.value(team);
                      return (
                        <td
                          key={item.key}
                          title={`${getName(team)} · ${item.label}: ${value == null ? DASH : item.format(value)} · rank ${rank ?? DASH}${coverage != null ? ` · ${coverage}% coverage` : ""}`}
                          className={cn(
                            "relative rounded-md px-1 py-1.5 font-semibold",
                            rank == null
                              ? "bg-surface-soft text-muted"
                              : BAND_CLASSES[Math.min(3, Math.floor((rank - 1) / band))],
                          )}
                        >
                          {rank ?? DASH}
                          {coverage != null && coverage < 100 && (
                            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-opponent" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Footnote>
              Sorted by {metric.label.toLowerCase()} rank.{" "}
              {metrics.some((item) => item.coverage) &&
                "Orange dot = stat missing for some games. "}
              Hover a cell for the per-game value.
            </Footnote>
            {mapRows.length > 20 && (
              <TextButton onClick={() => setShowAll((value) => !value)}>
                {showAll ? "Show top 20" : `Show all ${mapRows.length} teams`}
              </TextButton>
            )}
          </div>
        </Card>
      </div>

      {leaders && leaders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2>Category leaders</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {leaders.map((leader) => {
              const item = metrics.find((m) => m.key === leader.metric);
              const list = (rankings.get(leader.metric) ?? []).slice(0, 3);
              if (!item || !list.length) return null;
              return (
                <Card key={leader.label} as="article">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3>{leader.label}</h3>
                    <span className="text-2xs text-muted">{item.unit}</span>
                  </div>
                  <p className="stat mt-2 text-2xl text-ink">{item.format(list[0].value)}</p>
                  <TeamLink
                    sport={sport}
                    league={league}
                    teamId={list[0].id}
                    name={getName(list[0].team)}
                    badge={false}
                    className="text-caption"
                  />
                  <ul className="mt-3 border-t border-line-soft pt-2 text-xs text-muted">
                    {list.slice(1).map((entry) => (
                      <li key={entry.id} className="flex justify-between gap-2 py-0.5">
                        <span className="truncate">
                          {entry.rank} · {getName(entry.team)}
                        </span>
                        <span className="font-semibold text-ink tabular-nums">
                          {item.format(entry.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {note && <Footnote>{note}</Footnote>}
    </div>
  );
}
