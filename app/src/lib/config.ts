import { NETWORKS, parseNetwork, type Network } from "@relay/domain";

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

export type Cluster = Network;

/** The same `NETWORK` setting the server reads; anything unrecognised means devnet (no real money). */
export function parseCluster(v: string | undefined): Cluster {
  return parseNetwork(v) ?? "devnet";
}

/** Set from `NETWORK` in the root `.env` (see vite.config.ts). Must equal the server's. */
export const CLUSTER: Cluster = parseCluster(import.meta.env.NETWORK);

export const NETWORK_INFO = NETWORKS[CLUSTER];

export const CLUSTER_LABEL: Record<Cluster, string> = {
  devnet: NETWORKS.devnet.label,
  localnet: NETWORKS.localnet.label,
};
