import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../component/table/DataTable";
import {
  Card,
  EmptyState,
  Footnote,
  FormStrip,
  LocationSwitch,
  MiniStat,
  Notice,
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
import { average, bestBy, fmtNum, fmtPct, fmtSigned, overOptions, range } from "../../lib/format";
import { MARKET_SCALE } from "../../lib/rates";
import type { FormResult } from "../../lib/results";
import type { StatsColumn } from "../../lib/table";
import type { Location } from "../../lib/types";
import {
  betSummary,
  conferencesOf,
  footballSummaryQuery,
  getFootballLeague,
  INITIAL_LINES,
  periodScore,
  teamConference,
  type FootballBetKind,
  type FootballLines,
  type FootballMatch,
  type FootballTeam,
} from "../../services/americanFootballService";
import { BETS, footballForm, LAST_N_OPTIONS, record, SPORT, spreadOptions } from "./football";

type Row = {
  id: number;
  name: string;
  gp: number;
  record: string;
  winPct: number;
  pf: number;
  pa: number;
  net: number;
  total: number;
  rates: Record<FootballBetKind, number | null>;
  form: FormResult[];
  matches: FootballMatch[];
};

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

function toRows(teams: FootballTeam[], location: Location, lines: FootballLines): Row[] {
  return teams.map((team) => {
    const s = team[location];
    return {
      id: team.team_pk,
      name: team.team_name,
      gp: s.games_played,
      record: record(s),
      winPct: s.win_pct,
      pf: s.points_for_per_game,
      pa: s.points_against_per_game,
      net: s.points_for_per_game - s.points_against_per_game,
      total: s.total_points_per_game,
      rates: Object.fromEntries(
        BETS.map((bet) => [bet.key, betSummary(s.matches, bet.key, lines[bet.key]).pct]),
      ) as Row["rates"],
      form: footballForm(s.matches),
      matches: s.matches,
    };
  });
}

function columns(lines: FootballLines, league: string): StatsColumn<Row>[] {
  const n = (key: "pf" | "pa" | "total", header: string, showFrom?: "lg"): StatsColumn<Row> => ({
    accessorKey: key,
    header,
    cell: ({ getValue }) => fmtNum(getValue()),
    meta: { showFrom },
  });
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
    n("pf", "PF"),
    n("pa", "PA"),
    {
      accessorKey: "net",
      header: "Net",
      cell: ({ row }) => (
        <span className={row.original.net > 0 ? "font-semibold text-accent-strong" : undefined}>
          {fmtSigned(row.original.net)}
        </span>
      ),
    },
    n("total", "Total", "lg"),
    ...BETS.map((bet, index): StatsColumn<Row> => ({
      accessorFn: (row) => row.rates[bet.key] ?? undefined,
      id: bet.key,
      header: bet.short(lines[bet.key]),
      sortUndefined: "last",
      cell: ({ row }) => <RatePill value={row.original.rates[bet.key]} scale={MARKET_SCALE} />,
      meta: { showFrom: index === 0 ? undefined : index === 1 ? "lg" : "xl" },
    })),
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
  lines,
  league,
}: {
  row: Row;
  rank: number;
  lines: FootballLines;
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
        <MiniStat label="PF" value={fmtNum(row.pf)} />
        <MiniStat label="PA" value={fmtNum(row.pa)} />
        <MiniStat label="Net" value={fmtSigned(row.net)} />
        <MiniStat label={`O${lines.gameTotal}`} value={fmtPct(row.rates.gameTotal)} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-xs text-muted">
        Last 5 <FormStrip results={row.form} />
      </div>
    </article>
  );
}

type QuarterRow = {
  id: number;
  name: string;
  cells: { over: number | null; scored: number | null; won: number | null }[];
};

function QuarterTable({ rows, league }: { rows: Row[]; league: string }) {
  const [line, setLine] = useState(14.5);
  const data = useMemo<QuarterRow[]>(
    () =>
      rows.slice(0, 10).map((row) => ({
        id: row.id,
        name: row.name,
        cells: QUARTERS.map((quarter) => {
          const scores = row.matches.map((m) => periodScore(m, quarter)).filter((s) => s !== null);
          const n = scores.length;
          return {
            over: n
              ? (scores.filter((s) => s.team_score + s.opponent_score > line).length / n) * 100
              : null,
            scored: average(scores.map((s) => s.team_score)),
            won: n
              ? (scores.filter((s) => s.team_score > s.opponent_score).length / n) * 100
              : null,
          };
        }),
      })),
    [rows, line],
  );
  const columns: StatsColumn<QuarterRow>[] = [
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
    ...QUARTERS.map((quarter, index): StatsColumn<QuarterRow> => ({
      id: quarter,
      header: quarter,
      cell: ({ row }) => {
        const cell = row.original.cells[index];
        return (
          <span className="inline-flex flex-col items-center gap-0.5">
            <RatePill value={cell.over} scale={MARKET_SCALE} />
            <span className="text-2xs text-muted">
              {fmtNum(cell.scored)} pts · won {fmtPct(cell.won)}
            </span>
          </span>
        );
      },
    })),
    {
      id: "best",
      header: "Best quarter",
      cell: ({ row }) => {
        const index = row.original.cells.indexOf(bestBy(row.original.cells, (cell) => cell.won)!);
        return index >= 0
          ? `${QUARTERS[index]} · won ${fmtPct(row.original.cells[index].won)}`
          : "—";
      },
    },
  ];
  return (
    <Section
      title="Quarter by quarter"
      description="Share of games over the quarter line, with points scored and quarters won (regulation only, top 10 teams)."
      actions={
        <SelectField
          label="Quarter total"
          value={line}
          options={overOptions(range(4.5, 30.5))}
          onChange={setLine}
        />
      }
    >
      <DataTable
        data={data}
        columns={columns}
        getRowId={(row) => String(row.id)}
        sortable={false}
        minWidth="min-w-[720px]"
      />
    </Section>
  );
}

