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
  getSoccerLeague,
  soccerRankingsQuery,
  type SoccerRankedTeam,
  type SoccerRankKey,
} from "../../services/soccerService";
import { LAST_N_OPTIONS, SPORT } from "./soccer";

const metric = (
  key: SoccerRankKey,
  label: string,
  short: string,
): RankMetric<SoccerRankedTeam> => ({
  key,
  label,
  short,
  unit: "per game",
  value: (team) => team[key]?.average ?? null,
  rank: (team) => team[key]?.rank ?? null,
  coverage: (team) => team[key]?.coverage_pct ?? null,
  format: (value) => value.toFixed(2),
});

const METRICS: RankMetric<SoccerRankedTeam>[] = [
  {
    ...metric("possession_pct", "Possession", "Possession"),
    unit: "average share of the ball",
    format: (value) => `${value.toFixed(1)}%`,
    scaleMax: 100,
    marker: 50,
  },
  metric("shots_total", "Shots", "Shots"),
  metric("shots_on_target", "On target", "On target"),
  metric("corners", "Corners", "Corners"),
  metric("tackles", "Tackles", "Tackles"),
  metric("fouls_committed", "Fouls", "Fouls"),
  metric("cards", "Cards", "Cards"),
  metric("offsides", "Offsides", "Offsides"),
  metric("free_kicks", "Free kicks", "Free kicks"),
  metric("throw_ins", "Throw-ins", "Throw-ins"),
];

const getId = (team: SoccerRankedTeam) => team.team_pk;
const getName = (team: SoccerRankedTeam) => team.team_name;

export default function SoccerTeamRankings({ league: leagueKey }: { league: string }) {
  const league = getSoccerLeague(leagueKey);
  const [location, setLocation] = useState<Location>("overall");
  const [lastN, setLastN] = useState(100);
  const query = useQuery(
    soccerRankingsQuery(
      league ?? { key: leagueKey, label: leagueKey, competitionName: leagueKey, seasonId: null },
      location,
      lastN,
    ),
  );

  if (!league) return <EmptyState>Unknown soccer competition: {leagueKey}</EmptyState>;

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${league.seasonId ?? "not set"} · ${LOCATION_LABELS[location]}`}
        title="Team stats rankings"
        description="Per-game averages and league rank across ten match stats. Pick a stat to see the full order."
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
            note="Averages and ranks come from the API. For fouls and cards, rank 1 means the most of them."
          />
        )}
      </QueryState>
    </Page>
  );
}
