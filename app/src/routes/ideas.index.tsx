import { createFileRoute, redirect } from "@tanstack/react-router";

/** The idea list is Discover now; old links and bookmarks still arrive. */
export const Route = createFileRoute("/ideas/")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
