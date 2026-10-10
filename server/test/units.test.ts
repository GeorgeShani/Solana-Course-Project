import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { loadEnv } from "../src/env";
import {
  bucketOf,
  decodeCursor,
  encodeCursor,
  rankFeed,
  type Rankable,
} from "../src/services/feed-rank";
import {
  ApiError,
  clientKey,
  createRateLimiter,
  originGuard,
} from "../src/middleware";

describe("rate limiter", () => {
  it("allows up to the limit per window, per key, then resets", () => {
    const allow = createRateLimiter(2, 1000);
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 1)).toBe(true);
    expect(allow("a", 2)).toBe(false);
    expect(allow("b", 2)).toBe(true);
    expect(allow("a", 1000)).toBe(true);
  });
});

describe("clientKey", () => {
  it("trusts the right-most X-Forwarded-For entry, which the proxy appended", async () => {
    const app = new Hono();
    app.get("/", (c) => c.text(clientKey(c)));
    const res = await app.request("/", {
      headers: { "x-forwarded-for": "6.6.6.6, 7.7.7.7, 8.8.8.8" },
    });
    expect(await res.text()).toBe("8.8.8.8");
    expect(await (await app.request("/")).text()).toBe("local");
  });
});

describe("originGuard", () => {
  const app = new Hono();
  app.use("*", originGuard("https://relay.example"));
  app.onError((e, c) =>
    e instanceof ApiError
      ? c.json({ code: e.code }, e.status)
      : c.text("x", 500),
  );
  app.get("/", (c) => c.text("ok"));
  app.post("/", (c) => c.text("posted"));

  it("never blocks reads", async () => {
    expect((await app.request("/")).status).toBe(200);
  });

  it("requires the exact origin and JSON for writes", async () => {
    const json = { "content-type": "application/json" };
    const ok = { ...json, origin: "https://relay.example" };
    expect(
      (await app.request("/", { method: "POST", headers: ok })).status,
    ).toBe(200);
    const lookalike = { ...json, origin: "https://relay.example.evil.com" };
    expect(
      (await app.request("/", { method: "POST", headers: lookalike })).status,
    ).toBe(403);
    expect(
      (await app.request("/", { method: "POST", headers: json })).status,
    ).toBe(403);
    const noType = { origin: "https://relay.example" };
    expect(
      (await app.request("/", { method: "POST", headers: noType })).status,
    ).toBe(415);
  });
});

describe("feed ranking", () => {
  const NOW = 1_790_000_000;
  const item = (
    planPda: string,
    status: Rankable["status"],
    publishedAt = NOW - 100,
    expiresAt = NOW + 100,
  ): Rankable => ({ planPda, status, publishedAt, expiresAt });

  it("orders by bucket, then newest, then address", () => {
    const ranked = rankFeed(
      [
        item("c", "expired", NOW - 50, NOW - 10),
        item("b", "above_range", NOW - 10),
        item("a2", "in_range", NOW - 300),
        item("a1", "in_range", NOW - 20),
        item("d", "price_unavailable"),
      ],
      NOW,
    );
    expect(ranked.map((r) => r.planPda)).toEqual(["a1", "a2", "b", "d", "c"]);
  });

  it("puts old expired plans in the last bucket and recent ones in the fourth", () => {
    expect(
      bucketOf(item("old", "expired", NOW - 10 * 86400, NOW - 9 * 86400), NOW),
    ).toBe(5);
    expect(bucketOf(item("fresh", "expired", NOW - 3600, NOW - 60), NOW)).toBe(
      4,
    );
    expect(bucketOf(item("closed", "closed"), NOW)).toBe(4);
  });

  it("takes no performance claim as an input", () => {
    expect(Object.keys(item("x", "in_range")).sort()).toEqual([
      "expiresAt",
      "planPda",
      "publishedAt",
      "status",
    ]);
  });

  it("round-trips cursors and treats garbage as the start", () => {
    expect(decodeCursor(encodeCursor(30))).toBe(30);
    expect(decodeCursor(undefined)).toBe(0);
    expect(decodeCursor("%%%")).toBe(0);
    expect(decodeCursor(Buffer.from('{"o":-5}').toString("base64url"))).toBe(0);
    expect(decodeCursor(Buffer.from('{"o":"x"}').toString("base64url"))).toBe(
      0,
    );
  });
});

