import { address, generateKeyPairSigner, type Address } from "@solana/kit";
import {
  RELAY_PROGRAM_ADDRESS,
  getPlanAddress,
  getVersionAddress,
  type PlanAccount,
  type PlanVersionAccount,
} from "@relay/domain/solana";
import {
  JUP,
  SOL,
  USDC,
  ZERO_HASH,
  contentHash,
  termsHash,
  type Pair,
  type PlanContent,
  type ReferencePrice,
} from "@relay/domain";
import { createApp } from "../src/app";
import { connect, migrate, type Db } from "../src/db";
import { loadEnv, type Env } from "../src/env";
import { createPlanService } from "../src/services/plans";
import type { ChainReader, PriceSource } from "../src/services/types";

export const T0 = 1_790_000_000;
export const ORIGIN = "http://localhost:5173";
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://relay:relay_local_only@127.0.0.1:5432/relay_test";

export const GOOD_TEXT: PlanContent = {
  rationale: "Retest of support after the breakout.",
  exitThesis: "Take profit near the prior high, not a stop-loss order.",
  exitTarget: null,
  invalidation: null,
};

/** An in-memory stand-in for Solana that serves accounts built with the real encoders. */
export class FakeChain implements ChainReader {
  readonly programId = RELAY_PROGRAM_ADDRESS;
  now = T0 * 1000;
  plans = new Map<string, PlanAccount>();
  versions = new Map<string, PlanVersionAccount>();
  foreign = new Set<string>();
  down = false;

  async nowMs() {
    return this.now;
  }

  private check(pda: string) {
    if (this.down) throw new Error("rpc down");
    if (this.foreign.has(pda))
      throw new Error("Account is not owned by the Relay program");
  }

  async getPlan(planPda: string) {
    this.check(planPda);
    return this.plans.get(planPda) ?? null;
  }

  async getVersion(planPda: string, version: number) {
    const data = this.versions.get(`${planPda}:${version}`);
    return data
      ? { pda: await getVersionAddress(address(planPda), version), data }
      : null;
  }

  async listPlans() {
    if (this.down) throw new Error("rpc down");
    return [...this.plans].map(([pda, data]) => ({ pda, data }));
  }

  async listVersions() {
    if (this.down) throw new Error("rpc down");
    return Promise.all(
      [...this.versions].map(async ([key, data]) => ({
        pda: await getVersionAddress(data.plan, Number(key.split(":")[1])),
        data,
      })),
    );
  }

  /** Publishes (or revises, when the plan exists) a plan the way the program would. */
  async publish(args: {
    pair: Pair;
    low: bigint;
    high: bigint;
    expiresAt?: number;
    text?: PlanContent;
    creator?: Address;
    planId?: bigint;
    publishedAt?: number;
    closed?: boolean;
  }): Promise<{ plan: Address; version: number; text: PlanContent }> {
    const creator = args.creator ?? (await generateKeyPairSigner()).address;
    const planId = args.planId ?? BigInt(this.plans.size + 1);
    const plan = await getPlanAddress(creator, planId);
    const text = args.text ?? GOOD_TEXT;
    const existing = this.plans.get(plan);
    const version = (existing?.latestVersion ?? 0) + 1;
    const prev = this.versions.get(`${plan}:${version - 1}`);
    const content = await contentHash(text);
    const expiresAt = BigInt(args.expiresAt ?? T0 + 3600);
    const terms = await termsHash({
      programId: RELAY_PROGRAM_ADDRESS,
      plan,
      version,
      creator,
      baseMint: args.pair.base.mint,
      quoteMint: args.pair.quote.mint,
      baseDecimals: args.pair.base.decimals,
      quoteDecimals: args.pair.quote.decimals,
      entryLow: args.low,
      entryHigh: args.high,
      expiresAt,
      contentHash: content,
      prevTermsHash: prev?.termsHash ?? ZERO_HASH,
    });
    this.plans.set(plan, {
      creator,
      planId,
      baseMint: address(args.pair.base.mint),
      quoteMint: address(args.pair.quote.mint),
      baseDecimals: args.pair.base.decimals,
      quoteDecimals: args.pair.quote.decimals,
      latestVersion: version,
      status: args.closed ? "closed" : "open",
      createdAt: BigInt(T0),
    });
    this.versions.set(`${plan}:${version}`, {
      plan,
      version,
      entryLow: args.low,
      entryHigh: args.high,
      expiresAt,
      publishedAt: BigInt(args.publishedAt ?? T0),
      publishedSlot: 1n,
      contentHash: content,
      prevTermsHash: prev?.termsHash ?? ZERO_HASH,
      termsHash: terms,
    });
    return { plan, version, text };
  }
}

export class FakePrices implements PriceSource {
  /**
   * Base mint -> price in quote units and how old the observation is. Like the real source it
   * reports WALL-CLOCK observation times; the service converts them to chain time.
   */
  prices = new Map<string, { units: bigint; ageMs: number }>();
  async get(pair: Pair): Promise<ReferencePrice | null> {
    const p = this.prices.get(pair.base.mint);
    return p ? { units: p.units, observedAtMs: Date.now() - p.ageMs } : null;
  }
}

export interface TestApp {
  app: ReturnType<typeof createApp>;
  db: Db;
  chain: FakeChain;
  prices: FakePrices;
  env: Env;
  post: (
    path: string,
    body: unknown,
    headers?: Record<string, string>,
  ) => Promise<Response>;
  get: (path: string) => Promise<Response>;
}

export async function resetDatabase(db: Db): Promise<void> {
  await db`drop schema public cascade`;
  await db`create schema public`;
  await migrate(db);
}

export async function createTestApp(): Promise<TestApp> {
  const env = loadEnv({
    APP_ORIGIN: ORIGIN,
    SOLANA_CLUSTER: "localnet",
    DATABASE_URL: TEST_DATABASE_URL,
  });
  const db = connect(TEST_DATABASE_URL);
  await resetDatabase(db);
  const chain = new FakeChain();
  const prices = new FakePrices();
  prices.prices.set(SOL.mint, { units: 183_000_000n, ageMs: 1000 });
  prices.prices.set(JUP.mint, { units: 350_000n, ageMs: 1000 });
  const plans = createPlanService({ env, db, chain, prices });
  const app = createApp({ env, db, plans, prices });
  return {
    app,
    db,
    chain,
    prices,
    env,
    get: async (path) => app.request(path),
    post: async (path, body, headers = {}) =>
      app.request(path, {
        method: "POST",
        headers: {
          origin: ORIGIN,
          "content-type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
      }),
  };
}

export const SOL_PRICE_IN_RANGE = { low: 180_000_000n, high: 185_000_000n };
export { USDC };
