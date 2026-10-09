import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import {
  JUP,
  SOL,
  USDC,
  contentHash,
  toHex,
  type PlanContent,
} from "@relay/domain";
import { getVersionAddress } from "@relay/domain/solana";
import { address } from "@solana/kit";
import {
  GOOD_TEXT,
  ORIGIN,
  SOL_PRICE_IN_RANGE,
  T0,
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

let t: TestApp;
beforeEach(async () => {
  if (t) await t.db.close();
  t = await createTestApp();
});
afterAll(async () => {
  await t?.db.close();
});

/** The JSON body a client sends to /confirm for a given text. */
const body = (version: number, text: PlanContent = GOOD_TEXT) => ({
  version,
  content: {
    rationale: text.rationale,
    exitThesis: text.exitThesis,
    exitTarget: null,
    invalidation: null,
  },
});

// Responses are parsed as `unknown` and narrowed by these small readers (no type assertions).
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function json(res: Response): Promise<Record<string, unknown>> {
  const parsed: unknown = await res.json();
  if (!isRecord(parsed)) throw new Error("expected a JSON object");
  return parsed;
}

function list(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) throw new Error("expected a list");
  return v.map((x: unknown) => {
    if (!isRecord(x)) throw new Error("expected an object");
    return x;
  });
}

function obj(v: unknown): Record<string, unknown> {
  if (!isRecord(v)) throw new Error("expected an object");
  return v;
}

const statuses = (feed: Record<string, unknown>) =>
  list(feed.items).map((i) => obj(i.entry).status);

describe("basics", () => {
  it("answers /health and /health/ready", async () => {
    expect((await t.get("/health")).status).toBe(200);
    expect((await t.get("/health/ready")).status).toBe(200);
  });

  it("returns JSON errors for unknown routes and sets security headers", async () => {
    const res = await t.get("/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await json(res)).toEqual({
      error: { code: "not_found", message: "Not found" },
    });
  });
});

describe("write protection", () => {
  it("rejects a POST without the configured Origin", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    const none = await t.app.request(`/plans/${plan}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(none.status).toBe(403);
    const wrong = await t.post(`/plans/${plan}/confirm`, body(1), {
      origin: "https://evil.example",
    });
    expect(wrong.status).toBe(403);
  });

  it("accepts a same-origin request with no Origin header but Sec-Fetch-Site: same-origin", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    const res = await t.app.request(`/plans/${plan}/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify(body(1)),
    });
    expect(res.status).toBe(200);
  });

  it("rejects non-JSON content types even from the right origin", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    const res = await t.app.request(`/plans/${plan}/confirm`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "text/plain" },
      body: JSON.stringify(body(1)),
    });
    expect(res.status).toBe(415);
  });

  it("rejects bodies over 16 KB", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    const res = await t.post(`/plans/${plan}/confirm`, {
      version: 1,
      content: { rationale: "x".repeat(20_000) },
    });
    expect(res.status).toBe(413);
  });

  it("rate limits /confirm per client (the right-most X-Forwarded-For entry)", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    let last = 0;
    for (let i = 0; i < 11; i++) {
      // The left-most value is client-controlled and changes every time; it must not matter.
      last = (
        await t.post(`/plans/${plan}/confirm`, body(1), {
          "x-forwarded-for": `1.1.1.${i}, 9.9.9.9`,
        })
      ).status;
    }
    expect(last).toBe(429);
  });
});

