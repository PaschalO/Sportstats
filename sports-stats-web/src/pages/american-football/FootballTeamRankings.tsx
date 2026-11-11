import { useMemo, useState } from "react";
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
  conferencesOf,
  footballRankingsQuery,
  getFootballLeague,
  teamConference,
  type FootballRankedTeam,
  type FootballRankKey,
} from "../../services/americanFootballService";
import { LAST_N_OPTIONS, SPORT } from "./football";

const metric = (
  key: FootballRankKey,
  label: string,
  short: string,
  lowerIsBetter = false,
): RankMetric<FootballRankedTeam> => ({
  key,
  label,
  short,
  unit: "per game",
  lowerIsBetter,
  // The API's rank uses season totals; rank here follows the per-game average instead.
  value: (team) => team[key]?.average ?? null,
  coverage: (team) => team[key]?.coverage_pct ?? null,
  format: (value) => value.toFixed(key.includes("yards") ? 1 : 2),
});

const METRICS: RankMetric<FootballRankedTeam>[] = [
  metric("points_for", "Points scored", "PF"),
  metric("points_against", "Points allowed", "PA", true),
  metric("total_points", "Total points", "Total"),
  metric("passing_yards", "Passing yards", "Pass"),
  metric("passing_touchdowns", "Passing TDs", "Pass TD"),
  metric("rushing_yards", "Rushing yards", "Rush"),
  metric("rushing_attempts", "Rush attempts", "Att"),
  metric("touch_down", "Touchdowns", "TD"),
  metric("field_goals", "Field goals", "FG"),
  metric("turnovers", "Turnovers", "TO", true),
  metric("interceptions_thrown", "Interceptions", "Int", true),
  metric("punts", "Punts", "Punt", true),
];

const LEADERS = [
  { label: "Fewest allowed", metric: "points_against" },
  { label: "Highest totals", metric: "total_points" },
  { label: "Passing yards", metric: "passing_yards" },
  { label: "Rushing yards", metric: "rushing_yards" },
  { label: "Touchdowns", metric: "touch_down" },
  { label: "Fewest turnovers", metric: "turnovers" },
];

const getId = (team: FootballRankedTeam) => team.team_pk;
const getName = (team: FootballRankedTeam) => team.team_name;

export default function FootballTeamRankings({ league: leagueKey }: { league: string }) {
  const league = getFootballLeague(leagueKey);
  const [location, setLocation] = useState<Location>("overall");
  const [lastN, setLastN] = useState(100);
  const [conference, setConference] = useState("All");
  const query = useQuery(
    footballRankingsQuery({
      league: league ?? {
        key: leagueKey,
        label: leagueKey,
        competitionName: leagueKey,
        seasonId: null,
      },
      location,
      lastN,
    }),
  );
  const teams = useMemo(() => query.data?.teams ?? [], [query.data]);
  const conferences = useMemo(() => conferencesOf(teams, leagueKey), [teams, leagueKey]);
  const filtered = useMemo(
    () =>
      teams.filter(
        (team) => conference === "All" || teamConference(team, leagueKey) === conference,
      ),
    [teams, conference, leagueKey],
  );

  if (!league) return <EmptyState>Unknown football league: {leagueKey}</EmptyState>;

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${league.seasonId ?? "not set"} · ${LOCATION_LABELS[location]}`}
        title="Team stats rankings"
        description={`Per-game averages across ${METRICS.length} stats. Pick a stat to see every team's order.`}
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
      <QueryState query={query} loadingLabel="Loading rankings…">
        {() => (
          <RankingExplorer
            key={conference}
            teams={filtered}
            metrics={METRICS}
            getId={getId}
            getName={getName}
            sport={SPORT}
            league={leagueKey}
            leaders={LEADERS}
            note="Ranks follow each stat's per-game average among the filtered teams (the API's own rank uses season totals). For points allowed, turnovers, interceptions and punts, lower ranks higher."
          />
        )}
      </QueryState>
    </Page>
  );
}
