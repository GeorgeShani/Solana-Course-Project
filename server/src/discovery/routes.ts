import type { Hono } from "hono";
import type { AppEnv } from "../middleware";
import { ApiError } from "../middleware";
import {
  MAX_WATCH_TARGETS,
  type DiscoveryService,
  type WatchTarget,
} from "./service";

/**
 * Public, read-only discovery endpoints. Nothing here writes, and nothing is fetched from a
 * provider: every answer comes from curated rows (see apply.ts).
 *
 *   GET /discovery/traders?cursor&limit        sourced profiles and their coverage
 *   GET /discovery/traders/:id                 one profile, its links with the identity basis, its ideas
 *   GET /discovery/ideas?cursor&limit&trader   ideas, newest activity first
 *   GET /discovery/ideas/:id                   the original source and the timeline
 *   GET /discovery/changes?watch=idea:<id>:<seq>&watch=trader:<id>:<seq>&limit
 *                                              what changed in the things a reader watches, after
 *                                              the last event seq it has seen for each
 */
const TARGET = /^(idea|trader):([a-z0-9][a-z0-9_-]{2,63}):(\d{1,19})$/;

/** `watch=idea:sol-watch:12`. Bounded, validated, de-duplicated (the larger cursor wins nothing: the first stays). */
export function parseWatchTargets(values: readonly string[]): WatchTarget[] {
  if (values.length > MAX_WATCH_TARGETS)
    throw new ApiError(
      400,
      "too_many_targets",
      `Watch at most ${MAX_WATCH_TARGETS} things at once`,
    );
  const seen = new Set<string>();
  const out: WatchTarget[] = [];
  for (const value of values) {
    const m = TARGET.exec(value);
    const type = m?.[1];
    const id = m?.[2];
    const after = m?.[3];
    if (
      (type !== "idea" && type !== "trader") ||
      id === undefined ||
      after === undefined
    )
      throw new ApiError(
        400,
        "invalid_watch",
        "Each watch must look like idea:<id>:<seq> or trader:<id>:<seq>",
      );
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, id, after: String(BigInt(after)) });
  }
  return out;
}

export function mountDiscovery(app: Hono<AppEnv>, discovery: DiscoveryService) {
  const limitOf = (text: string | undefined): number | undefined =>
    text === undefined ? undefined : Number(text);

  app.get("/discovery/traders", async (c) =>
    c.json(
      await discovery.listTraders({
        cursor: c.req.query("cursor"),
        limit: limitOf(c.req.query("limit")),
      }),
    ),
  );

  app.get("/discovery/traders/:id", async (c) =>
    c.json(await discovery.getTrader(c.req.param("id"))),
  );

  app.get("/discovery/ideas", async (c) =>
    c.json(
      await discovery.listIdeas({
        cursor: c.req.query("cursor"),
        limit: limitOf(c.req.query("limit")),
        traderId: c.req.query("trader"),
      }),
    ),
  );

  app.get("/discovery/ideas/:id", async (c) =>
    c.json(await discovery.getIdea(c.req.param("id"))),
  );

  app.get("/discovery/changes", async (c) =>
    c.json(
      await discovery.getChanges(
        parseWatchTargets(c.req.queries("watch") ?? []),
        {
          limit: limitOf(c.req.query("limit")),
        },
      ),
    ),
  );
}
