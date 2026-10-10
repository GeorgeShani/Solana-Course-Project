import { NETWORKS, parseNetwork, type Network } from "@relay/domain";

/**
 * Typed environment. Fails fast on values that would silently break security
 * (for example an APP_ORIGIN that is not an origin) or a deployment (a local test network, a
 * missing database).
 *
 * The network is ONE setting, `NETWORK`: devnet | localnet (see NETWORKS in @relay/domain). It
 * defaults to devnet. `SOLANA_CLUSTER` is an old name for the same setting and is still read when
 * `NETWORK` is absent.
 */
export type Cluster = Network;

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
  /**
   * Server-side only, and the upstream of POST /rpc, so a keyed provider URL is safe here.
   * Defaults to the network's public endpoint.
   */
  solanaRpcUrl: string;
  cluster: Cluster;
  jupiterBaseUrl: string;
  /** Optional. Without a key Jupiter's keyless tier (0.5 req/s) applies. Server-side only. */
  jupiterApiKey: string | undefined;
  /**
   * Comma-separated Jupiter venue allowlist. Only meaningful on a local test fork, where
   * oracle-based private AMMs fail on stale state (see docs/spikes/surfpool-jupiter.md).
   * Ignored elsewhere.
   */
  jupiterDexes: string | undefined;
  /** Labels fictional demo creators and allows demo-only behaviour. */
  demoMode: boolean;
}

function parseCluster(source: Record<string, string | undefined>): Cluster {
  const v = source.NETWORK || source.SOLANA_CLUSTER;
  if (v === undefined || v === "") return "devnet";
  const network = parseNetwork(v);
  if (!network)
    throw new Error(`NETWORK must be devnet or localnet (got "${v}")`);
  return network;
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
  appOrigin: string,
): void {
  const problems: string[] = [];
  if (cluster === "localnet")
    problems.push(
      "NETWORK must be devnet in production (localnet is a local test network)",
    );
  if (!source.APP_ORIGIN) problems.push("APP_ORIGIN is required");
  else if (!appOrigin.startsWith("https://"))
    problems.push("APP_ORIGIN must use https");
  if (!source.DATABASE_URL) problems.push("DATABASE_URL is required");
  if (source.DEMO_MODE === "true")
    problems.push("DEMO_MODE must be off in production");
  if (problems.length)
    throw new Error(`Production configuration:\n- ${problems.join("\n- ")}`);
}

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const production = source.NODE_ENV === "production";
  const cluster = parseCluster(source);
  const databaseUrl =
    source.DATABASE_URL ??
    "postgres://relay:relay_local_only@127.0.0.1:5432/relay";
  const solanaRpcUrl = parseRpcUrl(
    source.SOLANA_RPC_URL || NETWORKS[cluster].defaultRpcUrl,
  );
  const appOrigin = parseOrigin(source.APP_ORIGIN || "http://localhost:5173");
  if (production) assertProduction(source, cluster, appOrigin);
  return {
    port: Number(source.PORT ?? 3001),
    production,
    appOrigin,
    databaseUrl,
    databaseDirectUrl: source.DATABASE_DIRECT_URL || databaseUrl,
    solanaRpcUrl,
    cluster,
    jupiterBaseUrl: source.JUPITER_BASE_URL || "https://api.jup.ag",
    jupiterApiKey: source.JUPITER_API_KEY || undefined,
    jupiterDexes:
      cluster === "localnet" ? source.JUPITER_DEXES || undefined : undefined,
    demoMode: source.DEMO_MODE === "true",
  };
}
