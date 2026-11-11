import { cn } from "../../lib/cn";
import { fmtPct } from "../../lib/format";
import { rateBands, rateTone, type RateScale, type RateTone } from "../../lib/rates";
import type { FormResult, ResultTone } from "../../lib/results";
import { teamAbbr } from "../../lib/teams";

const BADGE_SIZES = {
  sm: "size-7 text-[0.625rem]",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
} as const;

/** Team initials tile: "TOR". */
export function TeamBadge({
  name,
  size = "sm",
  tone = "soft",
  round = false,
}: {
  name: string;
  size?: keyof typeof BADGE_SIZES;
  tone?: "soft" | "dark";
  round?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center font-semibold",
        BADGE_SIZES[size],
        round ? "rounded-full" : size === "lg" ? "rounded-2xl" : "rounded-lg",
        tone === "dark" ? "bg-ink text-white" : "bg-surface text-ink-soft",
      )}
    >
      {teamAbbr(name)}
    </span>
  );
}

const RATE_TONES: Record<RateTone, string> = {
  strong: "bg-accent text-white",
  medium: "bg-accent-soft text-accent-strong",
  weak: "bg-surface text-ink-soft",
  low: "border border-line text-muted",
  none: "text-muted",
};

/** Hit-rate badge coloured by scale band. */
export function RatePill({
  value,
  scale,
  digits = 0,
}: {
  value: number | null | undefined;
  scale: RateScale;
  digits?: number;
}) {
  return (
    <span className={cn("pill", RATE_TONES[rateTone(value, scale)])}>{fmtPct(value, digits)}</span>
  );
}

export function RateLegend({ scale, label = "Hit rate" }: { scale: RateScale; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span className="mr-1">{label}</span>
      {rateBands(scale).map((band) => (
        <span key={band.tone} className={cn("pill min-w-0", RATE_TONES[band.tone])}>
          {band.label}
        </span>
      ))}
    </div>
  );
}

const RESULT_TONES: Record<ResultTone, string> = {
  win: "border-ink bg-ink text-white",
  softWin: "border-accent bg-accent-soft text-accent-strong",
  draw: "border-line-strong bg-surface text-ink-soft",
  loss: "border-line-strong bg-white text-muted",
};

/** Single W / D / L square, with an optional OT / SO note. */
export function ResultBadge({ label, tone, note, title }: Omit<FormResult, "key">) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 flex-col items-center justify-center rounded border font-bold leading-none",
        note ? "h-6 w-5.5" : "size-5",
        RESULT_TONES[tone],
      )}
    >
      <span className="text-[0.625rem]">{label}</span>
      {note && <span className="mt-px text-[0.4375rem]">{note}</span>}
    </span>
  );
}

/** Row of recent results, oldest to newest as given. */
export function FormStrip({
  results,
  label = "Recent form",
}: {
  results: FormResult[];
  label?: string;
}) {
  if (!results.length) return <span className="text-muted">—</span>;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1"
      aria-label={`${label}: ${results.map((r) => r.title ?? r.label).join(", ")}`}
    >
      {results.map(({ key, ...result }) => (
        <ResultBadge key={key} {...result} />
      ))}
    </span>
  );
}
