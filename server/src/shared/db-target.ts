/**
 * Which database a command is about to change, checked BEFORE it connects.
 *
 * A single root `.env` serves every command, and its DATABASE_URL may point at a remote database.
 * Commands that write (migrate, curate, seed, review, and a development server, which migrates on
 * start) therefore refuse a non-local host until the operator names it:
 *
 *   --confirm-db-host=<host>     for the scripts
 *
 * A production server is exempt: it is expected to talk to its real database.
 */
export interface DbTarget {
  host: string;
  database: string;
  local: boolean;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function describeDbTarget(url: string): DbTarget {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { host: "(unreadable)", database: "(unreadable)", local: false };
  }
  const host = u.hostname;
  return {
    host,
    database: u.pathname.replace(/^\//, "") || "(default)",
    local: LOCAL_HOSTS.has(host) || host.endsWith(".localhost"),
  };
}

/** The text to print before touching the database: host and name only, never credentials. */
export function targetLine(t: DbTarget): string {
  return `database: ${t.database} on ${t.host}${t.local ? " (local)" : " (REMOTE)"}`;
}

/** Null when it is fine to proceed; otherwise the message to print before exiting. */
export function targetRefusal(
  t: DbTarget,
  confirmed: string | undefined,
): string | null {
  if (t.local) return null;
  if (confirmed !== undefined && confirmed === t.host) return null;
  return `Refusing to change a remote database without confirmation.\n${targetLine(t)}\nIf this is the database you mean, repeat the command with the host named exactly: --confirm-db-host=${t.host}`;
}

/** `--confirm-db-host=<host>` from a script's arguments. */
export function confirmedHostArg(args: readonly string[]): string | undefined {
  const a = args.find((x) => x.startsWith("--confirm-db-host="));
  return a === undefined ? undefined : a.slice("--confirm-db-host=".length);
}

/** For scripts: print the target, and exit 1 when it is remote and unconfirmed. */
export function requireConfirmedTarget(
  url: string,
  args: readonly string[],
): void {
  const t = describeDbTarget(url);
  const refusal = targetRefusal(t, confirmedHostArg(args));
  console.error(targetLine(t));
  if (refusal) {
    console.error(refusal);
    process.exit(1);
  }
}
