import { createApp } from "./app";
import { connect, migrate } from "./db";
import { loadEnv } from "./env";
import { createLogger } from "./logger";
import { assertRpcMatchesNetwork } from "./network-check";
import { createDiscoveryService } from "./discovery/service";
import { createChain } from "./services/chain";
import { createFollowService } from "./services/follow";
import { createJupiterClient } from "./services/jupiter";
import { createPlanService } from "./services/plans";
import { createRpcForward } from "./services/rpc-proxy";
import { createJupiterPrices } from "./services/prices";

const env = loadEnv();
const logger = createLogger();

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

const app = createApp({
  env,
  db,
  discovery,
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
