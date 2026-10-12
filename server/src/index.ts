import { createApp } from "./app";
import { connect, migrate } from "./shared/db";
import { describeDbTarget, targetLine } from "./shared/db-target";
import { loadEnv } from "./shared/env";
import { createLogger } from "./shared/logger";
import { assertRpcMatchesNetwork } from "./shared/network-check";
import { createEvidenceService } from "./modules/discovery/evidence";
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

export default {
  port: env.port,
  fetch: app.fetch,
};
