import { createSolanaRpc } from "@solana/kit";
import { RPC_URL } from "./config";

let rpc: ReturnType<typeof createSolanaRpc> | undefined;

/** Shared RPC client. Safe to call on the server and in the browser. */
export function getRpc() {
  rpc ??= createSolanaRpc(RPC_URL);
  return rpc;
}
