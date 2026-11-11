import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RankingExplorer, type RankMetric } from "../../component/rankings/RankingExplorer";
import {
  EmptyState,
  LocationSwitch,
  Notice,
  Page,
  PageHeader,
  QueryState,
  SelectField,
} from "../../component/ui";
import { LOCATION_LABELS, type Location } from "../../lib/types";
import {
  basketballRankingsQuery,
  getBasketballLeague,
  rankMetric,
  type BasketballRankTeam,
} from "../../services/basketballService";
import { LAST_N_OPTIONS, SPORT } from "./basketball";

const metric = (
  key: string,
  label: string,
  short: string,
  percent = false,
): RankMetric<BasketballRankTeam> => ({
  key,
  label,
  short,
  unit: percent ? "percentage" : "per game",
  value: (team) => {
    const data = rankMetric(team, key);
    return (percent ? data?.percentage : data?.average) ?? null;
  },
  rank: (team) => rankMetric(team, key)?.rank ?? null,
  coverage: (team) => rankMetric(team, key)?.coverage_pct ?? null,
  format: (value) => `${value.toFixed(1)}${percent ? "%" : ""}`,
  scaleMax: percent ? 100 : undefined,
});

const METRICS: RankMetric<BasketballRankTeam>[] = [
  metric("points_for", "Points", "PTS"),
  metric("points_against", "Points allowed", "OPP"),
  metric("total_points", "Total points", "Total"),
  metric("field_goal_pct", "Field goal %", "FG%", true),
  metric("three_points_made", "3PT made", "3PM"),
  metric("three_point_pct", "3PT %", "3P%", true),
  metric("free_throw_pct", "Free throw %", "FT%", true),
  metric("offensive_rebounds", "Off. rebounds", "OREB"),
  metric("defensive_rebounds", "Def. rebounds", "DREB"),
  metric("total_rebounds", "Rebounds", "REB"),
  metric("assists", "Assists", "AST"),
  metric("turnovers", "Turnovers", "TOV"),
  metric("steals", "Steals", "STL"),
  metric("blocks", "Blocks", "BLK"),
  metric("personal_fouls", "Fouls", "PF"),
  metric("biggest_lead", "Biggest lead", "Lead"),
];

const LEADERS = [
  { label: "Fewest allowed", metric: "points_against" },
  { label: "Highest totals", metric: "total_points" },
  { label: "Three-point %", metric: "three_point_pct" },
  { label: "Rebounds", metric: "total_rebounds" },
  { label: "Assists", metric: "assists" },
  { label: "Fewest turnovers", metric: "turnovers" },
];

const getId = (team: BasketballRankTeam) => team.team_pk;
const getName = (team: BasketballRankTeam) => team.team_name;

export default function BasketballTeamRankings({ league: leagueKey }: { league: string }) {
  const league = getBasketballLeague(leagueKey);
  const [location, setLocation] = useState<Location>("overall");
  const [lastN, setLastN] = useState(5);
  const query = useQuery(
    basketballRankingsQuery({
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

  if (!league) return <EmptyState>Unknown basketball competition: {leagueKey}</EmptyState>;

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${league.seasonId ?? "not set"} · ${LOCATION_LABELS[location]}`}
        title="Team stats rankings"
        description={`Per-game averages and league rank across ${METRICS.length} stats. Pick a stat to see the full order.`}
        actions={
          <>
            <LocationSwitch value={location} onChange={setLocation} />
            <SelectField label="Last" value={lastN} options={LAST_N_OPTIONS} onChange={setLastN} />
          </>
        }
      />
      {league.seasonId == null && (
        <Notice>Set the {league.label} season ID in your .env file.</Notice>
      )}
      <QueryState query={query} loadingLabel="Loading rankings…">
        {(data) => (
          <RankingExplorer
            teams={data.teams}
            metrics={METRICS}
            getId={getId}
            getName={getName}
            sport={SPORT}
            league={leagueKey}
            leaders={LEADERS}
            note="Ranks come straight from the API. Percentages use made / attempted; missing ranks stay unavailable."
          />
        )}
      </QueryState>
    </Page>
  );
}