describe("confirm: text is accepted only if it matches the onchain commitment", () => {
  it("stores the text and shows it in the plan detail", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    const res = await t.post(`/plans/${plan}/confirm`, body(1));
    expect(res.status).toBe(200);
    const view = await json(res);
    expect(obj(obj(view.version).text).rationale).toBe(GOOD_TEXT.rationale);
    expect(obj(view.entry).status).toBe("in_range");
    const detail = await json(await t.get(`/plans/${plan}`));
    expect(list(detail.versions).length).toBe(1);
  });

  it("is idempotent", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    expect((await t.post(`/plans/${plan}/confirm`, body(1))).status).toBe(200);
    expect((await t.post(`/plans/${plan}/confirm`, body(1))).status).toBe(200);
    const rows =
      await t.db`select count(*)::int as n from plan_version_content`;
    expect(rows[0].n).toBe(1);
  });

  it("rejects text that does not hash to the onchain content_hash", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    const forged = {
      ...GOOD_TEXT,
      rationale: "A completely different rationale.",
    };
    const res = await t.post(`/plans/${plan}/confirm`, body(1, forged));
    expect(res.status).toBe(409);
    expect(obj((await json(res)).error).code).toBe("content_mismatch");
    const rows =
      await t.db`select count(*)::int as n from plan_version_content`;
    expect(rows[0].n).toBe(0);
  });

  it("cannot overwrite a version text with different text later", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    await t.post(`/plans/${plan}/confirm`, body(1));
    const res = await t.post(
      `/plans/${plan}/confirm`,
      body(1, { ...GOOD_TEXT, exitThesis: "Changed my mind after the fact." }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 404 for a plan or version that does not exist onchain", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    expect((await t.post(`/plans/${plan}/confirm`, body(2))).status).toBe(404);
    const unknown = address("4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx");
    expect((await t.post(`/plans/${unknown}/confirm`, body(1))).status).toBe(
      404,
    );
  });

  it("refuses an account that Relay does not own", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    t.chain.foreign.add(plan);
    const res = await t.post(`/plans/${plan}/confirm`, body(1));
    expect(res.status).toBe(400);
    expect(obj((await json(res)).error).code).toBe("not_a_relay_account");
  });

  it("validates input", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    expect(
      (await t.post("/plans/not-an-address/confirm", body(1))).status,
    ).toBe(400);
    expect(
      (
        await t.post(`/plans/${plan}/confirm`, {
          version: "1",
          content: body(1).content,
        })
      ).status,
    ).toBe(400);
    expect(
      (await t.post(`/plans/${plan}/confirm`, { version: 1 })).status,
    ).toBe(400);
    expect(
      (
        await t.post(`/plans/${plan}/confirm`, {
          version: 1,
          content: { rationale: 5, exitThesis: "x" },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await t.post(
          `/plans/${plan}/confirm`,
          body(1, { ...GOOD_TEXT, rationale: " padded text here " }),
        )
      ).status,
    ).toBe(400);
    const bad = await t.app.request(`/plans/${plan}/confirm`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: "{not json",
    });
    expect(bad.status).toBe(400);
  });

  it("reports an unreachable chain as 503", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    t.chain.down = true;
    expect((await t.post(`/plans/${plan}/confirm`, body(1))).status).toBe(503);
  });

  it("stores earlier versions so the hash chain is complete", async () => {
    const first = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
      planId: 5n,
    });
    const creator = t.chain.plans.get(first.plan)?.creator;
    const text2 = {
      ...GOOD_TEXT,
      exitThesis: "Lowered exit: take profit earlier this time.",
    };
    await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
      planId: 5n,
      creator,
      text: text2,
    });
    const res = await t.post(`/plans/${first.plan}/confirm`, body(2, text2));
    expect(res.status).toBe(200);
    const versions = list((await json(res)).versions);
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
    expect(versions[0]?.text).toBeNull(); // version 1 exists onchain but its text was never submitted
    expect(versions[1]?.prevTermsHash).toBe(versions[0]?.termsHash);
  });
});

