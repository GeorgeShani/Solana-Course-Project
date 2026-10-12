import { createFileRoute, redirect } from "@tanstack/react-router";

/** The guide became the two-sided picture at /about; old links still arrive. */
export const Route = createFileRoute("/how-it-works")({
  beforeLoad: () => {
    throw redirect({ to: "/about", replace: true });
  },
});
