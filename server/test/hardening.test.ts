import { afterAll, describe, expect, it } from "bun:test";
import { JUP, SOL, USDC } from "@relay/domain";
import { generateKeyPairSigner } from "@solana/kit";
import { loadEnv } from "../src/env";
import { createLogger, formatLine, safeMessage } from "../src/logger";
import { ApiError } from "../src/middleware";
import { createChain } from "../src/services/chain";
import { createJupiterClient } from "../src/services/jupiter";
import {
  BACKOFF_CAP_MS,
  BACKOFF_START_MS,
  createJupiterPrices,
} from "../src/services/prices";
import {
  GOOD_TEXT,
  SOL_PRICE_IN_RANGE,
  createTestApp,
  type TestApp,
} from "./helpers";

const SOL_PAIR = {
  id: "sol-usdc",
  label: "SOL / USDC",
  base: SOL,
  quote: USDC,
};
const JUP_PAIR = {
  id: "jup-usdc",
  label: "JUP / USDC",
  base: JUP,
  quote: USDC,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function obj(v: unknown): Record<string, unknown> {
  if (!isRecord(v)) throw new Error("expected an object");
  return v;
}
function list(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) throw new Error("expected a list");
  return v.map(obj);
}
async function json(res: Response): Promise<Record<string, unknown>> {
  return obj(await res.json());
}

/** Collects the lines a logger writes, parsed. */
function capture() {
  const lines: string[] = [];
  return {
    logger: createLogger((line) => lines.push(line)),
    lines,
    records: () => lines.map((l) => obj(JSON.parse(l))),
  };
}

let t: TestApp | undefined;
afterAll(async () => {
  await t?.db.close();
});
async function fresh(
  body: unknown = null,
  options: Parameters<typeof createTestApp>[1] = {},
): Promise<TestApp> {
  if (t) await t.db.close();
  t = await createTestApp(body, options);
  return t;
}

// ---------------------------------------------------------------------------------- feed policy

describe("env: CREATOR_ALLOWLIST", () => {
  it("is empty by default and when blank", () => {
    expect(loadEnv({}).creatorAllowlist).toEqual([]);
    expect(loadEnv({ CREATOR_ALLOWLIST: "" }).creatorAllowlist).toEqual([]);
    expect(loadEnv({ CREATOR_ALLOWLIST: " , \n" }).creatorAllowlist).toEqual(
      [],
    );
  });

  it("reads commas and whitespace, and drops duplicates", async () => {
    const a = (await generateKeyPairSigner()).address;
    const b = (await generateKeyPairSigner()).address;
    expect(
      loadEnv({ CREATOR_ALLOWLIST: `${a}, ${b}\n${a}` }).creatorAllowlist,
    ).toEqual([a, b]);
  });

  it("stops the start on anything that is not a wallet address", () => {
    expect(() => loadEnv({ CREATOR_ALLOWLIST: "not-an-address" })).toThrow(
      /CREATOR_ALLOWLIST/,
    );
    expect(() =>
      loadEnv({
        CREATOR_ALLOWLIST: "11111111111111111111111111111111,oops",
      }),
    ).toThrow(/CREATOR_ALLOWLIST/);
  });
});

