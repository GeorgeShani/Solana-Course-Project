import { createApp } from "./app";
import { connect, migrate } from "./shared/db";
import { describeDbTarget, targetLine } from "./shared/db-target";
import { loadEnv } from "./shared/env";
import { createLogger } from "./shared/logger";
import { assertRpcMatchesNetwork } from "./shared/network-check";
import { createEvidenceService } from "./modules/discovery/evidence";
import { loadFeedConfig, pollFeeds } from "./modules/discovery/feeds";
import { createDiscoveryService } from "./modules/discovery/service";
import { createChain } from "./modules/plans/chain";
import { createFollowService } from "./modules/plans/follow";
import { createJupiterClient } from "./modules/plans/jupiter";
import { createPlanService } from "./modules/plans/plans";
import { createRpcForward } from "./modules/plans/rpc-proxy";
import { createJupiterPrices } from "./modules/plans/prices";

const env = loadEnv();
const logger = createLogger();

// Say which database this start will migrate and use. (It never refuses: the root .env decides.)
if (!env.production) {
  logger.info("database_target", {
    target: targetLine(describeDbTarget(env.databaseUrl)),
  });
}

// A wrong RPC network would label real funds as test funds (or the reverse), so it stops the start.
if (
  (await assertRpcMatchesNetwork(env.solanaRpcUrl, env.cluster)) ===
    "unchecked" &&
  env.cluster !== "localnet"
) {
  logger.warn("rpc_network_unverified", {
    network: env.cluster,
    note: "could not verify the RPC network at start; /health/ready reports the RPC",
  });
}

// Anyone can publish a plan to a public network. Without an allowlist every one of them is listed.
if (env.production && env.creatorAllowlist.length === 0) {
  logger.warn("feed_unfiltered", {
    note: "CREATOR_ALLOWLIST is empty: every plan on the program is listed in the feed, including spam",
  });
}

// Migrations use the direct connection (see DATABASE_DIRECT_URL); the app uses the runtime one.
const migrationDb = connect(env.databaseDirectUrl);
const applied = await migrate(migrationDb);
await migrationDb.close();
if (applied.length) logger.info("migrations_applied", { names: applied });

const db = connect(env.databaseUrl);
const chain = createChain(env.solanaRpcUrl, env.cluster);
const prices = createJupiterPrices(env, db, { logger });
const plans = createPlanService({ env, db, chain, prices, logger });

const follow = createFollowService({
  env,
  db,
  chain,
  jupiter: createJupiterClient(env, { logger }),
  logger,
});

const discovery = createDiscoveryService({ env, db });
const evidence = createEvidenceService({ env, db });

const app = createApp({
  env,
  db,
  discovery,
  evidence,
  plans,
  follow,
  prices,
  rpc: createRpcForward(env.solanaRpcUrl),
  chain,
  logger,
});

logger.info("server_started", {
  port: env.port,
  network: env.cluster,
  origin: env.appOrigin,
  listedCreators: env.creatorAllowlist.length,
});

// Automatic detection of new items in the authors' own public feeds (titles and links only). It
// never runs in demo mode, and FEEDS_POLL=off turns it off.
if (!env.demoMode && process.env.FEEDS_POLL !== "off") {
  const feeds = loadFeedConfig();
  const poll = () =>
    pollFeeds(db, feeds, {
      fetch: (url, init) => fetch(url, init),
      now: () => new Date(),
      logger,
    }).then(
      (reports) =>
        logger.info("feeds_polled", {
          ok: reports.filter((r) => r.ok).length,
          failed: reports.filter((r) => !r.ok).length,
          added: reports.reduce((n, r) => n + r.added, 0),
        }),
      (e: unknown) =>
        logger.warn("feeds_poll_error", {
          error: e instanceof Error ? e.message : "unknown",
        }),
    );
  setTimeout(() => void poll(), 5_000);
  setInterval(() => void poll(), 30 * 60_000);
}

export default {
  port: env.port,
  fetch: app.fetch,
};
