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
  detailsOpen,
  detailsAvailable,
  onToggleDetails,
  detailsId,
  label,
}: {
  status: EntryStatus;
  watching: boolean;
  onToggleWatch: () => void;
  detailsOpen: boolean;
  detailsAvailable: boolean;
  onToggleDetails: () => void;
  detailsId: string;
  label: string;
}) {
  const reason = reviewUnavailableReason(status);
  return (
    <div className="actions">
      <button
        type="button"
        className="btn btn--ghost"
        aria-pressed={watching}
        aria-label={watching ? `Stop watching ${label}` : `Watch ${label}`}
        onClick={onToggleWatch}
        data-on={watching}
      >
        <Icon name={watching ? "star-filled" : "star"} />
        {watching ? "Watching" : "Watch"}
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        aria-expanded={detailsOpen}
        aria-controls={detailsId}
        disabled={!detailsAvailable}
        onClick={onToggleDetails}
      >
        <Icon name="details" className="btn__chevron" />
        {detailsOpen ? "Less" : "Details"}
      </button>
      {status === "in_range" ? (
        <div className="actions__review">
          <button type="button" className="btn btn--primary" disabled aria-describedby={`${detailsId}-review`}>
            Review trade
          </button>
          <p id={`${detailsId}-review`} className="actions__reason">
            {reason}
          </p>
        </div>
      ) : (
        <p className="actions__reason actions__reason--slot">{reason}</p>
      )}
    </div>
  );
}
