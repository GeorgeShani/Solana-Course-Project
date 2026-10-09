import { createApp } from "./app";
import { connect, migrate } from "./db";
import { loadEnv } from "./env";
import { createChain } from "./services/chain";
import { createPlanService } from "./services/plans";
import { createJupiterPrices } from "./services/prices";

const env = loadEnv();

// Migrations use the direct connection (see DATABASE_DIRECT_URL); the app uses the runtime one.
const migrationDb = connect(env.databaseDirectUrl);
const applied = await migrate(migrationDb);
await migrationDb.close();
if (applied.length) console.log(`applied migrations: ${applied.join(", ")}`);

const db = connect(env.databaseUrl);
const chain = createChain(env.solanaRpcUrl, env.cluster);
const prices = createJupiterPrices(env, db);
const plans = createPlanService({ env, db, chain, prices });

const app = createApp({ env, db, plans, prices });

console.log(
  `relay server on :${env.port} (cluster ${env.cluster}, origin ${env.appOrigin})`,
);

export default {
  port: env.port,
  fetch: app.fetch,
};
