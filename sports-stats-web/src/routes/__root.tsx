import { createRootRoute } from "@tanstack/react-router";
import AppLayout from "../component/layout/AppLayout";
import { EmptyState } from "../component/ui";

export const Route = createRootRoute({
  component: AppLayout,
  notFoundComponent: () => <EmptyState>That page does not exist. Pick a sport above.</EmptyState>,
});
