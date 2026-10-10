import type { EntryStatus } from "@relay/domain";
import { reviewUnavailableReason } from "../../lib/status";
import { Icon } from "../ui/Icon";

/**
 * The thumb-zone actions. Review is never hidden: outside "In plan range" its slot shows the
 * reason instead. Nothing here signs or trades.
 */
export function ActionRow({
  status,
  watching,
  onToggleWatch,
  onOpenScript,
  reviewId,
  label,
}: {
  status: EntryStatus;
  watching: boolean;
  onToggleWatch: () => void;
  onOpenScript: () => void;
  reviewId: string;
  label: string;
}) {
  const reason = reviewUnavailableReason(status);
  return (
    <div className="actions">
      <div className="actions__row">
        <button
          type="button"
          className="btn btn--glass btn--watch"
          aria-pressed={watching}
          aria-label={watching ? `Stop watching ${label}` : `Watch ${label}`}
          onClick={onToggleWatch}
          data-on={watching}
        >
          <Icon name={watching ? "star-filled" : "star"} size={22} />
          <span className="btn__label">{watching ? "Watching" : "Watch"}</span>
        </button>
        <button
          type="button"
          className="btn btn--glass"
          onClick={onOpenScript}
          aria-haspopup="dialog"
        >
          <Icon name="script" size={20} />
          View plan
        </button>
        {status === "in_range" && (
          <button
            type="button"
            className="btn btn--primary"
            disabled
            aria-describedby={reviewId}
          >
            Review trade
          </button>
        )}
      </div>
      <p id={reviewId} className="actions__reason">
        {reason}
      </p>
    </div>
  );
}
