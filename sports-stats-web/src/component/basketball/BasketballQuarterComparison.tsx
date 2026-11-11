import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { average, fmtNum, overOptions, range } from "../../lib/format";
import {
  basketballPeriodLine,
  isHalvesFeed,
  periodDefinitions,
  periodScore,
  type BasketballMatch,
  type PeriodDefinition,
} from "../../services/basketballService";
import { Card, Footnote, MiniStat, Section, SelectField } from "../ui";

type PeriodGame = {
  id: number;
  opponent: string;
  team: number;
  opponent_points: number;
  total: number;
};

function periodGames(matches: BasketballMatch[], key: string): PeriodGame[] {
  return matches.flatMap((m) => {
    const score = periodScore(m, key);
    return score
      ? [
          {
            id: m.game_pk,
            opponent: m.opponent_name,
            team: score.team_points,
            opponent_points: score.opponent_points,
            total: score.team_points + score.opponent_points,
          },
        ]
      : [];
  });
}

function PeriodCard({
  period,
  games,
  line,
  best,
}: {
  period: PeriodDefinition;
  games: PeriodGame[];
  line: number;
  best: boolean;
}) {
  // Up to 12 recent games, oldest to newest.
  const recent = games.slice(0, 12).reverse();
  const totals = games.map((g) => g.total);
  const low = Math.max(0, Math.floor((Math.min(line, ...totals) - 8) / 5) * 5);
  const high = Math.ceil((Math.max(line, ...totals) + 4) / 5) * 5;
  const pct = (value: number) => Math.max(1.5, ((value - low) / Math.max(1, high - low)) * 100);
  const won = games.filter((g) => g.team > g.opponent_points).length;
  const hits = totals.filter((t) => t > line).length;

  return (
    <Card as="article" tone={best ? "accent" : "default"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3>{period.title}</h3>
        <span className="text-xs font-semibold text-accent-strong">
          {hits} of {games.length} over
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Total" value={fmtNum(average(totals))} />
        <MiniStat label="Scored" value={fmtNum(average(games.map((g) => g.team)))} />
        <MiniStat label="Won" value={`${won}/${games.length}`} />
      </div>
      <div
        className="relative mt-4 h-20"
        role="img"
        aria-label={`${period.title}: ${hits} of ${games.length} games over ${line}`}
      >
        <div
          className="absolute inset-x-0 border-t border-dashed border-ink/60"
          style={{ bottom: `${pct(line)}%` }}
        />
        <div className="absolute inset-0 flex items-end gap-1">
          {recent.map((game) => (
            <div
              key={game.id}
              title={`${game.opponent} · ${game.team}–${game.opponent_points} · ${game.total} combined`}
              className={cn(
                "min-w-0 flex-1 rounded-t-sm",
                game.total > line ? "bg-accent" : "bg-line-strong",
              )}
              style={{ height: `${pct(game.total)}%` }}
            />
          ))}
          {!recent.length && <p className="m-auto text-xs text-muted">No data</p>}
        </div>
      </div>
    </Card>
  );
}

/** One card per quarter (or half) with a mini chart of recent games. */
export default function BasketballQuarterComparison({
  matches,
  leagueKey,
}: {
  matches: BasketballMatch[];
  leagueKey: string;
}) {
  const start = basketballPeriodLine(leagueKey);
  const [line, setLine] = useState(start);
  const periods = useMemo(() => periodDefinitions(matches, leagueKey), [matches, leagueKey]);
  const data = useMemo(
    () => periods.map((period) => ({ period, games: periodGames(matches, period.key) })),
    [matches, periods],
  );
  const best = [...data].sort(
    (a, b) =>
      (average(b.games.map((g) => g.team)) ?? 0) - (average(a.games.map((g) => g.team)) ?? 0),
  )[0]?.period.key;
  const halves = isHalvesFeed(periods);
  const unit = halves ? "half" : "quarter";

  return (
    <Section
      title={halves ? "Half by half" : "Quarter by quarter"}
      description={`Combined points in each ${unit}, every game. Dashed line = Over ${line.toFixed(1)}.`}
      actions={
        <SelectField
          label={`${halves ? "Half" : "Quarter"} line`}
          value={line}
          options={overOptions(range(Math.max(0.5, start - 30), start + 30, 1))}
          onChange={setLine}
        />
      }
    >
      {data.length ? (
        <div className={cn("grid gap-4 sm:grid-cols-2", data.length > 2 && "xl:grid-cols-4")}>
          {data.map(({ period, games }) => (
            <PeriodCard
              key={period.key}
              period={period}
              games={games}
              line={line}
              best={period.key === best}
            />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-caption text-muted">No usable period scores were returned.</p>
        </Card>
      )}
      <Footnote>
        Mini charts show up to 12 recent games. Highlighted card = strongest scoring {unit}. "Won"
        means the team outscored its opponent in that {unit}; ties do not count.
      </Footnote>
    </Section>
  );
}
