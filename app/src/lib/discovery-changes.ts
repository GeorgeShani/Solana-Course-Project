import type { ChangesResponse, TargetChanges } from "./discovery";
import { maxSeq, seqGreater } from "./discovery-watch";

/** How many meaningful entries are new across everything the reader watches. */
export function totalNew(changes: ChangesResponse): number {
  return changes.items.reduce((n, t) => n + t.count, 0);
}

/**
 * True only when every covered target has nothing new and nothing more waiting behind a page.
 * Targets Relay no longer covers do not count: they say nothing about being caught up.
 */
export function isCaughtUp(changes: ChangesResponse): boolean {
  const covered = changes.items.filter((t) => t.known);
  return (
    covered.length > 0 && covered.every((t) => t.count === 0 && !t.hasMore)
  );
}

/** The newest entry among the ones this response actually returned for a target. */
export function newestReturned(target: TargetChanges): string | null {
  let newest: string | null = null;
  for (const g of target.groups)
    for (const e of g.events)
      newest = newest === null ? e.seq : maxSeq(newest, e.seq);
  return newest;
}

/**
 * Where the cursor goes when the reader says "mark as read" for a target, or null when it should
 * not move. When everything new was returned, the reader has seen up to the newest entry of any
 * kind (minor entries are not listed but were not hidden either). When a page was cut short, only
 * what was shown counts as read, so the rest is still new next time.
 */
export function cursorAfterReading(
  target: TargetChanges,
  current: string,
): string | null {
  if (!target.known) return null;
  const next = target.hasMore ? newestReturned(target) : target.latestSeq;
  return next !== null && seqGreater(next, current) ? next : null;
}
