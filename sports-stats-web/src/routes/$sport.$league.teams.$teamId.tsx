import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, LoadingState } from "../component/ui";
import { TEAM_PAGES } from "../config/pages";

export const Route = createFileRoute("/$sport/$league/teams/$teamId")({
  component: TeamRoute,
});

function TeamRoute() {
  const { sport, league, teamId } = Route.useParams();
  const TeamPage = TEAM_PAGES[sport];
  if (!TeamPage) return <EmptyState>Team pages are not available for this sport yet.</EmptyState>;
  return (
    <Suspense fallback={<LoadingState label="Loading team…" />}>
      <TeamPage key={`${league}-${teamId}`} league={league} teamId={teamId} />
    </Suspense>
  );
}
