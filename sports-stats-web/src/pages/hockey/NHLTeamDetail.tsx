import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DualBarChart } from "../../component/charts/BarCharts";
import { GameByGame, type GameMetric } from "../../component/charts/GameByGame";
import { DataTable } from "../../component/table/DataTable";
import {
  Breadcrumbs,
  Card,
  EmptyState,
  Footnote,
  Legend,
  LocationSwitch,
  MetricBar,
  Page,
  PageHeader,
  QueryState,
  ResultBadge,
  Section,
  SectionHeader,
  StatStrip,
  TeamBadge,
} from "../../component/ui";
import { CHART } from "../../lib/chartTheme";
import { byNewest, fmtDate, fmtNum, fmtPct, fmtRecord, venuePrefix } from "../../lib/format";
import type { StatsColumn } from "../../lib/table";
import type { Location } from "../../lib/types";
import {
  DEFAULT_NHL_FILTERS,
  describeNHLResult,
  nhlOtLosses,
  nhlSummaryQuery,
  type NHLLocationSummary,
  type NHLMatchSummary,
  type NHLTeam,
} from "../../services/nhlService";
import { nhlResult, PERIODS, SPORT } from "./nhl";

const periodGoals = (key: string) => (match: NHLMatchSummary) =>
  match.periods?.[key]?.total_goals ?? null;

const METRICS: GameMetric<NHLMatchSummary>[] = [
  {
    key: "total",
    label: "Total goals",
    description: "Combined goals by both teams",
    line: 6.5,
    value: (m) => m.total_goals,
  },
  {
    key: "team",
    label: "Team goals",
    description: "Goals scored",
    line: 3.5,
    value: (m) => m.team_score,
  },
  {
    key: "opponent",
    label: "Opp goals",
    description: "Goals allowed",
    line: 3.5,
    value: (m) => m.opponent_score,
  },
  {
    key: "p1",
    label: "1st period",
    description: "Combined goals in the 1st period",
    line: 1.5,
    value: periodGoals("1ST"),
  },
  {
    key: "p2",
    label: "2nd period",
    description: "Combined goals in the 2nd period",
    line: 1.5,
    value: periodGoals("2ND"),
  },
  {
    key: "p3",
    label: "3rd period",
    description: "Combined goals in the 3rd period",
    line: 1.5,
    value: periodGoals("3RD"),
  },
  { key: "shots", label: "Shots", description: "Shots taken", line: 29.5, value: (m) => m.shots },
];

const SPLITS = [
  { key: "overall", label: "All", tone: "ink" },
  { key: "home", label: "Home", tone: "accent" },
  { key: "away", label: "Away", tone: "opponent" },
] as const;