export default function FootballTeamSummary({ league: leagueKey }: { league: string }) {
  const league = getFootballLeague(leagueKey);
  const [location, setLocation] = useState<Location>("overall");
  const [lastN, setLastN] = useState(10);
  const [lines, setLines] = useState<FootballLines>(INITIAL_LINES);
  const [conference, setConference] = useState("All");

  const query = useQuery(
    footballSummaryQuery({
      league: league ?? {
        key: leagueKey,
        label: leagueKey,
        competitionName: leagueKey,
        seasonId: null,
      },
      location,
      lastN,
      lines,
    }),
  );
  const teams = useMemo(() => query.data?.teams ?? [], [query.data]);
  const conferences = useMemo(() => conferencesOf(teams, leagueKey), [teams, leagueKey]);
  const rows = useMemo(() => {
    const filtered = teams.filter(
      (team) => conference === "All" || teamConference(team, leagueKey) === conference,
    );
    return toRows(filtered, location, lines);
  }, [teams, conference, leagueKey, location, lines]);
  const tableColumns = useMemo(() => columns(lines, leagueKey), [lines, leagueKey]);
  const setLine = (key: keyof FootballLines) => (value: number) =>
    setLines((current) => ({ ...current, [key]: value }));

  if (!league) return <EmptyState>Unknown football league: {leagueKey}</EmptyState>;

  const best = bestBy(rows, (row) => row.winPct);
  const offense = bestBy(rows, (row) => row.pf);
  const defense = bestBy(rows, (row) => row.pa, true);
  const totals = bestBy(rows, (row) => row.total);
  const over = bestBy(rows, (row) => row.rates.gameTotal);

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${query.data?.competition_season_id ?? league.seasonId ?? "not set"}`}
        title="Team summary"
        description={`Scoring, offense and line hit rates for ${teams.length || "all"} teams.`}
        actions={
          <>
            <LocationSwitch value={location} onChange={setLocation} />
            {conferences.length > 0 && (
              <SelectField
                label="Conference"
                value={conference}
                options={["All", ...conferences].map((value) => ({ value, label: value }))}
                onChange={setConference}
              />
            )}
            <SelectField label="Last" value={lastN} options={LAST_N_OPTIONS} onChange={setLastN} />
          </>
        }
      />
      {league.seasonId == null && (
        <Notice>Set the {league.label} season ID in your .env file.</Notice>
      )}

      <Card tone="soft" className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="label-caps">Lines</span>
        <SelectField
          label="Game total"
          value={lines.gameTotal}
          options={overOptions(range(29.5, 69.5))}
          onChange={setLine("gameTotal")}
        />
        <SelectField
          label="Team total"
          value={lines.teamTotal}
          options={overOptions(range(12.5, 39.5))}
          onChange={setLine("teamTotal")}
        />
        <SelectField
          label="Team spread"
          value={lines.teamSpread}
          options={spreadOptions}
          onChange={setLine("teamSpread")}
        />
        <SelectField
          label="Opponent spread"
          value={lines.opponentSpread}
          options={spreadOptions}
          onChange={setLine("opponentSpread")}
        />
        <Footnote className="basis-full">
          Hit rates recalculate when lines change. Pushes do not count toward the denominator.
        </Footnote>
      </Card>

      <QueryState query={query} loadingLabel="Loading football statistics…">
        {() => (
          <>
            <StatGrid>
              <StatCard label="Best record" value={best?.record ?? "—"} detail={best?.name} />
              <StatCard
                label="Best offense"
                value={fmtNum(offense?.pf)}
                detail={offense && `${offense.name} · points / game`}
              />
              <StatCard
                label="Best defense"
                value={fmtNum(defense?.pa)}
                detail={defense && `${defense.name} · allowed / game`}
              />
              <StatCard
                label="Highest totals"
                value={fmtNum(totals?.total)}
                detail={totals && `${totals.name} · combined / game`}
              />
              <StatCard
                tone="accent"
                label={`Top Over ${lines.gameTotal}`}
                value={fmtPct(over?.rates.gameTotal)}
                detail={over?.name}
              />
            </StatGrid>

            <Section title="All teams" actions={<RateLegend scale={MARKET_SCALE} />}>
              <DataTable
                key={conference}
                data={rows}
                columns={tableColumns}
                getRowId={(row) => String(row.id)}
                initialSorting={[{ id: "winPct", desc: true }]}
                rank
                pageSize={16}
                noun="teams"
                minWidth="min-w-[860px]"
                label={`${league.label} team summary`}
                searchText={(row) => row.name}
                mobileSort={[
                  { value: "winPct:desc", label: "Highest win %" },
                  { value: "pf:desc", label: "Most points / game" },
                  { value: "pa:asc", label: "Fewest allowed / game" },
                  { value: "gameTotal:desc", label: `Highest Over ${lines.gameTotal}` },
                ]}
                renderCard={(row, index) => (
                  <TeamCard row={row} rank={index + 1} lines={lines} league={leagueKey} />
                )}
              />
              <Footnote>
                PF / PA = points scored / allowed per game. Wider screens show more line columns.
              </Footnote>
            </Section>

            <QuarterTable rows={[...rows].sort((a, b) => b.winPct - a.winPct)} league={leagueKey} />
          </>
        )}
      </QueryState>
    </Page>
  );
}
