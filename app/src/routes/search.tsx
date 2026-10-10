import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search · Relay" }] }),
  component: Search,
});

function Search() {
  return (
    <section className="page" aria-labelledby="search-title">
      <h1 id="search-title" className="page__title">
        Search
      </h1>
      <p className="page__text">
        Searching creators and pairs isn't available yet. Every open plan is in
        the feed, ranked by entry status, never by claimed return.
      </p>
      <Link to="/" className="btn btn--ghost">
        Browse the feed
      </Link>
    </section>
  );
}
