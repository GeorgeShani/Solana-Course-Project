/** RPC endpoint. Defaults to a local Surfpool fork (or `solana-test-validator`) on :8899. */
export const RPC_URL: string =
  import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8899";

/**
 * The Hono server, reached through the same origin (Vite proxy in dev, Caddy in production). The
 * feed needs it; when it is down the app shows a service-unavailable state.
 */
export const API_URL: string = import.meta.env.VITE_API_URL ?? "/api";

export type Cluster = "localnet" | "devnet" | "mainnet";

function parseCluster(v: string | undefined): Cluster {
  return v === "devnet" || v === "mainnet" ? v : "localnet";
}

/** Must match the server's SOLANA_CLUSTER. `localnet` means a local Surfpool mainnet fork. */
export const CLUSTER: Cluster = parseCluster(import.meta.env.VITE_SOLANA_CLUSTER);

export const CLUSTER_LABEL: Record<Cluster, string> = {
  localnet: "Local fork",
  devnet: "Devnet",
  mainnet: "Mainnet",
};
