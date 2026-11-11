import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { EmptyState, MiniStat, SearchField, SelectField, TeamBadge } from "../ui";

export type TeamSort<T> = { value: string; label: string; compare: (a: T, b: T) => number };

type TeamPickerProps<T> = {
  teams: T[];
  getId: (team: T) => number;
  getName: (team: T) => string;
  sport: string;
  league: string;
  sorts: TeamSort<T>[];
  subtitle: (team: T) => ReactNode;
  stats: (team: T) => { label: string; value: string }[];
  /** Optional strip at the bottom of each card, e.g. recent form. */
  footer?: (team: T) => ReactNode;
  noun?: string;
};

/** Searchable, sortable grid of team cards linking to each team's page. */
export function TeamPicker<T>({
  teams,
  getId,
  getName,
  sport,
  league,
  sorts,
  subtitle,
  stats,
  footer,
  noun = "teams",
}: TeamPickerProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(sorts[0]?.value ?? "");

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const sort = sorts.find((item) => item.value === sortKey) ?? sorts[0];
    return teams
      .filter((team) => getName(team).toLocaleLowerCase().includes(term))
      .sort((a, b) => sort?.compare(a, b) || getName(a).localeCompare(getName(b)));
  }, [teams, search, sortKey, sorts, getName]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          label={`Search ${noun}`}
          placeholder={`Search ${noun}…`}
          value={search}
          onChange={setSearch}
          className="sm:max-w-xs"
        />
        <SelectField
          label="Sort by"
          value={sortKey}
          options={sorts.map(({ value, label }) => ({ value, label }))}
          onChange={setSortKey}
        />
      </div>
      <p className="text-xs text-muted">
        Showing {visible.length} of {teams.length} {noun}
      </p>
      {visible.length === 0 ? (
        <EmptyState>
          No {noun} match “{search}”.
        </EmptyState>
      ) : (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((team) => (
            <Link
              key={getId(team)}
              to="/$sport/$league/teams/$teamId"
              params={{ sport, league, teamId: String(getId(team)) }}
              className="group flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-accent"
            >
              <div className="flex min-w-0 items-center gap-3">
                <TeamBadge name={getName(team)} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-caption font-semibold group-hover:text-accent-strong sm:text-base">
                    {getName(team)}
                  </h3>
                  <p className="text-xs text-muted">{subtitle(team)}</p>
                </div>
                <span aria-hidden="true" className="text-accent-strong">
                  →
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-soft p-3">
                {stats(team).map((stat) => (
                  <MiniStat key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </div>
              {footer?.(team)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
