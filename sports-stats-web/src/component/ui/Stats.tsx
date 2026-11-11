import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { clampPct } from "../../lib/format";

const STAT_TONES = {
  default: {
    card: "border-line bg-white",
    label: "text-muted",
    value: "text-ink",
    detail: "text-ink-soft",
  },
  accent: {
    card: "border-accent-soft bg-accent-tint",
    label: "text-accent-strong",
    value: "text-accent-strong",
    detail: "text-ink-soft",
  },
  dark: {
    card: "border-ink bg-ink",
    label: "text-white/70",
    value: "text-white",
    detail: "text-white",
  },
} as const;

export type StatTone = keyof typeof STAT_TONES;

type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  /** Small text after the number, e.g. "pts · 8W 0D 1L". */
  unit?: ReactNode;
  detail?: ReactNode;
  sub?: ReactNode;
  tone?: StatTone;
};

/** Highlight card: "Best record / 11–5 / Boston Bruins". */
export function StatCard({ label, value, unit, detail, sub, tone = "default" }: StatCardProps) {
  const t = STAT_TONES[tone];
  return (
    <article className={cn("min-w-0 rounded-xl border p-4 sm:p-5", t.card)}>
      <p className={cn("text-xs font-medium", t.label)}>{label}</p>
      <p className={cn("stat mt-1 text-stat", t.value)}>
        {value}
        {unit && (
          <span className="ml-1.5 font-sans text-caption font-normal opacity-75">{unit}</span>
        )}
      </p>
      {detail && <p className={cn("mt-1 truncate text-caption font-medium", t.detail)}>{detail}</p>}
      {sub && <p className={cn("mt-1 text-xs", t.label)}>{sub}</p>}
    </article>
  );
}

/** Summary highlight cards: two per row on phones, one row of up to five on desktop. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:auto-cols-fr xl:grid-flow-col xl:grid-cols-none">
      {children}
    </div>
  );
}

export type StripItem = { label: string; value: ReactNode; detail?: ReactNode; accent?: boolean };

/** Joined KPI row used on team pages. Columns are set by the caller. */
export function StatStrip({ items, className }: { items: StripItem[]; className?: string }) {
  return (
    <section
      aria-label="Key statistics"
      className="overflow-hidden rounded-xl border border-line bg-white"
    >
      {/* Negative margins hide the trailing borders whatever the column count. */}
      <div className={cn("-mr-px -mb-px grid grid-cols-2", className)}>
        {items.map((item) => (
          <article
            key={item.label}
            className={cn(
              "min-w-0 border-r border-b border-line-soft p-4",
              item.accent && "bg-accent-tint",
            )}
          >
            <p
              className={cn(
                "text-xs font-medium",
                item.accent ? "text-accent-strong" : "text-muted",
              )}
            >
              {item.label}
            </p>
            <p
              className={cn(
                "stat mt-1 text-2xl break-words",
                item.accent ? "text-accent-strong" : "text-ink",
              )}
            >
              {item.value}
            </p>
            {item.detail && <p className="mt-1 text-xs text-muted">{item.detail}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

/** Label-over-value pair for compact cards. */
export function MiniStat({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate text-2xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

const BAR_TONES = {
  accent: "bg-accent",
  ink: "bg-ink",
  opponent: "bg-opponent",
  mid: "bg-accent-mid",
  muted: "bg-line-strong",
} as const;

export type BarTone = keyof typeof BAR_TONES;

/** Thin horizontal bar, optionally with a reference marker (e.g. league average). */
export function MetricBar({
  pct,
  tone = "accent",
  marker,
  className,
}: {
  pct: number;
  tone?: BarTone;
  marker?: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn("relative h-1.5 min-w-0 rounded-full bg-surface", className)}
      aria-hidden="true"
    >
      <div
        className={cn("h-full rounded-full", BAR_TONES[tone])}
        style={{ width: `${clampPct(pct)}%` }}
      />
      {marker != null && (
        <span
          className="absolute -top-1 h-3.5 w-px bg-ink/50"
          style={{ left: `${clampPct(marker)}%` }}
        />
      )}
    </div>
  );
}

export type LegendItem = { label: ReactNode; tone?: BarTone; color?: string };

export function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted", className)}
    >
      {items.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          <span
            className={cn("size-2 rounded-sm", item.tone && BAR_TONES[item.tone])}
            style={item.color ? { background: item.color } : undefined}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
