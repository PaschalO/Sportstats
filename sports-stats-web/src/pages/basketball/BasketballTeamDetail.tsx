import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import BasketballHalfComparison from "../../component/basketball/BasketballHalfComparison";
import BasketballQuarterComparison from "../../component/basketball/BasketballQuarterComparison";
import { GameByGame, type GameMetric } from "../../component/charts/GameByGame";
import { DataTable } from "../../component/table/DataTable";
import {
  Breadcrumbs,
  EmptyState,
  LocationSwitch,
  Notice,
  Page,
  PageHeader,
  QueryState,
  ResultBadge,
  Section,
  StatStrip,
  TeamBadge,
} from "../../component/ui";
import {
  byNewest,
  fmtDate,
  fmtNum,
  fmtPct,
  fmtRecord,
  fmtSigned,
  venuePrefix,
} from "../../lib/format";
import { resultTone } from "../../lib/results";
import type { StatsColumn } from "../../lib/table";
import type { Location } from "../../lib/types";
import {
  basketballHalfLine,
  basketballPeriodLine,
  basketballSummaryQuery,
  basketballTotalLine,
  getBasketballLeague,
  halfScore,
  isHalvesFeed,
  periodDefinitions,
  periodScore,
  type BasketballMatch,
  type BasketballSplit,
} from "../../services/basketballService";
import { netRating, SPORT } from "./basketball";

const combined = (score: { team_points: number; opponent_points: number } | null) =>
  score ? score.team_points + score.opponent_points : null;

function chartMetrics(
  matches: BasketballMatch[],
  leagueKey: string,
): GameMetric<BasketballMatch>[] {
  const periods = periodDefinitions(matches, leagueKey);
  const halfLine = basketballHalfLine(leagueKey);
  const base: GameMetric<BasketballMatch>[] = [
    {
      key: "total",
      label: "Total points",
      line: basketballTotalLine(leagueKey),
      value: (m) => m.total_points,
    },
    { key: "team", label: "Team points", line: 109.5, value: (m) => m.team_score },
    { key: "opponent", label: "Opp points", line: 109.5, value: (m) => m.opponent_score },
    {
      key: "1H",
      label: "1st half",
      line: halfLine,
      value: (m) => combined(halfScore(m, "1H", leagueKey)),
    },
    {
      key: "2H",
      label: "2nd half",
      line: halfLine,
      value: (m) => combined(halfScore(m, "2H", leagueKey)),
    },
  ];
  // Quarters get their own tabs; NCAAB halves are already covered above.
  if (isHalvesFeed(periods)) return base;
  return [
    ...base,
    ...periods.map((period) => ({
      key: period.key,
      label: period.title,
      line: basketballPeriodLine(leagueKey),
      value: (m: BasketballMatch) => combined(periodScore(m, period.key)),
    })),
  ];
}

type SplitRow = { split: string; s: BasketballSplit };

const SPLIT_COLUMNS: StatsColumn<SplitRow>[] = [
  {
    accessorKey: "split",
    header: "Split",
    meta: { align: "left" },
    cell: ({ getValue }) => (
      <span className="font-semibold text-ink capitalize">{String(getValue())}</span>
    ),
  },
  { id: "gp", header: "GP", cell: ({ row }) => row.original.s.games_played },
  {
    id: "record",
    header: "W–L",
    cell: ({ row }) => fmtRecord(row.original.s.wins, row.original.s.losses),
  },
  { id: "pts", header: "PTS", cell: ({ row }) => fmtNum(row.original.s.points_for_per_game) },
  { id: "opp", header: "OPP", cell: ({ row }) => fmtNum(row.original.s.points_against_per_game) },
  {
    id: "total",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-semibold text-accent-strong">
        {fmtNum(row.original.s.total_points_per_game)}
      </span>
    ),
  },
  { id: "fg", header: "FG%", cell: ({ row }) => fmtPct(row.original.s.field_goal_pct, 1) },
  {
    id: "three",
    header: "3PM / 3P%",
    cell: ({ row }) =>
      `${fmtNum(row.original.s.three_points_made_per_game)} / ${fmtPct(row.original.s.three_point_pct, 1)}`,
  },
  { id: "ast", header: "AST", cell: ({ row }) => fmtNum(row.original.s.assists_per_game) },
  { id: "tov", header: "TOV", cell: ({ row }) => fmtNum(row.original.s.turnovers_per_game) },
];

