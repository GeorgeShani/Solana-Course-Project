import { createFileRoute, redirect } from "@tanstack/react-router";

/** Search became Discover; old links still arrive. */
export const Route = createFileRoute("/search")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
