import type { EntryStatus } from "@relay/domain";
import { isRecord } from "../util";

/**
 * Deterministic feed ranking. Deliberately NOT based on claimed or simulated return: ranking by
 * highest profit would recreate the problem Relay exists to expose.
 *
 *   1  open plans whose price is inside the plan range
 *   2  open plans whose price is above or below the range
 *   3  open plans with no usable price
 *   4  expired or closed within the last 24 h (honest outcome browsing)
 *   5  everything older
 * Within a bucket: newest publication first, then plan address for a stable order.
 */
export interface Rankable {
  planPda: string;
  status: EntryStatus;
  /** Unix seconds when the latest version was published. */
  publishedAt: number;
  /** Unix seconds when the entry window ended (expiry), used for the 24 h recency rule. */
  expiresAt: number;
}

export const RECENT_END_SEC = 24 * 60 * 60;

export function bucketOf(item: Rankable, nowSec: number): 1 | 2 | 3 | 4 | 5 {
  switch (item.status) {
    case "in_range":
      return 1;
    case "above_range":
    case "below_range":
      return 2;
    case "price_stale":
    case "price_unavailable":
      return 3;
    case "expired":
    case "closed": {
      // A closed plan has no recorded close time here, so its window end (or publication) stands in.
      const endedAt = Math.min(item.expiresAt, nowSec);
      return nowSec - Math.max(endedAt, item.publishedAt) <= RECENT_END_SEC
        ? 4
        : 5;
    }
  }
}

export function rankFeed<T extends Rankable>(
  items: readonly T[],
  nowSec: number,
): T[] {
  return [...items].sort((a, b) => {
    const ba = bucketOf(a, nowSec);
    const bb = bucketOf(b, nowSec);
    if (ba !== bb) return ba - bb;
    if (a.publishedAt !== b.publishedAt) return b.publishedAt - a.publishedAt;
    return a.planPda < b.planPda ? -1 : a.planPda > b.planPda ? 1 : 0;
  });
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (isRecord(parsed)) {
      const o = parsed.o;
      if (typeof o === "number" && Number.isSafeInteger(o) && o >= 0) return o;
    }
    return 0;
  } catch {
    return 0;
  }
}