describe("feed policy", () => {
  it("lists every plan, marked listed, when no allowlist is set", async () => {
    const app = await fresh();
    await app.chain.publish({ pair: SOL_PAIR, ...SOL_PRICE_IN_RANGE });
    await app.chain.publish({ pair: JUP_PAIR, low: 340_000n, high: 360_000n });
    const feed = await json(await app.get("/feed"));
    expect(list(feed.items)).toHaveLength(2);
    expect(list(feed.items).every((i) => i.listed === true)).toBe(true);
  });

  it("lists only allowlisted creators, and a spam plan stays out of every page", async () => {
    const listedCreator = await generateKeyPairSigner();
    const spammer = await generateKeyPairSigner();
    const app = await fresh(null, {
      env: { CREATOR_ALLOWLIST: listedCreator.address },
    });
    const ok = await app.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
      creator: listedCreator.address,
    });
    for (let n = 0; n < 12; n++) {
      await app.chain.publish({
        pair: SOL_PAIR,
        ...SOL_PRICE_IN_RANGE,
        creator: spammer.address,
        planId: BigInt(100 + n),
      });
    }
    const first = await json(await app.get("/feed?limit=30"));
    expect(list(first.items).map((i) => i.planPda)).toEqual([ok.plan]);
    expect(first.nextCursor).toBeNull();
    expect(list(first.items)[0]?.listed).toBe(true);
  });

  it("keeps an unlisted plan reachable by its link, marked unlisted", async () => {
    const listedCreator = await generateKeyPairSigner();
    const other = await generateKeyPairSigner();
    const app = await fresh(null, {
      env: { CREATOR_ALLOWLIST: listedCreator.address },
    });
    const hidden = await app.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
      creator: other.address,
    });
    // Confirming (the creator's own app does this) stores it; the feed still does not list it.
    const confirm = await app.post(`/plans/${hidden.plan}/confirm`, {
      version: 1,
      content: {
        rationale: GOOD_TEXT.rationale,
        exitThesis: GOOD_TEXT.exitThesis,
        exitTarget: null,
        invalidation: null,
      },
    });
    expect(confirm.status).toBe(200);
    expect((await json(confirm)).listed).toBe(false);

    const detail = await json(await app.get(`/plans/${hidden.plan}`));
    expect(detail.listed).toBe(false);
    expect(detail.planPda).toBe(hidden.plan);

    const feed = await json(await app.get("/feed"));
    expect(list(feed.items)).toHaveLength(0);
  });

  it("combines with the pair filter", async () => {
    const creator = await generateKeyPairSigner();
    const app = await fresh(null, {
      env: { CREATOR_ALLOWLIST: creator.address },
    });
    await app.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
      creator: creator.address,
      planId: 1n,
    });
    const jup = await app.chain.publish({
      pair: JUP_PAIR,
      low: 340_000n,
      high: 360_000n,
      creator: creator.address,
      planId: 2n,
    });
    const feed = await json(await app.get("/feed?pair=jup-usdc"));
    expect(list(feed.items).map((i) => i.planPda)).toEqual([jup.plan]);
  });
});

// ------------------------------------------------------------------------------------ readiness

describe("GET /health/ready", () => {
  it("is ok when the database and the RPC both answer", async () => {
    const app = await fresh();
    const res = await app.get("/health/ready");
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      ok: true,
      network: "localnet",
      cluster: "localnet",
      checks: { database: "ok", rpc: "ok" },
    });
  });

  it("answers 503 and names the RPC when only the RPC is down", async () => {
    const app = await fresh();
    app.chain.down = true;
    const res = await app.get("/health/ready");
    expect(res.status).toBe(503);
    const body = await json(res);
    expect(body.ok).toBe(false);
    expect(body.checks).toEqual({ database: "ok", rpc: "down" });
  });

  it("stays alive for the container healthcheck while Solana is down", async () => {
    const app = await fresh();
    app.chain.down = true;
    expect((await app.get("/health")).status).toBe(200);
  });
});

// ------------------------------------------------------------------- request ids and structured logs

