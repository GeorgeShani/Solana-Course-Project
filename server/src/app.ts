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
import type { PlanService } from "./services/plans";
import type { PriceSource } from "./services/types";
import { isRecord } from "./util";

export interface AppDeps {
  env: Env;
  db: Db;
  plans: PlanService;
  prices: PriceSource;
}

const MAX_BODY_BYTES = 16 * 1024;

/**
 * The HTTP API. Everything is read-mostly: the Solana program is the authority, and the only
 * write is `POST /plans/:planPda/confirm`, which stores plan text after checking it against the
 * hash committed onchain. Mutating requests need the configured Origin and a JSON body.
 */
export function createApp({ env, db, plans, prices }: AppDeps) {
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
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        throw new ApiError(400, "invalid_json", "Body must be valid JSON");
      }
      if (!isRecord(body)) {
        throw new ApiError(400, "invalid_body", "Body must be an object");
      }
      return c.json(
        await plans.confirm(c.req.param("planPda"), {
          version: body.version,
          content: body.content,
        }),
      );
    },
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
