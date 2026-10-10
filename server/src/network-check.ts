import { NETWORKS, type Network } from "@relay/domain";
import { isRecord } from "./util";

/** The part of `fetch` this check needs, so a test can pass a plain function. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

/**
 * Refuses to start when the RPC is on a different Solana network than NETWORK says. Relay runs on
 * devnet, where tokens have no value; pasting any other network's RPC URL into SOLANA_RPC_URL
 * would point it at real funds. A local test validator is not checked (it has no fixed identity).
 *
 * Returns "unchecked" when the RPC cannot be reached or the network is a fork. The server still
 * starts (readiness reports the RPC); only a definite mismatch throws.
 */
export async function assertRpcMatchesNetwork(
  rpcUrl: string,
  network: Network,
  fetchImpl: FetchLike = defaultFetch,
): Promise<"verified" | "unchecked"> {
  const expected = NETWORKS[network].genesisHash;
  if (expected === null) return "unchecked";
  let actual: unknown;
  try {
    const res = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getGenesisHash",
      }),
      signal: AbortSignal.timeout(5000),
    });
    const body: unknown = await res.json();
    actual = isRecord(body) ? body.result : undefined;
  } catch {
    return "unchecked";
  }
  if (typeof actual !== "string") return "unchecked";
  if (actual !== expected) {
    throw new Error(
      `SOLANA_RPC_URL is not a ${network} RPC. Relay only runs on devnet: ` +
        `use https://api.devnet.solana.com or a devnet URL from your provider in .env.`,
    );
  }
  return "verified";
}