describe("request ids and logs", () => {
  it("gives every response an id and logs one line per request", async () => {
    const log = capture();
    const app = await fresh(null, { logger: log.logger });
    const res = await app.get("/health");
    const id = res.headers.get("x-request-id");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const lines = log.records().filter((r) => r.event === "request");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: "info",
      reqId: id,
      method: "GET",
      path: "/health",
      status: 200,
    });
    expect(typeof lines[0]?.ms).toBe("number");
  });

  it("keeps a well-formed caller id and replaces one that could forge a log line", async () => {
    const log = capture();
    const app = await fresh(null, { logger: log.logger });
    const good = await app.app.request("/health", {
      headers: { "x-request-id": "client-req-1234" },
    });
    expect(good.headers.get("x-request-id")).toBe("client-req-1234");
    const bad = await app.app.request("/health", {
      headers: { "x-request-id": 'x","level":"error' },
    });
    expect(bad.headers.get("x-request-id")).not.toContain('"');
    expect(bad.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("puts the id on error responses too, and logs the error code", async () => {
    const log = capture();
    const app = await fresh(null, { logger: log.logger });
    const res = await app.get("/plans/not-an-address");
    expect(res.status).toBe(400);
    const id = res.headers.get("x-request-id");
    expect(id).toBeTruthy();
    const apiError = log.records().find((r) => r.event === "api_error");
    expect(apiError).toMatchObject({
      reqId: id,
      status: 400,
      code: "invalid_plan",
    });
  });

  it("never logs the query string, headers, cookies or the body", async () => {
    const log = capture();
    const app = await fresh(null, { logger: log.logger });
    await app.app.request("/me/executions?follower=SECRET_QUERY_VALUE", {
      headers: {
        cookie: "relay_session=SECRET_COOKIE_VALUE",
        authorization: "Bearer SECRET_BEARER_VALUE",
      },
    });
    await app.post("/follow/verify", { signature: "SECRET_BODY_VALUE" });
    const all = log.lines.join("\n");
    for (const secret of [
      "SECRET_QUERY_VALUE",
      "SECRET_COOKIE_VALUE",
      "SECRET_BEARER_VALUE",
      "SECRET_BODY_VALUE",
    ]) {
      expect(all).not.toContain(secret);
    }
  });

  it("logs an unexpected error without its URL or key", async () => {
    const log = capture();
    const app = await fresh(null, { logger: log.logger });
    app.chain.listPlans = async () => {
      throw new Error(
        "fetch failed for https://rpc.example/?api-key=TOPSECRETKEY",
      );
    };
    // The feed swallows the chain error (stale rows still serve) but must log it, scrubbed.
    const res = await app.get("/feed");
    expect(res.status).toBe(200);
    const all = log.lines.join("\n");
    expect(all).toContain("chain_sync_failed");
    expect(all).not.toContain("TOPSECRETKEY");
    expect(all).not.toContain("rpc.example");
  });
});

describe("logger", () => {
  it("redacts fields whose name looks sensitive, at any depth", () => {
    const line = obj(
      JSON.parse(
        formatLine("info", "x", {
          sessionToken: "abc",
          nested: { apiKey: "k", ok: "fine" },
          signature: "sig",
          visible: "yes",
        }),
      ),
    );
    expect(line.sessionToken).toBe("[redacted]");
    expect(obj(line.nested).apiKey).toBe("[redacted]");
    expect(obj(line.nested).ok).toBe("fine");
    expect(line.signature).toBe("[redacted]");
    expect(line.visible).toBe("yes");
  });

  it("does not let a field overwrite the timestamp, level or event", () => {
    const line = obj(
      JSON.parse(formatLine("warn", "real", { event: "fake", level: "info" })),
    );
    expect(line.event).toBe("real");
    expect(line.level).toBe("warn");
  });

  it("writes bigints as text and strips URLs and long opaque strings from errors", () => {
    expect(obj(JSON.parse(formatLine("info", "x", { slot: 5n }))).slot).toBe(
      "5",
    );
    const msg = safeMessage(
      new Error(
        `bad https://user:pw@host.example/path?key=1 and ${"A".repeat(60)}`,
      ),
    );
    expect(msg).not.toContain("host.example");
    expect(msg).not.toContain("AAAA");
    expect(msg).toContain("[url]");
  });
});

// ---------------------------------------------------------------------- price source resilience

function priceBody(usd: number) {
  return new Response(JSON.stringify({ [SOL.mint]: { usdPrice: usd } }), {
    headers: { "content-type": "application/json" },
  });
}

describe("price source failure handling", () => {
  const env = { jupiterBaseUrl: "https://jup.test", jupiterApiKey: undefined };

  it("stops asking Jupiter during a failure window and serves the last good price", async () => {
    let now = 1_000_000;
    let calls = 0;
    let respond: () => Response = () => priceBody(180);
    const prices = createJupiterPrices(env, undefined, {
      now: () => now,
      fetch: async () => {
        calls++;
        return respond();
      },
    });
    const first = await prices.get(SOL_PAIR);
    expect(first?.units).toBe(180_000_000n);
    expect(calls).toBe(1);

    // The cache expires, then Jupiter starts failing.
    now += 11_000;
    respond = () => new Response("oops", { status: 503 });
    const stale = await prices.get(SOL_PAIR);
    expect(calls).toBe(2);
    // The old price is returned with its OLD observation time, so it reads as stale.
    expect(stale?.units).toBe(180_000_000n);
    expect(stale?.observedAtMs).toBe(1_000_000);

    // Inside the backoff window: a flood of requests makes no further calls.
    for (let i = 0; i < 20; i++) await prices.get(SOL_PAIR);
    expect(calls).toBe(2);

    // After the window it tries once more, and recovery clears the backoff.
    now += BACKOFF_START_MS + 1;
    respond = () => priceBody(190);
    const recovered = await prices.get(SOL_PAIR);
    expect(calls).toBe(3);
    expect(recovered?.units).toBe(190_000_000n);
    expect(recovered?.observedAtMs).toBe(now);
  });

  it("doubles the wait on repeated failures, up to a cap", async () => {
    let now = 5_000_000;
    let calls = 0;
    const log = capture();
    const prices = createJupiterPrices(env, undefined, {
      now: () => now,
      logger: log.logger,
      fetch: async () => {
        calls++;
        return new Response("down", { status: 500 });
      },
    });
    const waits: number[] = [];
    for (let i = 0; i < 9; i++) {
      await prices.get(SOL_PAIR);
      const last = log.records().at(-1);
      waits.push(Number(last?.retryInMs));
      now += Number(last?.retryInMs) + 1;
    }
    expect(waits[0]).toBe(BACKOFF_START_MS);
    expect(waits[1]).toBe(BACKOFF_START_MS * 2);
    expect(waits[2]).toBe(BACKOFF_START_MS * 4);
    expect(Math.max(...waits)).toBe(BACKOFF_CAP_MS);
    expect(calls).toBe(9);
  });

  it("honours Retry-After on a rate limit, capped", async () => {
    let now = 9_000_000;
    let calls = 0;
    const prices = createJupiterPrices(env, undefined, {
      now: () => now,
      fetch: async () => {
        calls++;
        return new Response("slow down", {
          status: 429,
          headers: { "retry-after": "30" },
        });
      },
    });
    expect(await prices.get(SOL_PAIR)).toBeNull();
    now += 29_000;
    await prices.get(SOL_PAIR);
    expect(calls).toBe(1); // still inside the 30 s Jupiter asked for
    now += 2_000;
    await prices.get(SOL_PAIR);
    expect(calls).toBe(2);
  });

  it("returns null, not an error, when Jupiter never answered", async () => {
    const prices = createJupiterPrices(env, undefined, {
      fetch: async () => {
        throw new Error("network down https://jup.test/secret");
      },
    });
    expect(await prices.get(SOL_PAIR)).toBeNull();
  });

  it("does not log the API key", async () => {
    const log = capture();
    const prices = createJupiterPrices(
      {
        jupiterBaseUrl: "https://jup.test",
        jupiterApiKey: "KEY_SHOULD_NOT_APPEAR",
      },
      undefined,
      {
        logger: log.logger,
        fetch: async (_url, init) => {
          expect(new Headers(init?.headers).get("x-api-key")).toBe(
            "KEY_SHOULD_NOT_APPEAR",
          );
          return new Response("no", { status: 500 });
        },
      },
    );
    await prices.get(SOL_PAIR);
    expect(log.lines.join("\n")).not.toContain("KEY_SHOULD_NOT_APPEAR");
  });
});

// ------------------------------------------------------------------- route (swap) client failures

describe("swap router failure handling", () => {
  const env = {
    jupiterBaseUrl: "https://jup.test",
    jupiterApiKey: "ROUTE_KEY",
    jupiterDexes: undefined,
    cluster: "devnet" as const,
  };
  const params = {
    inputMint: USDC.mint,
    outputMint: SOL.mint,
    amount: "1000000",
    taker: "11111111111111111111111111111111",
    destinationTokenAccount: "11111111111111111111111111111111",
    maxAccounts: 40,
  };
  async function failure(response: () => Response | Promise<Response>) {
    const log = capture();
    const client = createJupiterClient(env, {
      logger: log.logger,
      fetch: async () => response(),
    });
    let error: unknown;
    try {
      await client.build(params);
    } catch (e) {
      error = e;
    }
    if (!(error instanceof ApiError)) throw new Error("expected an ApiError");
    return { error, log };
  }

  it("maps 400 to no_route", async () => {
    const { error } = await failure(() => new Response("{}", { status: 400 }));
    expect([error.status, error.code]).toEqual([422, "no_route"]);
  });

  it("maps a rate limit to 429 so the app can say try again", async () => {
    const { error, log } = await failure(
      () =>
        new Response("{}", { status: 429, headers: { "retry-after": "2" } }),
    );
    expect([error.status, error.code]).toEqual([429, "rate_limited"]);
    expect(log.lines.join("\n")).toContain("route_rate_limited");
  });

  it("hides a rejected key from the follower but tells the operator", async () => {
    for (const status of [401, 403]) {
      const { error, log } = await failure(
        () => new Response('{"error":"bad key"}', { status }),
      );
      expect([error.status, error.code]).toEqual([502, "route_unavailable"]);
      expect(error.message).not.toMatch(/key/i);
      const entry = log.records().find((r) => r.event === "route_key_rejected");
      expect(entry?.level).toBe("error");
      expect(log.lines.join("\n")).not.toContain("ROUTE_KEY");
    }
  });

  it("maps a 5xx and a network failure to route_unavailable without the URL", async () => {
    const five = await failure(() => new Response("x", { status: 503 }));
    expect([five.error.status, five.error.code]).toEqual([
      502,
      "route_unavailable",
    ]);
    const down = await failure(() => {
      throw new Error(
        "connect ECONNREFUSED https://jup.test/swap/v2/build?x=1",
      );
    });
    expect([down.error.status, down.error.code]).toEqual([
      502,
      "route_unavailable",
    ]);
    expect(down.log.lines.join("\n")).not.toContain("jup.test");
  });
});

// --------------------------------------------------------------------------- swaps_unavailable

describe("POST /follow/quote without a swap venue", () => {
  it("answers 422 swaps_unavailable on a network that has none, before any other work", async () => {
    const app = await fresh(null, { env: { NETWORK: "devnet" } });
    const { plan } = await app.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    const follower = (await generateKeyPairSigner()).address;
    const res = await app.post("/follow/quote", {
      planPda: plan,
      version: 1,
      follower,
      quoteAmount: "10",
    });
    expect(res.status).toBe(422);
    const body = obj((await json(res)).error);
    expect(body.code).toBe("swaps_unavailable");
    expect(String(body.message)).toContain("Devnet");
    // Nothing was routed or simulated.
    expect(app.jupiter.calls).toHaveLength(0);
    expect(app.chain.simulated).toHaveLength(0);
  });

  it("still validates the body first, so a garbage request is a 400 not a 422", async () => {
    const app = await fresh(null, { env: { NETWORK: "devnet" } });
    const res = await app.post("/follow/quote", [1, 2, 3]);
    expect(res.status).toBe(400);
  });
});

// -------------------------------------------------------------------------------- RPC timeout

describe("chain reader timeouts", () => {
  it("gives up on an RPC that never answers instead of hanging the request", async () => {
    const hang = Bun.serve({
      port: 0,
      fetch: () => new Promise<Response>(() => undefined),
    });
    try {
      const chain = createChain(`http://127.0.0.1:${hang.port}`, "devnet", {
        timeoutMs: 300,
      });
      const started = Date.now();
      await expect(chain.health()).rejects.toThrow();
      expect(Date.now() - started).toBeLessThan(3000);
    } finally {
      await hang.stop(true);
    }
  });
});

// ------------------------------------------------------------------------------- database rule

describe("database: devnet only", () => {
  it("cannot store a plan or an execution on any network but devnet and localnet", async () => {
    const app = await fresh();
    // `await` inside an async function: a Bun SQL query is lazy, so give `expect` a real promise.
    const insertPlan = async (cluster: string) => {
      await app.db`
        insert into plans (plan_pda, cluster, creator_address, onchain_plan_id, base_mint, quote_mint,
                           base_decimals, quote_decimals, latest_version, status, created_at_chain)
        values (${`plan-${cluster}`}, ${cluster}, 'c', 1, 'b', 'q', 9, 6, 1, 'open', 0)`;
    };
    await insertPlan("devnet");
    await insertPlan("localnet");
    await expect(insertPlan("mainnet")).rejects.toThrow();
    await expect(insertPlan("mainnet-beta")).rejects.toThrow();
    const insertExecution = async () => {
      await app.db`insert into executions (cluster, tx_signature, follower, plan_pda, version, status)
                   values ('mainnet', 'sig', 'f', 'p', 1, 'failed')`;
    };
    await expect(insertExecution()).rejects.toThrow();
  });
});
