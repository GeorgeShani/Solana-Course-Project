import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Feed } from "../components/feed/Feed";
import { FeedLoading } from "../components/feed/FeedStates";
import { CurtainIntro } from "../components/theatre/CurtainIntro";
import { Welcome } from "../components/theatre/Welcome";
import { getChainStatus } from "../lib/chain";
import { getFirstFeedPage, type FeedLoad } from "../lib/feed-server";
import { fictionalPreviewFeed } from "../lib/fixtures";

interface FeedSearch {
  /** The active plan, for deep links and restoring the reader's place. */
  plan?: string;
  /** Development only: a labelled fictional feed for layout checks. */
  preview?: "fictional";
  /** Show the welcome scene again, even after the visitor has entered before. */
  welcome?: true;
}

const URL_WRITE_DELAY_MS = 350;

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): FeedSearch => ({
    plan:
      typeof search.plan === "string" && search.plan.length <= 64
        ? search.plan
        : undefined,
    preview: search.preview === "fictional" ? "fictional" : undefined,
    welcome: search.welcome !== undefined ? true : undefined,
  }),
  loaderDeps: ({ search }) => ({ preview: search.preview }),
  loader: async ({
    deps,
  }): Promise<{ feed: FeedLoad; chainOk: boolean; preview: boolean }> => {
    if (deps.preview === "fictional" && import.meta.env.DEV) {
      const now = Date.now();
      return {
        feed: { ok: true, page: fictionalPreviewFeed(now), receivedAt: now },
        chainOk: true,
        preview: true,
      };
    }
    const [feed, chain] = await Promise.all([
      getFirstFeedPage(),
      getChainStatus(),
    ]);
    return { feed, chainOk: chain.ok, preview: false };
  },
  component: FeedRoute,
  pendingComponent: FeedLoading,
});

function FeedRoute() {
  const { feed, chainOk, preview } = Route.useLoaderData();
  const { plan, welcome } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
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

  const onEntered = useCallback(() => {
    if (welcome)
      void navigate({
        search: (prev) => ({ ...prev, welcome: undefined }),
        replace: true,
        resetScroll: false,
      });
    document
      .querySelector<HTMLElement>(".feed [data-plan], .stage-msg")
      ?.focus({ preventScroll: true });
  }, [navigate, welcome]);

  const count = feed.ok ? feed.page.items.length : 0;
  return (
    <>
      <Welcome forced={!!welcome} onEntered={onEntered} />
      <CurtainIntro
        sub={
          !feed.ok
            ? "Tonight's lineup"
            : preview
              ? "Fictional preview"
              : `Tonight · ${count}${feed.page.nextCursor ? "+" : ""} ${count === 1 ? "plan" : "plans"}`
        }
      />
      <Feed
        key={preview ? "preview" : "live"}
        initial={feed}
        preview={preview}
        chainOk={chainOk}
        initialPlan={initialPlan}
        onActiveChange={onActiveChange}
      />
    </>
  );
}
