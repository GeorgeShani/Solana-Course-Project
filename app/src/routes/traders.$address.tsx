import { createFileRoute, redirect } from "@tanstack/react-router";

/** A wallet that signed plans is now under Plans; old links and bookmarks still arrive. */
export const Route = createFileRoute("/traders/$address")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/plans/creators/$address",
      params: { address: params.address },
      replace: true,
    });
  },
});
