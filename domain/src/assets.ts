/**
 * The deliberately small allowlist of spot assets Relay supports in the MVP.
 * These are Solana mainnet mints; they also exist on a Surfpool mainnet fork.
 * The Anchor program holds the same allowlist (program/programs/relay/src/constants.rs).
 */
export interface Asset {
  symbol: string;
  mint: string;
  decimals: number;
}

export const USDC: Asset = {
  symbol: "USDC",
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
};
/** Wrapped SOL (the SPL token form of SOL that swaps use). */
export const SOL: Asset = {
  symbol: "SOL",
  mint: "So11111111111111111111111111111111111111112",
  decimals: 9,
};
export const JUP: Asset = {
  symbol: "JUP",
  mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  decimals: 6,
};

/** A buy-side plan: the follower spends `quote` (USDC) to receive `base`. */
export interface Pair {
  id: string;
  label: string;
  base: Asset;
  quote: Asset;
}

export const SUPPORTED_PAIRS: readonly Pair[] = [
  { id: "sol-usdc", label: "SOL / USDC", base: SOL, quote: USDC },
  { id: "jup-usdc", label: "JUP / USDC", base: JUP, quote: USDC },
];

export function findPair(id: string): Pair | undefined {
  return SUPPORTED_PAIRS.find((p) => p.id === id);
}

export function findPairByMints(
  baseMint: string,
  quoteMint: string,
): Pair | undefined {
  return SUPPORTED_PAIRS.find(
    (p) => p.base.mint === baseMint && p.quote.mint === quoteMint,
  );
}
