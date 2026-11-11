import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DualBarChart } from "../../component/charts/BarCharts";
import { GameByGame, type GameMetric } from "../../component/charts/GameByGame";
import {
  Breadcrumbs,
  Card,
  EmptyState,
  Footnote,
  FormStrip,
  Legend,
  LocationSwitch,
  Notice,
  Page,
  PageHeader,
  QueryState,
  ResultBadge,
  Section,
  SectionHeader,
  SelectField,
  StatStrip,
  TeamBadge,
} from "../../component/ui";
import { CHART } from "../../lib/chartTheme";
import {
  average,
  byNewest,
  DASH,
  fmtDate,
  fmtNum,
  fmtPct,
  fmtRecord,
  fmtSigned,
  toNumber,
} from "../../lib/format";
import { teamAbbr } from "../../lib/teams";
import { LOCATION_LABELS, type Location } from "../../lib/types";
import {
  getSoccerLeague,
  soccerMatchesQuery,
  soccerSummaryQuery,
  type SoccerMatch,
  type SoccerMatchStats,
} from "../../services/soccerService";
import { cards, matchResult, soccerForm, soccerResult, SPORT } from "./soccer";

type Source = "team" | "opponent" | "total";
type Side = SoccerMatch["team_stats"];

const SOURCE_OPTIONS = [
  { value: "team" as const, label: "Team" },
  { value: "opponent" as const, label: "Opponent" },
  { value: "total" as const, label: "Match total" },
];

const LAST_OPTIONS = [
  { value: 5, label: "5 games" },
  { value: 10, label: "10 games" },
  { value: 15, label: "15 games" },
  { value: 100, label: "Season" },
];

/** Combine team and opponent values; a total needs both sides. */
function bySource(source: Source, team: number | null, opponent: number | null) {
  if (source === "team") return team;
  if (source === "opponent") return opponent;
  return team === null || opponent === null ? null : team + opponent;
}

type ChartStat = {
  key: string;
  label: string;
  line: number;
  totalLine: number;
  read: (side: Side) => number | null;
};

const CHART_STATS: ChartStat[] = [
  {
    key: "shots",
    label: "Shots",
    line: 11.5,
    totalLine: 22.5,
    read: (side) => toNumber(side?.shots_total),
  },
  {
    key: "on-target",
    label: "On target",
    line: 3.5,
    totalLine: 7.5,
    read: (side) => toNumber(side?.shots_on_target),
  },
  {
    key: "corners",
    label: "Corners",
    line: 3.5,
    totalLine: 9.5,
    read: (side) => toNumber(side?.corners),
  },
  { key: "cards", label: "Cards", line: 1.5, totalLine: 3.5, read: cards },
];

function chartMetrics(source: Source): GameMetric<SoccerMatch>[] {
  const total = source === "total";
  return [
    {
      key: "goals",
      label: "Goals",
      line: total ? 2.5 : 1.5,
      lines: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
      value: (m) => bySource(source, toNumber(m.team_score), toNumber(m.opponent_score)),
    },
    ...CHART_STATS.map((stat) => ({
      key: stat.key,
      label: stat.label,
      line: total ? stat.totalLine : stat.line,
      value: (m: SoccerMatch) =>
        bySource(source, stat.read(m.team_stats), stat.read(m.opponent_stats)),
    })),
  ];
}

const avgStat = (matches: SoccerMatch[], field: keyof SoccerMatchStats) =>
  average(matches.map((m) => toNumber(m.team_stats?.[field])));
const total = (matches: SoccerMatch[], get: (m: SoccerMatch) => number | null) =>
  matches.reduce((sum, m) => sum + (get(m) ?? 0), 0);

function GoalsVsXg({ matches }: { matches: SoccerMatch[] }) {
  const rows = [...matches.slice(0, 5)].reverse().map((m) => {
    const xg = toNumber(m.team_stats?.expected_goals);
    return {
      id: m.game_pk,
      label: teamAbbr(m.opponent_name),
      a: m.team_score,
      b: xg,
      tooltipTitle: `vs ${m.opponent_name}`,
      tooltipLines: [
        `${fmtDate(m.game_date)} · ${m.score_line}`,
        `${m.team_score} goals · ${fmtNum(xg, 2)} xG`,
      ],
    };
  });
  return (
    <Card>
      <SectionHeader
        level={3}
        title="Goals vs expected goals"
        actions={
          <Legend
            items={[
              { label: "Goals", tone: "ink" },
              { label: "xG", tone: "mid" },
            ]}
          />
        }
      />
      <div className="mt-3">
        <DualBarChart
          rows={rows}
          height={250}
          series={[
            { key: "a", name: "Goals", color: CHART.ink },
            { key: "b", name: "xG", color: CHART.accentMid },
          ]}
        />
      </div>
      <Footnote className="mt-2">
        Latest five matches, oldest to newest. xG bars are omitted when unavailable.
      </Footnote>
    </Card>
  );
}

