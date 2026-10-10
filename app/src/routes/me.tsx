import { createFileRoute, redirect } from "@tanstack/react-router";

/** My Plans became the Watchlist; old links and bookmarks still arrive. */
export const Route = createFileRoute("/me")({
  beforeLoad: () => {
    throw redirect({ to: "/watchlist", replace: true });
  },
});
