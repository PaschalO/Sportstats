import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../component/table/DataTable";
import {
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
import { bestBy, fmtNum, fmtPct, fmtRecord } from "../../lib/format";
import { PERIOD_SCALE } from "../../lib/rates";
import type { FormResult } from "../../lib/results";
import type { StatsColumn } from "../../lib/table";
import {
  DEFAULT_NHL_FILTERS,
  NHL_SEASON_ID,
  nhlOtLosses,
  nhlSummaryQuery,
  type NHLFilters,
  type NHLSummaryResponse,
} from "../../services/nhlService";
import { LAST_GAMES_OPTIONS, nhlForm, PERIOD_LINE_OPTIONS, SPORT } from "./nhl";

type Row = {
  id: number;
  name: string;
  gp: number;
  record: string;
  winPct: number;
  gf: number;
  ga: number;
  total: number;
  shots: number;
  btts: number;
  p1: number | null;
  p2: number | null;
  p3: number | null;
  form: FormResult[];
};

function toRows(data: NHLSummaryResponse, location: NHLFilters["location"]): Row[] {
  return data.teams.map((team) => {
    const s = team[location];
    return {
      id: team.team_pk,
      name: team.team_name,
      gp: s.games_played,
      record: fmtRecord(s.wins, s.losses, nhlOtLosses(s)),
      winPct: s.win_pct,
      gf: s.goals_per_game,
      ga: s.goals_against_per_game,
      total: s.total_goals_per_game,
      shots: s.shots_per_game,
      btts: s.btts_pct,
      p1: s.first_period?.percentage ?? null,
      p2: s.second_period?.percentage ?? null,
      p3: s.third_period?.percentage ?? null,
      form: nhlForm(s.matches ?? []),
    };
  });
}

const num = (digits: number) => ({
  cell: ({ getValue }: { getValue: () => unknown }) => fmtNum(getValue(), digits),
});

function columns(line: number, league: string): StatsColumn<Row>[] {
  const rate = (key: "p1" | "p2" | "p3", label: string, className?: string): StatsColumn<Row> => ({
    accessorFn: (row) => row[key] ?? undefined,
    id: key,
    header: `${label} O${line}`,
    sortUndefined: "last",
    cell: ({ row }) => <RatePill value={row.original[key]} scale={PERIOD_SCALE} />,
    meta: { className },
  });
  return [
    {
      accessorKey: "name",
      header: "Team",
      cell: ({ row }) => (
        <TeamLink sport={SPORT} league={league} teamId={row.original.id} name={row.original.name} />
      ),
      meta: { align: "left", sticky: true, className: "min-w-48" },
    },
    { accessorKey: "gp", header: "GP" },
    { accessorKey: "record", header: "W–L–OT", enableSorting: false },
    {
      accessorKey: "winPct",
      header: "Win %",
      cell: ({ getValue }) => (
        <span className="font-semibold text-ink">{fmtPct(getValue(), 1)}</span>
      ),
    },
    { accessorKey: "gf", header: "GF / G", ...num(2) },
    { accessorKey: "ga", header: "GA / G", ...num(2) },
    {
      accessorKey: "total",
      header: "Total / G",
      ...num(2),
      meta: { showFrom: "lg" },
    },
    {
      accessorKey: "shots",
      header: "Shots / G",
      ...num(1),
      meta: { showFrom: "xl" },
    },
    {
      accessorKey: "btts",
      header: "BTTS",
      cell: ({ getValue }) => fmtPct(getValue()),
      meta: { showFrom: "xl" },
    },
    rate("p1", "P1"),
    rate("p2", "P2"),
    rate("p3", "P3"),
    {
      id: "form",
      header: "Last 5",
      enableSorting: false,
      cell: ({ row }) => <FormStrip results={row.original.form} />,
      meta: { showFrom: "lg" },
    },
  ];
}

function TeamCard({ row, rank, league }: { row: Row; rank: number; league: string }) {
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
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-soft p-3">
        <MiniStat label="GF / G" value={fmtNum(row.gf, 2)} />
        <MiniStat label="GA / G" value={fmtNum(row.ga, 2)} />
        <MiniStat label="Total / G" value={fmtNum(row.total, 2)} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(["p1", "p2", "p3"] as const).map((key, index) => (
          <div key={key}>
            <p className="mb-1 text-2xs text-muted">Period {index + 1}</p>
            <RatePill value={row[key]} scale={PERIOD_SCALE} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-xs text-muted">
        Last 5 <FormStrip results={row.form} />
      </div>
    </article>
  );
}

export default function NHLTeamSummary({ league }: { league: string }) {
  const [filters, setFilters] = useState<NHLFilters>(DEFAULT_NHL_FILTERS);
  const query = useQuery(nhlSummaryQuery(filters));
  const update = (change: Partial<NHLFilters>) =>
    setFilters((current) => ({ ...current, ...change }));
  const rows = useMemo(
    () => (query.data ? toRows(query.data, filters.location) : []),
    [query.data, filters.location],
  );
  const tableColumns = useMemo(
    () => columns(filters.periodLine, league),
    [filters.periodLine, league],
  );

  const best = bestBy(rows, (row) => row.winPct);
  const mostGoals = bestBy(rows, (row) => row.gf);
  const fewestAllowed = bestBy(rows, (row) => row.ga, true);
  const topPeriod = bestBy(rows, (row) => row.p1);

  return (
    <Page>
      <PageHeader
        eyebrow={`${query.data?.competition_name ?? "NHL"} · Season ${query.data?.competition_season_id ?? NHL_SEASON_ID}`}
        title="Team summary"
        description={`Results, scoring and period-line hit rates for all ${query.data?.teams_found ?? rows.length} teams across their last ${filters.lastGames} games.`}
        actions={
          <>
            <LocationSwitch
              value={filters.location}
              onChange={(location) => update({ location })}
            />
            <SelectField
              label="Period line"
              value={filters.periodLine}
              options={PERIOD_LINE_OPTIONS}
              onChange={(periodLine) => update({ periodLine })}
            />
            <SelectField
              label="Last"
              value={filters.lastGames}
              options={LAST_GAMES_OPTIONS}
              onChange={(lastGames) => update({ lastGames })}
            />
          </>
        }
      />

      <QueryState query={query} loadingLabel="Loading NHL team statistics…">
        {() => (
          <>
            <StatGrid>
              <StatCard
                label="Best record"
                value={best?.record ?? "—"}
                detail={rows
                  .filter((row) => row.winPct === best?.winPct)
                  .map((row) => row.name)
                  .join(" · ")}
              />
              <StatCard
                label="Most goals per game"
                value={fmtNum(mostGoals?.gf, 2)}
                detail={mostGoals?.name}
              />
              <StatCard
                label="Fewest goals allowed"
                value={fmtNum(fewestAllowed?.ga, 2)}
                detail={fewestAllowed?.name}
              />
              <StatCard
                tone="accent"
                label={`Top 1st-period Over ${filters.periodLine}`}
                value={fmtPct(topPeriod?.p1)}
                detail={topPeriod?.name ?? "No period stats"}
              />
            </StatGrid>

            <Section
              title="All teams"
              actions={<RateLegend scale={PERIOD_SCALE} label="Period hit rate" />}
            >
              <DataTable
                data={rows}
                columns={tableColumns}
                getRowId={(row) => String(row.id)}
                initialSorting={[{ id: "winPct", desc: true }]}
                rank
                pageSize={16}
                noun="teams"
                minWidth="min-w-[760px]"
                label="NHL team summary"
                searchText={(row) => row.name}
                mobileSort={[
                  { value: "winPct:desc", label: "Highest win %" },
                  { value: "gf:desc", label: "Most goals / game" },
                  { value: "ga:asc", label: "Fewest goals allowed" },
                  { value: "p1:desc", label: "Highest P1 hit rate" },
                ]}
                renderCard={(row, index) => <TeamCard row={row} rank={index + 1} league={league} />}
              />
              <Footnote>
                Record = wins–regulation losses–OT/SO losses. GF / GA = goals for / against per
                game. BTTS = both teams scored. P1–P3 O{filters.periodLine} = share of games with
                more than {filters.periodLine} total goals in that period. Lighter W = overtime or
                shootout win.
              </Footnote>
            </Section>
          </>
        )}
      </QueryState>
    </Page>
  );
}
