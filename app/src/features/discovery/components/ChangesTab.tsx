import { Link } from "@tanstack/react-router";
import { Cue } from "../../../components/cue/Cue";
import { Icon } from "../../../components/ui/Icon";
import {
  eventKind,
  formatWhen,
  shortDate,
  updateFreshness,
  type ChangesResponse,
  type TargetChanges,
} from "../model";
import { cursorAfterReading, isCaughtUp, totalNew } from "../changes";
import { useChanges } from "../queries";
import {
  markSeen,
  removeWatch,
  toTargets,
  useDiscoveryWatch,
  type WatchedItem,
} from "../watch";

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
          Watch an idea to see what changes after you look away.
        </p>
        <Link to="/" className="btn btn--primary btn--large">
          Explore ideas
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
        Manual coverage. Relay does not watch these accounts live.
        {changes.coverage.lastRecordedAt
          ? ` Newest record ${formatWhen(changes.coverage.lastRecordedAt)}.`
          : ""}
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
              {fresh} new {fresh === 1 ? "entry" : "entries"}
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
  return (
    <li className="wl-card chg">
      <div className="wl-card__body">
        {!t.known ? (
          <>
            <p className="wl-card__title">{w.label}</p>
            <p className="wl-card__meta">
              Relay no longer covers this. Nothing can be reported about it.
            </p>
          </>
        ) : t.count === 0 ? (
          <>
            <p className="wl-card__title">{w.label}</p>
            <p className="wl-card__meta">Nothing new</p>
          </>
        ) : (
          t.groups.map((g) => (
            <div key={g.idea.id} className="chg__group">
              {g.events.map((e) => {
                const freshness = updateFreshness(e.occurredAt, e.recordedAt);
                const when = shortDate(e.occurredAt) ?? shortDate(e.recordedAt);
                return (
                  <div key={e.id} className="chg__event">
                    <p className="chg__idea">
                      <Link
                        to="/ideas/$ideaId"
                        params={{ ideaId: g.idea.id }}
                        hash={`event-${e.id}`}
                      >
                        {g.idea.title}
                      </Link>
                    </p>
                    <p className="chg__meta">
                      <span>{g.idea.traderDisplayName}</span>
                      {when && (
                        <time dateTime={e.occurredAt ?? e.recordedAt}>
                          {when}
                        </time>
                      )}
                      <span className="badge badge--quiet">{freshness}</span>
                      <span className="tl__label">{eventKind(e).label}</span>
                    </p>
                    <p className="chg__summary">{e.summary}</p>
                    <p className="chg__actions">
                      <Link
                        to="/ideas/$ideaId"
                        params={{ ideaId: g.idea.id }}
                        hash={`event-${e.id}`}
                        className="btn btn--glass btn--small"
                      >
                        Open
                      </Link>
                    </p>
                  </div>
                );
              })}
            </div>
          ))
        )}
        {t.hasMore && (
          <p className="wl-card__meta" role="status">
            More new entries exist. Mark these as read to see the next ones.
          </p>
        )}
      </div>
      <div className="wl-card__actions">
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
