import { createFileRoute, redirect } from "@tanstack/react-router";

/** Search became the Traders directory; old links still arrive. */
export const Route = createFileRoute("/search")({
  beforeLoad: () => {
    throw redirect({ to: "/traders", replace: true });
  },
});
