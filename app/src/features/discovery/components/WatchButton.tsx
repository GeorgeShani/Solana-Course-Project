import { useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { cueReact } from "../../../lib/cue-cursor";
import {
  isWatched,
  toggleWatch,
  useDiscoveryWatch,
  type WatchResult,
} from "../watch";
import type { WatchTarget } from "../model";

function problemText(result: Extract<WatchResult, { ok: false }>): string {
  return result.reason === "limit_reached"
    ? "You are watching as many things as Relay can check at once. Remove one first."
    : "This browser is blocking storage, so Relay can't remember what you watch.";
}

/**
 * Watch an idea or a trader. Watching is kept in this browser only: no account, no wallet. A new
 * watch starts at `seenSeq`, the newest entry the reader is looking at, so only later entries are
 * reported as new.
 */
export function WatchButton({
  type,
  id,
  label,
  seenSeq,
  variant = "pill",
  onWatched,
}: {
  type: WatchTarget["type"];
  id: string;
  label: string;
  seenSeq: string | null;
  /** "card" is the full-size button on a Discover card; "pill" the small one on pages. */
  variant?: "pill" | "card";
  /** Called after something new is watched (not when it is un-watched). */
  onWatched?: () => void;
}) {
  const list = useDiscoveryWatch();
  const watching = isWatched(list, type, id);
  const [problem, setProblem] = useState<string | null>(null);
  const noun = type === "idea" ? "this idea" : label;
  // On a Discover card a trader is watched as "the author", so the button says who it follows.
  const text = type === "trader" && variant === "card" ? "author" : "";
  const words = watching ? `Watching ${text}` : `Watch ${text}`;

  return (
    <div className="watchbtn" data-variant={variant}>
      <button
        type="button"
        className={
          variant === "card" ? "btn btn--glass" : "btn btn--glass btn--small"
        }
        aria-pressed={watching}
        data-on={watching}
        aria-label={watching ? `Stop watching ${noun}` : `Watch ${noun}`}
        onClick={() => {
          const result = toggleWatch(type, id, label, seenSeq);
          if (!result.ok) {
            setProblem(problemText(result));
            return;
          }
          setProblem(null);
          if (result.watching) {
            cueReact();
            onWatched?.();
          }
        }}
      >
        <Icon
          name={watching ? "star-filled" : "star"}
          size={variant === "card" ? 18 : 16}
        />
        {words.trim()}
      </button>
      {problem && (
        <p className="field__error" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
