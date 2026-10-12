import { loadEnv } from "./shared/env";
import { connect, migrate } from "./shared/db";
import { requireConfirmedTarget } from "./shared/db-target";

const env = loadEnv();
requireConfirmedTarget(env.databaseDirectUrl, process.argv.slice(2));
const db = connect(env.databaseDirectUrl);
const ran = await migrate(db);
console.log(
  ran.length ? `applied: ${ran.join(", ")}` : "database is up to date",
);
await db.close();
