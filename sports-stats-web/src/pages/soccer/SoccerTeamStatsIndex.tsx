import { useQuery } from "@tanstack/react-query";
import { TeamPicker, type TeamSort } from "../../component/teams/TeamPicker";
import { EmptyState, Notice, Page, PageHeader, QueryState } from "../../component/ui";
import { fmtNum } from "../../lib/format";
import { getSoccerLeague, soccerSummaryQuery, type SoccerTeam } from "../../services/soccerService";
import { goalsFor, points, SPORT, tableOrder } from "./soccer";

const byNumber =
  (get: (team: SoccerTeam) => number | null | undefined) => (a: SoccerTeam, b: SoccerTeam) =>
    (get(b) ?? -1) - (get(a) ?? -1);

const SORTS: TeamSort<SoccerTeam>[] = [
  { value: "table", label: "League position", compare: tableOrder((team) => team.overall) },
  { value: "goals", label: "Most goals", compare: byNumber((team) => goalsFor(team.overall)) },
  {
    value: "xg",
    label: "Highest xG / game",
    compare: byNumber((team) => team.overall.xg_per_game),
  },
  { value: "name", label: "Club name", compare: (a, b) => a.team_name.localeCompare(b.team_name) },
];

const getId = (team: SoccerTeam) => team.team_pk;
const getName = (team: SoccerTeam) => team.team_name;

export default function SoccerTeamStatsIndex({ league: leagueKey }: { league: string }) {
  const league = getSoccerLeague(leagueKey);
  const query = useQuery(
    soccerSummaryQuery({
      league: league ?? {
        key: leagueKey,
        label: leagueKey,
        competitionName: leagueKey,
        seasonId: null,
      },
      location: "overall",
      lastN: 100,
    }),
  );

  if (!league) return <EmptyState>Unknown soccer competition: {leagueKey}</EmptyState>;

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${league.seasonId ?? "not set"}`}
        title="Team stats"
        description="Select a club to see goals, expected goals, shots, corners, cards and game-by-game charts."
      />
      {league.seasonId == null && (
        <Notice>Set the {league.label} season ID in your .env file.</Notice>
      )}
      <QueryState query={query} loadingLabel="Loading clubs…">
        {(data) => (
          <TeamPicker
            teams={data.teams}
            getId={getId}
            getName={getName}
            sport={SPORT}
            league={leagueKey}
            noun="clubs"
            sorts={SORTS}
            subtitle={(team) => {
              const s = team.overall;
              return `${s.games_played} GP · ${s.wins}W ${s.draws}D ${s.losses}L · ${points(s)} pts`;
            }}
            stats={(team) => [
              { label: "Goals / game", value: fmtNum(team.overall.goals_per_game, 2) },
              { label: "xG / game", value: fmtNum(team.overall.xg_per_game, 2) },
              { label: "Shots / game", value: fmtNum(team.overall.shots_per_game) },
            ]}
          />
        )}
      </QueryState>
    </Page>
  );
}