describe("feed", () => {
  it("shows a plan committed onchain even before its text is confirmed", async () => {
    await t.chain.publish({ pair: SOL_PAIR, ...SOL_PRICE_IN_RANGE });
    const feed = await json(await t.get("/feed"));
    const items = list(feed.items);
    expect(items.length).toBe(1);
    expect(obj(items[0]?.version).text).toBeNull();
  });

  it("classifies the entry status from the reference price", async () => {
    await t.chain.publish({ pair: SOL_PAIR, ...SOL_PRICE_IN_RANGE }); // price 183 -> in range
    await t.chain.publish({
      pair: SOL_PAIR,
      low: 150_000_000n,
      high: 160_000_000n,
    }); // price above range
    await t.chain.publish({
      pair: SOL_PAIR,
      low: 200_000_000n,
      high: 210_000_000n,
    }); // price below range
    const got = statuses(await json(await t.get("/feed")));
    expect([...got].sort()).toEqual(["above_range", "below_range", "in_range"]);
  });

  it("ranks in-range plans first, then out-of-range, then expired", async () => {
    await t.chain.publish({
      pair: SOL_PAIR,
      low: 150_000_000n,
      high: 160_000_000n,
      publishedAt: T0 + 50,
    });
    await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
      expiresAt: T0 - 10,
      publishedAt: T0 + 40,
    });
    await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
      publishedAt: T0,
    });
    expect(statuses(await json(await t.get("/feed")))).toEqual([
      "in_range",
      "above_range",
      "expired",
    ]);
  });

  it("uses CHAIN time, not the wall clock, so time travel expires plans", async () => {
    await t.chain.publish({ pair: SOL_PAIR, ...SOL_PRICE_IN_RANGE });
    t.chain.now = (T0 + 7200) * 1000;
    expect(statuses(await json(await t.get("/feed")))).toEqual(["expired"]);
  });

  it("never reports a stale or missing price as in range", async () => {
    await t.chain.publish({ pair: SOL_PAIR, ...SOL_PRICE_IN_RANGE });
    t.prices.prices.set(SOL.mint, { units: 183_000_000n, ageMs: 120_000 });
    expect(statuses(await json(await t.get("/feed")))).toEqual(["price_stale"]);
    t.prices.prices.delete(SOL.mint);
    expect(statuses(await json(await t.get("/feed")))).toEqual([
      "price_unavailable",
    ]);
  });

  it("marks closed plans as closed and keeps showing them", async () => {
    await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
      closed: true,
    });
    const feed = await json(await t.get("/feed"));
    expect(list(feed.items)[0]?.planStatus).toBe("closed");
    expect(statuses(feed)).toEqual(["closed"]);
  });

  it("filters by pair and paginates with an opaque cursor", async () => {
    for (let i = 0; i < 5; i++) {
      await t.chain.publish({
        pair: SOL_PAIR,
        ...SOL_PRICE_IN_RANGE,
        publishedAt: T0 + i,
      });
    }
    await t.chain.publish({ pair: JUP_PAIR, low: 300_000n, high: 400_000n });
    const jup = await json(await t.get("/feed?pair=jup-usdc"));
    expect(list(jup.items).length).toBe(1);

    const p1 = await json(await t.get("/feed?pair=sol-usdc&limit=2"));
    expect(list(p1.items).length).toBe(2);
    expect(p1.nextCursor).not.toBeNull();
    const p2 = await json(
      await t.get(`/feed?pair=sol-usdc&limit=2&cursor=${p1.nextCursor}`),
    );
    const p3 = await json(
      await t.get(`/feed?pair=sol-usdc&limit=2&cursor=${p2.nextCursor}`),
    );
    const all = [p1, p2, p3].flatMap((p) =>
      list(p.items).map((i) => i.planPda),
    );
    expect(new Set(all).size).toBe(5);
    expect(p3.nextCursor).toBeNull();
  });

  it("rejects an unknown pair or a non-integer limit, and ignores a garbage cursor", async () => {
    expect((await t.get("/feed?pair=doge-usdc")).status).toBe(400);
    expect((await t.get("/feed?limit=abc")).status).toBe(400);
    expect((await t.get("/feed?cursor=%%%")).status).toBe(200);
  });

  it("still serves stored plans when the chain is unreachable", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    await t.post(`/plans/${plan}/confirm`, body(1));
    t.chain.down = true;
    expect(list((await json(await t.get("/feed"))).items).length).toBe(1);
  });
});

describe("plan detail and prices", () => {
  it("404s for an unknown plan and 400s for a malformed address", async () => {
    expect(
      (await t.get("/plans/4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx"))
        .status,
    ).toBe(404);
    expect((await t.get("/plans/nope")).status).toBe(400);
  });

  it("serves exact decimals and hashes for a version", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      low: 180_250_000n,
      high: 185_000_000n,
    });
    await t.post(`/plans/${plan}/confirm`, body(1));
    const version = obj((await json(await t.get(`/plans/${plan}`))).version);
    expect(version.entryLow).toBe("180.25");
    expect(version.entryLowUnits).toBe("180250000");
    expect(version.contentHash).toBe(toHex(await contentHash(GOOD_TEXT)));
  });

  it("lists advisory prices with their age", async () => {
    const items = list((await json(await t.get("/prices"))).items);
    expect(items.map((i) => i.pair)).toEqual(["sol-usdc", "jup-usdc"]);
    expect(obj(items[0]?.price).display).toBe("183");
  });
});

/** Asserts that a query is rejected by the database with a message matching `pattern`. */
async function expectDbError(query: PromiseLike<unknown>, pattern: RegExp) {
  try {
    await query;
  } catch (e) {
    expect(e instanceof Error ? e.message : String(e)).toMatch(pattern);
    return;
  }
  throw new Error("expected the database to reject the statement");
}

describe("database guarantees", () => {
  it("makes plan versions and their text append-only", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    await t.post(`/plans/${plan}/confirm`, body(1));
    await expectDbError(
      t.db`update plan_versions set entry_low = 1`,
      /append-only/,
    );
    await expectDbError(t.db`delete from plan_versions`, /append-only/);
    await expectDbError(
      t.db`update plan_version_content set rationale = 'edited'`,
      /append-only/,
    );
    await expectDbError(t.db`delete from plan_version_content`, /append-only/);
  });

  it("stores version addresses that match the program derivation", async () => {
    const { plan } = await t.chain.publish({
      pair: SOL_PAIR,
      ...SOL_PRICE_IN_RANGE,
    });
    await t.post(`/plans/${plan}/confirm`, body(1));
    const rows = await t.db`select version_pda from plan_versions`;
    expect(rows[0].version_pda).toBe(await getVersionAddress(address(plan), 1));
  });
});
