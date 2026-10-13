import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Cue } from "../../../components/cue/Cue";
import { KindBadge } from "../../../components/ui/KindBadge";
import { API_URL } from "../../../lib/config";
import { DiscoveryNotFoundError, fetchIdea, fetchTrader } from "../model";
import { refreshWatchLabel, removeWatch, type WatchedItem } from "../watch";

function when(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The public ideas or public-source profiles this browser watches. Titles and authors are
 * refreshed from the API so old saved placeholders never stick. Native plans stay under Plans.
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
          Explore ideas
        </Link>
      </div>
    );

  return (
    <ul className="wl-list">
      {items.map((w) => (
        <WatchedRow key={`${w.type}:${w.id}`} item={w} kind={kind} />
      ))}
    </ul>
  );
}

function WatchedRow({
  item,
  kind,
}: {
  item: WatchedItem;
  kind: "idea" | "trader";
}) {
  const ideaQ = useQuery({
    queryKey: ["discovery", "idea", item.id],
    queryFn: () => fetchIdea(API_URL, item.id),
    enabled: kind === "idea",
    staleTime: 30_000,
    retry: 1,
  });
  const traderQ = useQuery({
    queryKey: ["discovery", "trader", item.id],
    queryFn: () => fetchTrader(API_URL, item.id),
    enabled: kind === "trader",
    staleTime: 30_000,
    retry: 1,
  });

  const pending = kind === "idea" ? ideaQ.isPending : traderQ.isPending;
  const error = kind === "idea" ? ideaQ.error : traderQ.error;
  const missing = error instanceof DiscoveryNotFoundError;

  let title = item.label;
  let subtitle: string | null = null;
  let liveLabel: string | null = null;

  if (kind === "idea" && ideaQ.data) {
    title = ideaQ.data.title;
    subtitle = ideaQ.data.trader.displayName;
    liveLabel = `${ideaQ.data.title} · ${ideaQ.data.trader.displayName}`;
  } else if (kind === "trader" && traderQ.data) {
    title = traderQ.data.displayName;
    subtitle =
      traderQ.data.markets.length > 0
        ? traderQ.data.markets.join(", ")
        : "Public-source profile";
    liveLabel = traderQ.data.displayName;
  }

  useEffect(() => {
    if (liveLabel !== null && liveLabel !== item.label)
      refreshWatchLabel(item.type, item.id, liveLabel);
  }, [item.id, item.label, item.type, liveLabel]);

  return (
    <li className="wl-card wl-card--plain lift">
      <div className="wl-card__body">
        <p className="wl-card__title" aria-busy={pending || undefined}>
          {title}
        </p>
        {missing ? (
          <p className="wl-card__meta">
            Relay no longer has this {kind === "idea" ? "idea" : "profile"}.
          </p>
        ) : (
          subtitle && <p className="wl-card__meta">{subtitle}</p>
        )}
        <p className="wl-card__meta">
          {item.savedAt > 0 && <>Watching since {when(item.savedAt)}</>}
        </p>
        <p className="wl-card__source">
          <KindBadge kind="public_post" />
          <span className="wl-card__meta">Manual coverage</span>
        </p>
      </div>
      <div className="wl-card__actions">
        {kind === "idea" ? (
          <Link
            to="/ideas/$ideaId"
            params={{ ideaId: item.id }}
            className="btn btn--glass btn--small"
          >
            Open story
          </Link>
        ) : (
          <Link
            to="/profiles/$traderId"
            params={{ traderId: item.id }}
            className="btn btn--glass btn--small"
          >
            Open profile
          </Link>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => removeWatch(item.type, item.id)}
          aria-label={`Stop watching ${item.label}`}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
