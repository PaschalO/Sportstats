import { Link } from "@tanstack/react-router";
import { cn } from "../../lib/cn";
import { TeamBadge } from "./Badges";

type TeamLinkProps = {
  sport: string;
  league: string;
  teamId: string | number;
  name: string;
  badge?: boolean;
  round?: boolean;
  className?: string;
};

/** Team name (with initials badge) linking to the team detail page. */
export function TeamLink({
  sport,
  league,
  teamId,
  name,
  badge = true,
  round,
  className,
}: TeamLinkProps) {
  return (
    <Link
      to="/$sport/$league/teams/$teamId"
      params={{ sport, league, teamId: String(teamId) }}
      title={`View ${name}`}
      className={cn(
        "flex min-w-0 items-center gap-2.5 font-semibold text-ink hover:text-accent-strong",
        className,
      )}
    >
      {badge && <TeamBadge name={name} round={round} />}
      <span className="min-w-0 truncate">{name}</span>
    </Link>
  );
}
