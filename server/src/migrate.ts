import { loadEnv } from "./env";
import { connect, migrate } from "./db";

const env = loadEnv();
const db = connect(env.databaseDirectUrl);
const ran = await migrate(db);
console.log(
  ran.length ? `applied: ${ran.join(", ")}` : "database is up to date",
);
await db.close();
