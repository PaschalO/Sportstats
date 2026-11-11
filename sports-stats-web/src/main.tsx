import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {createRouter, RouterProvider} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

const router = createRouter({
    routeTree,
    defaultPreload: "intent",
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            retry: 1,
        },
    },
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
      </QueryClientProvider>
  </StrictMode>,
)