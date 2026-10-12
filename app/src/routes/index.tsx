import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import {
  IdeaCard,
  SourcedTraderCard,
} from "../features/discovery/components/Cards";
import { Cue } from "../components/cue/Cue";
import { Icon } from "../components/ui/Icon";
import { formatWhen, latestCapture } from "../features/discovery/model";
import { useIdeaFeed, useSourcedTraders } from "../features/discovery/queries";

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
  const people = profiles.data?.pages.flatMap((p) => p.items) ?? [];
  const ideas = ideasQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const selected = people.find((p) => p.id === trader);
  const captured = latestCapture(ideas);

  return (
    <section
      className="page page--wide"
      aria-labelledby="discover-title"
      data-cursor-zone
    >
      <header className="page__head">
        <div>
          <h1 id="discover-title" className="page__title" data-page-start>
            Discover
          </h1>
          <p className="page__lede">
            See the original idea. Follow what changed. Check the evidence.
          </p>
        </div>
      </header>

      <aside className="callout" aria-labelledby="coverage-title">
        <Cue pose="unavailable" className="callout__cue" />
        <div className="callout__body">
          <h2 id="coverage-title" className="callout__title">
            Manual coverage, not a live feed
          </h2>
          <p className="callout__text">
            A person at Relay recorded each entry by hand from a public source.
            Relay does not watch these accounts, so something may have changed
            since. A statement is not proof that a trade happened, and a profile
            is not claimed or endorsed by the person it describes.
            {captured && ` Newest capture: ${formatWhen(captured)}.`}
          </p>
        </div>
        <Link to="/how-it-works" className="btn btn--ghost btn--small">
          How evidence works
        </Link>
      </aside>

      <section aria-labelledby="profiles-title" className="discover__section">
        <h2 id="profiles-title" className="page__subsection">
          Public-source profiles
        </h2>
        {profiles.isPending ? (
          <ul className="tgrid" aria-busy="true" aria-label="Loading profiles">
            <li className="tcard tcard--ghost" />
            <li className="tcard tcard--ghost" />
            <li className="tcard tcard--ghost" />
          </ul>
        ) : profiles.isError ? (
          <ErrorNotice
            message={profiles.error.message}
            onRetry={() => void profiles.refetch()}
          />
        ) : people.length === 0 ? (
          <p className="page__text">
            No profile has been recorded yet. Relay lists a profile only after a
            person has linked a real public source for it.
          </p>
        ) : (
          <ul className="tgrid">
            {people.map((t) => (
              <SourcedTraderCard key={t.id} trader={t} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ideas-title" className="discover__section">
        <h2 id="ideas-title" className="page__subsection">
          Ideas
          {selected ? ` by ${selected.displayName}` : ""}
        </h2>

        {people.length > 1 && (
          <nav aria-label="Filter ideas by profile">
            <ul className="filters">
              <li>
                <Link
                  to="/"
                  search={{}}
                  className="filters__chip"
                  aria-current={trader === undefined}
                >
                  All
                </Link>
              </li>
              {people.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/"
                    search={{ trader: p.id }}
                    className="filters__chip"
                    aria-current={trader === p.id}
                  >
                    {p.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {ideasQuery.isPending ? (
          <ul className="igrid" aria-busy="true" aria-label="Loading ideas">
            {[0, 1, 2].map((i) => (
              <li key={i} className="icard icard--ghost" />
            ))}
          </ul>
        ) : ideasQuery.isError ? (
          <ErrorNotice
            message={ideasQuery.error.message}
            onRetry={() => void ideasQuery.refetch()}
          />
        ) : ideas.length === 0 ? (
          <div className="notice" role="status">
            <Cue pose="unavailable" className="notice__cue" />
            <div className="notice__body">
              <p className="notice__title">
                {trader ? "No ideas for this profile" : "No ideas recorded yet"}
              </p>
              <p className="page__text">
                Relay lists only ideas a person has recorded from a real, linked
                source. It won't fill the gap with made-up ones.
              </p>
              {trader && (
                <Link to="/" search={{}} className="btn btn--glass btn--small">
                  Show all ideas
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <ul className="igrid">
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </ul>
            {ideasQuery.hasNextPage && (
              <div className="igrid__more">
                <button
                  type="button"
                  className="btn btn--glass"
                  disabled={ideasQuery.isFetchingNextPage}
                  onClick={() => void ideasQuery.fetchNextPage()}
                >
                  {ideasQuery.isFetchingNextPage
                    ? "Loading…"
                    : "Show more ideas"}
                </button>
              </div>
            )}
            {ideasQuery.isFetchNextPageError && (
              <p className="field__error" role="alert">
                Couldn't load more ideas. Try again.
              </p>
            )}
          </>
        )}
      </section>

      <aside className="discover__plans" aria-labelledby="plans-title">
        <div>
          <h2 id="plans-title" className="page__subsection">
            Optional: plans published through Relay
          </h2>
          <p className="page__text page__text--quiet">
            Separate from the public profiles above. A plan is signed on Solana
            devnet (test tokens, no value) and can be followed only by you, with
            your own approval. A public post never becomes a plan.
          </p>
        </div>
        <Link to="/plans" className="btn btn--glass btn--small">
          See plans
        </Link>
      </aside>
    </section>
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
