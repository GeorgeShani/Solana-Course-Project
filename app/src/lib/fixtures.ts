import { entryStatus, formatUnits } from "@relay/domain";
import type { FeedPage, PlanCardView } from "./api";

/**
 * FICTIONAL PREVIEW. A development-only feed (`/?preview=fictional`) used to check the layout of
 * every entry status when the API or Postgres is not running. Every card is flagged
 * `fictionalPreview` and badged in the UI. Nothing here exists onchain: there are no plan
 * addresses, hashes, signatures, receipts or follower results, and the names are role labels,
 * not people.
 */

interface Spec {
  key: string;
  creator: string;
  pair: "sol" | "jup";
  low: string;
  high: string;
  price: string | null;
  priceAgeMs: number;
  expiresInMs: number;
  publishedAgoMs: number;
  versions: number;
  closed?: boolean;
  text: null | { rationale: string; exitThesis: string };
}

const PAIRS: Record<Spec["pair"], PlanCardView["pair"]> = {
  sol: { id: "sol-usdc", label: "SOL / USDC", baseSymbol: "SOL", quoteSymbol: "USDC", baseDecimals: 9, quoteDecimals: 6 },
  jup: { id: "jup-usdc", label: "JUP / USDC", baseSymbol: "JUP", quoteSymbol: "USDC", baseDecimals: 6, quoteDecimals: 6 },
};

const MIN = 60_000;

const SPECS: Spec[] = [
  {
    key: "a", creator: "Understudy A", pair: "sol", low: "100", high: "105", price: "102.4",
    priceAgeMs: 4_000, expiresInMs: 45 * MIN, publishedAgoMs: 12 * MIN, versions: 1,
    text: {
      rationale: "Illustrative text: a retest of the 100 level after a breakout. The plan is void under 98.",
      exitThesis: "Illustrative: take profit near 112.",
    },
  },
  {
    key: "b", creator: "Understudy B", pair: "jup", low: "0.4", high: "0.42", price: "0.4115",
    priceAgeMs: 9_000, expiresInMs: 7 * MIN, publishedAgoMs: 4 * MIN, versions: 2,
    text: {
      rationale: "Illustrative text: version 2 narrowed the exit; the entry range is unchanged.",
      exitThesis: "Illustrative: exit near 0.46.",
    },
  },
  {
    key: "c", creator: "Understudy C", pair: "sol", low: "95", high: "98", price: "102.4",
    priceAgeMs: 6_000, expiresInMs: 3 * 60 * MIN, publishedAgoMs: 50 * MIN, versions: 1,
    text: { rationale: "Illustrative text: entry planned on a pullback that has not happened.", exitThesis: "Illustrative: exit near 108." },
  },
  {
    key: "d", creator: "Understudy D", pair: "jup", low: "0.45", high: "0.48", price: "0.4115",
    priceAgeMs: 7_000, expiresInMs: 20 * 60 * MIN, publishedAgoMs: 2 * 60 * MIN, versions: 1,
    text: { rationale: "Illustrative text: the plan assumed 0.45 would hold as support.", exitThesis: "Illustrative: exit near 0.55." },
  },
  {
    key: "e", creator: "Understudy E", pair: "sol", low: "101", high: "104", price: "102.4",
    priceAgeMs: 2 * MIN + 5_000, expiresInMs: 90 * MIN, publishedAgoMs: 30 * MIN, versions: 1,
    text: { rationale: "Illustrative text: the last price is old, so the status cannot be confirmed.", exitThesis: "Illustrative: exit near 110." },
  },
  {
    key: "f", creator: "Understudy F", pair: "jup", low: "0.39", high: "0.43", price: null,
    priceAgeMs: 0, expiresInMs: 5 * 60 * MIN, publishedAgoMs: 15 * MIN, versions: 1,
    text: { rationale: "Illustrative text: no reference price is available for this pair.", exitThesis: "Illustrative: exit near 0.5." },
  },
  {
    key: "g", creator: "Understudy G", pair: "sol", low: "100", high: "103", price: "102.4",
    priceAgeMs: 5_000, expiresInMs: 2 * 60 * MIN, publishedAgoMs: 25 * MIN, versions: 1,
    text: null,
  },
  {
    key: "h", creator: "Understudy H", pair: "sol", low: "99", high: "102", price: "102.4",
    priceAgeMs: 3_000, expiresInMs: -30 * MIN, publishedAgoMs: 3 * 60 * MIN, versions: 1,
    text: { rationale: "Illustrative text: the entry window ended before the price returned.", exitThesis: "Illustrative: exit near 109." },
  },
  {
    key: "i", creator: "Understudy I", pair: "jup", low: "0.4", high: "0.42", price: "0.4115",
    priceAgeMs: 5_000, expiresInMs: 6 * 60 * MIN, publishedAgoMs: 4 * 60 * MIN, versions: 3, closed: true,
    text: { rationale: "Illustrative text: the creator closed the plan to new entries.", exitThesis: "Illustrative: exit near 0.47." },
  },
];

function units(decimal: string, decimals: number): bigint {
  const [whole, fraction = ""] = decimal.split(".");
  return BigInt(whole + fraction.padEnd(decimals, "0").slice(0, decimals));
}

function card(spec: Spec, nowMs: number): PlanCardView {
  const pair = PAIRS[spec.pair];
  const low = units(spec.low, pair.quoteDecimals);
  const high = units(spec.high, pair.quoteDecimals);
  const expiresAt = Math.floor((nowMs + spec.expiresInMs) / 1000);
  const price =
    spec.price === null
      ? null
      : { units: units(spec.price, pair.quoteDecimals), observedAtMs: nowMs - spec.priceAgeMs };
  const status = entryStatus({
    plan: { status: spec.closed ? "closed" : "open", entryLow: low, entryHigh: high, expiresAt: BigInt(expiresAt) },
    price,
    nowMs,
  });
  return {
    planPda: `fictional-preview-${spec.key}`,
    cluster: "localnet",
    creator: {
      address: `fictional-creator-${spec.key}`,
      handle: `fictional_${spec.key}`,
      displayName: spec.creator,
      isDemo: true,
    },
    pair,
    planStatus: spec.closed ? "closed" : "open",
    version: {
      version: spec.versions,
      versionPda: "",
      publishedAt: Math.floor((nowMs - spec.publishedAgoMs) / 1000),
      expiresAt,
      entryLow: formatUnits(low, pair.quoteDecimals),
      entryHigh: formatUnits(high, pair.quoteDecimals),
      entryLowUnits: low.toString(),
      entryHighUnits: high.toString(),
      contentHash: "",
      termsHash: "",
      prevTermsHash: "",
      text: spec.text && { ...spec.text, exitTarget: null, invalidation: null },
    },
    versionCount: spec.versions,
    entry: {
      status: status.status,
      closingSoon: status.closingSoon,
      msUntilExpiry: status.msUntilExpiry,
      price: price && {
        units: price.units.toString(),
        display: formatUnits(price.units, pair.quoteDecimals),
        observedAtMs: price.observedAtMs,
      },
    },
    nowMs,
    fictionalPreview: true,
  };
}

export function fictionalPreviewFeed(nowMs: number): FeedPage {
  return { items: SPECS.map((s) => card(s, nowMs)), nextCursor: null, nowMs };
}
