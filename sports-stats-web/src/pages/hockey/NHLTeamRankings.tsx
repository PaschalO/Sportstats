import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RankingCard, RankingList, type RankingItem } from "../../component/rankings/RankingCards";
import {
  Card,
  Footnote,
  LocationSwitch,
  Page,
  PageHeader,
  QueryState,
  SectionHeader,
  SelectField,
  type BarTone,
} from "../../component/ui";
import { LOCATION_LABELS, type Location } from "../../lib/types";
import {
  DEFAULT_NHL_FILTERS,
  NHL_SEASON_ID,
  nhlSummaryQuery,
  type NHLFilters,
  type NHLLocationSummary,
  type NHLTeam,
} from "../../services/nhlService";
import { LAST_GAMES_OPTIONS, PERIOD_LINE_OPTIONS, SPORT } from "./nhl";

type Ranking = {
  id: string;
  title: string;
  unit: string;
  tone: BarTone;
  lowerIsBetter?: boolean;
  /** Line-dependent titles get "Over x" appended. */
  periodLine?: boolean;
  format: (value: number) => string;
  /** Which split to read; home/away record cards ignore the location filter. */
  split?: (team: NHLTeam, location: Location) => NHLLocationSummary;
  value: (summary: NHLLocationSummary) => number | null;
};

const average = (value: number) => value.toFixed(2);
const shots = (value: number) => value.toFixed(1);
const percent = (value: number) => `${Math.round(value)}%`;
const played = (s: NHLLocationSummary, value: number) => (s.games_played > 0 ? value : null);

const RANKINGS: Ranking[] = [
  {
    id: "goals-for",
    title: "Goals for",
    unit: "per game",
    tone: "ink",
    format: average,
    value: (s) => played(s, s.goals_per_game),
  },
  {
    id: "goals-against",
    title: "Fewest goals against",
    unit: "per game",
    tone: "ink",
    lowerIsBetter: true,
    format: average,
    value: (s) => played(s, s.goals_against_per_game),
  },
  {
    id: "total-goals",
    title: "Highest total goals",
    unit: "per game",
    tone: "opponent",
    format: average,
    value: (s) => played(s, s.total_goals_per_game),
  },
  {
    id: "first-period",
    title: "1st period",
    unit: "hit rate",
    tone: "accent",
    periodLine: true,
    format: percent,
    value: (s) => s.first_period?.percentage ?? null,
  },
  {
    id: "second-period",
    title: "2nd period",
    unit: "hit rate",
    tone: "accent",
    periodLine: true,
    format: percent,
    value: (s) => s.second_period?.percentage ?? null,
  },
  {
    id: "third-period",
    title: "3rd period",
    unit: "hit rate",
    tone: "accent",
    periodLine: true,
    format: percent,
    value: (s) => s.third_period?.percentage ?? null,
  },
  {
    id: "shots-for",
    title: "Shots for",
    unit: "per game",
    tone: "ink",
    format: shots,
    value: (s) => (s.games_with_stats > 0 ? s.shots_per_game : null),
  },
  {
    id: "shots-against",
    title: "Shots against",
    unit: "per game · most allowed",
    tone: "opponent",
    format: shots,
    value: (s) => (s.games_with_stats > 0 ? s.shots_against_per_game : null),
  },
  {
    id: "home-record",
    title: "Best home record",
    unit: "win %",
    tone: "ink",
    format: percent,
    split: (team) => team.home,
    value: (s) => played(s, s.win_pct),
  },
  {
    id: "away-record",
    title: "Best away record",
    unit: "win %",
    tone: "ink",
    format: percent,
    split: (team) => team.away,
    value: (s) => played(s, s.win_pct),
  },
];

/** Ties fall back to win %, then games played, then name. */
function rank(teams: NHLTeam[], ranking: Ranking, location: Location): RankingItem[] {
  return teams
    .flatMap((team) => {
      const split = ranking.split?.(team, location) ?? team[location];
      const value = ranking.value(split);
      return value == null || !Number.isFinite(value)
        ? []
        : [
            {
              id: team.team_pk,
              name: team.team_name,
              value,
              gamesPlayed: split.games_played,
              winPct: split.win_pct,
            },
          ];
    })
    .sort(
      (a, b) =>
        (ranking.lowerIsBetter ? a.value - b.value : b.value - a.value) ||
        b.winPct - a.winPct ||
        b.gamesPlayed - a.gamesPlayed ||
        a.name.localeCompare(b.name),
    );
}

export default function NHLTeamRankings({ league }: { league: string }) {
  const [filters, setFilters] = useState<NHLFilters>(DEFAULT_NHL_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useQuery(nhlSummaryQuery(filters));
  const update = (change: Partial<NHLFilters>) =>
    setFilters((current) => ({ ...current, ...change }));

  const rankings = useMemo(
    () =>
      RANKINGS.map((ranking) => ({
        ranking,
        items: rank(query.data?.teams ?? [], ranking, filters.location),
      })),
    [query.data, filters.location],
  );
  const title = (ranking: Ranking) =>
    ranking.periodLine ? `${ranking.title} Over ${filters.periodLine}` : ranking.title;
  const open = rankings.find(({ ranking }) => ranking.id === openId);

  return (
    <Page>
      <PageHeader
        eyebrow={`${query.data?.competition_name ?? "NHL"} · Season ${query.data?.competition_season_id ?? NHL_SEASON_ID} · ${LOCATION_LABELS[filters.location]}`}
        title="Team stats rankings"
        description={`The top five teams in each category. Select a card to see the full ${query.data?.teams_found ?? 32}-team ranking.`}
        actions={
          <>
            <LocationSwitch
              value={filters.location}
              onChange={(location) => update({ location })}
            />
            <SelectField
              label="Last"
              value={filters.lastGames}
              options={LAST_GAMES_OPTIONS}
              onChange={(lastGames) => update({ lastGames })}
            />
            <SelectField
              label="Period line"
              value={filters.periodLine}
              options={PERIOD_LINE_OPTIONS}
              onChange={(periodLine) => update({ periodLine })}
            />
          </>
        }
      />

      <QueryState query={query} loadingLabel="Loading NHL rankings…">
        {() =>
          open ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="self-start text-caption font-semibold text-accent hover:text-accent-strong"
              >
                <span aria-hidden="true">←</span> All ranking categories
              </button>
              <Card>
                <SectionHeader
                  title={title(open.ranking)}
                  description={`${open.ranking.unit} · ${open.items.length} teams ranked · ${LOCATION_LABELS[filters.location]}`}
                />
                <div className="mt-3">
                  <RankingList
                    full
                    items={open.items}
                    format={open.ranking.format}
                    tone={open.ranking.tone}
                    lowerIsBetter={open.ranking.lowerIsBetter}
                    sport={SPORT}
                    league={league}
                  />
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rankings.map(({ ranking, items }) => (
                <RankingCard
                  key={ranking.id}
                  title={title(ranking)}
                  unit={ranking.unit}
                  items={items}
                  format={ranking.format}
                  tone={ranking.tone}
                  lowerIsBetter={ranking.lowerIsBetter}
                  sport={SPORT}
                  league={league}
                  onOpen={() => setOpenId(ranking.id)}
                />
              ))}
            </div>
          )
        }
      </QueryState>

      <Footnote>
        Ties share a value; order within a tie follows win %. Period columns read as the share of
        games with more than {filters.periodLine} total goals in that period. Home and away record
        cards always use that split.
      </Footnote>
    </Page>
  );
}
