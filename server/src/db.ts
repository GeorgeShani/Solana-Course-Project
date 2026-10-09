import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SQL } from "bun";

export type Db = InstanceType<typeof SQL>;

export function connect(url: string): Db {
  return new SQL(url);
}

const MIGRATIONS_DIR = join(import.meta.dir, "..", "migrations");

/**
 * Applies server/migrations/*.sql in filename order, each in its own transaction, recording the
 * names in schema_migrations. Safe to run on every start: applied files are skipped.
 */
export async function migrate(
  db: Db,
  dir: string = MIGRATIONS_DIR,
): Promise<string[]> {
  await db`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set(
    (await db`select name from schema_migrations`).map(
      (r: { name: string }) => r.name,
    ),
  );
  const ran: string[] = [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const text = readFileSync(join(dir, file), "utf8");
    await db.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    ran.push(file);
  }
  return ran;
}
