import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Icon } from "../../../components/ui/Icon";
import { formatWhen } from "../model";
import { useIdea } from "../queries";
import { Avatar } from "./Avatar";

/** Short date for a card: "17 Feb". The full time is in the tooltip. */
function day(iso: string | null): string {
  if (iso === null) return "?";
  const t = Date.parse(iso);
  return Number.isNaN(t)
    ? "?"
    : new Date(t).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
}

/** The one real example: Hayes' essay, and the later essay in which he links back to it himself. */
const EXAMPLE = "hayes-ai-credit-deflation";

/**
 * What watching does, shown with a real case instead of described: the original, the line to the
 * author's own later update, and the bell that would have rung. It appears after the reader's
 * first Watch of a session. If the example cannot be read, nothing is shown.
 */
export function WatchStory({ onClose }: { onClose: () => void }) {
  const q = useIdea(EXAMPLE);
  const done = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    done.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, q.isSuccess]);

  const idea = q.data;
  const original = idea?.events.find(
    (e) => e.relationship.basis === "original",
  );
  const update = idea?.events.find(
    (e) =>
      e.type === "update_published" &&
      e.relationship.basis === "creator_confirmed",
  );
  // No honest example to show: skip the story rather than invent one.
  const skip = q.isError || (q.isSuccess && (!original || !update));
  useEffect(() => {
    if (skip) onClose();
  }, [skip, onClose]);
  if (skip || !idea || !original || !update) return null;

  return (
    <div
      className="story"
      role="dialog"
      aria-label="What watching does, with a real example"
    >
      <div className="story__row">
        <span className="story__who" title={idea.trader.displayName}>
          <Avatar id={idea.trader.id} name={idea.trader.displayName} />
        </span>
        <span className="story__card" title={formatWhen(original.occurredAt)}>
          <Icon name="post" size={18} />
          {day(original.occurredAt)}
          <small>Original</small>
        </span>
        <svg
          className="story__wire"
          viewBox="0 0 80 4"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1="2" y1="2" x2="78" y2="2" pathLength={1} />
        </svg>
        <span
          className="story__card story__card--new"
          title={formatWhen(update.occurredAt)}
        >
          <Icon name="chain" size={18} />
          {day(update.occurredAt)}
          <small>Author-linked</small>
        </span>
        <span className="story__bell" aria-hidden="true">
          <Icon name="updated" size={22} />
        </span>
      </div>
      <p className="sr-only">
        Example: {idea.trader.displayName} published an essay on{" "}
        {day(original.occurredAt)} and linked back to it in a later essay on{" "}
        {day(update.occurredAt)}. Watching tells you when that happens.
      </p>
      <div className="story__actions">
        <Link
          to="/updates"
          className="btn btn--glass btn--small"
          onClick={onClose}
        >
          Updates
        </Link>
        <button
          ref={done}
          type="button"
          className="btn btn--primary btn--small"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
