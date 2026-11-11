import {createRootRoute} from "@tanstack/react-router";

import AppLayout from "../component/layout/AppLayout";

export const Route = createRootRoute({
    component: AppLayout,
});