import { parseUnits } from "./amounts";

/**
 * Price unit used everywhere in Relay (domain, server, program):
 *   a price is a u64 count of QUOTE atomic units per ONE WHOLE BASE token.
 * Example: $183.20 per SOL with USDC (6 decimals) is 183_200_000n.
 *
 * Range checks use cross-multiplication in bigint (the program does the same in u128),
 * so there is no rounding at the boundary.
 */
export const U64_MAX = (1n << 64n) - 1n;

export type RangePosition = "below_range" | "in_range" | "above_range";

/** "183.20" -> 183_200_000n (USDC). Must be > 0 and fit in u64. */
export function parsePrice(value: string, quoteDecimals: number): bigint {
  const price = parseUnits(value, quoteDecimals);
  if (price <= 0n) throw new RangeError("Price must be greater than zero");
  if (price > U64_MAX) throw new RangeError("Price is too large");
  return price;
}

/**
 * Converts an ADVISORY USD price (e.g. from Jupiter Price API, a JSON number) to price units.
 * Rounds to the quote's decimals. Never used for anything the program enforces.
 */
export function usdPriceToUnits(
  usdPrice: number | string,
  quoteDecimals: number,
): bigint {
  const n = typeof usdPrice === "number" ? usdPrice : Number(usdPrice);
  if (!Number.isFinite(n) || n <= 0) throw new RangeError("Price unavailable");
  return parsePrice(n.toFixed(quoteDecimals), quoteDecimals);
}

function pow10(n: number): bigint {
  return 10n ** BigInt(n);
}

/** ceil(quoteSpent * 10^baseDecimals / baseReceived): conservative price paid per whole base token. */
export function effectivePriceCeil(
  quoteSpent: bigint,
  baseReceived: bigint,
  baseDecimals: number,
): bigint {
  if (quoteSpent <= 0n || baseReceived <= 0n)
    throw new RangeError("Amounts must be positive");
  const num = quoteSpent * pow10(baseDecimals);
  return (num + baseReceived - 1n) / baseReceived;
}

/** floor version of effectivePriceCeil, for display where rounding down is the honest choice. */
export function effectivePriceFloor(
  quoteSpent: bigint,
  baseReceived: bigint,
  baseDecimals: number,
): bigint {
  if (quoteSpent <= 0n || baseReceived <= 0n)
    throw new RangeError("Amounts must be positive");
  return (quoteSpent * pow10(baseDecimals)) / baseReceived;
}

/** Where a fill sits relative to [entryLow, entryHigh]. Boundaries are inclusive. Mirrors finish_follow. */
export function fillPosition(args: {
  quoteSpent: bigint;
  baseReceived: bigint;
  baseDecimals: number;
  entryLow: bigint;
  entryHigh: bigint;
}): RangePosition {
  const { quoteSpent, baseReceived, baseDecimals, entryLow, entryHigh } = args;
  if (quoteSpent <= 0n || baseReceived <= 0n)
    throw new RangeError("Amounts must be positive");
  const paid = quoteSpent * pow10(baseDecimals);
  if (paid > entryHigh * baseReceived) return "above_range";
  if (paid < entryLow * baseReceived) return "below_range";
  return "in_range";
}

/** Where a single reference price sits relative to the range. Boundaries are inclusive. */
export function pricePosition(
  price: bigint,
  entryLow: bigint,
  entryHigh: bigint,
): RangePosition {
  if (price > entryHigh) return "above_range";
  if (price < entryLow) return "below_range";
  return "in_range";
}

/**
 * Smallest base amount (atomic) that keeps the price at or below entryHigh for `quoteIn`:
 * ceil(quoteIn * 10^baseDecimals / entryHigh). If a route's guaranteed minimum output is below this,
 * the fill can breach the plan's high bound.
 */
export function minBaseForHigh(
  quoteIn: bigint,
  baseDecimals: number,
  entryHigh: bigint,
): bigint {
  if (quoteIn <= 0n || entryHigh <= 0n)
    throw new RangeError("Amounts must be positive");
  const num = quoteIn * pow10(baseDecimals);
  return (num + entryHigh - 1n) / entryHigh;
}
