import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { SUPPORTED_PAIRS, formatUnits } from "@relay/domain";
import type { Db } from "./db";
import type { Env } from "./env";
import { safeMessage, shortAddress, silentLogger, type Logger } from "./logger";
import {
  ApiError,
  clientKey,
  createRateLimiter,
  originGuard,
  rateLimit,
  requestLog,
  type AppEnv,
} from "./middleware";
import type { FollowService } from "./services/follow";
import type { PlanService } from "./services/plans";
import type { ChainReader, PriceSource } from "./services/types";
import { parseRpcRequest, type RpcForward } from "./services/rpc-proxy";
import { isRecord } from "./util";

export interface AppDeps {
  env: Env;
  db: Db;
  plans: PlanService;
  follow: FollowService;
  prices: PriceSource;
  /** Upstream of POST /rpc (the server's SOLANA_RPC_URL). */
  rpc: RpcForward;
  /** Used by GET /health/ready to ask the RPC for its slot. */
  chain: Pick<ChainReader, "health">;
  /** Request lines and errors. Defaults to silent so tests and scripts stay quiet. */
  logger?: Logger;
}

const MAX_BODY_BYTES = 16 * 1024;

async function readJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Body must be valid JSON");
  }
  if (!isRecord(body)) {
    throw new ApiError(400, "invalid_body", "Body must be an object");
  }
  return body;
}

/**
 * The HTTP API. Everything is read-mostly: the Solana program is the authority, and the only
 * write is `POST /plans/:planPda/confirm`, which stores plan text after checking it against the
 * hash committed onchain. Mutating requests need the configured Origin and a JSON body.
 */
