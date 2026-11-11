import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, BAR_LABEL, CHART, VALUE_TICK } from "../../lib/chartTheme";

type TooltipRow = { tooltipTitle: string; tooltipLines: ReactNode[] };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: TooltipRow }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-line bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-ink">{row.tooltipTitle}</p>
      {row.tooltipLines.map((line, index) => (
        <p key={index} className="mt-1 text-muted first:text-muted">
          {line}
        </p>
      ))}
    </div>
  );
}

export type ThresholdRow = TooltipRow & {
  id: number | string;
  label: string;
  value: number | null;
};

type ThresholdBarChartProps = {
  rows: ThresholdRow[];
  /** Dashed reference line; bars above it are highlighted. */
  line: number;
  height?: number;
  compact?: boolean;
  /** Show a range navigator for long seasons. */
  brush?: boolean;
  /** Override bar colours (e.g. wins vs losses). */
  colorFor?: (value: number) => string;
  /** Let the y-axis go below zero (margins). */
  allowNegative?: boolean;
};

/** One bar per game, coloured by whether it beat the line. */
export function ThresholdBarChart({
  rows,
  line,
  height = 320,
  compact = false,
  brush = false,
  colorFor,
  allowNegative = false,
}: ThresholdBarChartProps) {
  const labels = new Map(rows.map((row) => [String(row.id), row.label]));
  const tick = (id: string | number) => labels.get(String(id)) ?? "";
  const fill = (value: number | null) => {
    if (value === null) return "transparent";
    if (colorFor) return colorFor(value);
    return value > line ? CHART.accent : CHART.neutral;
  };

  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart
        data={rows}
        margin={{ top: 24, right: compact ? 4 : 12, bottom: 4, left: compact ? -24 : -12 }}
        barCategoryGap={compact ? "18%" : "26%"}
      >
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="id"
          type="category"
          tickFormatter={tick}
          tick={{ ...AXIS_TICK, fontSize: compact ? 10 : 11 }}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <YAxis
          tick={VALUE_TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
          domain={[
            allowNegative ? "auto" : 0,
            (max: number) => Math.ceil(Math.max(max, line) * 1.15 + 1),
          ]}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.cursor }} />
        <ReferenceLine y={line} stroke={CHART.ink} strokeDasharray="5 4" strokeWidth={1.4} />
        <Bar dataKey="value" maxBarSize={44} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.id} fill={fill(row.value)} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            style={{ ...BAR_LABEL, fontSize: compact ? 10 : 11 }}
          />
        </Bar>
        {brush && rows.length > 15 && (
          <Brush
            dataKey="id"
            tickFormatter={tick}
            height={26}
            travellerWidth={10}
            stroke={CHART.accent}
            fill={CHART.cursor}
            startIndex={Math.max(0, rows.length - 15)}
            endIndex={rows.length - 1}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export type Series = { key: "a" | "b"; name: string; color: string; faded?: string };
export type DualRow = TooltipRow & {
  id: number | string;
  label: string;
  a: number | null;
  b: number | null;
};

type DualBarChartProps = {
  rows: DualRow[];
  series: [Series, Series];
  /** Optional dashed line; series with a faded colour dim bars at or under it. */
  line?: number;
  height?: number;
  /** Minimum px per group; the chart scrolls sideways on narrow screens. */
  groupWidth?: number;
  labels?: boolean;
  yMin?: number;
};

/** Two bars per group: scored vs allowed, 1st vs 2nd half, goals vs xG. */
export function DualBarChart({
  rows,
  series,
  line,
  height = 260,
  groupWidth = 0,
  labels = true,
  yMin = 0,
}: DualBarChartProps) {
  const ticks = new Map(rows.map((row) => [String(row.id), row.label]));
  const fill = (s: Series, value: number | null) =>
    line != null && s.faded && (value === null || value <= line) ? s.faded : s.color;

  return (
    <div className="min-w-0 overflow-x-auto">
      <div style={{ minWidth: rows.length * groupWidth }}>
        <ResponsiveContainer width="100%" height={height} minWidth={0}>
          <BarChart
            data={rows}
            margin={{ top: 24, right: 8, bottom: 4, left: -16 }}
            barCategoryGap="24%"
            barGap={3}
          >
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="id"
              type="category"
              tickFormatter={(id: string | number) => ticks.get(String(id)) ?? ""}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              tick={VALUE_TICK}
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
              domain={[yMin, (max: number) => Math.ceil(Math.max(max, line ?? 0) * 1.12 + 1)]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.cursor }} />
            {line != null && (
              <ReferenceLine y={line} stroke={CHART.ink} strokeDasharray="5 4" strokeWidth={1.4} />
            )}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                maxBarSize={30}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell key={row.id} fill={fill(s, row[s.key])} />
                ))}
                {labels && <LabelList dataKey={s.key} position="top" style={BAR_LABEL} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
