import { Link } from "@tanstack/react-router";
import { Cue } from "../cue/Cue";
import { KindBadge } from "../ui/KindBadge";
import { removeWatch, type WatchedItem } from "../../lib/discovery-watch";

function when(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The public ideas or public-source profiles this browser watches. They are saved here only; this
 * list never mixes in native plans, which are watched separately under Plans.
 */
export function WatchedList({
  items,
  kind,
}: {
  items: readonly WatchedItem[];
  kind: "idea" | "trader";
}) {
  if (items.length === 0)
    return (
      <div className="wl-empty">
        <Cue pose="saved" className="wl-empty__cue" />
        <p className="wl-empty__line">
          {kind === "idea"
            ? "Watch an idea to see what changes after you look away."
            : "Watch a profile to see what its author adds next."}
        </p>
        <Link to="/" className="btn btn--primary btn--large">
          Discover ideas
        </Link>
      </div>
    );

  return (
    <ul className="wl-list">
      {items.map((w) => (
        <li key={`${w.type}:${w.id}`} className="wl-card wl-card--plain lift">
          <div className="wl-card__body">
            <p className="wl-card__title">{w.label}</p>
            <p className="wl-card__meta">
              {w.savedAt > 0 && <>Watching since {when(w.savedAt)}</>}
            </p>
            <p className="wl-card__source">
              <KindBadge kind="public_post" />
              <span className="wl-card__meta">
                Source: public-source coverage, recorded by hand
              </span>
            </p>
          </div>
          <div className="wl-card__actions">
            {kind === "idea" ? (
              <Link
                to="/ideas/$ideaId"
                params={{ ideaId: w.id }}
                className="btn btn--glass btn--small"
              >
                Open
              </Link>
            ) : (
              <Link
                to="/profiles/$traderId"
                params={{ traderId: w.id }}
                className="btn btn--glass btn--small"
              >
                Open
              </Link>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => removeWatch(w.type, w.id)}
              aria-label={`Stop watching ${w.label}`}
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
