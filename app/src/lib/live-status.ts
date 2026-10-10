import { entryStatus, type EntryStatusResult } from "@relay/domain";
import type { PlanCardView } from "./api";

/**
 * "Now" on the chain clock for a card: the server's chain-time snapshot moved forward by the wall
 * time that passed since the response arrived. On a Surfpool fork the chain clock can be ahead of
 * (or time-travelled past) the wall clock, so never use Date.now() for plan expiry directly.
 */
export function chainNowMs(serverNowMs: number, receivedAtMs: number, wallNowMs: number | null): number {
  if (wallNowMs === null) return serverNowMs;
  return serverNowMs + Math.max(0, wallNowMs - receivedAtMs);
}

/**
 * Recomputes the advisory entry status with the same domain function the server uses. As time
 * passes without fresh data, an "In plan range" turns into "Price may be outdated" or "Plan expired"
 * on its own instead of staying green.
 */
export function liveEntry(card: PlanCardView, nowMs: number): EntryStatusResult {
  const price = card.entry.price;
  return entryStatus({
    plan: {
      status: card.planStatus,
      entryLow: BigInt(card.version.entryLowUnits),
      entryHigh: BigInt(card.version.entryHighUnits),
      expiresAt: BigInt(card.version.expiresAt),
    },
    price: price ? { units: BigInt(price.units), observedAtMs: price.observedAtMs } : null,
    nowMs,
  });
}
