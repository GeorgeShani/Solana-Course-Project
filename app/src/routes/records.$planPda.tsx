import { createFileRoute, redirect } from "@tanstack/react-router";

/** Plans moved under /plans; old links and bookmarks still arrive. */
export const Route = createFileRoute("/records/$planPda")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/plans/$planPda",
      params: { planPda: params.planPda },
      replace: true,
    });
  },
});
