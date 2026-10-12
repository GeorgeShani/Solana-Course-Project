/**
 * Polls the authors' own public feeds once and prints what was found.
 *
 *   bun run --cwd server feeds
 *
 * The server does this every 30 minutes on its own; run this to refresh now. Only the title, link
 * and date of each item are kept. A remote database needs --confirm-db-host=<host>.
 */
import { connect, migrate } from "../src/shared/db";
import { requireConfirmedTarget } from "../src/shared/db-target";
import { loadEnv } from "../src/shared/env";
import { loadFeedConfig, pollFeeds } from "../src/modules/discovery/feeds";

const env = loadEnv();
requireConfirmedTarget(env.databaseDirectUrl, process.argv.slice(2));
const db = connect(env.databaseDirectUrl);
await migrate(db);
const reports = await pollFeeds(db, loadFeedConfig());
for (const r of reports)
  console.log(
    `${r.ok ? "ok  " : "FAIL"} ${r.url}  seen ${r.seen}, new ${r.added}${r.error ? `  (${r.error})` : ""}`,
  );
await db.close();
process.exit(reports.every((r) => r.ok) ? 0 : 1);
