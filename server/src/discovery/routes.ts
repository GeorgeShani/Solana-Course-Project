import type { Hono } from "hono";
import type { AppEnv } from "../middleware";
import type { DiscoveryService } from "./service";

/**
 * Public, read-only discovery endpoints. Nothing here writes, and nothing is fetched from a
 * provider: every answer comes from curated rows (see apply.ts).
 *
 *   GET /discovery/traders?cursor&limit        sourced profiles and their coverage
 *   GET /discovery/traders/:id                 one profile, its links with the identity basis, its ideas
 *   GET /discovery/ideas?cursor&limit&trader   ideas, newest activity first
 *   GET /discovery/ideas/:id                   the original source and the timeline
 */
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
}