function Standouts({ matches }: { matches: SoccerMatch[] }) {
  const withXg = matches.filter((m) => toNumber(m.team_stats?.expected_goals) !== null);
  const xgDiff =
    total(withXg, (m) => m.team_score) -
    total(withXg, (m) => toNumber(m.team_stats?.expected_goals));
  const btts = matches.filter((m) => m.team_score > 0 && m.opponent_score > 0).length;
  const over = matches.filter((m) => m.team_score + m.opponent_score > 2.5).length;
  const reds = total(matches, (m) => toNumber(m.team_stats?.red_cards));
  const possession = matches
    .map((m) => toNumber(m.team_stats?.possession_pct))
    .filter((v): v is number => v !== null);

  const items = [
    withXg.length > 0 && {
      value: fmtSigned(xgDiff, 2),
      tone: "text-accent-strong",
      text: `Goals minus expected goals across ${withXg.length} matches with xG.`,
    },
    {
      value: `${btts}/${matches.length}`,
      tone: "text-ink",
      text: `Both teams scored in ${btts} matches; ${over} went over 2.5 goals.`,
    },
    possession.length > 0 && {
      value: fmtPct(Math.min(...possession)),
      tone: "text-ink",
      text: "Lowest possession share in these matches.",
    },
    { value: String(reds), tone: "text-danger", text: "Red cards across these matches." },
  ].filter((item): item is { value: string; tone: string; text: string } => !!item);

  return (
    <Card tone="soft" as="aside">
      <h3>What stands out</h3>
      <dl className="mt-4 flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.text} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
            <dt className={`stat text-lg ${item.tone}`}>{item.value}</dt>
            <dd className="text-caption text-ink-soft">{item.text}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function PairRow({
  label,
  team,
  opponent,
  format,
}: {
  label: string;
  team: number | null;
  opponent: number | null;
  format?: (n: number) => string;
}) {
  const show = (value: number | null) =>
    value === null ? DASH : format ? format(value) : String(Number(value.toFixed(2)));
  const sum = Math.max((team ?? 0) + (opponent ?? 0), 1);
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs">
      <span className="font-semibold text-ink tabular-nums">{show(team)}</span>
      <div className="min-w-0">
        <p className="mb-1 text-center text-2xs text-muted">{label}</p>
        <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface">
          {team !== null && opponent !== null && (
            <>
              <div className="rounded-full bg-accent" style={{ width: `${(team / sum) * 100}%` }} />
              <div
                className="rounded-full bg-opponent"
                style={{ width: `${(opponent / sum) * 100}%` }}
              />
            </>
          )}
        </div>
      </div>
      <span className="text-right text-muted tabular-nums">{show(opponent)}</span>
    </div>
  );
}

function MatchCard({ match }: { match: SoccerMatch }) {
  const t = match.team_stats;
  const o = match.opponent_stats;
  const result = soccerResult(match);
  const rows = [
    {
      label: "Possession",
      team: toNumber(t?.possession_pct),
      opponent: toNumber(o?.possession_pct),
      format: (x: number) => `${Math.round(x)}%`,
    },
    { label: "Shots", team: toNumber(t?.shots_total), opponent: toNumber(o?.shots_total) },
    {
      label: "On target",
      team: toNumber(t?.shots_on_target),
      opponent: toNumber(o?.shots_on_target),
    },
    {
      label: "Expected goals",
      team: toNumber(t?.expected_goals),
      opponent: toNumber(o?.expected_goals),
    },
    { label: "Corners", team: toNumber(t?.corners), opponent: toNumber(o?.corners) },
    { label: "Fouls", team: toNumber(t?.fouls), opponent: toNumber(o?.fouls) },
    { label: "Cards", team: cards(t), opponent: cards(o) },
    { label: "Tackles", team: toNumber(t?.tackles), opponent: toNumber(o?.tackles) },
  ];
  return (
    <Card as="article">
      <div className="flex items-start justify-between gap-3 border-b border-line-soft pb-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            {fmtDate(match.game_date)} · {LOCATION_LABELS[match.location]}
          </p>
          <h3 className="truncate">vs {match.opponent_name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="stat text-xl text-ink">
            {match.team_score}–{match.opponent_score}
          </span>
          <ResultBadge {...result} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <PairRow key={row.label} {...row} />
        ))}
      </div>
      {!o && <Footnote className="mt-3">Opponent stats not available for this match.</Footnote>}
    </Card>
  );
}

