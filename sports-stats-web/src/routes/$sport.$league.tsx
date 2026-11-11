import { createFileRoute, notFound } from "@tanstack/react-router";
import { findLeague } from "../config/navigation";

export const Route = createFileRoute("/$sport/$league")({
  beforeLoad: ({ params }) => {
    if (!findLeague(params.sport, params.league)) throw notFound();
  },
});
