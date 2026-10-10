import { Link, createFileRoute } from "@tanstack/react-router";
import { IdeaCard } from "../components/discovery/Cards";
import { Cue } from "../components/cue/Cue";
import { Icon } from "../components/ui/Icon";
import { useIdeaFeed } from "../lib/discovery-queries";

export const Route = createFileRoute("/ideas/")({
  head: () => ({ meta: [{ title: "Ideas · Relay" }] }),
  component: Ideas,
});

function Ideas() {
  const q = useIdeaFeed();
  const ideas = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section
      className="page page--wide"
      aria-labelledby="ideas-title"
      data-cursor-zone
    >
      <header className="page__head">
        <div>
          <h1 id="ideas-title" className="page__title">
            Ideas
          </h1>
          <p className="page__lede">
            Traders' public ideas, each with the original source and what was
            said or shown afterwards.
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
            A person at Relay recorded each entry by hand from public sources.
            Relay does not watch these accounts, so something may have changed
            since. A statement is not proof that a trade happened.
          </p>
        </div>
        <Link to="/how-it-works" className="btn btn--ghost btn--small">
          How evidence works
        </Link>
      </aside>

      {q.isPending ? (
        <ul className="igrid" aria-busy="true" aria-label="Loading ideas">
          {[0, 1, 2].map((i) => (
            <li key={i} className="icard icard--ghost" />
          ))}
        </ul>
      ) : q.isError ? (
        <div className="notice notice--error" role="status">
          <Cue pose="unavailable" className="notice__cue" />
          <div className="notice__body">
            <p className="notice__title">Can't reach Relay's service</p>
            <p className="page__text">{q.error.message}.</p>
            <button
              type="button"
              className="btn btn--glass btn--small"
              onClick={() => void q.refetch()}
            >
              <Icon name="refresh" size={18} />
              Try again
            </button>
          </div>
        </div>
      ) : ideas.length === 0 ? (
        <div className="notice" role="status">
          <Cue pose="unavailable" className="notice__cue" />
          <div className="notice__body">
            <p className="notice__title">No ideas have been recorded yet</p>
            <p className="page__text">
              Relay lists only ideas a person has recorded from a real, linked
              source. It won't fill the gap with made-up ones.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ul className="igrid">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </ul>
          {q.hasNextPage && (
            <div className="igrid__more">
              <button
                type="button"
                className="btn btn--glass"
                disabled={q.isFetchingNextPage}
                onClick={() => void q.fetchNextPage()}
              >
                {q.isFetchingNextPage ? "Loading…" : "Show more ideas"}
              </button>
            </div>
          )}
          {q.isFetchNextPageError && (
            <p className="field__error" role="alert">
              Couldn't load more ideas. Try again.
            </p>
          )}
        </>
      )}
    </section>
  );
}
