/**
 * Typed environment. Fails fast on values that would silently break security
 * (for example an APP_ORIGIN that is not an origin) or production (a local cluster, a missing
 * database, the public rate-limited RPC).
 */

/**
 * `mainnet` is production and the default. `localnet` is a local Surfpool mainnet fork, used only
 * by tests and burner-key rehearsals; it must be chosen explicitly and is refused in production.
 */
export type Cluster = "mainnet" | "localnet";

export interface Env {
  port: number;
  /** True when NODE_ENV=production. Enables the production guard in loadEnv. */
  production: boolean;
  /** The exact browser origin allowed to call mutating endpoints. Never taken from request headers. */
  appOrigin: string;
  /** Runtime connection. May be a pooled URL (then disable prepared statements). */
  databaseUrl: string;
  /** Direct connection used only for migrations. Falls back to databaseUrl. */
  databaseDirectUrl: string;
  /** Server-side only, and the upstream of POST /rpc, so a keyed provider URL is safe here. */
  solanaRpcUrl: string;
  cluster: Cluster;
  jupiterBaseUrl: string;
  /** Optional. Without a key Jupiter's keyless tier (0.5 req/s) applies. Server-side only. */
  jupiterApiKey: string | undefined;
  /**
   * Comma-separated Jupiter venue allowlist. Only meaningful on a Surfpool mainnet fork, where
   * oracle-based private AMMs fail on stale state (see docs/spikes/surfpool-jupiter.md).
   * Ignored on mainnet.
   */
  jupiterDexes: string | undefined;
  /** Labels fictional demo creators and allows demo-only behaviour. */
  demoMode: boolean;
}

/** Solana's public endpoint: fine for development, too rate-limited for production. */
export const PUBLIC_MAINNET_RPC = "https://api.mainnet-beta.solana.com";
const FORK_RPC = "http://127.0.0.1:8899";

function parseCluster(v: string | undefined): Cluster {
  if (v === undefined || v === "") return "mainnet";
  if (v === "mainnet" || v === "localnet") return v;
  throw new Error(`SOLANA_CLUSTER must be mainnet or localnet (got "${v}")`);
}

function parseOrigin(v: string): string {
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new Error(
      `APP_ORIGIN must be an origin like https://example.com (got "${v}")`,
    );
  }
  if (url.origin !== v)
    throw new Error(
      `APP_ORIGIN must be exactly an origin without path or trailing slash (got "${v}")`,
    );
  return v;
}

function parseRpcUrl(v: string): string {
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new Error(`SOLANA_RPC_URL must be an http(s) URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error(`SOLANA_RPC_URL must be an http(s) URL`);
  return v;
}

/** Throws with every missing or unsafe production setting at once, so a deploy fails in one go. */
function assertProduction(
  source: Record<string, string | undefined>,
  cluster: Cluster,
  rpcUrl: string,
  appOrigin: string,
): void {
  const problems: string[] = [];
  if (cluster !== "mainnet")
    problems.push("SOLANA_CLUSTER must be mainnet in production");
  if (!source.APP_ORIGIN) problems.push("APP_ORIGIN is required");
  else if (!appOrigin.startsWith("https://"))
    problems.push("APP_ORIGIN must use https");
  if (!source.DATABASE_URL) problems.push("DATABASE_URL is required");
  if (!source.SOLANA_RPC_URL) problems.push("SOLANA_RPC_URL is required");
  else if (new URL(rpcUrl).origin === new URL(PUBLIC_MAINNET_RPC).origin)
    problems.push(
      "SOLANA_RPC_URL must be a dedicated provider, not the public rate-limited endpoint",
    );
  if (source.DEMO_MODE === "true")
    problems.push("DEMO_MODE must be off in production");
  if (problems.length)
    throw new Error(`Production configuration:\n- ${problems.join("\n- ")}`);
}

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const production = source.NODE_ENV === "production";
  const cluster = parseCluster(source.SOLANA_CLUSTER);
  const databaseUrl =
    source.DATABASE_URL ??
    "postgres://relay:relay_local_only@127.0.0.1:5432/relay";
  const solanaRpcUrl = parseRpcUrl(
    source.SOLANA_RPC_URL ||
      (cluster === "localnet" ? FORK_RPC : PUBLIC_MAINNET_RPC),
  );
  const appOrigin = parseOrigin(source.APP_ORIGIN ?? "http://localhost:5173");
  if (production) assertProduction(source, cluster, solanaRpcUrl, appOrigin);
  return {
    port: Number(source.PORT ?? 3001),
    production,
    appOrigin,
    databaseUrl,
    databaseDirectUrl: source.DATABASE_DIRECT_URL || databaseUrl,
    solanaRpcUrl,
    cluster,
    jupiterBaseUrl: source.JUPITER_BASE_URL ?? "https://api.jup.ag",
    jupiterApiKey: source.JUPITER_API_KEY || undefined,
    jupiterDexes:
      cluster === "localnet" ? source.JUPITER_DEXES || undefined : undefined,
    demoMode: source.DEMO_MODE === "true",
  };
}
