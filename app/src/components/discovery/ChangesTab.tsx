import { Link } from "@tanstack/react-router";
import { Cue } from "../cue/Cue";
import { Icon } from "../ui/Icon";
import {
  RELATIONSHIP_LABEL,
  eventLabel,
  formatWhen,
  safeHref,
  type ChangesResponse,
  type TargetChanges,
} from "../../lib/discovery";
import {
  cursorAfterReading,
  isCaughtUp,
  totalNew,
} from "../../lib/discovery-changes";
import { useChanges } from "../../lib/discovery-queries";
import {
  markSeen,
  removeWatch,
  toTargets,
  useDiscoveryWatch,
  type WatchedItem,
} from "../../lib/discovery-watch";

/**
 * "Since your last visit": the meaningful entries added to the ideas and traders this browser
 * watches. The server only reports entries after a cursor kept in this browser; it never marks
 * anything read. A cursor moves when the reader opens an idea or taps "Mark as read", and not
 * because this list was shown.
 */
export function ChangesTab() {
  const watched = useDiscoveryWatch();
  const q = useChanges(toTargets(watched));

  if (watched.length === 0)
    return (
      <div className="wl-empty">
        <Cue pose="saved" className="wl-empty__cue" />
        <p className="wl-empty__line">
          Watch an idea or a trader to see what changes after you look away.
        </p>
        <Link to="/ideas" className="btn btn--primary btn--large">
          See ideas
        </Link>
      </div>
    );

  if (q.isPending)
    return (
      <p className="page__text" aria-busy="true">
        Checking for new entries…
      </p>
    );

  if (q.isError)
    return (
      <div className="notice notice--error" role="status">
        <Cue pose="unavailable" className="notice__cue" />
        <div className="notice__body">
          <p className="notice__title">Can't check for new entries</p>
          <p className="page__text">
            {q.error.message}. Nothing was marked as read.
          </p>
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
    );

  return <ChangesView changes={q.data} watched={watched} />;
}

function markAllRead(
  changes: ChangesResponse,
  watched: readonly WatchedItem[],
) {
  for (const t of changes.items) {
    const w = watched.find(
      (x) => x.type === t.target.type && x.id === t.target.id,
    );
    if (!w) continue;
    const next = cursorAfterReading(t, w.after);
    if (next !== null) markSeen(w.type, w.id, next);
  }
}

function ChangesView({
  changes,
  watched,
}: {
  changes: ChangesResponse;
  watched: readonly WatchedItem[];
}) {
  const fresh = totalNew(changes);
  const caughtUp = isCaughtUp(changes);
  return (
    <div className="chg-wrap">
      <p className="chg-fresh">
        <Icon name="clock" size={14} />
        {changes.coverage.lastRecordedAt
          ? `Manual coverage. The newest entry was recorded ${formatWhen(changes.coverage.lastRecordedAt)}. Relay does not watch these accounts live.`
          : "Manual coverage. Nothing has been recorded yet. Relay does not watch these accounts live."}
      </p>

      {caughtUp ? (
        <div className="chg-caught" role="status">
          <Cue pose="saved" className="chg-caught__cue" />
          <p className="chg-caught__line">You're caught up</p>
          <p className="page__text page__text--quiet">
            Nothing new in what you watch, as of {formatWhen(changes.asOf)}.
          </p>
        </div>
      ) : (
        fresh > 0 && (
          <div className="chg-bar">
            <h2 className="page__subsection" id="chg-title">
              Since your last visit: {fresh} new{" "}
              {fresh === 1 ? "entry" : "entries"}
            </h2>
            <button
              type="button"
              className="btn btn--glass btn--small"
              onClick={() => markAllRead(changes, watched)}
            >
              Mark all as read
            </button>
          </div>
        )
      )}

      <ul className="wl-list chg-list">
        {changes.items.map((t) => {
          const w = watched.find(
            (x) => x.type === t.target.type && x.id === t.target.id,
          );
          return w ? (
            <TargetCard key={`${w.type}:${w.id}`} t={t} w={w} />
          ) : null;
        })}
      </ul>
    </div>
  );
}

function TargetCard({ t, w }: { t: TargetChanges; w: WatchedItem }) {
  const next = cursorAfterReading(t, w.after);
  const open =
    w.type === "idea" ? (
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
    );
  return (
    <li className="wl-card chg">
      <div className="wl-card__body">
        <p className="wl-card__title">
          {w.label}
          <span className="badge badge--quiet">
            {w.type === "idea" ? "Idea" : "Trader"}
          </span>
          {t.count > 0 && <span className="badge">{t.count} new</span>}
        </p>
        {!t.known ? (
          <p className="wl-card__meta">
            Relay no longer covers this, or it was never in this version's
            coverage. Nothing can be reported about it.
          </p>
        ) : t.count === 0 ? (
          <p className="wl-card__meta">Nothing new</p>
        ) : (
          t.groups.map((g) => (
            <div key={g.idea.id} className="chg__group">
              <p className="chg__idea">
                <Link to="/ideas/$ideaId" params={{ ideaId: g.idea.id }}>
                  {g.idea.title}
                </Link>
              </p>
              <ul className="chg__events">
                {g.events.map((e) => {
                  const href = e.source ? safeHref(e.source.url) : null;
                  return (
                    <li key={e.id}>
                      <p className="chg__head">
                        <span className="tl__label">
                          {eventLabel(e.type).label}
                        </span>
                        {e.relationship.basis !== "original" && (
                          <span className="badge badge--quiet">
                            {RELATIONSHIP_LABEL[e.relationship.basis]}
                          </span>
                        )}
                        <span className="wl-card__meta">
                          {e.occurredAt
                            ? `Happened ${formatWhen(e.occurredAt)}`
                            : `Recorded ${formatWhen(e.recordedAt)} (time of the event unknown)`}
                        </span>
                      </p>
                      <p className="chg__summary">{e.summary}</p>
                      {href && (
                        <a
                          className="wl-card__meta"
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                        >
                          Open the source
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
        {t.hasMore && (
          <p className="wl-card__meta" role="status">
            There are more new entries than shown here. Mark these as read to
            see the next ones.
          </p>
        )}
      </div>
      <div className="wl-card__actions">
        {t.known && open}
        {next !== null && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => markSeen(w.type, w.id, next)}
            aria-label={`Mark ${w.label} as read`}
          >
            Mark as read
          </button>
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
  );
}
