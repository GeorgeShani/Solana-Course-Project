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

/**
 * The name on the portrait plate. A seeded demo creator's "(demo)" suffix moves to the "Demo creator"
 * badge beside the portrait, so the plate stays short without hiding that the creator is a demo.
 */
export function stageName(card: PlanCardView): string {
  const name = creatorName(card);
  return card.creator.isDemo ? name.replace(/\s*\(demo\)$/i, "") : name;
}

/** "SOL / USDC · Mika Tan" — used for the watch list and announcements. */
export function planLabel(card: PlanCardView): string {
  return `${card.pair.label} · ${creatorName(card)}`;
}
