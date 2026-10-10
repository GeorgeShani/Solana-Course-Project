import { entryStatus, parseUnits, type EntryStatusResult } from "@relay/domain";

/**
 * The "Try a demo" walkthrough: one fictional trader and one fictional plan on a simulated clock.
 * It is self-contained by design: no API call, no chain read, nothing written to the real watch list,
 * no receipt and no result. Statuses still come from the same `entryStatus` the feed uses, so the
 * words match what a real plan would show.
 */

export const DEMO_LABEL = "Fictional demo · simulated prices · no real trades";

const QUOTE_DECIMALS = 6;
const MIN = 60_000;

export const DEMO_PLAN = {
  id: "demo-mika-sol",
  creator: "Mika",
  creatorNote: "fictional demo profile",
  /** Sigil seed; not an address. */
  seed: "fictional-demo:mika",
  pair: "SOL / USDC",
  baseSymbol: "SOL",
  quoteDecimals: QUOTE_DECIMALS,
  entryLow: "140",
  entryHigh: "145",
  entryLowUnits: parseUnits("140", QUOTE_DECIMALS),
  entryHighUnits: parseUnits("145", QUOTE_DECIMALS),
  publishedMinutesBefore: 12,
  windowMinutes: 45,
  rationale:
    "Illustrative: SOL retests the 140 area after a breakout. Below 140 the idea is off.",
  exitThesis: "Illustrative: take profit near 160.",
  /** A fictional public post that comes before the plan: an idea, not a trade. */
  post: "Illustrative: SOL looks heavy into 140. I'd want it between 140 and 145.",
} as const;

export interface DemoStep {
  /** Simulated minutes after the demo starts. */
  minutes: number;
  /** Simulated SOL price in USDC. */
  price: string;
  /** What the advance button says to get here. */
  advanceLabel: string;
}

export const DEMO_STEPS: readonly DemoStep[] = [
  { minutes: 0, price: "143", advanceLabel: "" },
  { minutes: 20, price: "148", advanceLabel: "Advance demo · 20 minutes" },
  {
    minutes: 50,
    price: "146.5",
    advanceLabel: "Advance demo · past the window",
  },
];

export interface DemoState {
  step: number;
  nowMs: number;
  publishedAtSec: number;
  expiresAtSec: number;
  price: { units: bigint; display: string };
  entry: EntryStatusResult;
}

/** The simulated world at one step, anchored to the moment the demo started. */
export function demoState(step: number, startMs: number): DemoState {
  const i = Math.min(Math.max(0, step), DEMO_STEPS.length - 1);
  const s = DEMO_STEPS[i];
  const nowMs = startMs + s.minutes * MIN;
  const publishedAtSec = Math.floor(
    (startMs - DEMO_PLAN.publishedMinutesBefore * MIN) / 1000,
  );
  const expiresAtSec = Math.floor(
    (startMs + DEMO_PLAN.windowMinutes * MIN) / 1000,
  );
  const units = parseUnits(s.price, QUOTE_DECIMALS);
  return {
    step: i,
    nowMs,
    publishedAtSec,
    expiresAtSec,
    price: { units, display: s.price },
    entry: entryStatus({
      plan: {
        status: "open",
        entryLow: DEMO_PLAN.entryLowUnits,
        entryHigh: DEMO_PLAN.entryHighUnits,
        expiresAt: BigInt(expiresAtSec),
      },
      // Simulated prices are always "just observed" on the simulated clock.
      price: { units, observedAtMs: nowMs },
      nowMs,
    }),
  };
}
