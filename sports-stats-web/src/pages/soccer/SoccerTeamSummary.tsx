import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../component/table/DataTable";
import {
  EmptyState,
  Footnote,
  FormStrip,
  Legend,
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
import { cn } from "../../lib/cn";
import { bestBy, fmtNum, fmtPct, fmtSigned, toNumber } from "../../lib/format";
import { MARKET_SCALE } from "../../lib/rates";
import type { FormResult } from "../../lib/results";
import type { StatsColumn } from "../../lib/table";
import type { Location } from "../../lib/types";
import { getSoccerLeague, soccerSummaryQuery, type SoccerTeam } from "../../services/soccerService";
import {
  bttsRate,
  cleanSheetRate,
  goalDifference,
  LAST_N_OPTIONS,
  overRate,
  points,
  soccerForm,
  SPORT,
  tableOrder,
} from "./soccer";

type Row = {
  id: number;
  name: string;
  position: number;
  zone: "top" | "bottom" | null;
  gp: number;
  w: number;
  d: number;
  l: number;
  gd: number;
  pts: number;
  gf: number | null;
  ga: number | null;
  xg: number | null;
  xga: number | null;
  sot: number | null;
  btts: number | null;
  over: number | null;
  clean: number | null;
  form: FormResult[];
};

const ANY = -1;
const lineOptions = (lines: number[]) => [
  { value: ANY, label: "Any" },
  ...lines.map((value) => ({ value, label: `Over ${value}` })),
];

function toRows(teams: SoccerTeam[], location: Location, line: number): Row[] {
  return [...teams].sort(tableOrder((team) => team[location])).map((team, index, all) => {
    const s = team[location];
    return {
      id: team.team_pk,
      name: team.team_name,
      position: index + 1,
      zone:
        all.length >= 10 && index < 4
          ? "top"
          : all.length >= 10 && index >= all.length - 3
            ? "bottom"
            : null,
      gp: s.games_played,
      w: s.wins,
      d: s.draws,
      l: s.losses,
      gd: goalDifference(s),
      pts: points(s),
      gf: toNumber(s.goals_per_game),
      ga: toNumber(s.goals_against_per_game),
      xg: toNumber(s.xg_per_game),
      xga: toNumber(s.xg_against_per_game),
      sot: toNumber(s.shots_on_target_per_game),
      btts: bttsRate(s),
      over: overRate(s, line),
      clean: cleanSheetRate(s),
      form: soccerForm(s.matches),
    };
  });
}

function XgBars({ xg, xga }: { xg: number | null; xga: number | null }) {
  const width = (value: number | null) => `${Math.min(100, ((value ?? 0) / 2.5) * 100)}%`;
  return (
    <span className="flex items-center gap-3">
      <span className="flex w-14 flex-col gap-1" aria-hidden="true">
        <span className="h-1 rounded-full bg-accent" style={{ width: width(xg) }} />
        <span className="h-1 rounded-full bg-opponent" style={{ width: width(xga) }} />
      </span>
      <span className="text-xs text-muted">
        {fmtNum(xg, 2)} · {fmtNum(xga, 2)}
      </span>
    </span>
  );
}

const pctCell =
  (key: "btts" | "over" | "clean"): StatsColumn<Row>["cell"] =>
  ({ row }) => <RatePill value={row.original[key]} scale={MARKET_SCALE} />;

function columns(line: number, league: string): StatsColumn<Row>[] {
  const nullable = { sortUndefined: "last" as const };
  return [
    {
      accessorKey: "position",
      header: "#",
      meta: { align: "left" },
      cell: ({ row }) => (
        <span className="flex items-center gap-2 text-muted">
          <span
            className={cn(
              "h-5 w-0.5 rounded-full",
              row.original.zone === "top"
                ? "bg-accent"
                : row.original.zone === "bottom"
                  ? "bg-opponent"
                  : "bg-transparent",
            )}
          />
          {row.original.position}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Club",
      meta: { align: "left", sticky: true, className: "min-w-48" },
      cell: ({ row }) => (
        <TeamLink
          sport={SPORT}
          league={league}
          teamId={row.original.id}
          name={row.original.name}
          round
        />
      ),
    },
    { accessorKey: "gp", header: "GP" },
    { accessorKey: "w", header: "W" },
    { accessorKey: "d", header: "D" },
    { accessorKey: "l", header: "L" },
    { accessorKey: "gd", header: "GD", cell: ({ getValue }) => fmtSigned(getValue(), 0) },
    {
      accessorKey: "pts",
      header: "Pts",
      cell: ({ getValue }) => <span className="stat text-base text-ink">{String(getValue())}</span>,
    },
    {
      accessorFn: (row) => row.xg ?? undefined,
      id: "xg",
      header: "xG vs xGA",
      ...nullable,
      cell: ({ row }) => <XgBars xg={row.original.xg} xga={row.original.xga} />,
      meta: { align: "left", showFrom: "lg" },
    },
    {
      accessorFn: (row) => row.sot ?? undefined,
      id: "sot",
      header: "SOT / G",
      ...nullable,
      cell: ({ row }) => fmtNum(row.original.sot),
      meta: { showFrom: "lg" },
    },
    {
      accessorFn: (row) => row.btts ?? undefined,
      id: "btts",
      header: "BTTS",
      ...nullable,
      cell: pctCell("btts"),
    },
    {
      accessorFn: (row) => row.over ?? undefined,
      id: "over",
      header: `O${line}`,
      ...nullable,
      cell: pctCell("over"),
    },
    {
      accessorFn: (row) => row.clean ?? undefined,
      id: "clean",
      header: "Clean sheet",
      ...nullable,
      cell: pctCell("clean"),
      meta: { showFrom: "xl" },
    },
    {
      id: "form",
      header: "Form",
      enableSorting: false,
      cell: ({ row }) => <FormStrip results={row.original.form} />,
    },
  ];
}

function ClubCard({ row, line, league }: { row: Row; line: number; league: string }) {
  return (
    <article
      className={cn(
        "rounded-xl border border-line bg-white p-4",
        row.zone === "top" && "border-l-2 border-l-accent",
        row.zone === "bottom" && "border-l-2 border-l-opponent",
      )}
    >
      <div className="flex items-center gap-3">
        <TeamBadge name={row.name} size="md" round />
        <div className="min-w-0 flex-1">
          <TeamLink
            sport={SPORT}
            league={league}
            teamId={row.id}
            name={`${row.position}. ${row.name}`}
            badge={false}
          />
          <p className="text-xs text-muted">
            {row.gp} GP · {row.w}W {row.d}D {row.l}L · GD {fmtSigned(row.gd, 0)}
          </p>
        </div>
        <p className="stat text-2xl text-ink">
          {row.pts}
          <span className="ml-1 font-sans text-2xs font-normal text-muted">PTS</span>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-soft p-3">
        <MiniStat label="GF / G" value={fmtNum(row.gf, 2)} />
        <MiniStat label="GA / G" value={fmtNum(row.ga, 2)} />
        <MiniStat label="xG / G" value={fmtNum(row.xg, 2)} />
        <MiniStat label="BTTS" value={fmtPct(row.btts)} />
        <MiniStat label={`Over ${line}`} value={fmtPct(row.over)} />
        <MiniStat label="SOT / G" value={fmtNum(row.sot)} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-xs text-muted">
        Form <FormStrip results={row.form} />
      </div>
    </article>
  );
}

export default function SoccerTeamSummary({ league: leagueKey }: { league: string }) {
  const league = getSoccerLeague(leagueKey);
  const [location, setLocation] = useState<Location>("overall");
  const [lastN, setLastN] = useState(100);
  const [totalLine, setTotalLine] = useState(2.5);
  const [teamLine, setTeamLine] = useState(ANY);
  const line = totalLine === ANY ? 2.5 : totalLine;

  const query = useQuery(
    soccerSummaryQuery({
      league: league ?? {
        key: leagueKey,
        label: leagueKey,
        competitionName: leagueKey,
        seasonId: null,
      },
      location,
      lastN,
      totalGoalsOver: totalLine === ANY ? null : totalLine,
      teamGoalsOver: teamLine === ANY ? null : teamLine,
    }),
  );
  const rows = useMemo(
    () => toRows(query.data?.teams ?? [], location, line),
    [query.data, location, line],
  );
  const tableColumns = useMemo(() => columns(line, leagueKey), [line, leagueKey]);

  if (!league) return <EmptyState>Unknown soccer competition: {leagueKey}</EmptyState>;

  const [top, next] = rows;
  const attack = bestBy(rows, (row) => row.gf);
  const defence = bestBy(rows, (row) => row.ga, true);
  const xg = bestBy(rows, (row) => row.xg);
  const btts = bestBy(rows, (row) => row.btts);

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${league.seasonId ?? "not set"}`}
        title="Team summary"
        description={`Results, goals, expected goals and market hit rates for all ${rows.length || ""} clubs.`}
        actions={
          <>
            <LocationSwitch value={location} onChange={setLocation} />
            <SelectField
              label="Total goals"
              value={totalLine}
              options={lineOptions([0.5, 1.5, 2.5, 3.5, 4.5])}
              onChange={setTotalLine}
            />
            <SelectField
              label="Team goals"
              value={teamLine}
              options={lineOptions([0.5, 1.5, 2.5, 3.5])}
              onChange={setTeamLine}
            />
            <SelectField label="Last" value={lastN} options={LAST_N_OPTIONS} onChange={setLastN} />
          </>
        }
      />

      {league.seasonId == null && (
        <Notice>Set the {league.label} season ID in your .env file, then restart Vite.</Notice>
      )}

      <QueryState query={query} loadingLabel="Loading soccer statistics…">
        {() =>
          !rows.length ? (
            <EmptyState>No teams returned for these filters.</EmptyState>
          ) : (
            <>
              <StatGrid>
                <StatCard
                  tone="dark"
                  label="Top of the table"
                  value={top.pts}
                  unit={`pts · ${top.w}W ${top.d}D ${top.l}L`}
                  detail={top.name}
                  sub={next ? `${top.pts - next.pts} pts clear of ${next.name}` : undefined}
                />
                <StatCard
                  label="Best attack"
                  value={fmtNum(attack?.gf, 2)}
                  detail={attack && `${attack.name} · goals / game`}
                />
                <StatCard
                  label="Best defence"
                  value={fmtNum(defence?.ga, 2)}
                  detail={defence && `${defence.name} · conceded / game`}
                />
                <StatCard
                  label="Highest xG"
                  value={fmtNum(xg?.xg, 2)}
                  detail={xg && `${xg.name} · per game`}
                />
                <StatCard
                  tone="accent"
                  label="Most BTTS"
                  value={fmtPct(btts?.btts)}
                  detail={btts?.name}
                />
              </StatGrid>

              <Section
                title="League table"
                actions={
                  <>
                    <Legend
                      items={[
                        { label: "Top 4", tone: "accent" },
                        { label: "Bottom 3", tone: "opponent" },
                      ]}
                    />
                    <RateLegend scale={MARKET_SCALE} />
                  </>
                }
              >
                <DataTable
                  data={rows}
                  columns={tableColumns}
                  getRowId={(row) => String(row.id)}
                  initialSorting={[{ id: "position", desc: false }]}
                  noun="clubs"
                  minWidth="min-w-[860px]"
                  label={`${league.label} table`}
                  searchText={(row) => row.name}
                  searchPlaceholder="Search clubs…"
                  mobileSort={[
                    { value: "position:asc", label: "League position" },
                    { value: "gf:desc", label: "Most goals / game" },
                    { value: "ga:asc", label: "Fewest conceded / game" },
                    { value: "over:desc", label: `Highest Over ${line}` },
                  ]}
                  renderCard={(row) => <ClubCard row={row} line={line} league={leagueKey} />}
                />
                <Footnote>
                  <Legend
                    className="inline-flex"
                    items={[
                      { label: "xG created per game", tone: "accent" },
                      { label: "xG conceded per game", tone: "opponent" },
                    ]}
                  />{" "}
                  SOT = shots on target. BTTS = both teams scored. Form reads oldest to newest.
                  Points = 3 × wins + draws unless the API supplies them; missing metrics show — and
                  are never treated as zero.
                </Footnote>
              </Section>
            </>
          )
        }
      </QueryState>
    </Page>
  );
}
