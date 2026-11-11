import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../component/table/DataTable";
import {
  EmptyState,
  Footnote,
  LocationSwitch,
  Page,
  PageHeader,
  QueryState,
  RatePill,
  SegmentedControl,
  SelectField,
  TeamLink,
} from "../../component/ui";
import { average, fmtNum, fmtPct, hitRate, overOptions } from "../../lib/format";
import { MARKET_SCALE } from "../../lib/rates";
import type { StatsColumn } from "../../lib/table";
import type { Location } from "../../lib/types";
import {
  basketballPeriodLine,
  basketballSummaryQuery,
  getBasketballLeague,
  isHalvesFeed,
  periodDefinitions,
  periodScore,
  type BasketballTeam,
} from "../../services/basketballService";
import { LAST_N_OPTIONS, SPORT } from "./basketball";

type Row = {
  id: number;
  name: string;
  games: number;
  combined: number | null;
  scored: number | null;
  allowed: number | null;
  winPct: number | null;
  overPct: number | null;
};

const LINES = [39.5, 44.5, 49.5, 54.5, 57.5, 59.5, 64.5, 69.5, 74.5, 79.5, 89.5, 109.5, 114.5];

function toRows(teams: BasketballTeam[], location: Location, period: string, line: number): Row[] {
  return teams.map((team) => {
    const scores = team[location].matches
      .map((m) => periodScore(m, period))
      .filter((s) => s !== null);
    const totals = scores.map((s) => s.team_points + s.opponent_points);
    return {
      id: team.team_pk,
      name: team.team_name,
      games: scores.length,
      combined: average(totals),
      scored: average(scores.map((s) => s.team_points)),
      allowed: average(scores.map((s) => s.opponent_points)),
      winPct: scores.length
        ? (scores.filter((s) => s.team_points > s.opponent_points).length / scores.length) * 100
        : null,
      overPct: hitRate(totals, line).pct,
    };
  });
}

const nullable = (
  key: keyof Row,
  header: string,
  render: (value: number | null) => ReactNode,
): StatsColumn<Row> => ({
  accessorFn: (row) => (row[key] as number | null) ?? undefined,
  id: key,
  header,
  sortUndefined: "last",
  cell: ({ row }) => render(row.original[key] as number | null),
});

export default function BasketballQuarterStats({ league: leagueKey }: { league: string }) {
  const league = getBasketballLeague(leagueKey);
  const [location, setLocation] = useState<Location>("overall");
  const [lastN, setLastN] = useState(100);
  const [period, setPeriod] = useState("");
  const [line, setLine] = useState(basketballPeriodLine(leagueKey));
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
  const teams = useMemo(() => query.data?.teams ?? [], [query.data]);
  const periods = useMemo(
    () =>
      periodDefinitions(
        teams.flatMap((team) => team[location].matches),
        leagueKey,
      ),
    [teams, location, leagueKey],
  );
  const chosen = periods.some((p) => p.key === period) ? period : (periods[0]?.key ?? "");
  const rows = useMemo(
    () => toRows(teams, location, chosen, line),
    [teams, location, chosen, line],
  );
  const columns = useMemo<StatsColumn<Row>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Team",
        meta: { align: "left", sticky: true, className: "min-w-48" },
        cell: ({ row }) => (
          <TeamLink
            sport={SPORT}
            league={leagueKey}
            teamId={row.original.id}
            name={row.original.name}
          />
        ),
      },
      { accessorKey: "games", header: "Games" },
      nullable("combined", "Combined / game", (v) => (
        <span className="font-semibold text-accent-strong">{fmtNum(v)}</span>
      )),
      nullable("scored", "Scored", (v) => fmtNum(v)),
      nullable("allowed", "Allowed", (v) => fmtNum(v)),
      nullable("winPct", "Period win %", (v) => fmtPct(v)),
      nullable("overPct", `Over ${line}`, (v) => <RatePill value={v} scale={MARKET_SCALE} />),
    ],
    [leagueKey, line],
  );

  if (!league) return <EmptyState>Unknown basketball competition: {leagueKey}</EmptyState>;
  const halves = isHalvesFeed(periods);

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${league.seasonId ?? "not set"}`}
        title={halves ? "Half stats" : "Quarter stats"}
        description="Compare combined scoring, points scored and allowed, and periods won across the league."
        actions={
          <>
            <LocationSwitch value={location} onChange={setLocation} />
            <SelectField label="Last" value={lastN} options={LAST_N_OPTIONS} onChange={setLastN} />
          </>
        }
      />
      <QueryState query={query} loadingLabel="Loading period statistics…">
        {() =>
          !periods.length ? (
            <EmptyState>
              The API response has no recognizable period scores for this league.
            </EmptyState>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedControl
                  label="Period"
                  value={chosen}
                  options={periods.map((p) => ({ value: p.key, label: p.title }))}
                  onChange={setPeriod}
                />
                <SelectField
                  label="Combined points line"
                  value={line}
                  options={overOptions([...new Set([...LINES, line])].sort((a, b) => a - b))}
                  onChange={setLine}
                />
              </div>
              <DataTable
                data={rows}
                columns={columns}
                getRowId={(row) => String(row.id)}
                initialSorting={[{ id: "combined", desc: true }]}
                rank
                noun="teams"
                minWidth="min-w-[720px]"
                label="Period statistics"
              />
              <Footnote>
                A period is won when the team outscores its opponent in it; ties are not wins.
                Periods without data are left out of the averages.
              </Footnote>
            </>
          )
        }
      </QueryState>
    </Page>
  );
}