function PeriodHitRates({ team }: { team: NHLTeam }) {
  return (
    <Card>
      <SectionHeader
        level={3}
        title="Period Over 1.5 hit rate"
        actions={<Legend items={SPLITS.map(({ label, tone }) => ({ label, tone }))} />}
      />
      <div className="mt-4 flex flex-col gap-4">
        {PERIODS.map((period) => (
          <div key={period.key} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-caption font-semibold text-ink">{period.label}</span>
            <div className="flex flex-col gap-1.5">
              {SPLITS.map((split) => {
                const pct = team[split.key][period.field]?.percentage ?? null;
                return (
                  <div key={split.key} className="flex items-center gap-2">
                    <MetricBar className="flex-1" pct={pct ?? 0} tone={split.tone} />
                    <span className="w-10 text-right text-xs font-semibold text-ink-soft tabular-nums">
                      {fmtPct(pct)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Footnote className="mt-4">
        Uses Over 1.5 and each team's most recent {DEFAULT_NHL_FILTERS.lastGames} games.
      </Footnote>
    </Card>
  );
}

function GoalsByPeriod({ summary }: { summary: NHLLocationSummary }) {
  const rows = useMemo(
    () =>
      [...PERIODS, { key: "OT1", label: "OT" }].flatMap((period) => {
        const scores = summary.matches.flatMap((match) => match.periods?.[period.key] ?? []);
        if (!scores.length) return [];
        const a = scores.reduce((sum, item) => sum + item.team_goals, 0);
        const b = scores.reduce((sum, item) => sum + item.opponent_goals, 0);
        return [
          {
            id: period.key,
            label: `${period.label} (${a - b > 0 ? "+" : ""}${a - b})`,
            a,
            b,
            tooltipTitle: `${period.label} period`,
            tooltipLines: [`${a} scored · ${b} allowed · ${scores.length} games`],
          },
        ];
      }),
    [summary.matches],
  );
  return (
    <Card>
      <SectionHeader
        level={3}
        title="Goals by period"
        actions={
          <Legend
            items={[
              { label: "Scored", tone: "accent" },
              { label: "Allowed", tone: "opponent" },
            ]}
          />
        }
      />
      <div className="mt-3">
        <DualBarChart
          rows={rows}
          height={240}
          series={[
            { key: "a", name: "Scored", color: CHART.accent },
            { key: "b", name: "Allowed", color: CHART.opponent },
          ]}
        />
      </div>
      <Footnote className="mt-2">
        OT is the first overtime period when recorded; shootout goals are not included.
      </Footnote>
    </Card>
  );
}

type SplitRow = { split: string; summary: NHLLocationSummary };

const SPLIT_COLUMNS: StatsColumn<SplitRow>[] = [
  {
    accessorKey: "split",
    header: "Split",
    meta: { align: "left" },
    cell: ({ getValue }) => (
      <span className="font-semibold text-ink capitalize">{String(getValue())}</span>
    ),
  },
  { id: "gp", header: "GP", cell: ({ row }) => row.original.summary.games_played },
  {
    id: "record",
    header: "W–L–OT",
    cell: ({ row }) =>
      fmtRecord(
        row.original.summary.wins,
        row.original.summary.losses,
        nhlOtLosses(row.original.summary),
      ),
  },
  { id: "gf", header: "GF / G", cell: ({ row }) => fmtNum(row.original.summary.goals_per_game, 2) },
  {
    id: "ga",
    header: "GA / G",
    cell: ({ row }) => fmtNum(row.original.summary.goals_against_per_game, 2),
  },
  {
    id: "total",
    header: "Total / G",
    cell: ({ row }) => fmtNum(row.original.summary.total_goals_per_game, 2),
  },
  {
    id: "shots",
    header: "Shots F / A",
    cell: ({ row }) =>
      `${fmtNum(row.original.summary.shots_per_game)} / ${fmtNum(row.original.summary.shots_against_per_game)}`,
  },
  ...PERIODS.map((period, index): StatsColumn<SplitRow> => ({
    id: period.key,
    header: `P${index + 1}`,
    cell: ({ row }) => fmtPct(row.original.summary[period.field]?.percentage),
  })),
];

function PeriodScore({ match, period }: { match: NHLMatchSummary; period: string }) {
  const score = match.periods?.[period];
  if (!score) return <span className="text-muted">—</span>;
  return (
    <span
      className={`pill min-w-12 ${score.total_goals > 1.5 ? "bg-accent-soft text-accent-strong" : "bg-surface text-muted"}`}
    >
      {score.team_goals}–{score.opponent_goals}
    </span>
  );
}

function Score({ match }: { match: NHLMatchSummary }) {
  const result = nhlResult(match);
  return (
    <span className="inline-flex items-center gap-1.5" title={describeNHLResult(match.result)}>
      <ResultBadge
        label={result.label}
        tone={result.tone === "softWin" ? "win" : result.tone === "draw" ? "loss" : result.tone}
      />
      <span className="font-semibold text-ink tabular-nums">
        {match.score_line.replace("-", "–")}
      </span>
      {result.note && <span className="text-2xs text-muted">{result.note}</span>}
    </span>
  );
}

const LOG_COLUMNS: StatsColumn<NHLMatchSummary>[] = [
  {
    accessorKey: "game_date",
    header: "Date",
    meta: { align: "left" },
    cell: ({ getValue }) => <span className="text-muted">{fmtDate(String(getValue()))}</span>,
  },
  {
    accessorKey: "opponent_name",
    header: "Opponent",
    meta: { align: "left" },
    cell: ({ row }) => (
      <span className="font-semibold text-ink">
        <span className="mr-1.5 font-normal text-muted">{venuePrefix(row.original.location)}</span>
        {row.original.opponent_name}
      </span>
    ),
  },
  {
    id: "result",
    header: "Result",
    meta: { align: "left" },
    cell: ({ row }) => <Score match={row.original} />,
  },
  ...PERIODS.map((period): StatsColumn<NHLMatchSummary> => ({
    id: period.key,
    header: period.label,
    cell: ({ row }) => <PeriodScore match={row.original} period={period.key} />,
  })),
  {
    accessorKey: "total_goals",
    header: "Total",
    cell: ({ getValue }) => <span className="font-semibold text-ink">{String(getValue())}</span>,
  },
  {
    id: "shots",
    header: "Shots",
    cell: ({ row }) => `${row.original.shots ?? "—"}–${row.original.shots_against ?? "—"}`,
  },
];

function MatchCard({ match }: { match: NHLMatchSummary }) {
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">{fmtDate(match.game_date)}</p>
          <p className="truncate text-caption font-semibold text-ink">
            {venuePrefix(match.location)} {match.opponent_name}
          </p>
        </div>
        <Score match={match} />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line-soft pt-3 text-center">
        {PERIODS.map((period) => (
          <div key={period.key}>
            <p className="mb-1 text-2xs text-muted">{period.label}</p>
            <PeriodScore match={match} period={period.key} />
          </div>
        ))}
        <div>
          <p className="mb-1 text-2xs text-muted">Shots</p>
          <p className="text-xs font-semibold tabular-nums">
            {match.shots ?? "—"}–{match.shots_against ?? "—"}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function NHLTeamDetail({ league, teamId }: { league: string; teamId: string }) {
  const [location, setLocation] = useState<Location>("overall");
  // Same filters as the summary page, so TanStack Query reuses its cache.
  const query = useQuery(nhlSummaryQuery(DEFAULT_NHL_FILTERS));
  const team = query.data?.teams.find((item) => String(item.team_pk) === teamId);
  const summary = team?.[location];
  const matches = useMemo(() => byNewest(summary?.matches), [summary]);

  return (
    <Page>
      <Breadcrumbs
        sport={SPORT}
        league={league}
        items={[
          { label: "NHL" },
          { label: "Team summary", section: "team-summary" },
          { label: team?.team_name ?? `Team ${teamId}` },
        ]}
      />
      <QueryState query={query} loadingLabel="Loading NHL team statistics…">
        {(data) =>
          !team || !summary ? (
            <EmptyState>
              No NHL team has ID {teamId} in season {data.competition_season_id}.
            </EmptyState>
          ) : (
            <>
              <PageHeader
                leading={<TeamBadge name={team.team_name} size="lg" />}
                eyebrow={`NHL · Season ${data.competition_season_id}`}
                title={team.team_name}
                meta={`${fmtRecord(summary.wins, summary.losses, nhlOtLosses(summary))} record (W–L–OT) · ${fmtPct(summary.win_pct, 1)} wins · last ${summary.games_played} games`}
                actions={<LocationSwitch value={location} onChange={setLocation} />}
              />
              <StatStrip
                className="lg:grid-cols-5"
                items={[
                  {
                    label: "Goals for / game",
                    value: fmtNum(summary.goals_per_game, 2),
                    detail: `${summary.goals} goals in ${summary.games_played} games`,
                  },
                  {
                    label: "Goals against / game",
                    value: fmtNum(summary.goals_against_per_game, 2),
                    detail: `${summary.goals_against} allowed`,
                  },
                  {
                    label: "Total goals / game",
                    value: fmtNum(summary.total_goals_per_game, 2),
                    detail: `${summary.total_goals} total`,
                  },
                  {
                    label: "Shots for / against",
                    value: (
                      <>
                        {fmtNum(summary.shots_per_game)}
                        <span className="text-lg text-muted">
                          {" "}
                          / {fmtNum(summary.shots_against_per_game)}
                        </span>
                      </>
                    ),
                    detail: "per game",
                  },
                  {
                    label: "Both teams scored",
                    value: fmtPct(summary.btts_pct),
                    detail: `${summary.btts} of ${summary.games_played} games`,
                    accent: true,
                  },
                ]}
              />
              <GameByGame
                key={location}
                matches={matches}
                metrics={METRICS}
                describe={(match) => describeNHLResult(match.result)}
              />
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <PeriodHitRates team={team} />
                <GoalsByPeriod summary={summary} />
              </div>
              <Section title="Home vs away">
                <DataTable
                  data={[
                    { split: "home", summary: team.home },
                    { split: "away", summary: team.away },
                  ]}
                  columns={SPLIT_COLUMNS}
                  getRowId={(row) => row.split}
                  minWidth="min-w-[720px]"
                  label="Home and away splits"
                  sortable={false}
                />
              </Section>
              <Section
                title="Match log"
                description="Period score is team–opponent · blue = Over 1.5 · OT/SO beside the score"
              >
                <DataTable
                  key={location}
                  data={matches}
                  columns={LOG_COLUMNS}
                  getRowId={(match) => String(match.game_pk)}
                  pageSize={10}
                  pageStep={10}
                  noun="games"
                  minWidth="min-w-[760px]"
                  label="Match log"
                  sortable={false}
                  renderCard={(match) => <MatchCard match={match} />}
                />
              </Section>
            </>
          )
        }
      </QueryState>
    </Page>
  );
}
