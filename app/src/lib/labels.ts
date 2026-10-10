import type { PlanCardView } from "./api";
import { shortAddress } from "./format";

export function creatorName(card: PlanCardView): string {
  return (
    card.creator.displayName ??
    (card.creator.handle
      ? `@${card.creator.handle}`
      : shortAddress(card.creator.address))
  );
}

/** "SOL / USDC · Mika Tan" — used for the watch list and announcements. */
export function planLabel(card: PlanCardView): string {
  return `${card.pair.label} · ${creatorName(card)}`;
}
