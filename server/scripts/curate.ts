/**
 * Loads the owner-reviewed curation file into the discovery tables.
 *
 *   bun run --cwd server curate                 # curation/curated.json (real traders)
 *   bun run --cwd server curate --check         # validate only, touch nothing
 *   bun run --cwd server curate --demo          # curation/demo.json (fictional; refused in production)
 *   bun run --cwd server curate --file path.json
 *
 * Safe to run again: the same file changes nothing. A file that contradicts what is already
 * recorded is refused whole. See server/curation/README.md for what each trader needs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { connect, migrate } from "../src/db";
import { applyCuration, CurationConflictError } from "../src/discovery/apply";
import { CurationError, parseCuration } from "../src/discovery/curation";
import { loadEnv } from "../src/env";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const fileArg = args.indexOf("--file");
const dir = join(import.meta.dir, "..", "curation");
const path =
  fileArg !== -1 && args[fileArg + 1]
    ? (args[fileArg + 1] ?? "")
    : join(dir, flag("--demo") ? "demo.json" : "curated.json");

const env = loadEnv();
let raw: unknown;
try {
  raw = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.error(
    `Could not read ${path}: ${e instanceof Error ? e.message : "unknown error"}`,
  );
  process.exit(1);
}

try {
  const curation = parseCuration(raw);
  if (curation.demo && env.production) {
    console.error("Refusing to load fictional demo data in production.");
    process.exit(1);
  }
  const ideas = curation.traders.reduce((n, t) => n + t.ideas.length, 0);
  console.log(
    `${path}: ${curation.demo ? "FICTIONAL DEMO" : "live"} file, ${curation.traders.length} trader(s), ${ideas} idea(s) — valid.`,
  );
  if (flag("--check")) process.exit(0);

  const db = connect(env.databaseDirectUrl);
  await migrate(db);
  const report = await applyCuration(db, curation);
  await db.close();
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  if (e instanceof CurationError || e instanceof CurationConflictError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
