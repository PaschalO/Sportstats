import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getNavLeagueGroups, getNavTargetSection } from "../../config/navigation";
import { getSoccerLeague } from "../../services/soccerService";

/** Used once in the shared app layout for EVERY sport. */
export default function LeagueNavbar() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [, sportSlug = "", leagueSlug = "", sectionSlug = ""] = pathname.split("/");
    const groups = getNavLeagueGroups(sportSlug);
    // Redirect direct visits to /soccer, /basketball, etc. before the old
    // sport landing card page becomes a required navigation step.
    const firstLeague = groups.flatMap((group) => group.leagues)[0]?.slug;
    const isSportHome = !!sportSlug && pathname.replace(/\/+$/, "") === `/${sportSlug}`;
    useEffect(() => {
        if (!isSportHome || !firstLeague) return;
        void navigate({
            to: "/$sport/$league/$section",
            params: {
                sport: sportSlug,
                league: firstLeague,
                section: getNavTargetSection(sportSlug, firstLeague, "team-summary"),
            },
            replace: true,
        });
    }, [isSportHome, firstLeague, navigate, sportSlug]);

    if (!groups.length) return null;

    const current = groups.flatMap((group) => group.leagues).find((league) => league.slug === leagueSlug);
    const grouped = groups.length > 1;
    const activeSoccerCompetition = sportSlug === "soccer" ? getSoccerLeague(leagueSlug) : null;
    console.log("activeSoccerCompetition", activeSoccerCompetition);
    const sectionFor = (targetLeague: string) => getNavTargetSection(sportSlug, targetLeague, sectionSlug);

    return (
        <nav aria-label="League navigation" className="border-b border-line bg-white">
            {grouped ? (
                <div className="page flex flex-wrap items-center gap-3 py-3">
                    <label htmlFor="competition-select" className="shrink-0 text-xs font-semibold text-muted">
                        Competition
                    </label>
                    <select
                        id="competition-select"
                        aria-label="Choose soccer competition"
                        value={current?.slug ?? ""}
                        onChange={(event) => {
                            const targetLeague = event.target.value;
                            if (!targetLeague) return;
                            void navigate({
                                to: "/$sport/$league/$section",
                                params: { sport: sportSlug, league: targetLeague, section: sectionFor(targetLeague) },
                            });
                        }}
                        className="min-w-[220px] max-w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink sm:min-w-[300px]"
                    >
                        {!current && <option value="">Choose a competition</option>}
                        {groups.map((group) => (
                            <optgroup label={group.name} key={group.name}>
                                {group.leagues.map((league) => <option key={league.slug} value={league.slug}>{league.name}</option>)}
                            </optgroup>
                        ))}
                    </select>
                    <span className="text-xs text-muted">{current?.name ?? "Select a league or cup"}</span>
                    {activeSoccerCompetition && activeSoccerCompetition.seasonId == null && (
                        <span className="text-xs text-muted" role="status">Set this competition's season ID in .env</span>
                    )}
                </div>
            ) : (
                <div className="page flex gap-2 overflow-x-auto py-3">
                    {groups[0].leagues.map((league) => {
                        const isActive = leagueSlug === league.slug;
                        return (
                            <Link
                                key={league.slug}
                                to="/$sport/$league/$section"
                                params={{ sport: sportSlug, league: league.slug, section: sectionFor(league.slug) }}
                                aria-current={isActive ? "page" : undefined}
                                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? "bg-ink text-white!" : "bg-surface text-muted! hover:text-ink!"}`}
                            >
                                {league.name}
                            </Link>
                        );
                    })}
                </div>
            )}
        </nav>
    );
}
