import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HalvesChart, MarginChart } from "../../component/american-football/FootballCharts";
import { GameByGame, type GameMetric } from "../../component/charts/GameByGame";
import { DataTable } from "../../component/table/DataTable";
import {
  Breadcrumbs,
  Card,
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
import { cn } from "../../lib/cn";
import { byNewest, fmtDate, fmtNum, fmtPct, fmtSigned, venuePrefix } from "../../lib/format";
import { resultTone } from "../../lib/results";
import type { StatsColumn } from "../../lib/table";
import type { Location } from "../../lib/types";
import {
  betSummary,
  footballSummaryQuery,
  getFootballLeague,
  INITIAL_LINES,
  matchBetResult,
  periodScore,
  teamConference,
  type FootballMatch,
  type FootballPeriodKey,
  type FootballSplit,
} from "../../services/americanFootballService";
import { BETS, record, signedLine, SPORT } from "./football";

const periodTotal = (key: FootballPeriodKey) => (m: FootballMatch) => {
  const score = periodScore(m, key);
  return score ? score.team_score + score.opponent_score : null;
};

const METRICS: GameMetric<FootballMatch>[] = [
  { key: "total", label: "Total points", line: 47.5, value: (m) => m.total_points },
  { key: "team", label: "Team points", line: 24.5, value: (m) => m.team_score },
  { key: "opponent", label: "Opp points", line: 22.5, value: (m) => m.opponent_score },
  { key: "1H", label: "1st half", line: 23.5, value: periodTotal("1H") },
  { key: "2H", label: "2nd half", line: 23.5, value: periodTotal("2H") },
  ...(["Q1", "Q2", "Q3", "Q4"] as const).map((key) => ({
    key,
    label: key,
    line: 11.5,
    value: periodTotal(key),
  })),
];

const LINES = INITIAL_LINES;
const BET_TONES = {
  hit: "bg-accent text-white",
  push: "border border-line text-muted",
  miss: "bg-surface text-muted",
} as const;

function BettingLines({ matches }: { matches: FootballMatch[] }) {
  return (
    <Section
      title="Betting lines"
      description="Hit rate at each line, split by home and away. Pushes are left out of the denominator."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {BETS.map((bet) => {
          const line = LINES[bet.key];
          const all = betSummary(matches, bet.key, line);
          const home = betSummary(
            matches.filter((m) => m.location === "home"),
            bet.key,
            line,
          );
          const away = betSummary(
            matches.filter((m) => m.location === "away"),
            bet.key,
            line,
          );
          return (
            <Card key={bet.key} as="article">
              <div className="flex justify-between gap-2 text-xs">
                <span className="font-semibold text-ink">{bet.label}</span>
                <span className="text-muted">
                  {bet.key.endsWith("Spread") ? signedLine(line) : `Over ${line}`}
                </span>
              </div>
              <p className="stat mt-2 text-stat text-ink">{fmtPct(all.pct)}</p>
              <p className="text-xs text-muted">
                {all.hits} of {all.decided} decided
                {all.pushes ? ` · ${all.pushes} push${all.pushes === 1 ? "" : "es"}` : ""}
              </p>
              <div className="mt-3 flex gap-0.5" aria-hidden="true">
                {[...all.results].reverse().map((result, index) => (
                  <span key={index} className={cn("h-2 flex-1 rounded-sm", BET_TONES[result])} />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">
                Home{" "}
                <b className="text-ink">
                  {home.hits}/{home.decided}
                </b>{" "}
                · Away{" "}
                <b className="text-ink">
                  {away.hits}/{away.decided}
                </b>
              </p>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

type SplitRow = { split: string; s: FootballSplit };

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
  { id: "record", header: "W–L", cell: ({ row }) => record(row.original.s) },
  {
    id: "pf",
    header: "PF",
    cell: ({ row }) => (
      <span className="text-accent-strong">{fmtNum(row.original.s.points_for_per_game)}</span>
    ),
  },
  { id: "pa", header: "PA", cell: ({ row }) => fmtNum(row.original.s.points_against_per_game) },
  { id: "total", header: "Total", cell: ({ row }) => fmtNum(row.original.s.total_points_per_game) },
  {
    id: "pass",
    header: "Pass yds",
    cell: ({ row }) => fmtNum(row.original.s.passing_yards_per_game),
  },
  {
    id: "rush",
    header: "Rush yds",
    cell: ({ row }) => fmtNum(row.original.s.rushing_yards_per_game),
  },
  ...BETS.slice(0, 3).map((bet): StatsColumn<SplitRow> => ({
    id: bet.key,
    header: bet.short(LINES[bet.key]),
    cell: ({ row }) => {
      const summary = betSummary(row.original.s.matches, bet.key, LINES[bet.key]);
      return `${summary.hits}/${summary.decided}`;
    },
  })),
];

const LOG_COLUMNS: StatsColumn<FootballMatch>[] = [
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
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5">
        <ResultBadge label={row.original.result} tone={resultTone(row.original.result)} />
        <span className="font-semibold text-ink">{row.original.score_line}</span>
      </span>
    ),
  },
  ...(["Q1", "Q2", "Q3", "Q4"] as const).map((key): StatsColumn<FootballMatch> => ({
    id: key,
    header: key,
    cell: ({ row }) => {
      const s = periodScore(row.original, key);
      return s ? (
        <span
          className={cn(
            "pill min-w-12",
            s.team_score > s.opponent_score
              ? "bg-accent-soft text-accent-strong"
              : "bg-surface text-ink-soft",
          )}
        >
          {s.team_score}–{s.opponent_score}
        </span>
      ) : (
        "—"
      );
    },
  })),
  {
    accessorKey: "total_points",
    header: "Total",
    cell: ({ getValue }) => <span className="font-semibold text-ink">{String(getValue())}</span>,
  },
  ...BETS.map((bet): StatsColumn<FootballMatch> => ({
    id: bet.key,
    header: bet.short(LINES[bet.key]),
    cell: ({ row }) => {
      const result = matchBetResult(row.original, bet.key, LINES[bet.key]);
      return <span className={cn("pill min-w-12 capitalize", BET_TONES[result])}>{result}</span>;
    },
  })),
];

export default function FootballTeamDetail({
  league: leagueKey,
  teamId,
}: {
  league: string;
  teamId: string;
}) {
  const league = getFootballLeague(leagueKey) ?? {
    key: leagueKey,
    label: leagueKey,
    competitionName: leagueKey,
    seasonId: null,
  };
  const [location, setLocation] = useState<Location>("overall");
  const query = useQuery(
    footballSummaryQuery({ league, location: "overall", lastN: 100, lines: INITIAL_LINES }),
  );
  const team = query.data?.teams.find((item) => String(item.team_pk) === teamId);
  const stats = team?.[location];
  const matches = useMemo(() => byNewest(stats?.matches), [stats]);

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
              Team ID {teamId} was not returned for {league.label}.
            </EmptyState>
          ) : (
            <>
              <PageHeader
                leading={<TeamBadge name={team.team_name} size="lg" />}
                eyebrow={[league.label, teamConference(team, leagueKey)]
                  .filter(Boolean)
                  .join(" · ")}
                title={team.team_name}
                meta={`${record(stats)} record · ${fmtPct(stats.win_pct, 1)} wins · last ${stats.games_played} games`}
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
                  {
                    label: "Net margin",
                    value: fmtSigned(stats.points_for_per_game - stats.points_against_per_game),
                    detail: "per game",
                  },
                  {
                    label: "Total points / game",
                    value: fmtNum(stats.total_points_per_game),
                    detail: "both teams",
                    accent: true,
                  },
                  {
                    label: "Passing yards",
                    value: fmtNum(stats.passing_yards_per_game),
                    detail: `${fmtNum(stats.passing_touchdowns_per_game)} passing TDs`,
                  },
                  {
                    label: "Rushing yards",
                    value: fmtNum(stats.rushing_yards_per_game),
                    detail: "per game",
                  },
                  {
                    label: "Turnovers",
                    value: fmtNum(stats.turnovers_per_game, 2),
                    detail: `${fmtNum(stats.interceptions_per_game, 2)} interceptions`,
                  },
                ]}
              />
              <BettingLines matches={matches} />
              <GameByGame
                key={location}
                matches={matches}
                metrics={METRICS}
                windows={[3, 5, 10, "season"]}
                defaultWindow="season"
              />
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <MarginChart matches={matches} />
                <HalvesChart matches={matches} />
              </div>
              <Section title="Home vs away">
                <DataTable
                  data={[
                    { split: "home", s: team.home },
                    { split: "away", s: team.away },
                  ]}
                  columns={SPLIT_COLUMNS}
                  getRowId={(row) => row.split}
                  sortable={false}
                  minWidth="min-w-[760px]"
                />
              </Section>
              <Section
                title="Match log"
                description="Quarter scores are team–opponent; OT is not included in Q4."
              >
                <DataTable
                  key={location}
                  data={matches}
                  columns={LOG_COLUMNS}
                  getRowId={(m) => String(m.game_pk)}
                  sortable={false}
                  pageSize={10}
                  pageStep={10}
                  noun="games"
                  minWidth="min-w-[980px]"
                />
              </Section>
            </>
          )
        }
      </QueryState>
    </Page>
  );
}