export default function SoccerTeamStats({
  league: leagueKey,
  teamId,
}: {
  league: string;
  teamId: string;
}) {
  const league = getSoccerLeague(leagueKey) ?? {
    key: leagueKey,
    label: leagueKey,
    competitionName: leagueKey,
    seasonId: null,
  };
  const [location, setLocation] = useState<Location>("overall");
  const [lastN, setLastN] = useState(5);
  const [source, setSource] = useState<Source>("team");

  const summary = useQuery(soccerSummaryQuery({ league, location: "overall", lastN: 100 }));
  const team = summary.data?.teams.find((item) => String(item.team_pk) === teamId);
  const history = useQuery(soccerMatchesQuery(league, team?.team_name, location));

  const allMatches = useMemo(() => byNewest(history.data?.matches), [history.data]);
  const matches = useMemo(() => allMatches.slice(0, lastN), [allMatches, lastN]);
  const metrics = useMemo(() => chartMetrics(source), [source]);

  const count = (result: string) => matches.filter((m) => matchResult(m) === result).length;
  const goals = total(matches, (m) => m.team_score);
  const conceded = total(matches, (m) => m.opponent_score);
  const perGame = (value: number) => fmtNum(matches.length ? value / matches.length : null, 2);
  const xg = avgStat(matches, "expected_goals");
  const shots = avgStat(matches, "shots_total");
  const yellows = total(matches, (m) => toNumber(m.team_stats?.yellow_cards));
  const reds = total(matches, (m) => toNumber(m.team_stats?.red_cards));

  return (
    <Page>
      <Breadcrumbs
        sport={SPORT}
        league={leagueKey}
        items={[
          { label: "Soccer" },
          { label: league.label, section: "team-summary" },
          { label: team?.team_name ?? `Team ${teamId}` },
        ]}
      />
      {league.seasonId == null && (
        <Notice>Set the {league.label} season ID in your .env file.</Notice>
      )}
      <QueryState query={summary} loadingLabel="Loading club…">
        {() =>
          !team ? (
            <EmptyState>
              Team ID {teamId} was not found in {league.label} this season.
            </EmptyState>
          ) : (
            <>
              <PageHeader
                leading={<TeamBadge name={team.team_name} size="lg" tone="dark" round />}
                eyebrow={`${league.label} · Season ${league.seasonId} · ${LOCATION_LABELS[location]}`}
                title={team.team_name}
                meta={
                  <span className="flex flex-wrap items-center gap-2">
                    Last {Math.min(5, allMatches.length)}{" "}
                    {location === "overall" ? "games" : `at ${location}`}
                    <FormStrip results={soccerForm(allMatches)} />
                  </span>
                }
                actions={
                  <>
                    <LocationSwitch value={location} onChange={setLocation} />
                    <SelectField
                      label="Last"
                      value={lastN}
                      options={LAST_OPTIONS}
                      onChange={setLastN}
                    />
                  </>
                }
              />
              <QueryState query={history} loadingLabel={`Loading ${team.team_name} matches…`}>
                {() => (
                  <>
                    <StatStrip
                      className="md:grid-cols-4 xl:grid-cols-7"
                      items={[
                        {
                          label: "Record",
                          value: fmtRecord(count("W"), count("D"), count("L")),
                          detail: "W–D–L",
                        },
                        {
                          label: "Goals",
                          value: `${goals}–${conceded}`,
                          detail: `${perGame(goals)} for · ${perGame(conceded)} against`,
                        },
                        {
                          label: "xG per game",
                          value: fmtNum(xg, 2),
                          detail:
                            xg === null
                              ? "Expected goals"
                              : `${fmtSigned(goals / Math.max(1, matches.length) - xg, 2)} goals over xG`,
                          accent: true,
                        },
                        {
                          label: "Possession",
                          value: fmtPct(avgStat(matches, "possession_pct"), 1),
                          detail: "average share",
                        },
                        {
                          label: "Shots",
                          value: fmtNum(shots),
                          detail: `${fmtNum(avgStat(matches, "shots_on_target"))} on target`,
                        },
                        {
                          label: "Corners",
                          value: fmtNum(avgStat(matches, "corners")),
                          detail: "per game",
                        },
                        {
                          label: "Tackles",
                          value: fmtNum(avgStat(matches, "tackles")),
                          detail: `${yellows} yellow · ${reds} red`,
                        },
                      ]}
                    />
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                      <GoalsVsXg matches={matches} />
                      <Standouts matches={matches} />
                    </div>
                    <GameByGame
                      key={location}
                      matches={allMatches}
                      metrics={metrics}
                      defaultWindow={5}
                      controls={
                        <SelectField
                          label="Whose numbers"
                          value={source}
                          options={SOURCE_OPTIONS}
                          onChange={setSource}
                        />
                      }
                    />
                    <Section
                      title="Match by match"
                      actions={
                        <Legend
                          items={[
                            { label: team.team_name, tone: "accent" },
                            { label: "Opponent", tone: "opponent" },
                          ]}
                        />
                      }
                    >
                      {matches.length ? (
                        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {matches.map((match) => (
                            <MatchCard key={match.game_pk} match={match} />
                          ))}
                        </div>
                      ) : (
                        <EmptyState>No completed games for these filters.</EmptyState>
                      )}
                    </Section>
                    <Footnote>
                      Per-game averages use only matches with that stat available. A — means the
                      value is missing; no zeros are substituted.
                    </Footnote>
                  </>
                )}
              </QueryState>
            </>
          )
        }
      </QueryState>
    </Page>
  );
}
