import {createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { getLeague } from "../config/sports";

export const Route = createFileRoute("/$sport/$league")({
    beforeLoad: ({ params }) => {
        if (!getLeague(params.sport, params.league)) {
            throw notFound();
        }
    },
    component: LeagueLayout,
});

function LeagueLayout() {
    return <Outlet />;
}