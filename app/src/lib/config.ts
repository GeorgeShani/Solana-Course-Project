/**
 * The Hono server, reached through the same origin (Vite proxy in dev, Caddy in production). The
 * feed needs it; when it is down the app shows a service-unavailable state.
 */
export const API_URL: string = import.meta.env.VITE_API_URL || "/api";

/**
 * Browser RPC endpoint. By default Relay's own proxy (`POST /api/rpc`), which forwards an
 * allowlisted set of methods to the server's provider, so a keyed RPC URL never ships in the
 * bundle. `VITE_RPC_URL` overrides it, for example `http://127.0.0.1:8899` for the local fork.
 */
// `||`, not `??`: a Docker build arg that is declared but not given arrives as "".
export const RPC_URL: string = import.meta.env.VITE_RPC_URL || `${API_URL}/rpc`;

/**
 * `mainnet` is production and the default. `localnet` is a local Surfpool mainnet fork for tests
 * and rehearsals; it must be chosen explicitly. Must match the server's SOLANA_CLUSTER.
 */
export type Cluster = "mainnet" | "localnet";

export function parseCluster(v: string | undefined): Cluster {
  return v === "localnet" ? "localnet" : "mainnet";
}

export const CLUSTER: Cluster = parseCluster(
  import.meta.env.VITE_SOLANA_CLUSTER,
);

export const CLUSTER_LABEL: Record<Cluster, string> = {
  mainnet: "Mainnet",
  localnet: "Local fork",
};
