/** RPC endpoint. Defaults to a local `solana-test-validator`. */
export const RPC_URL: string =
  import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8899";

/** The Hono server, reached through the same origin (Vite proxy in dev, Caddy in production). */
export const API_URL: string = import.meta.env.VITE_API_URL ?? "/api";
