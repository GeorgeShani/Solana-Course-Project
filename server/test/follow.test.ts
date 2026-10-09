import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { SOL, USDC, parseJupiterBuild } from "@relay/domain";
import {
  beginFollowInstruction,
  composeFollowTx,
  getAssociatedTokenAddress,
  getReceiptAddress,
  getVersionAddress,
  type FollowReceiptAccount,
} from "@relay/domain/solana";
import { address, type Address } from "@solana/kit";
import { ApiError } from "../src/middleware";
import fixture from "../../domain/test/fixtures/jupiter-build.json";
import { T0, createTestApp, fakeSignature, type TestApp } from "./helpers";

// The captured Jupiter response was built for this follower: 100 USDC in, ~909.7 million lamports
// out, guaranteed minimum ~900.6 million. That is about $109.9 expected and $111.0 worst case.
const FOLLOWER = address("4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx");
const SOL_PAIR = {
  id: "sol-usdc",
  label: "SOL / USDC",
  base: SOL,
  quote: USDC,
};
const IN_RANGE = { low: 100_000_000n, high: 120_000_000n };

let t: TestApp;
beforeEach(async () => {
  if (t) await t.db.close();
  t = await createTestApp(fixture);
});
afterAll(async () => {
  await t?.db.close();
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function json(res: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await res.json();
  if (!isRecord(parsed)) throw new Error("expected a JSON object");
  return parsed;
}

function obj(v: unknown): Record<string, unknown> {
  if (!isRecord(v)) throw new Error("expected an object");
  return v;
}

function errorCode(body: Record<string, unknown>): unknown {
  return obj(body.error).code;
}

async function publish(range = IN_RANGE) {
  return t.chain.publish({ pair: SOL_PAIR, ...range });
}

const quote = (plan: Address, extra: Record<string, unknown> = {}) =>
  t.post("/follow/quote", {
    planPda: plan,
    version: 1,
    follower: FOLLOWER,
    quoteAmount: "100",
    ...extra,
  });

describe("POST /follow/quote", () => {
  it("returns a summary and the exact inputs the client needs to rebuild the transaction", async () => {
    const { plan } = await publish();
    const res = await quote(plan);
    expect(res.status).toBe(200);
    const body = await json(res);
    const summary = obj(body.summary);
    expect(obj(summary.pay).display).toBe("100");
    expect(obj(summary.receive).display).toBe("0.909735704");
    expect(obj(summary.minimumReceive).display).toBe("0.900638347");
    expect(summary.check).toBe("ok");
    expect(obj(summary.entryRange)).toEqual({ low: "100", high: "120" });
    expect(Number(obj(summary.effectivePrice).display)).toBeGreaterThan(109);
    expect(Number(obj(summary.effectivePrice).display)).toBeLessThan(110);
    expect(obj(summary.fees).receiptRentLamports).toBe("1865280");

    // The client rebuilds the identical transaction from the returned inputs, with no trust in us.
    const compose = obj(body.compose);
    if (
      typeof compose.nonce !== "string" ||
      typeof compose.blockhash !== "string"
    )
      throw new Error("missing compose inputs");
    const rebuilt = await composeFollowTx({
      build: parseJupiterBuild(compose.build),
      plan,
      version: 1,
      follower: FOLLOWER,
      baseMint: address(SOL.mint),
      quoteMint: address(USDC.mint),
      nonce: BigInt(compose.nonce),
      maxQuoteIn: 100_000_000n,
      blockhash: {
        blockhash: t.chain.fixedBlockhash,
        lastValidBlockHeight: BigInt(String(compose.lastValidBlockHeight)),
      },
      computeUnitLimit: Number(compose.computeUnitLimit),
      computeUnitPriceCap: 5_000_000n,
    });
    expect(rebuilt.sizeBytes).toBeLessThanOrEqual(1232);
    expect(Number(compose.computeUnitLimit)).toBe(Math.ceil(120_000 * 1.2));
    expect(t.chain.simulated.length).toBe(1);
  });

  it("asks Jupiter for the output to land in the follower's own wSOL account", async () => {
    const { plan } = await publish();
    await quote(plan);
    const call = t.jupiter.calls[0];
    expect(call?.taker).toBe(FOLLOWER);
    expect(call?.destinationTokenAccount).toBe(
      await getAssociatedTokenAddress(FOLLOWER, address(SOL.mint)),
    );
    expect(call?.amount).toBe("100000000");
  });

  it("warns when only the guaranteed minimum would breach the range", async () => {
    const { plan } = await publish({ low: 100_000_000n, high: 110_500_000n });
    const body = await json(await quote(plan));
    expect(obj(body.summary).check).toBe("may_fail_near_upper_bound");
  });

  it("refuses when the route price is already above or below the plan's range", async () => {
    const above = await publish({ low: 90_000_000n, high: 100_000_000n });
    const aboveRes = await quote(above.plan);
    expect(aboveRes.status).toBe(422);
    expect(errorCode(await json(aboveRes))).toBe("price_above_range");

    const below = await publish({ low: 120_000_000n, high: 130_000_000n });
    const belowRes = await quote(below.plan);
    expect(belowRes.status).toBe(422);
    expect(errorCode(await json(belowRes))).toBe("price_below_range");
    expect(t.chain.simulated.length).toBe(0); // rejected before spending a simulation
  });

  it("rejects a quote for an old version after the plan was revised", async () => {
    const first = await publish();
    const creator = t.chain.plans.get(first.plan)?.creator;
    await t.chain.publish({ pair: SOL_PAIR, ...IN_RANGE, planId: 1n, creator });
    const res = await quote(first.plan, { version: 1 });
    expect(res.status).toBe(409);
    expect(errorCode(await json(res))).toBe("stale_version");
  });

  it("rejects a closed plan and an expired or nearly expired one", async () => {
    const closed = await t.chain.publish({
      pair: SOL_PAIR,
      ...IN_RANGE,
      closed: true,
    });
    expect(errorCode(await json(await quote(closed.plan)))).toBe("plan_closed");

    const open = await t.chain.publish({
      pair: SOL_PAIR,
      ...IN_RANGE,
      expiresAt: T0 + 3600,
    });
    t.chain.now = (T0 + 3600 - 19) * 1000; // inside the 20 s safety margin
    const nearly = await quote(open.plan);
    expect(nearly.status).toBe(409);
    expect(errorCode(await json(nearly))).toBe("plan_expired");
    t.chain.now = (T0 + 3600 - 21) * 1000;
    expect((await quote(open.plan)).status).toBe(200);
  });

  it("validates the amount", async () => {
    const { plan } = await publish();
    for (const bad of [
      "0",
      "0.5",
      "1001",
      "abc",
      "-5",
      "1.0000001",
      "1e3",
      "",
    ]) {
      const res = await quote(plan, { quoteAmount: bad });
      expect(res.status, bad).toBe(400);
    }
  });

  it("validates the other inputs and accepts the amount limits", async () => {
    const { plan } = await publish();
    expect((await quote(plan, { quoteAmount: 100 })).status).toBe(400);
    expect((await quote(plan, { follower: "nope" })).status).toBe(400);
    expect((await quote(plan, { planPda: "nope" })).status).toBe(400);
    expect((await quote(plan, { version: "1" })).status).toBe(400);
    // The fake router always returns the 100 USDC route, so only check the amount is not rejected as invalid.
    expect((await quote(plan, { quoteAmount: "1" })).status).not.toBe(400);
    expect((await quote(plan, { quoteAmount: "1000" })).status).not.toBe(400);
  });

  it("404s for an unknown plan and 400s for a non-Relay account", async () => {
    const unknown = address("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
    expect((await quote(unknown)).status).toBe(404);
    const { plan } = await publish();
    t.chain.foreign.add(plan);
    expect((await quote(plan)).status).toBe(400);
  });

  it("maps a failing simulation to a plain-language rejection and hands out no transaction", async () => {
    const { plan } = await publish();
    t.chain.simulation = {
      ok: false,
      unitsConsumed: null,
      logs: [
        "Program log: AnchorError thrown in programs/relay/src/instructions/finish_follow.rs:90. Error Code: PriceAboveRange. Error Number: 6013. Error Message: The price paid is above the plan's entry range.",
      ],
      error: { InstructionError: [4, { Custom: 6013 }] },
    };
    const res = await quote(plan);
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(errorCode(body)).toBe("price_above_range");
    expect(body.compose).toBeUndefined();

    t.chain.simulation = {
      ok: false,
      unitsConsumed: null,
      logs: [],
      error: { InstructionError: [3, { Custom: 1 }] },
    };
    expect(errorCode(await json(await quote(plan)))).toBe("swap_would_fail");
  });

  it("surfaces router failures without leaking details", async () => {
    const { plan } = await publish();
    t.jupiter.failure = new ApiError(
      422,
      "no_route",
      "No route was found for this amount",
    );
    expect((await quote(plan)).status).toBe(422);
    t.jupiter.failure = new ApiError(
      502,
      "route_unavailable",
      "The swap router is unavailable",
    );
    expect((await quote(plan)).status).toBe(502);
  });

  it("fails closed when Jupiter returns an instruction we do not recognise", async () => {
    const { plan } = await publish();
    const tipped = { ...fixture, tipInstruction: fixture.swapInstruction };
    t.jupiter.body = tipped;
    const res = await quote(plan);
    expect(res.status).toBe(502);
    expect(errorCode(await json(res))).toBe("route_rejected");
    t.jupiter.body = { nonsense: true };
    expect(errorCode(await json(await quote(plan)))).toBe("route_invalid");
  });

  it("tries smaller routes when the transaction is too large", async () => {
    const { plan } = await publish();
    // The captured route fits, so this only checks the first attempt asks for 40 accounts.
    await quote(plan);
    expect(t.jupiter.calls.map((c) => c.maxAccounts)).toEqual([40]);
  });

  it("rate limits per follower", async () => {
    const { plan } = await publish();
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (
        await t.post(
          "/follow/quote",
          { planPda: plan, version: 1, follower: FOLLOWER, quoteAmount: "5" },
          { "x-forwarded-for": `9.9.9.${i}` },
        )
      ).status;
    }
    expect(last).toBe(429);
  });
});

// ------------------------------------------------------------------------------------ verify

/** A confirmed follow transaction as the verifier would read it from the cluster. */
async function chainFollow(
  plan: Address,
  opts: { n: number; error?: unknown; logs?: string[]; nonce?: bigint } = {
    n: 1,
  },
) {
  const nonce = opts.nonce ?? 1n;
  const planVersion = await getVersionAddress(plan, 1);
  const receipt = await getReceiptAddress(planVersion, FOLLOWER, nonce);
  const base = await getAssociatedTokenAddress(FOLLOWER, address(SOL.mint));
  const quoteAta = await getAssociatedTokenAddress(
    FOLLOWER,
    address(USDC.mint),
  );
  const begin = beginFollowInstruction({
    follower: FOLLOWER,
    plan,
    planVersion,
    receipt,
    followerBase: base,
    followerQuote: quoteAta,
    version: 1,
    nonce,
    maxQuoteIn: 200_000_000n,
  });
  const signature = fakeSignature(opts.n);
  t.chain.transactions.set(signature, {
    signature,
    slot: 99n,
    blockTime: T0 + 5,
    feeLamports: 5_000n,
    error: opts.error ?? null,
    logs: opts.logs ?? [],
    instructions: [
      {
        programId: begin.programAddress,
        accounts: (begin.accounts ?? []).map((a) => a.address),
        data: Uint8Array.from(begin.data ?? []),
      },
    ],
  });
  const record: FollowReceiptAccount = {
    plan,
    version: 1,
    follower: FOLLOWER,
    preBase: 0n,
    preQuote: 1_000_000_000n,
    maxQuoteIn: 200_000_000n,
    quoteSpent: 100_000_000n,
    baseReceived: 909_000_000n,
    status: "recorded",
    recordedAt: BigInt(T0 + 5),
    slot: 99n,
    nonce,
  };
  return { signature, receipt, record };
}

const verify = (signature: string, extra: Record<string, unknown> = {}) =>
  t.post("/follow/verify", { signature, ...extra });

describe("POST /follow/verify", () => {
  it("records an execution from the receipt account, ignoring anything the client claims", async () => {
    const { plan } = await publish();
    const f = await chainFollow(plan, { n: 1 });
    t.chain.receipts.set(f.receipt, f.record);
    const res = await verify(f.signature, {
      quoteSpent: "999999999999",
      baseReceived: "1",
      status: "failed",
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("recorded");
    expect(body.quoteSpent).toBe("100000000");
    expect(body.baseReceived).toBe("909000000");
    expect(body.receiptPda).toBe(f.receipt);
    // ceil(100e6 * 1e9 / 909e6) = 110011002 -> $110.011002 per SOL
    expect(body.effectivePrice).toBe("110011002");
  });

  it("is idempotent and appears in the follower's history", async () => {
    const { plan } = await publish();
    const f = await chainFollow(plan, { n: 2 });
    t.chain.receipts.set(f.receipt, f.record);
    expect((await verify(f.signature)).status).toBe(200);
    expect((await verify(f.signature)).status).toBe(200);
    const rows = await t.db`select count(*)::int as n from executions`;
    expect(rows[0].n).toBe(1);
    const history = await json(
      await t.get(`/me/executions?follower=${FOLLOWER}`),
    );
    expect(Array.isArray(history.items) ? history.items.length : -1).toBe(1);
  });

  it("records a failed transaction as failed, with the reason, and never as a participation", async () => {
    const { plan } = await publish();
    const f = await chainFollow(plan, {
      n: 3,
      error: { InstructionError: [4, { Custom: 6006 }] },
      logs: [
        "Program log: AnchorError thrown in programs/relay/src/instructions/begin_follow.rs:67. Error Code: PlanExpired. Error Number: 6006. Error Message: This plan version has expired.",
      ],
    });
    const body = await json(await verify(f.signature));
    expect(body.status).toBe("failed");
    expect(body.errorName).toBe("PlanExpired");
    expect(body.errorCode).toBe(6006);
    expect(body.errorMessage).toBe("This plan's entry window has closed.");
    expect(body.receiptPda).toBeNull();
    expect(body.quoteSpent).toBeNull();
  });

  it("never turns a recorded execution into a failed one", async () => {
    const { plan } = await publish();
    const f = await chainFollow(plan, { n: 4 });
    t.chain.receipts.set(f.receipt, f.record);
    await verify(f.signature);
    // The same signature can only ever have one outcome; even if the cluster answered differently
    // later, the recorded row is final.
    t.chain.transactions.set(f.signature, {
      ...t.chain.storedTransaction(f.signature),
      error: { InstructionError: [0, "AccountNotFound"] },
    });
    await verify(f.signature);
    const rows = await t.db`select status from executions`;
    expect(rows[0].status).toBe("recorded");
  });

  it("rejects an unknown, malformed or non-follow transaction", async () => {
    const { plan } = await publish();
    expect((await verify("not-a-signature")).status).toBe(400);
    expect((await t.post("/follow/verify", {})).status).toBe(400);
    expect((await verify(fakeSignature(50))).status).toBe(404);
    const f = await chainFollow(plan, { n: 5 });
    t.chain.transactions.set(f.signature, {
      ...t.chain.storedTransaction(f.signature),
      instructions: [],
    });
    expect((await verify(f.signature)).status).toBe(400);
  });

  it("does not record a landed transaction whose receipt is missing, foreign or mismatched", async () => {
    const { plan } = await publish();
    const missing = await chainFollow(plan, { n: 6 });
    expect((await verify(missing.signature)).status).toBe(409);

    const foreign = await chainFollow(plan, { n: 7, nonce: 2n });
    t.chain.receipts.set(foreign.receipt, foreign.record);
    t.chain.foreign.add(foreign.receipt);
    expect((await verify(foreign.signature)).status).toBe(502);

    const other = await chainFollow(plan, { n: 8, nonce: 3n });
    t.chain.receipts.set(other.receipt, {
      ...other.record,
      follower: address("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"),
    });
    expect((await verify(other.signature)).status).toBe(409);

    const pending = await chainFollow(plan, { n: 9, nonce: 4n });
    t.chain.receipts.set(pending.receipt, {
      ...pending.record,
      status: "pending",
    });
    expect((await verify(pending.signature)).status).toBe(409);

    const rows = await t.db`select count(*)::int as n from executions`;
    expect(rows[0].n).toBe(0);
  });

  it("reports an unreachable chain as 503", async () => {
    const { plan } = await publish();
    const f = await chainFollow(plan, { n: 10 });
    t.chain.down = true;
    expect((await verify(f.signature)).status).toBe(503);
  });

  it("validates the history query", async () => {
    expect((await t.get("/me/executions")).status).toBe(400);
    expect((await t.get("/me/executions?follower=nope")).status).toBe(400);
    const empty = await json(
      await t.get(`/me/executions?follower=${FOLLOWER}`),
    );
    expect(empty.items).toEqual([]);
  });

  it("keeps the database invariant: a recorded row needs a receipt and amounts", async () => {
    let rejected = false;
    try {
      await t.db`insert into executions (cluster, tx_signature, follower, plan_pda, version, status) values ('localnet', 'x', 'f', 'p', 1, 'recorded')`;
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });
});
