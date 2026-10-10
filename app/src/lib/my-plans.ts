import type { EntryStatus } from "@relay/domain";
import type { PlanCardView } from "./api";
import { formatUsd } from "./format";
import { STATUS_HEADLINE } from "./status";
import type { WatchSnapshot } from "./watchlist";

export interface Change {
  what: "status" | "version" | "price";
  then: string;
  now: string;
}

/**
 * What differs between the moment a plan was watched and now. Prices are compared as integers in
 * the plan's quote units; the words come from the same status vocabulary as the feed.
 */
export function watchChanges(
  snap: WatchSnapshot,
  card: PlanCardView,
  status: EntryStatus,
): Change[] {
  const out: Change[] = [];
  if (snap.status !== status) {
    out.push({
      what: "status",
      then: STATUS_HEADLINE[snap.status],
      now: STATUS_HEADLINE[status],
    });
  }
  if (snap.version !== card.version.version) {
    out.push({
      what: "version",
      then: `Version ${snap.version}`,
      now: `Version ${card.version.version}`,
    });
  }
  const nowUnits = card.entry.price?.units ?? null;
  if (snap.priceUnits !== nowUnits) {
    const show = (u: string | null, decimals: number) =>
      u === null ? "No price" : formatUsd(BigInt(u), decimals);
    out.push({
      what: "price",
      then: show(snap.priceUnits, snap.quoteDecimals),
      now: show(nowUnits, card.pair.quoteDecimals),
    });
  }
  return out;
}

/**
 * The open position's value at the current reference price, minus what was spent, in quote base
 * units. An estimate: no exit happened, fees and slippage on a sale are not included.
 */
export function estimateOpen(
  baseReceived: bigint,
  quoteSpent: bigint,
  priceUnits: bigint,
  baseDecimals: number,
): { value: bigint; change: bigint } {
  const value = (baseReceived * priceUnits) / 10n ** BigInt(baseDecimals);
  return { value, change: value - quoteSpent };
}

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isAddress(s: string): boolean {
  return BASE58_ADDRESS.test(s);
}

/**
 * Block times before 2020 or far in the future are not shown: a local fork can report values that
 * aren't Unix seconds, and a wrong date is worse than none.
 */
export function plausibleBlockTime(t: number | null): number | null {
  return t !== null && t > 1_577_836_800 && t < 4_102_444_800 ? t : null;
}
