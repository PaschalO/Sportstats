import { createFileRoute, Link } from "@tanstack/react-router";
import { Page, PageHeader } from "../component/ui";
import { getLeagues, sportLanding } from "../config/navigation";
import { SPORTS } from "../config/sports";
import { CARD_LINK } from "../lib/styles";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Sports analytics"
        title="Explore sports statistics"
        description="Pick a sport to explore leagues, team summaries, rankings and game-by-game trends."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SPORTS.map((sport) => {
          const landing = sportLanding(sport.slug);
          const count = getLeagues(sport.slug).length;
          const body = (
            <>
              <h2 className="text-h3">{sport.name}</h2>
              <p className="text-caption text-muted">
                {count} {count === 1 ? "league" : "leagues"}
              </p>
            </>
          );
          return landing ? (
            <Link
              key={sport.slug}
              to="/$sport/$league/$section"
              params={landing}
              className={CARD_LINK}
            >
              {body}
            </Link>
          ) : (
            <div key={sport.slug} className={CARD_LINK}>
              {body}
            </div>
          );
        })}
      </div>
    </Page>
  );
}
