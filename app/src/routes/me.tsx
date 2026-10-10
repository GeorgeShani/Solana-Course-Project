import { Link, createFileRoute } from "@tanstack/react-router";
import { Icon } from "../components/ui/Icon";
import { useMounted } from "../lib/mounted";
import { removeWatched, useWatchList } from "../lib/watchlist";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "My Plans · Relay" }] }),
  component: MyPlans,
});

function MyPlans() {
  const mounted = useMounted();
  const watching = useWatchList();
  return (
    <section className="page" aria-labelledby="me-title">
      <h1 id="me-title" className="page__title">
        My Plans
      </h1>

      <h2 className="page__section">Watching</h2>
      <p className="page__text page__text--quiet">Saved in this browser only. No wallet or account needed.</p>
      {!mounted ? (
        <p className="page__text" aria-busy="true">
          Reading your watch list…
        </p>
      ) : watching.length === 0 ? (
        <p className="page__text">
          Nothing watched yet. Tap <strong>Watch</strong> on a plan in the feed to keep it here.
        </p>
      ) : (
        <ul className="watchlist">
          {watching.map((w) => (
            <li key={w.planPda} className="watchlist__item">
              <Icon name="star-filled" className="watchlist__star" />
              <div className="watchlist__text">
                <p className="watchlist__label">{w.label}</p>
                {w.savedAt > 0 && (
                  <p className="watchlist__meta">
                    Watching since{" "}
                    {new Date(w.savedAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              <Link to="/" search={{ plan: w.planPda }} className="btn btn--ghost btn--small">
                Open
              </Link>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => removeWatched(w.planPda)}
                aria-label={`Stop watching ${w.label}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="page__section">Followed</h2>
      <p className="page__text">
        Trades you review and approve yourself appear here with their onchain receipts. Reviewing a trade isn't
        available in this build yet.
      </p>
    </section>
  );
}
