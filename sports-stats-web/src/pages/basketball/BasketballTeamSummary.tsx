import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../component/table/DataTable";
import {
  EmptyState,
  Footnote,
  FormStrip,
  LocationSwitch,
  MiniStat,
  Page,
  PageHeader,
  QueryState,
  RateLegend,
  RatePill,
  Section,
  SelectField,
  StatCard,
  StatGrid,
  TeamBadge,
  TeamLink,
} from "../../component/ui";
import {
  average,
  bestBy,
  fmtNum,
  fmtPct,
  fmtRecord,
  fmtSigned,
  hitRate,
  overOptions,
  type HitRate,
} from "../../lib/format";
import { MARKET_SCALE } from "../../lib/rates";
import type { FormResult } from "../../lib/results";
import type { StatsColumn } from "../../lib/table";
import type { Location } from "../../lib/types";
import {
  basketballSummaryQuery,
  basketballTotalLine,
  getBasketballLeague,
  periodDefinitions,
  periodScore,
  type BasketballMatch,
  type BasketballTeam,
  type PeriodDefinition,
} from "../../services/basketballService";
import { basketballForm, LAST_N_OPTIONS, netRating, SPORT } from "./basketball";

type Row = {
  id: number;
  name: string;
  gp: number;
  record: string;
  winPct: number;
  pts: number;
  opp: number;
  net: number;
  total: number;
  fg: number | null;
  three: number | null;
  reb: number | null;
  ast: number | null;
  tov: number | null;
  over: HitRate;
  form: FormResult[];
  matches: BasketballMatch[];
};

const LINES = [129.5, 149.5, 169.5, 179.5, 199.5, 209.5, 219.5, 229.5, 239.5, 249.5];

function toRows(teams: BasketballTeam[], location: Location, line: number): Row[] {
  return teams.map((team) => {
    const s = team[location];
    return {
      id: team.team_pk,
      name: team.team_name,
      gp: s.games_played,
      record: fmtRecord(s.wins, s.losses),
      winPct: s.win_pct,
      pts: s.points_for_per_game,
      opp: s.points_against_per_game,
      net: netRating(s),
      total: s.total_points_per_game,
      fg: s.field_goal_pct,
      three: s.three_point_pct,
      reb: s.total_rebounds_per_game,
      ast: s.assists_per_game,
      tov: s.turnovers_per_game,
      over: hitRate(
        s.matches.map((m) => m.total_points),
        line,
      ),
      form: basketballForm(s.matches),
      matches: s.matches,
    };
  });
}

const optional = (
  key: "fg" | "three" | "reb" | "ast" | "tov",
  header: string,
): StatsColumn<Row> => ({
  accessorFn: (row) => row[key] ?? undefined,
  id: key,
  header,
  sortUndefined: "last",
  cell: ({ row }) => fmtNum(row.original[key]),
  meta: { showFrom: "xl" },
});

function columns(line: number, league: string): StatsColumn<Row>[] {
  return [
    {
      accessorKey: "name",
      header: "Team",
      meta: { align: "left", sticky: true, className: "min-w-48" },
      cell: ({ row }) => (
        <TeamLink sport={SPORT} league={league} teamId={row.original.id} name={row.original.name} />
      ),
    },
    { accessorKey: "gp", header: "GP" },
    { accessorKey: "record", header: "W–L", enableSorting: false },
    {
      accessorKey: "winPct",
      header: "Win %",
      cell: ({ getValue }) => (
        <span className="font-semibold text-ink">{fmtPct(getValue(), 1)}</span>
      ),
    },
    { accessorKey: "pts", header: "PTS", cell: ({ getValue }) => fmtNum(getValue()) },
    { accessorKey: "opp", header: "OPP", cell: ({ getValue }) => fmtNum(getValue()) },
    {
      accessorKey: "net",
      header: "Net",
      cell: ({ row }) => (
        <span className={row.original.net > 0 ? "font-semibold text-accent-strong" : undefined}>
          {fmtSigned(row.original.net)}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ getValue }) => fmtNum(getValue()),
      meta: { showFrom: "lg" },
    },
    optional("fg", "FG%"),
    optional("three", "3P%"),
    optional("reb", "REB"),
    optional("ast", "AST"),
    optional("tov", "TOV"),
    {
      accessorFn: (row) => row.over.pct ?? undefined,
      id: "over",
      header: `O${line}`,
      sortUndefined: "last",
      cell: ({ row }) => <RatePill value={row.original.over.pct} scale={MARKET_SCALE} />,
    },
    {
      id: "form",
      header: "Last 5",
      enableSorting: false,
      cell: ({ row }) => <FormStrip results={row.original.form} />,
    },
  ];
}