function logColumns(matches: BasketballMatch[], leagueKey: string): StatsColumn<BasketballMatch>[] {
  const periods = periodDefinitions(matches, leagueKey);
  return [
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
          <span className="mr-1.5 font-normal text-muted">
            {venuePrefix(row.original.location)}
          </span>
          {row.original.opponent_name}
        </span>
      ),
    },
    {
      id: "result",
      header: "Result",
      meta: { align: "left" },
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5">
          <ResultBadge label={row.original.result} tone={resultTone(row.original.result)} />
          <span className="font-semibold text-ink">{row.original.score_line}</span>
        </span>
      ),
    },
    ...periods.map((period): StatsColumn<BasketballMatch> => ({
      id: period.key,
      header: period.title,
      cell: ({ row }) => {
        const score = periodScore(row.original, period.key);
        return score ? (
          <span
            className={`pill min-w-14 ${score.team_points > score.opponent_points ? "bg-accent-soft text-accent-strong" : "bg-surface text-muted"}`}
          >
            {score.team_points}–{score.opponent_points}
          </span>
        ) : (
          "—"
        );
      },
    })),
    {
      id: "margin",
      header: "Margin",
      cell: ({ row }) => {
        const margin = row.original.team_score - row.original.opponent_score;
        return (
          <span className={margin > 0 ? "font-semibold text-accent-strong" : undefined}>
            {fmtSigned(margin, 0)}
          </span>
        );
      },
    },
    {
      accessorKey: "total_points",
      header: "Total",
      cell: ({ getValue }) => <span className="font-semibold text-ink">{String(getValue())}</span>,
    },
  ];
}

export default function BasketballTeamDetail({
  league: leagueKey,
  teamId,
}: {
  league: string;
  teamId: string;
}) {
  const league = getBasketballLeague(leagueKey) ?? {
    key: "nba" as const,
    label: leagueKey,
    competitionName: leagueKey,
    seasonId: null,
  };
  const [location, setLocation] = useState<Location>("overall");
  const query = useQuery(basketballSummaryQuery({ league, location: "overall", lastN: 100 }));
  const team = query.data?.teams.find((item) => String(item.team_pk) === teamId);
  const stats = team?.[location];
  const matches = useMemo(() => byNewest(stats?.matches), [stats]);
  const metrics = useMemo(() => chartMetrics(matches, leagueKey), [matches, leagueKey]);
  const columns = useMemo(() => logColumns(matches, leagueKey), [matches, leagueKey]);

  return (
    <Page>
      <Breadcrumbs
        sport={SPORT}
        league={leagueKey}
        items={[
          { label: league.label },
          { label: "Team summary", section: "team-summary" },
          { label: team?.team_name ?? `Team ${teamId}` },
        ]}
      />
      {league.seasonId == null && (
        <Notice>Set the {league.label} season ID in your .env file.</Notice>
      )}
      <QueryState query={query} loadingLabel="Loading team…">
        {() =>
          !team || !stats ? (
            <EmptyState>
              Team ID {teamId} was not found in {league.label} season {league.seasonId}.
            </EmptyState>
          ) : (
            <>
              <PageHeader
                leading={<TeamBadge name={team.team_name} size="lg" />}
                eyebrow={`${league.label} · Season ${league.seasonId}`}
                title={team.team_name}
                meta={`${fmtRecord(stats.wins, stats.losses)} record · ${fmtPct(stats.win_pct, 1)} wins · ${stats.games_played} games`}
                actions={<LocationSwitch value={location} onChange={setLocation} />}
              />
              <StatStrip
                className="md:grid-cols-3 xl:grid-cols-6"
                items={[
                  {
                    label: "Points / game",
                    value: fmtNum(stats.points_for_per_game),
                    detail: `${fmtNum(stats.points_against_per_game)} allowed`,
                  },
                  { label: "Net margin", value: fmtSigned(netRating(stats)), detail: "per game" },
                  {
                    label: "Total points / game",
                    value: fmtNum(stats.total_points_per_game),
                    detail: "both teams",
                    accent: true,
                  },
                  {
                    label: "Shooting",
                    value: fmtPct(stats.field_goal_pct, 1),
                    detail: `FG · ${fmtPct(stats.three_point_pct, 1)} from three`,
                  },
                  {
                    label: "Assists",
                    value: fmtNum(stats.assists_per_game),
                    detail: `${fmtNum(stats.turnovers_per_game)} turnovers`,
                  },
                  {
                    label: "Avg biggest lead",
                    value: fmtNum(stats.biggest_lead_average),
                    detail: "points",
                  },
                ]}
              />
              <GameByGame
                key={location}
                matches={matches}
                metrics={metrics}
                windows={[3, 5, 10, "season"]}
                defaultWindow="season"
              />
              <BasketballHalfComparison
                key={`half-${location}`}
                matches={matches}
                leagueKey={leagueKey}
                teamName={team.team_name}
              />
              <BasketballQuarterComparison
                key={`quarter-${location}`}
                matches={matches}
                leagueKey={leagueKey}
              />
              <Section title="Home vs away">
                <DataTable
                  data={[
                    { split: "home", s: team.home },
                    { split: "away", s: team.away },
                  ]}
                  columns={SPLIT_COLUMNS}
                  getRowId={(row) => row.split}
                  sortable={false}
                  minWidth="min-w-[720px]"
                />
              </Section>
              <Section title="Match log">
                <DataTable
                  key={location}
                  data={matches}
                  columns={columns}
                  getRowId={(m) => String(m.game_pk)}
                  sortable={false}
                  pageSize={10}
                  pageStep={10}
                  noun="games"
                  minWidth="min-w-[820px]"
                />
              </Section>
            </>
          )
        }
      </QueryState>
    </Page>
  );
}