describe("env", () => {
  it("defaults to devnet with its public RPC", () => {
    const env = loadEnv({});
    expect(env.cluster).toBe("devnet");
    expect(env.production).toBe(false);
    expect(env.solanaRpcUrl).toBe("https://api.devnet.solana.com");
    expect(env.appOrigin).toBe("http://localhost:5173");
    expect(env.databaseDirectUrl).toBe(env.databaseUrl);
  });

  it("reads NETWORK, falls back to the old SOLANA_CLUSTER name, and prefers NETWORK", () => {
    expect(loadEnv({ NETWORK: "localnet" }).cluster).toBe("localnet");
    expect(loadEnv({ SOLANA_CLUSTER: "localnet" }).cluster).toBe("localnet");
    expect(
      loadEnv({ NETWORK: "devnet", SOLANA_CLUSTER: "localnet" }).cluster,
    ).toBe("devnet");
  });

  it("treats empty values like unset, so a blank line in .env changes nothing", () => {
    const env = loadEnv({
      NETWORK: "",
      SOLANA_RPC_URL: "",
      APP_ORIGIN: "",
      JUPITER_BASE_URL: "",
    });
    expect(env.cluster).toBe("devnet");
    expect(env.solanaRpcUrl).toBe("https://api.devnet.solana.com");
    expect(env.appOrigin).toBe("http://localhost:5173");
    expect(env.jupiterBaseUrl).toBe("https://api.jup.ag");
  });

  it("uses each network's default RPC, and a given one wins", () => {
    expect(loadEnv({ NETWORK: "localnet" }).solanaRpcUrl).toBe(
      "http://127.0.0.1:8899",
    );
    expect(
      loadEnv({ NETWORK: "devnet", SOLANA_RPC_URL: "https://my.rpc/x" })
        .solanaRpcUrl,
    ).toBe("https://my.rpc/x");
  });

  it("uses a separate direct URL for migrations when given", () => {
    const env = loadEnv({
      DATABASE_URL: "postgres://pooled",
      DATABASE_DIRECT_URL: "postgres://direct",
    });
    expect(env.databaseUrl).toBe("postgres://pooled");
    expect(env.databaseDirectUrl).toBe("postgres://direct");
  });

  it("rejects an APP_ORIGIN that is not exactly an origin", () => {
    expect(() => loadEnv({ APP_ORIGIN: "https://relay.example/" })).toThrow(
      /origin/,
    );
    expect(() => loadEnv({ APP_ORIGIN: "relay.example" })).toThrow();
    expect(loadEnv({ APP_ORIGIN: "https://relay.example" }).appOrigin).toBe(
      "https://relay.example",
    );
  });

  it("refuses unsafe deployment settings, listing every problem", () => {
    let message = "";
    try {
      loadEnv({
        NODE_ENV: "production",
        NETWORK: "localnet",
        APP_ORIGIN: "http://relay.example",
        DEMO_MODE: "true",
      });
    } catch (e) {
      message = e instanceof Error ? e.message : "";
    }
    expect(message).toContain("NETWORK must be devnet");
    expect(message).toContain("APP_ORIGIN must use https");
    expect(message).toContain("DATABASE_URL is required");
    expect(message).toContain("DEMO_MODE must be off");
  });

  it("accepts a complete deployment configuration on devnet", () => {
    const env = loadEnv({
      NODE_ENV: "production",
      NETWORK: "devnet",
      APP_ORIGIN: "https://relay.example",
      DATABASE_URL: "postgres://db",
    });
    expect(env.production).toBe(true);
    expect(env.cluster).toBe("devnet");
  });

  it("refuses any network that is not devnet or localnet, and applies the venue allowlist only on localnet", () => {
    for (const name of ["moon", "testnet", "mainnet", "mainnet-beta"]) {
      expect(() => loadEnv({ NETWORK: name })).toThrow(
        /NETWORK must be devnet or localnet/,
      );
    }
    expect(
      loadEnv({ NETWORK: "localnet", JUPITER_DEXES: "Orca V2" }).jupiterDexes,
    ).toBe("Orca V2");
    expect(
      loadEnv({ NETWORK: "devnet", JUPITER_DEXES: "Orca V2" }).jupiterDexes,
    ).toBeUndefined();
  });
});
