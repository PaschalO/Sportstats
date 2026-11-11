import { Link, useParams } from "@tanstack/react-router";
import { cn } from "../../lib/cn";
import { getLeagues, targetSection } from "../../config/navigation";
import { getSoccerLeague } from "../../services/soccerService";

/** League pills under the header (mockup: Premier League · LaLiga · Serie A …). */
export default function LeagueBar() {
  const { sport = "", league: activeLeague, section } = useParams({ strict: false });
  const leagues = getLeagues(sport);
  if (leagues.length < 2) return null;

  const missingSeason =
    sport === "soccer" && activeLeague && getSoccerLeague(activeLeague)?.seasonId == null;

  return (
    <nav aria-label="Leagues" className="border-b border-line bg-surface-soft">
      <div className="page scrollbar-none flex items-center gap-2 overflow-x-auto py-2.5 lg:flex-wrap lg:overflow-visible">
        {leagues.map((league) => {
          const active = league.slug === activeLeague;
          return (
            <Link
              key={league.slug}
              to="/$sport/$league/$section"
              params={{ sport, league: league.slug, section: targetSection(sport, section) }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-caption font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink-soft hover:border-line-strong",
              )}
            >
              {league.name}
            </Link>
          );
        })}
        {missingSeason && (
          <span role="status" className="shrink-0 text-xs text-muted">
            Set this competition's season ID in .env
          </span>
        )}
      </div>
    </nav>
  );
}
