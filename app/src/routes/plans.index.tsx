import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Feed } from "../features/plans/feed/Feed";
import { FeedLoading } from "../features/plans/feed/FeedStates";
import { getChainStatus } from "../features/plans/chain";
import { getFirstFeedPage, type FeedLoad } from "../features/plans/feed-server";

interface PlansSearch {
  /** The active plan, for deep links and restoring the reader's place. */
  plan?: string;
}

const URL_WRITE_DELAY_MS = 350;

/**
 * Relay-native plans: plans a wallet signed and committed on Solana, mirrored by the server. This
 * is the optional technical capability, separate from public-source discovery (`/`). Imported
 * public posts never appear here and can never become a plan automatically.
 */
export const Route = createFileRoute("/plans/")({
  validateSearch: (search: Record<string, unknown>): PlansSearch => ({
    plan:
      typeof search.plan === "string" && search.plan.length <= 64
        ? search.plan
        : undefined,
  }),
  head: () => ({ meta: [{ title: "Plans · Relay" }] }),
  loader: async (): Promise<{ feed: FeedLoad; chainOk: boolean }> => {
    const [feed, chain] = await Promise.all([
      getFirstFeedPage(),
      getChainStatus(),
    ]);
    return { feed, chainOk: chain.ok };
  },
  component: PlansRoute,
  pendingComponent: FeedLoading,
});

function PlansRoute() {
  const { feed, chainOk } = Route.useLoaderData();
  const { plan } = Route.useSearch();
  const navigate = useNavigate({ from: "/plans/" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [initialPlan] = useState(plan);

  const onActiveChange = useCallback(
    (planPda: string) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void navigate({
          search: (prev) => ({ ...prev, plan: planPda }),
          replace: true,
          resetScroll: false,
        });
      }, URL_WRITE_DELAY_MS);
    },
    [navigate],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Feed
      initial={feed}
      preview={false}
      chainOk={chainOk}
      initialPlan={initialPlan}
      onActiveChange={onActiveChange}
    />
  );
}
