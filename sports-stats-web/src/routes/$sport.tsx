import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { getNavLeagueGroups, getNavTargetSection } from "../config/navigation";

/**
 * Reusable entry route for every sport.
 * /soccer redirects to /soccer/premier-league/team-summary.
 * /basketball redirects to the first configured basketball league/section.
 * Nested pages such as /soccer/premier-league/rankings remain untouched.
 *
 * Keep the LeagueNavbar and SectionNavbar in the existing shared layout.
 */
export const Route = createFileRoute("/$sport")({
    component: SportRoute,
});

function SportRoute() {
    const { sport } = Route.useParams();
    const { pathname } = useLocation();
    const isSportHome = pathname.replace(/\/+$/, "") === `/${sport}`;

    // This route may also be a parent of deeper TanStack Router pages.
    // Render those children normally; never redirect them to the default league.
    if (!isSportHome) return <Outlet />;

    const leagues = getNavLeagueGroups(sport).flatMap((group) => group.leagues);
    const defaultLeague = leagues[0]?.slug;

    if (!defaultLeague) {
        return (
            <section className="page py-10">
                <h1 className="text-xl font-semibold text-ink">No competitions configured</h1>
                <p className="mt-2 text-sm text-muted">Choose another sport or add a league in your sports configuration.</p>
            </section>
        );
    }

    return (
        <Navigate
            to="/$sport/$league/$section"
            params={{
                sport,
                league: defaultLeague,
                section: getNavTargetSection(sport, defaultLeague, "team-summary"),
            }}
            replace
        />
    );
}
