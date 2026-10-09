import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { SUPPORTED_PAIRS, formatUnits } from "@relay/domain";
import type { Db } from "./db";
import type { Env } from "./env";
import {
  ApiError,
  createRateLimiter,
  originGuard,
  rateLimit,
} from "./middleware";
import type { FollowService } from "./services/follow";
import type { PlanService } from "./services/plans";
import type { PriceSource } from "./services/types";
import { isRecord } from "./util";

export interface AppDeps {
  env: Env;
  db: Db;
  plans: PlanService;
  follow: FollowService;
  prices: PriceSource;
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
export function createApp({ env, db, plans, follow, prices }: AppDeps) {
  const app = new Hono();

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
  app.use("*", rateLimit(createRateLimiter(120, 60_000)));

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/health/ready", async (c) => {
    await db`select 1`;
    return c.json({ ok: true, cluster: env.cluster });
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
    return c.json(await follow.quote(body));
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
      return c.json(
        { error: { code: err.code, message: err.message } },
        err.status,
      );
    }
    console.error("unhandled error", err);
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
