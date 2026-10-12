import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Feed } from "../components/feed/Feed";
import { FeedLoading } from "../components/feed/FeedStates";
import type { FeedLoad } from "../lib/feed-server";

/**
 * DEVELOPMENT ONLY. A gallery of every entry status, built from invented plans (`lib/fixtures.ts`),
 * for checking layout without the API, Postgres or a chain. Every card is badged "Fictional
 * preview" and nothing here is onchain. It is not the technical demo, the product demonstration or
 * a navigation target: a production build answers 404 and does not ship the fixtures.
 */
export const Route = createFileRoute("/dev/plan-states")({
  validateSearch: (search: Record<string, unknown>): { plan?: string } => ({
    plan:
      typeof search.plan === "string" && search.plan.length <= 64
        ? search.plan
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Fictional plan states · Relay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async (): Promise<{ feed: FeedLoad }> => {
    if (!import.meta.env.DEV) throw notFound();
    const { fictionalPreviewFeed } = await import("../lib/fixtures");
    const now = Date.now();
    return {
      feed: { ok: true, page: fictionalPreviewFeed(now), receivedAt: now },
    };
  },
  component: PlanStates,
  pendingComponent: FeedLoading,
});

function PlanStates() {
  const { feed } = Route.useLoaderData();
  const { plan } = Route.useSearch();
  const navigate = useNavigate({ from: "/dev/plan-states" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [initialPlan] = useState(plan);
  const onActiveChange = useCallback(
    (id: string) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void navigate({
          search: (prev) => ({ ...prev, plan: id }),
          replace: true,
          resetScroll: false,
        });
      }, 350);
    },
    [navigate],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Feed
      initial={feed}
      preview
      chainOk
      initialPlan={initialPlan}
      onActiveChange={onActiveChange}
    />
  );
}
