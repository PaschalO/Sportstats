import {createFileRoute, Link,} from "@tanstack/react-router";
import { getSport } from "../config/sports";
export const Route = createFileRoute("/$sport/")({
    component: SportPage,
});

function SportPage() {
    const { sport: sportSlug } = Route.useParams();
    const sport = getSport(sportSlug);
    return (
        <section>
            <p className="eyebrow">Select a league</p>
            <h1 className="mt-2">{sport && sport.name}</h1>
            <p className="mt-3 text-muted">
                Choose a league to view team statistics,
                rankings, and player performance.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sport && sport.leagues.map((league) => (
                    <Link
                        key={league.slug}
                        to="/$sport/$league"
                        params={{
                            sport: sportSlug,
                            league: league.slug,
                        }}
                        className="rounded-xl border border-line p-6 hover:border-accent"
                    >
                        <h3 className="text-ink">{league.name}</h3>
                        <p className="mt-2 text-caption text-muted">
                            View league statistics
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}