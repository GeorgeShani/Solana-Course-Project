import { createFileRoute, redirect } from "@tanstack/react-router";

/** Public-source profiles are listed on Discover; plan creators moved under Plans. */
export const Route = createFileRoute("/traders/")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