export function createApp({
  env,
  db,
  plans,
  follow,
  prices,
  rpc,
  chain,
  logger = silentLogger,
}: AppDeps) {
  const app = new Hono<AppEnv>();

  app.use("*", requestLog(logger));
  app.use("*", secureHeaders());
  app.use(
    "*",
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) =>
        c.json(
          {
            error: {
              code: "payload_too_large",
              message: "Request body is too large",
            },
          },
          413,
        ),
    }),
  );
  app.use("*", originGuard(env.appOrigin));
  // /rpc has its own, higher limit: confirming one wallet transaction polls the RPC.
  const generalLimit = rateLimit(createRateLimiter(120, 60_000));
  app.use("*", (c, next) =>
    c.req.path === "/rpc" ? next() : generalLimit(c, next),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  /**
   * Readiness, for an operator or a monitor (the container's own healthcheck uses /health, which
   * must not depend on Solana). It answers 503 when the database or the Solana RPC cannot answer,
   * and says which, so "the feed is empty" can be told apart from "the RPC key is wrong".
   */
  app.get("/health/ready", async (c) => {
    const check = async (run: () => Promise<unknown>): Promise<"ok" | "down"> =>
      run().then(
        () => "ok",
        (e: unknown) => {
          logger.warn("readiness_check_failed", { error: safeMessage(e) });
          return "down";
        },
      );
    const [database, rpcState] = await Promise.all([
      check(() => db`select 1`),
      check(() => chain.health()),
    ]);
    const ok = database === "ok" && rpcState === "ok";
    return c.json(
      {
        ok,
        network: env.cluster,
        // Kept for older clients: the same value as `network`.
        cluster: env.cluster,
        checks: { database, rpc: rpcState },
      },
      ok ? 200 : 503,
    );
  });

  app.get("/feed", async (c) => {
    const limitText = c.req.query("limit");
    const limit = limitText === undefined ? undefined : Number(limitText);
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw new ApiError(400, "invalid_limit", "limit must be an integer");
    }
    return c.json(
      await plans.feed({
        cursor: c.req.query("cursor"),
        pairId: c.req.query("pair"),
        limit,
      }),
    );
  });

  app.get("/plans/:planPda", async (c) =>
    c.json(await plans.detail(c.req.param("planPda"))),
  );

  app.post(
    "/plans/:planPda/confirm",
    rateLimit(createRateLimiter(10, 60_000)),
    async (c) => {
      const body = await readJson(c.req.raw);
      return c.json(
        await plans.confirm(c.req.param("planPda"), {
          version: body.version,
          content: body.content,
        }),
      );
    },
  );

  const quoteLimiter = createRateLimiter(10, 60_000);
  const quoteFollowerLimiter = createRateLimiter(10, 60_000);
  /** Builds the transaction a follower may sign: fresh route, simulated, nothing sent. */
  app.post("/follow/quote", rateLimit(quoteLimiter), async (c) => {
    const body = await readJson(c.req.raw);
    if (
      typeof body.follower === "string" &&
      !quoteFollowerLimiter(body.follower)
    ) {
      throw new ApiError(
        429,
        "rate_limited",
        "Too many requests. Try again in a moment.",
      );
    }
    const result = await follow.quote(body);
    // One structured line per follow attempt (plan section V): what was routed, how heavy it is.
    logger.info("follow_quote", {
      reqId: c.get("reqId"),
      planPda: result.summary.planPda,
      version: result.summary.version,
      follower: shortAddress(result.summary.follower),
      routeLabels: result.summary.routeLabels,
      computeUnits: result.compose.computeUnitLimit,
      check: result.summary.check,
    });
    return c.json(result);
  });

  /** Records the outcome of a follow by re-reading the chain. The client supplies only a signature. */
  app.post(
    "/follow/verify",
    rateLimit(createRateLimiter(30, 60_000)),
    async (c) => c.json(await follow.verify(await readJson(c.req.raw))),
  );

  app.get("/me/executions", async (c) =>
    c.json({ items: await follow.executionsFor(c.req.query("follower")) }),
  );

  /**
   * The browser's Solana RPC. Forwards one allowlisted JSON-RPC request to the server's own
   * provider, so a keyed RPC URL never reaches the client bundle. Mutating like every POST, so it
   * needs the app's Origin.
   */
  const rpcLimiter = createRateLimiter(300, 60_000);
  const sendLimiter = createRateLimiter(20, 60_000);
  app.post("/rpc", rateLimit(rpcLimiter), async (c) => {
    const request = parseRpcRequest(await readJson(c.req.raw));
    if (request.method === "sendTransaction" && !sendLimiter(clientKey(c))) {
      throw new ApiError(
        429,
        "rate_limited",
        "Too many requests. Try again in a moment.",
      );
    }
    const upstream = await rpc(request);
    return c.body(upstream.body, 200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
  });

  /** Advisory reference prices (never enforced by the program). */
  app.get("/prices", async (c) => {
    const now = Date.now();
    const items = await Promise.all(
      SUPPORTED_PAIRS.map(async (pair) => {
        const price = await prices.get(pair).catch(() => null);
        return {
          pair: pair.id,
          label: pair.label,
          price: price
            ? {
                units: price.units.toString(),
                display: formatUnits(price.units, pair.quote.decimals),
                observedAtMs: price.observedAtMs,
                ageMs: now - price.observedAtMs,
              }
            : null,
        };
      }),
    );
    return c.json({ items });
  });

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      // The code is the "error code" of the attempt: it says which check stopped it.
      logger[err.status >= 500 ? "warn" : "info"]("api_error", {
        reqId: c.get("reqId"),
        method: c.req.method,
        path: c.req.path,
        status: err.status,
        code: err.code,
      });
      return c.json(
        { error: { code: err.code, message: err.message } },
        err.status,
      );
    }
    logger.error("unhandled_error", {
      reqId: c.get("reqId"),
      method: c.req.method,
      path: c.req.path,
      error: safeMessage(err),
    });
    return c.json(
      { error: { code: "internal", message: "Something went wrong" } },
      500,
    );
  });

  app.notFound((c) =>
    c.json({ error: { code: "not_found", message: "Not found" } }, 404),
  );

  return app;
}
