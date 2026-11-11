import { createFileRoute, notFound } from "@tanstack/react-router";
import { getSport } from "../config/sports";

/** Layout route for /$sport; children render through the default <Outlet />. */
export const Route = createFileRoute("/$sport")({
  beforeLoad: ({ params }) => {
    if (!getSport(params.sport)) throw notFound();
  },
});
