import { Link, useLocation } from "@tanstack/react-router";
import { sports } from "../../config/sports";
import { getNavLeagueGroups, getNavTargetSection } from "../../config/navigation";

type Props = { size?: number };

/**
 * Sport links open the first configured competition's statistics page directly.
 * This bypasses the redundant "Select a league" cards.
 * Leagues/competitions remain selectable through the shared LeagueNavbar.
 */
export default function Navbar({ size = 30 }: Props) {
    const { pathname } = useLocation();
    const activeSport = pathname.split("/")[1];

    return (
        <header className="border-b border-line bg-white">
            <nav aria-label="Sports navigation" className="page flex min-h-16 items-center gap-6">
                <Link to="/" className="flex shrink-0 items-center gap-2 text-ink!">
                    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
                        <rect width="30" height="30" rx="8" fill="#0B1220" />
                        <g transform="translate(7 7) scale(0.6667)" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round">
                            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                        </g>
                    </svg>
                    <span className="font-display font-bold text-lg tracking-tight">SportsStats</span>
                </Link>
                <div className="flex min-w-0 gap-2 overflow-x-auto py-2">
                    {sports.map((sport) => {
                        const isActive = activeSport === sport.slug;
                        const firstLeague = getNavLeagueGroups(sport.slug).flatMap((group) => group.leagues)[0]?.slug;
                        const className = `shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            isActive ? "bg-ink text-white!" : "text-muted! hover:bg-surface hover:text-ink!"
                        }`;
                        if (!firstLeague) {
                            return (
                                <Link key={sport.slug} to="/$sport" params={{ sport: sport.slug }} aria-current={isActive ? "page" : undefined} className={className}>
                                    {sport.name}
                                </Link>
                            );
                        }
                        return (
                            <Link
                                key={sport.slug}
                                to="/$sport/$league/$section"
                                params={{
                                    sport: sport.slug,
                                    league: firstLeague,
                                    section: getNavTargetSection(sport.slug, firstLeague, "team-summary"),
                                }}
                                aria-current={isActive ? "page" : undefined}
                                className={className}
                            >
                                {sport.name}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </header>
    );
}
