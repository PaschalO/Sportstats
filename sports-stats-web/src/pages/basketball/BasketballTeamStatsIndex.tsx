import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TeamPicker, type TeamSort } from "../../component/teams/TeamPicker";
import {
  EmptyState,
  FormStrip,
  LocationSwitch,
  Notice,
  Page,
  PageHeader,
  QueryState,
} from "../../component/ui";
import { fmtNum, fmtPct, fmtRecord } from "../../lib/format";
import type { Location } from "../../lib/types";
import {
  basketballSummaryQuery,
  getBasketballLeague,
  type BasketballTeam,
} from "../../services/basketballService";
import { basketballForm, SPORT } from "./basketball";

const getId = (team: BasketballTeam) => team.team_pk;
const getName = (team: BasketballTeam) => team.team_name;

function sorts(location: Location): TeamSort<BasketballTeam>[] {
  return [
    {
      value: "win",
      label: "Highest win %",
      compare: (a, b) => b[location].win_pct - a[location].win_pct,
    },
    {
      value: "points",
      label: "Most points / game",
      compare: (a, b) => b[location].points_for_per_game - a[location].points_for_per_game,
    },
    {
      value: "allowed",
      label: "Fewest allowed / game",
      compare: (a, b) => a[location].points_against_per_game - b[location].points_against_per_game,
    },
    {
      value: "name",
      label: "Team name",
      compare: (a, b) => a.team_name.localeCompare(b.team_name),
    },
  ];
}

/** Team picker shared by NBA, NCAAB, WNBA and NBL. */
export default function BasketballTeamStatsIndex({ league: leagueKey }: { league: string }) {
  const league = getBasketballLeague(leagueKey);
  const [location, setLocation] = useState<Location>("overall");
  const query = useQuery(
    basketballSummaryQuery({
      league: league ?? {
        key: "nba",
        label: leagueKey,
        competitionName: leagueKey,
        seasonId: null,
      },
      location: "overall",
      lastN: 100,
    }),
  );

  if (!league) return <EmptyState>Unknown basketball competition: {leagueKey}</EmptyState>;

  return (
    <Page>
      <PageHeader
        eyebrow={`${league.label} · Season ${league.seasonId ?? "not set"}`}
        title="Team stats"
        description="Select a team to explore game-by-game scoring, quarters or halves, home and away splits and match history."
        actions={<LocationSwitch value={location} onChange={setLocation} />}
      />
      {league.seasonId == null && (
        <Notice>Set the {league.label} season ID in your .env file.</Notice>
      )}
      <QueryState query={query} loadingLabel="Loading teams…">
        {(data) => (
          <TeamPicker
            key={location}
            teams={data.teams}
            getId={getId}
            getName={getName}
            sport={SPORT}
            league={leagueKey}
            sorts={sorts(location)}
            subtitle={(team) =>
              `${fmtRecord(team[location].wins, team[location].losses)} · ${team[location].games_played} games`
            }
            stats={(team) => [
              { label: "Win %", value: fmtPct(team[location].win_pct) },
              { label: "PTS / game", value: fmtNum(team[location].points_for_per_game) },
              { label: "OPP / game", value: fmtNum(team[location].points_against_per_game) },
            ]}
            footer={(team) => (
              <div className="flex items-center justify-between border-t border-line-soft pt-3 text-xs text-muted">
                Last 5 <FormStrip results={basketballForm(team[location].matches)} />
              </div>
            )}
          />
        )}
      </QueryState>
    </Page>
  );
}
