const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * Stops a script that signs with throwaway keys, funds accounts through cheatcodes or publishes
 * demo plans from ever running against a real cluster. A Surfpool fork reports mainnet's genesis
 * hash, so the only reliable signal is that the RPC is on this machine.
 */
export function assertLocalFork(rpcUrl: string, script: string): void {
  let host = "";
  try {
    host = new URL(rpcUrl).hostname;
  } catch {
    // fall through to the error below
  }
  if (!LOOPBACK.has(host)) {
    throw new Error(
      `${script} only runs against a local Surfpool fork (RPC on 127.0.0.1). Refusing ${host || "an invalid RPC URL"}: it signs with throwaway keys and must never touch mainnet.`,
    );
  }
}
