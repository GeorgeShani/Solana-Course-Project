import { NETWORKS } from "@relay/domain";
import { createSolanaRpc } from "@solana/kit";
import { CLUSTER, RPC_URL } from "./config";

let rpc: ReturnType<typeof createSolanaRpc> | undefined;

/**
 * Where this runtime reaches Solana. In the browser: RPC_URL (Relay's same-origin proxy by default).
 * During server render: the provider directly through the server-only SOLANA_RPC_URL, because the
 * proxy only accepts requests carrying the app's Origin.
 */
export function rpcUrlForRuntime(): string {
  if (typeof window !== "undefined") {
    return new URL(RPC_URL, window.location.origin).toString();
  }
  return process.env.SOLANA_RPC_URL || NETWORKS[CLUSTER].defaultRpcUrl;
}

/** Shared RPC client. Safe to call on the server and in the browser. */
export function getRpc() {
  rpc ??= createSolanaRpc(rpcUrlForRuntime());
  return rpc;
}
