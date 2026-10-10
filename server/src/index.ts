import { createApp } from "./app";
import { connect, migrate } from "./db";
import { loadEnv } from "./env";
import { assertRpcMatchesNetwork } from "./network-check";
import { createChain } from "./services/chain";
import { createFollowService } from "./services/follow";
import { createJupiterClient } from "./services/jupiter";
import { createPlanService } from "./services/plans";
import { createRpcForward } from "./services/rpc-proxy";
import { createJupiterPrices } from "./services/prices";

const env = loadEnv();
// A wrong RPC network would label real funds as test funds (or the reverse), so it stops the start.
if (
  (await assertRpcMatchesNetwork(env.solanaRpcUrl, env.cluster)) ===
    "unchecked" &&
  env.cluster !== "localnet"
) {
  console.warn(
    `could not verify that the RPC is on ${env.cluster}; /health/ready reports the RPC`,
  );
}

// Migrations use the direct connection (see DATABASE_DIRECT_URL); the app uses the runtime one.
const migrationDb = connect(env.databaseDirectUrl);
const applied = await migrate(migrationDb);
await migrationDb.close();
if (applied.length) console.log(`applied migrations: ${applied.join(", ")}`);

const db = connect(env.databaseUrl);
const chain = createChain(env.solanaRpcUrl, env.cluster);
const prices = createJupiterPrices(env, db);
const plans = createPlanService({ env, db, chain, prices });

const follow = createFollowService({
  env,
  db,
  chain,
  jupiter: createJupiterClient(env),
});

const app = createApp({
  env,
  db,
  plans,
  follow,
  prices,
  rpc: createRpcForward(env.solanaRpcUrl),
});

console.log(
  `relay server on :${env.port} (cluster ${env.cluster}, origin ${env.appOrigin})`,
);

export default {
  port: env.port,
  fetch: app.fetch,
};
