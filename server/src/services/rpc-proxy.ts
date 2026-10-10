import { ApiError } from "../middleware";
import { isRecord } from "../util";

/**
 * The JSON-RPC methods the browser may call through POST /rpc. Everything the app needs to read
 * state, simulate, send a wallet-signed transaction and confirm it; nothing that scans the chain
 * (getProgramAccounts, getSignaturesForAddress) or costs the provider much per call.
 */
export const RPC_METHODS: ReadonlySet<string> = new Set([
  "getAccountInfo",
  "getBalance",
  "getBlockHeight",
  "getEpochInfo",
  "getFeeForMessage",
  "getGenesisHash",
  "getHealth",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getSignatureStatuses",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getVersion",
  "isBlockhashValid",
  "sendTransaction",
  "simulateTransaction",
]);

export interface RpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown[];
}

/** Validates one JSON-RPC request (batches are not accepted) and keeps only the standard fields. */
export function parseRpcRequest(body: unknown): RpcRequest {
  if (!isRecord(body))
    throw new ApiError(400, "invalid_rpc", "Send one JSON-RPC request");
  const { jsonrpc, id, method, params } = body;
  if (jsonrpc !== "2.0")
    throw new ApiError(400, "invalid_rpc", 'jsonrpc must be "2.0"');
  if (typeof id !== "string" && typeof id !== "number")
    throw new ApiError(400, "invalid_rpc", "id must be a string or number");
  if (typeof method !== "string" || !RPC_METHODS.has(method))
    throw new ApiError(
      403,
      "rpc_method_not_allowed",
      "This RPC method is not available through Relay",
    );
  if (params !== undefined && !Array.isArray(params))
    throw new ApiError(400, "invalid_rpc", "params must be an array");
  return params === undefined
    ? { jsonrpc, id, method }
    : { jsonrpc, id, method, params };
}

/** Sends one validated request upstream and returns the provider's JSON body and status. */
export type RpcForward = (
  request: RpcRequest,
) => Promise<{ status: number; body: string }>;

export function createRpcForward(
  upstreamUrl: string,
  fetchImpl: typeof fetch = fetch,
): RpcForward {
  return async (request) => {
    let res: Response;
    try {
      res = await fetchImpl(upstreamUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ApiError(502, "rpc_unavailable", "Solana RPC did not respond");
    }
    // Upstream 5xx and rate limits are reported as ours to give, never with the provider's URL.
    if (res.status === 429)
      throw new ApiError(
        429,
        "rate_limited",
        "Too many requests. Try again in a moment.",
      );
    if (res.status >= 500)
      throw new ApiError(502, "rpc_unavailable", "Solana RPC failed");
    return { status: res.status, body: await res.text() };
  };
}
