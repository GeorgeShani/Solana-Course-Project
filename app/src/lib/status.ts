import type { EntryStatus } from "@relay/domain";
import { formatClock, formatDuration } from "./format";

/**
 * The entry-status vocabulary from the plan (section E). These exact words are shared by the UI,
 * the API enum, the docs and the tests. "Eligible" is never used: it sounds like permission.
 */
export const STATUS_HEADLINE: Record<EntryStatus, string> = {
  in_range: "In plan range",
  above_range: "Original entry passed",
  below_range: "Below plan range",
  expired: "Plan expired",
  closed: "Closed by creator",
  price_stale: "Price may be outdated",
  price_unavailable: "Price unavailable",
};

export type StatusTone = "in" | "above" | "below" | "ended" | "unknown";

export const STATUS_TONE: Record<EntryStatus, StatusTone> = {
  in_range: "in",
  above_range: "above",
  below_range: "below",
  expired: "ended",
  closed: "ended",
  price_stale: "unknown",
  price_unavailable: "unknown",
};

export interface StatusCopyInput {
  status: EntryStatus;
  closingSoon: boolean;
  msUntilExpiry: number;
  /** Unix seconds (chain clock). */
  expiresAt: number;
  /** Age of the last price in ms, when there is one. */
  priceAgeMs: number | null;
}

/** "In plan range · closes in 7 min" when closing soon; otherwise the plain headline. */
export function statusHeadline(input: StatusCopyInput): string {
  const base = STATUS_HEADLINE[input.status];
  if (input.status === "in_range" && input.closingSoon) {
    return `${base} · closes in ${formatDuration(input.msUntilExpiry)}`;
  }
  return base;
}

/** The always-visible hint under the headline. */
export function statusHint(input: StatusCopyInput): string {
  switch (input.status) {
    case "in_range":
      return "Price is inside the creator's original entry. Not a recommendation.";
    case "above_range":
      return "Price is above the plan's entry. Following now would not match the plan.";
    case "below_range":
      return "Price is under the plan's entry. The creator's thesis may no longer hold.";
    case "expired":
      return `The entry window closed at ${formatClock(input.expiresAt)}.`;
    case "closed":
      return "The creator stopped new entries. History stays visible.";
    case "price_stale":
      return input.priceAgeMs === null
        ? "Status will update when data returns."
        : `Last price ${formatDuration(input.priceAgeMs)} ago. Status will update when data returns.`;
    case "price_unavailable":
      return "We can't check the entry right now.";
  }
}

/** Why Review is not offered, written for the disabled slot (never hidden). */
export function reviewUnavailableReason(status: EntryStatus): string {
  switch (status) {
    case "in_range":
      return "Review a fresh quote, then approve in your wallet";
    case "above_range":
      return "Original entry passed — no Relay entry available";
    case "below_range":
      return "Below plan range — no Relay entry available";
    case "expired":
      return "Plan expired — entry window closed";
    case "closed":
      return "Closed by creator — no new entries";
    case "price_stale":
    case "price_unavailable":
      return "Can't check the entry right now";
  }
}
