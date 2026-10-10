import type { Network } from "./networks";

/**
 * The deliberately small allowlist of spot assets Relay supports in the MVP.
 * Mint addresses are per network (`pairsFor`). The Anchor program holds the same allowlist, chosen
 * at build time: default build = the local test fork's mainnet mints, `devnet` feature = the devnet
 * mints (program/programs/relay/src/constants.rs).
 */
export interface Asset {
  symbol: string;
  mint: string;
  decimals: number;
}

/** USDC as it exists on the local test fork (a copy of mainnet state). Not a devnet token. */
export const USDC: Asset = {
  symbol: "USDC",
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
};
/** The USDC test token on Solana devnet (Circle's devnet mint; free from the faucet, no value). */
export const DEVNET_USDC: Asset = {
  symbol: "USDC",
  mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
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

/** Pairs on the local test fork (mainnet mints; Jupiter routes them). */
export const SUPPORTED_PAIRS: readonly Pair[] = [
  { id: "sol-usdc", label: "SOL / USDC", base: SOL, quote: USDC },
  { id: "jup-usdc", label: "JUP / USDC", base: JUP, quote: USDC },
];

/**
 * Devnet has one pair. JUP has no devnet market or mint, so it is not offered there. The pair id
 * is the same as on the fork ("sol-usdc") because it names the market, not the network.
 */
export const DEVNET_PAIRS: readonly Pair[] = [
  { id: "sol-usdc", label: "SOL / USDC", base: SOL, quote: DEVNET_USDC },
];

/** The pairs a network supports. Always ask with a network: the same pair id has different mints. */
export function pairsFor(network: Network): readonly Pair[] {
  return network === "devnet" ? DEVNET_PAIRS : SUPPORTED_PAIRS;
}

/** The pair with this id on `network` (the local test fork when none is given). */
export function findPair(
  id: string,
  network: Network = "localnet",
): Pair | undefined {
  return pairsFor(network).find((p) => p.id === id);
}

/**
 * The pair for these mints. With a network, only that network's pairs are searched, so a plan whose
 * quote mint belongs to another network is "unsupported" there. Without one, every network's pairs
 * are searched (mint pairs are distinct across networks).
 */
export function findPairByMints(
  baseMint: string,
  quoteMint: string,
  network?: Network,
): Pair | undefined {
  const pairs =
    network === undefined
      ? [...SUPPORTED_PAIRS, ...DEVNET_PAIRS]
      : pairsFor(network);
  return pairs.find(
    (p) => p.base.mint === baseMint && p.quote.mint === quoteMint,
  );
}
