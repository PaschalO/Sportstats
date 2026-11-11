import {createFileRoute, Link } from "@tanstack/react-router";

import { getLeague, getSections } from "../config/sports";

export const Route = createFileRoute("/$sport/$league/")({
    component: LeaguePage,
});

function LeaguePage() {
    const { sport, league } = Route.useParams();

    const leagueInfo = getLeague(sport, league);
    const availableSections = getSections(sport, league);
    return (
        <section>
            <p className="eyebrow">{sport}</p>
            <h1 className="mt-2">{leagueInfo && leagueInfo.name}</h1>
            <p className="mt-3 text-muted">Select a statistical category to explore.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableSections && availableSections.map((section) => (
                    <Link
                        key={section.slug}
                        to="/$sport/$league/$section"
                        params={{
                            sport,
                            league,
                            section: section.slug,
                        }}
                        className="rounded-xl border border-line p-6 hover:border-accent"
                    >
                        <h3 className="text-ink">{section.name}</h3>
                    </Link>
                ))}
            </div>
        </section>
    );
}