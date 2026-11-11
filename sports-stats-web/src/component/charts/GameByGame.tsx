import { useMemo, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { CHART } from "../../lib/chartTheme";
import {
  DASH,
  average,
  fmtDate,
  fmtNum,
  fmtPct,
  hitRate,
  median,
  numbers,
  venuePrefix,
} from "../../lib/format";
import { teamAbbr } from "../../lib/teams";
import type { Venue } from "../../lib/types";
import {
  Card,
  Legend,
  LineStepper,
  SectionHeader,
  SegmentedControl,
  SelectField,
  type SelectOption,
} from "../ui";
import { ThresholdBarChart, type ThresholdRow } from "./BarCharts";

export type GameLike = {
  game_pk: number;
  game_date: string;
  location: Venue;
  opponent_name: string;
  score_line?: string;
};

export type GameMetric<M> = {
  key: string;
  label: string;
  description?: string;
  line: number;
  /** Stepper increment, or a fixed list of lines shown as a select. */
  step?: number;
  lines?: number[];
  value: (match: M) => number | null;
};

export type GameWindow = number | "season";

type GameByGameProps<M extends GameLike> = {
  /** Newest first. */
  matches: M[];
  metrics: GameMetric<M>[];
  windows?: GameWindow[];
  defaultWindow?: GameWindow;
  title?: string;
  /** Extra controls such as "Whose numbers". */
  controls?: ReactNode;
  /** Extra tooltip line for a game, e.g. the result description. */
  describe?: (match: M) => string;
};

const PAGE = 5;

const spanLabel = (span: GameWindow) => (span === "season" ? "Season" : `Last ${span}`);
const take = <M,>(matches: M[], span: GameWindow) =>
  span === "season" ? matches : matches.slice(0, span);

/** Metric tabs, hit-rate tiles, line control and a game-by-game bar chart. */
export function GameByGame<M extends GameLike>({
  matches,
  metrics,
  windows = [5, 10, 15, "season"],
  defaultWindow = 10,
  title = "Game by game",
  controls,
  describe,
}: GameByGameProps<M>) {
  const [metricKey, setMetricKey] = useState(metrics[0]?.key ?? "");
  const [span, setSpan] = useState<GameWindow>(defaultWindow);
  const [lines, setLines] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);

  const metric = metrics.find((item) => item.key === metricKey) ?? metrics[0];
  // Keyed by default line too, so a metric whose default changes starts fresh.
  const lineKey = metric ? `${metric.key}:${metric.line}` : "";
  const line = metric ? (lines[lineKey] ?? metric.line) : 0;
  const selected = useMemo(() => take(matches, span), [matches, span]);

  const rows = useMemo<ThresholdRow[]>(() => {
    if (!metric) return [];
    return [...selected].reverse().map((match) => {
      const value = metric.value(match);
      return {
        id: match.game_pk,
        label: `${venuePrefix(match.location)}${teamAbbr(match.opponent_name)}`,
        value,
        tooltipTitle: `${venuePrefix(match.location)} ${match.opponent_name}`,
        tooltipLines: [
          [fmtDate(match.game_date), describe?.(match), match.score_line]
            .filter(Boolean)
            .join(" · "),
          <strong key="value" className="text-accent-strong">
            {metric.label}: {value ?? "Not available"}
          </strong>,
        ],
      };
    });
  }, [selected, metric, describe]);

  if (!metric) return null;

  const values = numbers(rows.map((row) => row.value));
  const missing = rows.length - values.length;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  // Phones show five bars at a time; page 0 is the newest five.
  const mobileRows = rows.slice(
    Math.max(0, rows.length - (current + 1) * PAGE),
    rows.length - current * PAGE,
  );

  const setLine = (value: number) => setLines((previous) => ({ ...previous, [lineKey]: value }));
  const reset = () => setPage(0);
  const lineOptions: SelectOption<number>[] | null = metric.lines
    ? [...new Set([...metric.lines, line])]
        .sort((a, b) => a - b)
        .map((value) => ({ value, label: `Over ${value.toFixed(1)}` }))
    : null;

  return (
    <Card>
      <SectionHeader
        title={title}
        description={`${metric.description ?? metric.label} · oldest to newest`}
        actions={
          <SegmentedControl
            label="Chart statistic"
            size="sm"
            value={metric.key}
            options={metrics.map((item) => ({ value: item.key, label: item.label }))}
            onChange={(key) => {
              setMetricKey(key);
              reset();
            }}
          />
        }
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {windows.map((item) => {
          const rate = hitRate(take(matches, item).map(metric.value), line);
          const active = item === span;
          return (
            <button
              key={String(item)}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setSpan(item);
                reset();
              }}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink hover:border-line-strong",
              )}
            >
              <span className={cn("block text-2xs", active ? "text-white/70" : "text-muted")}>
                {spanLabel(item)}
              </span>
              <span className="stat block text-xl">{fmtPct(rate.pct)}</span>
              <span className={cn("block text-2xs", active ? "text-white/70" : "text-muted")}>
                {rate.hits} of {rate.total} over {line}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <dl className="flex gap-5">
          {[
            ["Average", fmtNum(average(values), 2)],
            ["Median", fmtNum(median(values), 1)],
            ["Range", values.length ? `${Math.min(...values)}–${Math.max(...values)}` : DASH],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-2xs text-muted">{label}</dt>
              <dd className="stat text-lg text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          {controls}
          {lineOptions ? (
            <SelectField label="Line" value={line} options={lineOptions} onChange={setLine} />
          ) : (
            <LineStepper label="Line" value={line} step={metric.step ?? 1} onChange={setLine} />
          )}
        </div>
      </div>

      {values.length === 0 ? (
        <p className="mt-4 grid h-48 place-items-center rounded-lg bg-surface-soft text-caption text-muted">
          No values available for these games.
        </p>
      ) : (
        <>
          <div className="mt-4 md:hidden">
            <ThresholdBarChart rows={mobileRows} line={line} height={260} compact />
            {pages > 1 && (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  disabled={current >= pages - 1}
                  onClick={() => setPage(current + 1)}
                  className="rounded-lg border border-line px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  ← Older
                </button>
                <span className="text-muted">
                  {current + 1} / {pages}
                </span>
                <button
                  type="button"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                  className="rounded-lg border border-line px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  Newer →
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 hidden md:block">
            <ThresholdBarChart
              key={`${metric.key}-${String(span)}`}
              rows={rows}
              line={line}
              brush={span === "season"}
            />
          </div>
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Legend
          items={[
            { label: `Over ${line.toFixed(1)}`, color: CHART.accent },
            { label: "Under or equal", color: CHART.neutral },
          ]}
        />
        <span className="text-2xs text-muted">
          {missing > 0 ? `${missing} games without data are excluded` : `${rows.length} games`}
          {span === "season" && rows.length > 15 && " · drag the navigator to see earlier games"}
        </span>
      </div>
    </Card>
  );
}
