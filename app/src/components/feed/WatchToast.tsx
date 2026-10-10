import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useCalmMotion } from "../../lib/motion";
import { Cue } from "../cue/Cue";
import { Icon } from "../ui/Icon";

const EASE = [0.16, 1, 0.3, 1] as const;
const SHOW_MS = 5000;

/**
 * Cue hugs the bookmark when a plan is watched. The toast never takes focus and never blocks the
 * plan; screen readers hear the same confirmation through the feed's polite live region.
 */
export function WatchToast({
  toast,
  onDismiss,
}: {
  toast: { key: number; subject: string } | null;
  onDismiss: () => void;
}) {
  const reduce = useCalmMotion();
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, SHOW_MS);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.aside
          key={toast.key}
          className="watch-toast"
          aria-label="Watch confirmation"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
          transition={{ duration: reduce ? 0.15 : 0.4, ease: EASE }}
        >
          <Cue pose="saved" className="watch-toast__cue" />
          <div className="watch-toast__text">
            <p className="watch-toast__title">Saved to My Plans</p>
            <p className="watch-toast__body">
              Watching {toast.subject} doesn't place a trade.
            </p>
            <Link to="/me" className="watch-toast__link">
              Open My Plans
            </Link>
          </div>
          <button
            type="button"
            className="btn btn--icon watch-toast__close"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <Icon name="close" size={18} />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
