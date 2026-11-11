import { createFileRoute, redirect } from "@tanstack/react-router";
import { targetSection } from "../config/navigation";

/** /hockey/nhl -> /hockey/nhl/team-summary */
export const Route = createFileRoute("/$sport/$league/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$sport/$league/$section",
      params: { ...params, section: targetSection(params.sport) },
      replace: true,
    });
  },
});