function TeamCard({
  row,
  rank,
  line,
  league,
}: {
  row: Row;
  rank: number;
  line: number;
  league: string;
}) {
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <TeamBadge name={row.name} size="md" />
        <div className="min-w-0 flex-1">
          <TeamLink sport={SPORT} league={league} teamId={row.id} name={row.name} badge={false} />
          <p className="text-xs text-muted">
            #{rank} · {row.gp} GP · {row.record}
          </p>
        </div>
        <strong className="stat text-lg text-ink">{fmtPct(row.winPct, 1)}</strong>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-surface-soft p-3">
        <MiniStat label="PTS" value={fmtNum(row.pts)} />
        <MiniStat label="OPP" value={fmtNum(row.opp)} />
        <MiniStat label="Net" value={fmtSigned(row.net)} />
        <MiniStat label={`O${line}`} value={fmtPct(row.over.pct)} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-xs text-muted">
        Last 5 <FormStrip results={row.form} />
      </div>
    </article>
  );
}

type PeriodRow = {
  id: number;
  name: string;
  cells: { key: string; avg: number | null; scored: number | null; winPct: number | null }[];
};

function PeriodTable({
  rows,
  periods,
  league,
}: {
  rows: Row[];
  periods: PeriodDefinition[];
  league: string;
}) {
  const data = useMemo<PeriodRow[]>(
    () =>
      rows.slice(0, 10).map((row) => ({
        id: row.id,
        name: row.name,
        cells: periods.map((period) => {
          const scores = row.matches
            .map((m) => periodScore(m, period.key))
            .filter((s) => s !== null);
          return {
            key: period.key,
            avg: average(scores.map((s) => s.team_points + s.opponent_points)),
            scored: average(scores.map((s) => s.team_points)),
            winPct: scores.length
              ? (scores.filter((s) => s.team_points > s.opponent_points).length / scores.length) *
                100
              : null,
          };
        }),
      })),
    [rows, periods],
  );
  const columns: StatsColumn<PeriodRow>[] = [
    {
      accessorKey: "name",
      header: "Team",
      meta: { align: "left", sticky: true, className: "min-w-44" },
      cell: ({ row }) => (
        <TeamLink
          sport={SPORT}
          league={league}
          teamId={row.original.id}
          name={row.original.name}
          badge={false}
        />
      ),
    },
    ...periods.map((period, index): StatsColumn<PeriodRow> => ({
      id: period.key,
      header: period.title,
      cell: ({ row }) => {
        const cell = row.original.cells[index];
        return (
          <span className="inline-flex flex-col items-center gap-0.5">
            <span className="pill bg-accent-soft text-accent-strong">{fmtNum(cell.avg)}</span>
            <span className="text-2xs text-muted">
              {fmtNum(cell.scored)} pts · won {fmtPct(cell.winPct)}
            </span>
          </span>
        );
      },
    })),
    {
      id: "best",
      header: "Best period",
      cell: ({ row }) => {
        const best = bestBy(row.original.cells, (cell) => cell.winPct);
        const title = periods.find((period) => period.key === best?.key)?.title;
        return best ? `${title} · won ${fmtPct(best.winPct)}` : "—";
      },
    },
  ];
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      sortable={false}
      minWidth="min-w-[720px]"
    />
  );
}

