import type { EntryStatus } from "@relay/domain";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useGoogleAuth } from "../../lib/google-auth";
import { reviewUnavailableReason } from "../../lib/status";
import { Icon } from "../ui/Icon";

/**
 * The thumb-zone actions. Review is never hidden: outside "In plan range" its slot shows the
 * reason instead. Nothing here signs or trades.
 *
 * If the visitor is not signed in, action buttons redirect to /account instead of acting.
 * The feed itself (scrolling, reading plan cards) is always accessible without signing in.
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
  const auth = useGoogleAuth();
  const navigate = useNavigate();

  const requireAuth = useCallback(
    (action: () => void) => () => {
      if (auth.status !== "signed_in") {
        void navigate({ to: "/account", search: {} });
        return;
      }
      action();
    },
    [auth.status, navigate],
  );

  return (
    <div className="actions">
      <div className="actions__row">
        <button
          type="button"
          className="btn btn--glass btn--watch"
          aria-pressed={watching}
          aria-label={watching ? `Stop watching ${label}` : `Watch ${label}`}
          onClick={requireAuth(onToggleWatch)}
          data-on={watching}
        >
          <Icon name={watching ? "star-filled" : "star"} size={22} />
          <span className="btn__label">{watching ? "Watching" : "Watch"}</span>
        </button>
        <button
          type="button"
          className="btn btn--glass"
          onClick={requireAuth(onOpenScript)}
          aria-haspopup="dialog"
        >
          <Icon name="script" size={20} />
          View plan
        </button>
        {status === "in_range" && planPda && (
          <Link
            to="/plans/$planPda"
            params={{ planPda }}
            hash="follow"
            className="btn btn--primary"
            aria-describedby={reviewId}
            onClick={
              auth.status !== "signed_in"
                ? (e) => {
                    e.preventDefault();
                    void navigate({ to: "/account", search: {} });
                  }
                : undefined
            }
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
