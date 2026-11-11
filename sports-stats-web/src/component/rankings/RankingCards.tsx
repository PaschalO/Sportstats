import { Link } from "@tanstack/react-router";
import { cn } from "../../lib/cn";
import { Card, MetricBar, type BarTone } from "../ui";

export type RankingItem = { id: number; name: string; value: number; gamesPlayed?: number };

type ListProps = {
  items: RankingItem[];
  format: (value: number) => string;
  tone: BarTone;
  /** For "fewest" rankings a lower value earns a longer bar. */
  lowerIsBetter?: boolean;
  /** Full list: rows link to teams and show games played. */
  full?: boolean;
  sport: string;
  league: string;
};

function barPct(value: number, best: number, lowerIsBetter?: boolean) {
  if (best <= 0 || value <= 0) return 0;
  return Math.max(4, (lowerIsBetter ? best / value : value / best) * 100);
}

export function RankingList({
  items,
  format,
  tone,
  lowerIsBetter,
  full,
  sport,
  league,
}: ListProps) {
  const best = items[0]?.value ?? 0;
  return (
    <ol className={cn("flex flex-col", full ? "divide-y divide-line-soft" : "gap-3")}>
      {items.map((item, index) => (
        <li
          key={item.id}
          className={cn(
            "grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1",
            full && "py-2.5",
          )}
        >
          <span className="text-xs text-muted tabular-nums">{index + 1}</span>
          {full ? (
            <Link
              to="/$sport/$league/teams/$teamId"
              params={{ sport, league, teamId: String(item.id) }}
              className="truncate text-caption font-semibold text-ink hover:text-accent-strong"
            >
              {item.name}
            </Link>
          ) : (
            <span className="truncate text-caption font-medium text-ink">{item.name}</span>
          )}
          <span className="stat row-span-2 text-right text-base text-ink">
            {format(item.value)}
          </span>
          <MetricBar
            className="col-start-2"
            pct={barPct(item.value, best, lowerIsBetter)}
            tone={tone}
          />
          {full && item.gamesPlayed != null && (
            <span className="col-start-2 text-2xs text-muted">{item.gamesPlayed} GP</span>
          )}
        </li>
      ))}
    </ol>
  );
}

type CardProps = Omit<ListProps, "full"> & { title: string; unit: string; onOpen: () => void };

/** Top-five card that opens the full ranking (mockup: NHL Team stats rankings). */
export function RankingCard({ title, unit, onOpen, ...list }: CardProps) {
  return (
    <Card as="article" className="flex flex-col">
      <div className="mb-4 flex items-start justify-between gap-2">
        <h3>{title}</h3>
        <span className="shrink-0 pt-1 text-2xs text-muted">{unit}</span>
      </div>
      <div className="flex-1">
        {list.items.length ? (
          <RankingList {...list} items={list.items.slice(0, 5)} />
        ) : (
          <p className="py-6 text-caption text-muted">No statistics available.</p>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 self-start text-caption font-semibold text-accent hover:text-accent-strong"
      >
        Full ranking <span aria-hidden="true">→</span>
      </button>
    </Card>
  );
}
