import { createFileRoute, redirect } from "@tanstack/react-router";
import { EmptyState } from "../component/ui";
import { sportLanding } from "../config/navigation";

/** /soccer -> /soccer/premier-league/team-summary */
export const Route = createFileRoute("/$sport/")({
  beforeLoad: ({ params }) => {
    const landing = sportLanding(params.sport);
    if (landing) throw redirect({ to: "/$sport/$league/$section", params: landing, replace: true });
  },
  component: () => <EmptyState>No competitions are configured for this sport yet.</EmptyState>,
});
