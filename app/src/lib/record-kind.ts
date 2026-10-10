import type { IconName } from "../components/ui/Icon";

/**
 * The four kinds of content Relay shows. They are never blended: a public post is not proof that a
 * trade happened, and only a plan published through Relay can be reviewed as a trade.
 */
export type RecordKind = "public_post" | "onchain" | "relay_plan" | "fictional";

export const RECORD_KIND: Record<
  RecordKind,
  { label: string; icon: IconName; meaning: string }
> = {
  public_post: {
    label: "Public post",
    icon: "post",
    meaning:
      "An idea the trader shared publicly, linked to its original source and time. A post is not proof that a trade happened.",
  },
  onchain: {
    label: "On-chain activity",
    icon: "chain",
    meaning:
      "A transaction read from Solana, shown for a wallet only when the link to the trader is supported.",
  },
  relay_plan: {
    label: "Published through Relay",
    icon: "plans",
    meaning:
      "A plan the trader signed and committed on Solana through Relay: an entry range, a deadline and hashed text. Only these can be reviewed as a trade.",
  },
  fictional: {
    label: "Fictional demo",
    icon: "fictional",
    meaning:
      "Invented for the walkthrough. Simulated prices, no real trader, no trade.",
  },
};
