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
import { periodScore, type FootballMatch } from "../../services/americanFootballService";
import { DualBarChart, ThresholdBarChart } from "../charts/BarCharts";
import { Card, Footnote, Legend, SectionHeader, SelectField } from "../ui";

const tick = (m: FootballMatch) => `${venuePrefix(m.location)}${teamAbbr(m.opponent_name)}`;
const title = (m: FootballMatch) => `${venuePrefix(m.location)} ${m.opponent_name}`;

/** Points won or lost by, each game (oldest to newest). */
export function MarginChart({ matches }: { matches: FootballMatch[] }) {
  const rows = [...matches].reverse().map((m) => {
    const margin = m.team_score - m.opponent_score;
    return {
      id: m.game_pk,
      label: tick(m),
      value: margin,
      tooltipTitle: title(m),
      tooltipLines: [`${fmtDate(m.game_date)} · ${m.score_line}`, `Margin ${fmtSigned(margin, 0)}`],
    };
  });
  return (
    <Card>
      <SectionHeader
        level={3}
        title="Margin of victory"
        description="Points won or lost by, each game. Zero means tied."
      />
      <div className="mt-3 overflow-x-auto">
        <div style={{ minWidth: rows.length * 44 }}>
          <ThresholdBarChart
            rows={rows}
            line={0}
            height={240}
            allowNegative
            colorFor={(value) => (value >= 0 ? CHART.accent : CHART.opponent)}
          />
        </div>
      </div>
      <Legend
        className="mt-2"
        items={[
          { label: "Win or tie", tone: "accent" },
          { label: "Loss", tone: "opponent" },
        ]}
      />
    </Card>
  );
}

/** Combined points per half with a line and summary for each half. */
export function HalvesChart({ matches }: { matches: FootballMatch[] }) {
  const [line, setLine] = useState(23.5);
  const rows = useMemo(
    () =>
      [...matches].reverse().map((m) => {
        const first = periodScore(m, "1H");
        const second = periodScore(m, "2H");
        const a = first ? first.team_score + first.opponent_score : null;
        const b = second ? second.team_score + second.opponent_score : null;
        return {
          id: m.game_pk,
          label: tick(m),
          a,
          b,
          tooltipTitle: title(m),
          tooltipLines: [`1st half ${a ?? "—"} · 2nd half ${b ?? "—"}`],
        };
      }),
    [matches],
  );
  const summary = (half: "1H" | "2H") => {
    const parts = matches.map((m) => periodScore(m, half)).filter((p) => p !== null);
    return {
      combined: average(parts.map((p) => p.team_score + p.opponent_score)),
      scored: average(parts.map((p) => p.team_score)),
      allowed: average(parts.map((p) => p.opponent_score)),
      wins: parts.filter((p) => p.team_score > p.opponent_score).length,
      hits: parts.filter((p) => p.team_score + p.opponent_score > line).length,
      n: parts.length,
    };
  };
  const halves = [
    { name: "1st half", color: CHART.accent, s: summary("1H") },
    { name: "2nd half", color: CHART.opponent, s: summary("2H") },
  ];
  return (
    <Card>
      <SectionHeader
        level={3}
        title="First half vs second half"
        description={`Combined points per half · dashed line = Over ${line.toFixed(1)}`}
        actions={
          <SelectField
            label="Half line"
            value={line}
            options={overOptions(range(9.5, 49.5))}
            onChange={setLine}
          />
        }
      />
      <div className="mt-3">
        <DualBarChart
          rows={rows}
          line={line}
          height={220}
          groupWidth={48}
          labels={false}
          series={[
            { key: "a", name: "1st half", color: CHART.accent },
            { key: "b", name: "2nd half", color: CHART.opponent },
          ]}
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {halves.map(({ name, color, s }) => (
          <div key={name} className="rounded-lg bg-surface-soft p-3 text-xs text-ink-soft">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span className="size-2 rounded-sm" style={{ background: color }} />
              {name}
            </p>
            <p className="stat mt-1 text-lg text-ink">
              {fmtNum(s.combined)}{" "}
              <span className="font-sans text-xs font-normal text-muted">combined / game</span>
            </p>
            <p>
              {fmtNum(s.scored)} scored · {fmtNum(s.allowed)} allowed
            </p>
            <p>
              Won {s.wins}/{s.n} · Over {line}: {s.hits}/{s.n}
            </p>
          </div>
        ))}
      </div>
      <Footnote className="mt-2">Halves without both quarter scores are left out.</Footnote>
    </Card>
  );
}
