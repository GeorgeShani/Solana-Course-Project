import type { EntryStatus } from "@relay/domain";
import { Link } from "@tanstack/react-router";
import { reviewUnavailableReason } from "../../lib/status";
import { Icon } from "../ui/Icon";

/**
 * The thumb-zone actions. Review is never hidden: outside "In plan range" its slot shows the
 * reason instead. Nothing here signs or trades.
 */
export function ActionRow({
  planPda,
  status,
  watching,
  onToggleWatch,
  onOpenScript,
  reviewId,
  label,
}: {
  /** Null for the fictional preview, which has no record to review. */
  planPda: string | null;
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
        {status === "in_range" && planPda && (
          <Link
            to="/records/$planPda"
            params={{ planPda }}
            hash="follow"
            className="btn btn--primary"
            aria-describedby={reviewId}
          >
            Review trade
          </Link>
        )}
      </div>
      <p id={reviewId} className="actions__reason">
        {reason}
      </p>
    </div>
  );
}
