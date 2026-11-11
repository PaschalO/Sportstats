import { useMemo, useState } from "react";
import { CHART } from "../../lib/chartTheme";
import {
  average,
  fmtDate,
  fmtNum,
  fmtSigned,
  overOptions,
  range,
  venuePrefix,
} from "../../lib/format";
import { teamAbbr } from "../../lib/teams";
import {
  basketballHalfLine,
  halfScore,
  type BasketballMatch,
} from "../../services/basketballService";
import { DualBarChart } from "../charts/BarCharts";
import { Card, Footnote, Legend, MiniStat, Section, SelectField } from "../ui";

type Half = "1H" | "2H";

function summarize(matches: BasketballMatch[], half: Half, line: number, leagueKey: string) {
  const scores = matches.map((m) => halfScore(m, half, leagueKey)).filter((s) => s !== null);
  const scored = average(scores.map((s) => s.team_points));
  const allowed = average(scores.map((s) => s.opponent_points));
  return {
    games: scores.length,
    total: scored === null || allowed === null ? null : scored + allowed,
    scored,
    allowed,
    margin: scored === null || allowed === null ? null : scored - allowed,
    wins: scores.filter((s) => s.team_points > s.opponent_points).length,
    hits: scores.filter((s) => s.team_points + s.opponent_points > line).length,
  };
}

type Summary = ReturnType<typeof summarize>;

function HalfCard({
  title,
  stats,
  line,
  color,
}: {
  title: string;
  stats: Summary;
  line: number;
  color: string;
}) {
  return (
    <Card as="article">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: color }} />
          {title}
        </h3>
        <span className="text-xs font-semibold text-ink-soft">
          {stats.hits} of {stats.games} over {line.toFixed(1)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <MiniStat label="Total" value={fmtNum(stats.total)} />
        <MiniStat label="Scored" value={fmtNum(stats.scored)} />
        <MiniStat label="Allowed" value={fmtNum(stats.allowed)} />
        <MiniStat label="Won" value={`${stats.wins}/${stats.games}`} />
      </div>
    </Card>
  );
}

/** Combined points per half for every game, with a summary for each half. */
export default function BasketballHalfComparison({
  matches,
  leagueKey,
  teamName,
}: {
  matches: BasketballMatch[];
  leagueKey: string;
  teamName: string;
}) {
  const start = basketballHalfLine(leagueKey);
  const [line, setLine] = useState(start);
  const first = summarize(matches, "1H", line, leagueKey);
  const second = summarize(matches, "2H", line, leagueKey);

  const rows = useMemo(
    () =>
      [...matches]
        .reverse()
        .map((m) => {
          const first = halfScore(m, "1H", leagueKey);
          const second = halfScore(m, "2H", leagueKey);
          const a = first ? first.team_points + first.opponent_points : null;
          const b = second ? second.team_points + second.opponent_points : null;
          return {
            id: m.game_pk,
            label: `${venuePrefix(m.location)}${teamAbbr(m.opponent_name)}`,
            a,
            b,
            tooltipTitle: `${venuePrefix(m.location)} ${m.opponent_name}`,
            tooltipLines: [fmtDate(m.game_date), `1st half ${a ?? "—"} · 2nd half ${b ?? "—"}`],
          };
        })
        .filter((row) => row.a !== null || row.b !== null),
    [matches, leagueKey],
  );
  const low = Math.min(...rows.flatMap((row) => [row.a ?? Infinity, row.b ?? Infinity]));
  // Start the axis near the lowest half so the differences stay visible.
  const yMin = Number.isFinite(low) ? Math.max(0, Math.min(80, Math.floor(low / 10) * 10 - 10)) : 0;

  return (
    <Section
      title="First half vs second half"
      description={`Combined points in each half, every game. Dashed line = Over ${line.toFixed(1)}.`}
      actions={
        <SelectField
          label="Half line"
          value={line}
          options={overOptions(range(Math.max(0.5, start - 55), start + 55, 5))}
          onChange={setLine}
        />
      }
    >
      {rows.length === 0 ? (
        <Card>
          <p className="text-caption text-muted">
            Half scores are not available for these {matches.length} matches. Expected Q1–Q4, NCAAB
            Q1/Q2 halves, or explicit 1H/2H.
          </p>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3>Half totals by game</h3>
              <Legend
                items={[
                  { label: "1st half", color: CHART.accent },
                  { label: "2nd half", color: CHART.opponent },
                ]}
              />
            </div>
            <div className="mt-3">
              <DualBarChart
                rows={rows}
                line={line}
                yMin={yMin}
                height={280}
                groupWidth={64}
                series={[
                  { key: "a", name: "1st half", color: CHART.accent, faded: CHART.accentFaded },
                  { key: "b", name: "2nd half", color: CHART.opponent, faded: CHART.opponentFaded },
                ]}
              />
            </div>
            <Footnote className="mt-2">
              Faded bars are at or under the line. Overtime is excluded.
            </Footnote>
          </Card>
          <div className="flex min-w-0 flex-col gap-3">
            <HalfCard title="1st half" stats={first} line={line} color={CHART.accent} />
            <HalfCard title="2nd half" stats={second} line={line} color={CHART.opponent} />
            <Card tone="soft" className="text-caption text-ink-soft">
              {teamName} averages <strong className="text-ink">{fmtSigned(first.margin)}</strong>{" "}
              points of margin in the first half and{" "}
              <strong className="text-ink">{fmtSigned(second.margin)}</strong> in the second.
            </Card>
          </div>
        </div>
      )}
    </Section>
  );
}
