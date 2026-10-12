import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { findPair, parseJupiterBuild } from "@relay/domain";
import {
  getVenuePoolAddress,
  SIMULATED_VENUE_LABEL,
  SIMULATED_VENUE_PROGRAM_ADDRESS,
} from "@relay/domain/solana";
import { address } from "@solana/kit";
import type { VenuePoolSnapshot } from "../src/modules/plans/types";
import { isRecord } from "../src/shared/util";
import { createTestApp, type TestApp } from "./helpers";

const ADMIN = address("HRJpuCAo3bvBgUUSTbcqNRupR853yaQ1FMcXMkEikp1e");
const FOLLOWER = address("4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx");
const pair = findPair("sol-usdc", "devnet") ?? missingPair();
function missingPair(): never {
  throw new Error("Missing devnet pair");
}
let t: TestApp;
let pool: VenuePoolSnapshot | null;
beforeEach(async () => {
  t = await createTestApp(null, {
    env: { NETWORK: "devnet", SIMULATED_VENUE_ADMIN: ADMIN },
  });
  const derived = await getVenuePoolAddress(
    ADMIN,
    address(pair.base.mint),
    address(pair.quote.mint),
  );
  pool = {
    address: derived.address,
    data: {
      admin: ADMIN,
      baseMint: address(pair.base.mint),
      quoteMint: address(pair.quote.mint),
      baseDecimals: 9,
      bump: derived.bump,
      price: 100_000_000n,
    },
    baseAvailable: 2_000_000_000n,
  };
  Object.assign(t.chain, { getVenuePool: async () => pool });
});
afterEach(async () => {
  await t?.db.close();
});

async function publish(low = 90_000_000n, high = 110_000_000n) {
  return t.chain.publish({ pair, low, high });
}
async function quote(plan: string) {
  return t.post("/follow/quote", {
    planPda: plan,
    version: 1,
    follower: FOLLOWER,
    quoteAmount: "1",
  });
}
function object(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Expected object");
  return value;
}
async function body(response: Response) {
  return object(await response.json());
}

describe("devnet simulated venue", () => {
  it("quotes a real venue route without calling Jupiter and simulates before handing out a transaction", async () => {
    const { plan } = await publish();
    const response = await quote(plan);
    expect(response.status).toBe(200);
    const result = await body(response);
    const summary = object(result.summary);
    expect(summary.routeLabels).toEqual([SIMULATED_VENUE_LABEL]);
    expect(object(summary.receive).units).toBe("10000000");
    expect(object(summary.effectivePrice).display).toBe("100");
    const route = parseJupiterBuild(object(result.compose).build);
    expect(route.swapInstruction.programId).toBe(
      SIMULATED_VENUE_PROGRAM_ADDRESS,
    );
    expect(route.inAmount).toBe(1_000_000n);
    expect(route.minOutAmount).toBe(route.outAmount);
    expect(t.jupiter.calls).toHaveLength(0);
    expect(t.chain.simulated).toHaveLength(1);
  });
  it("reports live availability, including missing and drained pools", async () => {
    const ready = await body(await t.get("/follow/status?pair=sol-usdc"));
    expect(ready.available).toBe(true);
    if (pool) pool.baseAvailable = 0n;
    expect(
      (await body(await t.get("/follow/status?pair=sol-usdc"))).available,
    ).toBe(false);
    pool = null;
    expect(
      (await body(await t.get("/follow/status?pair=sol-usdc"))).available,
    ).toBe(false);
  });
  it("never hands out a transaction for a missing or insufficiently funded pool", async () => {
    const { plan } = await publish();
    if (pool) pool.baseAvailable = 9_999_999n;
    expect((await quote(plan)).status).toBe(422);
    pool = null;
    expect((await quote(plan)).status).toBe(422);
    expect(t.jupiter.calls).toHaveLength(0);
    expect(t.chain.simulated).toHaveLength(0);
  });
  it("enforces the plan's range against actual venue output", async () => {
    const above = await publish(80_000_000n, 90_000_000n);
    expect(object((await body(await quote(above.plan))).error).code).toBe(
      "price_above_range",
    );
    const below = await publish(110_000_000n, 120_000_000n);
    expect(object((await body(await quote(below.plan))).error).code).toBe(
      "price_below_range",
    );
    expect(t.chain.simulated).toHaveLength(0);
  });
  it("keeps simulation failure a failure and returns no compose payload", async () => {
    const { plan } = await publish();
    t.chain.simulation = {
      ok: false,
      unitsConsumed: null,
      logs: [],
      error: { InstructionError: [4, { Custom: 13 }] },
    };
    const response = await quote(plan);
    expect(response.status).toBe(422);
    expect((await body(response)).compose).toBeUndefined();
    expect(await t.db`select * from executions`).toHaveLength(0);
  });
});
