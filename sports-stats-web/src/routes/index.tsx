import {createFileRoute, Link} from "@tanstack/react-router";
import { sports } from "../config/sports";

export const Route = createFileRoute("/")({
    component: HomePage,
});

function HomePage() {
    return (
        <section>
            <p className="eyebrow">Sports analytics</p>
            <h1 className="mt-2">Explore sports statistic</h1>
            <p className="mt-3 text-lead text-muted">Select a sport to explore leagues, teams, players, and statistical rankings.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sports.map((sport) => (
                    <Link
                        key={sport.slug}
                        to="/$sport"
                        params={{ sport: sport.slug }}
                        className="rounded-xl border border-line p-6 transition-colors hover:border-accent"
                    >
                        <h3 className="text-ink">{sport.name}</h3>
                        <p className="mt-2 text-caption text-muted">{sport.leagues.length} leagues available</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}