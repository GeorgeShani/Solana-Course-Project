/** RPC endpoint. Defaults to a local `solana-test-validator`. */
export const RPC_URL: string =
  import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8899'

/** Optional Hono support server (reminders, indexing). Never required. */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
