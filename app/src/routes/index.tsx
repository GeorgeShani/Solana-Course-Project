import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { IdeaStream } from "../features/discovery/components/IdeaStream";
import { Cue } from "../components/cue/Cue";
import { Icon } from "../components/ui/Icon";
import {
  useDetectedFeed,
  useIdeaFeed,
  useSourcedTraders,
} from "../features/discovery/queries";

interface DiscoverSearch {
  /** Narrow the ideas to one public-source profile. */
  trader?: string;
  /** Older deep links to a plan on `/`; redirected to `/plans`. */
  plan?: string;
  /** Compatibility only: opens the welcome, then the scene replaces it with the clean path. */
  welcome?: true;
  /** Older development links to the fictional fixtures; redirected in development only. */
  preview?: "fictional";
}

const TRADER_ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;

/**
 * Discover: public-source ideas first. Each idea links its original source and later items, with
 * the relationship between them stated. Nothing here is a trade, a recommendation or live data:
 * people at Relay recorded every entry by hand.
 */
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): DiscoverSearch => ({
    trader:
      typeof search.trader === "string" && TRADER_ID.test(search.trader)
        ? search.trader
        : undefined,
    plan:
      typeof search.plan === "string" && search.plan.length <= 64
        ? search.plan
        : undefined,
    welcome: search.welcome !== undefined ? true : undefined,
    preview: search.preview === "fictional" ? "fictional" : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.preview === "fictional" && import.meta.env.DEV)
      throw redirect({
        to: "/dev/plan-states",
        search: { plan: search.plan },
        replace: true,
      });
    if (search.plan)
      throw redirect({
        to: "/plans",
        search: { plan: search.plan },
        replace: true,
      });
  },
  head: () => ({
    meta: [
      { title: "Relay — Discover traders' public ideas, with sources" },
      {
        name: "description",
        content:
          "See the original idea. Follow what changed. Check the evidence. Public-source profiles recorded by hand, with exact links and times. Not financial advice.",
      },
    ],
  }),
  component: Discover,
});

function Discover() {
  const { trader } = Route.useSearch();
  const profiles = useSourcedTraders();
  const ideasQuery = useIdeaFeed(trader);
  const detected = useDetectedFeed();
  const people = profiles.data?.pages.flatMap((p) => p.items) ?? [];
  const ideas = ideasQuery.data?.pages.flatMap((p) => p.items) ?? [];

  // The stream wants every recorded idea; there are few, so read the remaining pages now.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = ideasQuery;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (profiles.isError || ideasQuery.isError)
    return (
      <section
        className="page page--wide"
        aria-labelledby="discover-title"
        data-cursor-zone
      >
        <h1 id="discover-title" className="page__title" data-page-start>
          Discover
        </h1>
        <ErrorNotice
          message={
            (ideasQuery.error ?? profiles.error)?.message ?? "Request failed"
          }
          onRetry={() => {
            void profiles.refetch();
            void ideasQuery.refetch();
          }}
        />
      </section>
    );

  return (
    <IdeaStream
      ideas={ideas}
      detected={detected.data?.items ?? []}
      people={people}
      trader={trader}
      feedError={detected.isError}
      loading={profiles.isPending || ideasQuery.isPending}
    />
  );
}

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="notice notice--error" role="status">
      <Cue pose="unavailable" className="notice__cue" />
      <div className="notice__body">
        <p className="notice__title">Can't reach Relay's service</p>
        <p className="page__text">{message}.</p>
        <button
          type="button"
          className="btn btn--glass btn--small"
          onClick={onRetry}
        >
          <Icon name="refresh" size={18} />
          Try again
        </button>
      </div>
    </div>
  );
}
