// Seeds labelled DEMO creators and plans.
//
// The plans are REAL: each one is committed onchain on a local Surfpool fork by a freshly
// generated key. The script refuses any RPC that is not on this machine, so demo plans never reach
// any real network. Only the creators' names are fictional, and they
// are stored with is_demo = true so the UI can label them. Nothing here fakes blockchain state.
//
// Needs: the cluster running with the relay program deployed, Postgres migrated, and the API
// server running (the plan text is submitted through POST /plans/:planPda/confirm, like a real
// creator would):
//   bun run --cwd server seed

import {
  address,
  createSolanaRpc,
  generateKeyPairSigner,
  getBase64Encoder,
  getI64Codec,
  lamports,
} from "@solana/kit";
import {
  JUP,
  SOL,
  USDC,
  contentHash,
  findPair,
  parsePrice,
  type Pair,
  type PlanContent,
} from "@relay/domain";
import {
  assertLocalFork,
  CLOCK_SYSVAR_ADDRESS,
  createPlanInstruction,
  getPlanAddress,
  getVersionAddress,
  revisePlanInstruction,
  sendInstructions,
} from "@relay/domain/solana";
import { connect } from "../src/db";
import { loadEnv } from "../src/env";
import { isRecord } from "../src/util";

const env = loadEnv();
assertLocalFork(env.solanaRpcUrl, "seed-demo");
const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";
const rpc = createSolanaRpc(env.solanaRpcUrl);
const db = connect(env.databaseUrl);

async function chainNowSec(): Promise<number> {
  const { value } = await rpc
    .getAccountInfo(CLOCK_SYSVAR_ADDRESS, { encoding: "base64" })
    .send();
  if (!value) throw new Error("clock unavailable");
  const bytes = Uint8Array.from(getBase64Encoder().encode(value.data[0]));
  return Number(getI64Codec().decode(bytes, 32));
}

async function usdPrice(mint: string): Promise<number> {
  const res = await fetch(`${env.jupiterBaseUrl}/price/v3?ids=${mint}`);
  const body: unknown = await res.json();
  const entry = isRecord(body) ? body[mint] : undefined;
  if (isRecord(entry) && typeof entry.usdPrice === "number")
    return entry.usdPrice;
  throw new Error(`no price for ${mint}`);
}

/** Price units with six decimals, scaled by a percentage (e.g. 97 means 97%). */
function scaled(price: number, percent: number, pair: Pair): bigint {
  return parsePrice(
    ((price * percent) / 100).toFixed(pair.quote.decimals),
    pair.quote.decimals,
  );
}

async function confirm(plan: string, version: number, text: PlanContent) {
  const res = await fetch(`${API_URL}/plans/${plan}/confirm`, {
    method: "POST",
    headers: { origin: env.appOrigin, "content-type": "application/json" },
    body: JSON.stringify({
      version,
      content: {
        rationale: text.rationale,
        exitThesis: text.exitThesis,
        exitTarget: null,
        invalidation: null,
      },
    }),
  });
  if (!res.ok) throw new Error(`confirm failed: ${await res.text()}`);
}

interface Seed {
  handle: string;
  displayName: string;
  pairId: string;
  /** Entry range as a percentage of the current price. */
  low: number;
  high: number;
  text: PlanContent;
  /** If set, the creator revises the plan once with this text (shows append-only history). */
  revision?: PlanContent;
}

const seeds: Seed[] = [
  {
    handle: "mika_demo",
    displayName: "Mika Tan (demo)",
    pairId: "sol-usdc",
    low: 97,
    high: 102,
    text: {
      rationale:
        "Demo plan: accumulating SOL on a retest of the breakout level.",
      exitThesis:
        "Demo exit thesis: reassess near the prior high, not a stop-loss order.",
      exitTarget: null,
      invalidation: null,
    },
    revision: {
      rationale:
        "Demo plan: accumulating SOL on a retest of the breakout level.",
      exitThesis:
        "Demo update: exit idea lowered to the first resistance instead.",
      exitTarget: null,
      invalidation: null,
    },
  },
  {
    handle: "ren_demo",
    displayName: "Ren Okafor (demo)",
    pairId: "jup-usdc",
    low: 96,
    high: 103,
    text: {
      rationale:
        "Demo plan: JUP volume is recovering and the range is holding.",
      exitThesis:
        "Demo exit thesis: review the plan if the window closes first.",
      exitTarget: null,
      invalidation: null,
    },
  },
  {
    handle: "alex_demo",
    displayName: "Alex Rivera (demo)",
    pairId: "sol-usdc",
    low: 86,
    high: 92,
    text: {
      rationale: "Demo plan: waiting for a pullback that has not come yet.",
      exitThesis: "Demo exit thesis: none yet, the original entry has passed.",
      exitTarget: null,
      invalidation: null,
    },
  },
  {
    handle: "noor_demo",
    displayName: "Noor Haddad (demo)",
    pairId: "jup-usdc",
    low: 108,
    high: 116,
    text: {
      rationale:
        "Demo plan: only interested if JUP trades above the range first.",
      exitThesis:
        "Demo exit thesis: this plan sits below the current price on purpose.",
      exitTarget: null,
      invalidation: null,
    },
  },
];

async function main() {
  const now = await chainNowSec();
  const prices = new Map<string, number>([
    [SOL.mint, await usdPrice(SOL.mint)],
    [JUP.mint, await usdPrice(JUP.mint)],
  ]);

  for (const seed of seeds) {
    const pair = findPair(seed.pairId);
    if (!pair) throw new Error(`unknown pair ${seed.pairId}`);
    const price = prices.get(pair.base.mint);
    if (price === undefined) throw new Error("missing price");

    const creator = await generateKeyPairSigner();
    await rpc.requestAirdrop(creator.address, lamports(2_000_000_000n)).send();
    await new Promise((r) => setTimeout(r, 1200));

    const planId = BigInt(Date.now());
    const plan = await getPlanAddress(creator.address, planId);
    const v1 = await getVersionAddress(plan, 1);
    const low = scaled(price, seed.low, pair);
    const high = scaled(price, seed.high, pair);
    await sendInstructions(
      rpc,
      [
        createPlanInstruction({
          creator: creator.address,
          plan,
          version: v1,
          baseMint: address(pair.base.mint),
          quoteMint: address(USDC.mint),
          planId,
          entryLow: low,
          entryHigh: high,
          expiresAt: BigInt(now + 6 * 3600),
          contentHash: await contentHash(seed.text),
        }),
      ],
      creator,
    );

    await db`
      insert into creators (address, handle, display_name, is_demo)
      values (${creator.address}, ${seed.handle}, ${seed.displayName}, true)
      on conflict (address) do nothing`;
    await confirm(plan, 1, seed.text);

    if (seed.revision) {
      await sendInstructions(
        rpc,
        [
          revisePlanInstruction({
            creator: creator.address,
            plan,
            prevVersion: v1,
            newVersion: await getVersionAddress(plan, 2),
            entryLow: low,
            entryHigh: high,
            expiresAt: BigInt(now + 8 * 3600),
            contentHash: await contentHash(seed.revision),
          }),
        ],
        creator,
      );
      await confirm(plan, 2, seed.revision);
    }
    console.log(`seeded ${seed.displayName}: ${pair.label} ${plan}`);
  }
  await db.close();
}

await main();