export default function BasketballTeamSummary({ league: leagueKey }: { league: string }) {
  const league = getBasketballLeague(leagueKey);
  const [location, setLocation] = useState<Location>("overall");
  const [lastN, setLastN] = useState(100);
  const [line, setLine] = useState(basketballTotalLine(leagueKey));
  const query = useQuery(
    basketballSummaryQuery({
      league: league ?? {
        key: "nba",
        label: leagueKey,
        competitionName: leagueKey,
        seasonId: null,
      },
      location,
      lastN,
    }),
  );
  const rows = useMemo(
    () => toRows(query.data?.teams ?? [], location, line),
    [query.data, location, line],
  );
  const tableColumns = useMemo(() => columns(line, leagueKey), [line, leagueKey]);
  const periods = useMemo(
    () =>
      periodDefinitions(
        rows.flatMap((row) => row.matches),
        leagueKey,
      ),
    [rows, leagueKey],
  );

  if (!league) return <EmptyState>Unknown basketball competition: {leagueKey}</EmptyState>;

  const best = bestBy(rows, (row) => row.winPct);
  const offense = bestBy(rows, (row) => row.pts);
  const defense = bestBy(rows, (row) => row.opp, true);
  const margin = bestBy(rows, (row) => row.net);
  const over = bestBy(rows, (row) => row.over.pct);

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${league.seasonId ?? "not set"}`}
        title="Team summary"
        description="Scoring, shooting and period-by-period totals across the competition."
        actions={
          <>
            <LocationSwitch value={location} onChange={setLocation} />
            <SelectField
              label="Game total"
              value={line}
              options={overOptions([...new Set([...LINES, line])].sort((a, b) => a - b))}
              onChange={setLine}
            />
            <SelectField label="Last" value={lastN} options={LAST_N_OPTIONS} onChange={setLastN} />
          </>
        }
      />
      <QueryState query={query} loadingLabel="Loading basketball statistics…">
        {() => (
          <>
            <StatGrid>
              <StatCard label="Best record" value={best?.record ?? "—"} detail={best?.name} />
              <StatCard
                label="Best offense"
                value={fmtNum(offense?.pts)}
                detail={offense && `${offense.name} · pts / game`}
              />
              <StatCard
                label="Best defense"
                value={fmtNum(defense?.opp)}
                detail={defense && `${defense.name} · allowed / game`}
              />
              <StatCard
                label="Best net rating"
                value={fmtSigned(margin?.net)}
                detail={margin && `${margin.name} · margin`}
              />
              <StatCard
                tone="accent"
                label={`Top Over ${line}`}
                value={fmtPct(over?.over.pct)}
                detail={over && `${over.name} · ${over.over.hits} of ${over.over.total}`}
              />
            </StatGrid>

            <Section
              title="All teams"
              actions={<RateLegend scale={MARKET_SCALE} label={`Over ${line}`} />}
            >
              <DataTable
                data={rows}
                columns={tableColumns}
                getRowId={(row) => String(row.id)}
                initialSorting={[{ id: "winPct", desc: true }]}
                rank
                pageSize={15}
                noun="teams"
                minWidth="min-w-[820px]"
                label={`${league.label} team summary`}
                searchText={(row) => row.name}
                mobileSort={[
                  { value: "winPct:desc", label: "Highest win %" },
                  { value: "pts:desc", label: "Most points / game" },
                  { value: "opp:asc", label: "Fewest allowed / game" },
                  { value: "over:desc", label: `Highest Over ${line}` },
                ]}
                renderCard={(row, index) => (
                  <TeamCard row={row} rank={index + 1} line={line} league={leagueKey} />
                )}
              />
              <Footnote>
                PTS / OPP = scored / allowed per game. Net = average margin. The Over rate uses the
                matches in this response.
              </Footnote>
            </Section>

            {periods.length > 0 && (
              <Section
                title={
                  periods[0].key.startsWith("Q") && periods.length > 2
                    ? "Quarter by quarter"
                    : "Period by period"
                }
                description="Average combined points per period, with team scoring and period win rate (top 10 teams by win %)."
              >
                <PeriodTable
                  rows={[...rows].sort((a, b) => b.winPct - a.winPct)}
                  periods={periods}
                  league={leagueKey}
                />
              </Section>
            )}
          </>
        )}
      </QueryState>
    </Page>
  );
}
