/**
 * Typed environment. Fails fast on values that would silently break security
 * (for example an APP_ORIGIN that is not an origin).
 */
export type Cluster = "localnet" | "devnet" | "mainnet";

export interface Env {
  port: number;
  /** The exact browser origin allowed to call mutating endpoints. Never taken from request headers. */
  appOrigin: string;
  /** Runtime connection. May be a pooled URL (then disable prepared statements). */
  databaseUrl: string;
  /** Direct connection used only for migrations. Falls back to databaseUrl. */
  databaseDirectUrl: string;
  solanaRpcUrl: string;
  cluster: Cluster;
  jupiterBaseUrl: string;
  /** Optional. Without a key Jupiter's keyless tier (0.5 req/s) applies. Server-side only. */
  jupiterApiKey: string | undefined;
  /**
   * Comma-separated Jupiter venue allowlist. Only meaningful on a Surfpool mainnet fork, where
   * oracle-based private AMMs fail on stale state (see docs/spikes/surfpool-jupiter.md).
   * Ignored on devnet/mainnet.
   */
  jupiterDexes: string | undefined;
  /** Labels fictional demo creators and allows demo-only behaviour. */
  demoMode: boolean;
}

function parseCluster(v: string | undefined): Cluster {
  if (v === undefined || v === "") return "localnet";
  if (v === "localnet" || v === "devnet" || v === "mainnet") return v;
  throw new Error(
    `SOLANA_CLUSTER must be localnet, devnet or mainnet (got "${v}")`,
  );
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

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const cluster = parseCluster(source.SOLANA_CLUSTER);
  const databaseUrl =
    source.DATABASE_URL ??
    "postgres://relay:relay_local_only@127.0.0.1:5432/relay";
  return {
    port: Number(source.PORT ?? 3001),
    appOrigin: parseOrigin(source.APP_ORIGIN ?? "http://localhost:5173"),
    databaseUrl,
    databaseDirectUrl: source.DATABASE_DIRECT_URL || databaseUrl,
    solanaRpcUrl: source.SOLANA_RPC_URL ?? "http://127.0.0.1:8899",
    cluster,
    jupiterBaseUrl: source.JUPITER_BASE_URL ?? "https://api.jup.ag",
    jupiterApiKey: source.JUPITER_API_KEY || undefined,
    jupiterDexes:
      cluster === "localnet" ? source.JUPITER_DEXES || undefined : undefined,
    demoMode: source.DEMO_MODE === "true",
  };
}
