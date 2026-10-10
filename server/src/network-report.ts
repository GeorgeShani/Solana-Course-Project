import { NETWORKS, SUPPORTED_PAIRS } from "@relay/domain";
import {
  RELAY_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "@relay/domain/solana";
import type { Env } from "./env";
import { safeMessage } from "./logger";
import type { FetchLike } from "./network-check";
import { isRecord } from "./util";

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init);
const TIMEOUT_MS = 8_000;

/** One JSON-RPC call. Returns the `result`, or throws with a message that holds no URL. */
async function rpcCall(
  fetchImpl: FetchLike,
  url: string,
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 429) throw new Error("rate limited by the RPC provider");
  if (!res.ok) throw new Error(`RPC answered HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (!isRecord(body))
    throw new Error("RPC answered with something unexpected");
  if (body.error !== undefined && body.error !== null)
    throw new Error(
      isRecord(body.error) && typeof body.error.message === "string"
        ? body.error.message
        : "RPC returned an error",
    );
  return body.result;
}

/** `{ value: { owner, executable, data: { parsed: { info: { decimals } } } } | null }`, narrowed. */
function readAccount(result: unknown): null | {
  owner: string;
  executable: boolean;
  decimals: number | null;
} {
  if (!isRecord(result)) throw new Error("account answer is malformed");
  const value = result.value;
  if (value === null) return null;
  if (!isRecord(value) || typeof value.owner !== "string")
    throw new Error("account answer is malformed");
  let decimals: number | null = null;
  const data = value.data;
  if (isRecord(data) && isRecord(data.parsed) && isRecord(data.parsed.info)) {
    const d = data.parsed.info.decimals;
    if (typeof d === "number") decimals = d;
  }
  return {
    owner: value.owner,
    executable: value.executable === true,
    decimals,
  };
}

/**
 * A read-only report on the configured network: is the RPC the right one, is the Relay program
 * deployed, do the supported tokens exist, is the price source reachable. It signs nothing, sends
 * nothing and holds no key, and no result ever contains the RPC URL (provider keys live in URLs).
 */
export async function runNetworkReport(
  env: Env,
  fetchImpl: FetchLike = defaultFetch,
): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const network = NETWORKS[env.cluster];
  const add = (name: string, status: CheckStatus, detail: string) =>
    out.push({ name, status, detail });

  add(
    "network setting",
    env.cluster === "devnet" ? "pass" : "warn",
    env.cluster === "devnet"
      ? "NETWORK=devnet (test tokens, no value)"
      : "NETWORK=localnet is for automated tests on this machine, not for a deployment",
  );

  // 1. Can we talk to the RPC at all?
  let slot: unknown;
  try {
    slot = await rpcCall(fetchImpl, env.solanaRpcUrl, "getSlot", [
      { commitment: "confirmed" },
    ]);
    add("RPC reachable", "pass", `current slot ${String(slot)}`);
  } catch (e) {
    add("RPC reachable", "fail", safeMessage(e));
    return out; // nothing else can be read
  }

  // 2. Is it the network we think it is?
  if (network.genesisHash === null) {
    add(
      "RPC network",
      "warn",
      "a local network has no fixed identity to check",
    );
  } else {
    try {
      const genesis = await rpcCall(
        fetchImpl,
        env.solanaRpcUrl,
        "getGenesisHash",
      );
      add(
        "RPC network",
        genesis === network.genesisHash ? "pass" : "fail",
        genesis === network.genesisHash
          ? `genesis hash matches ${network.label}`
          : `this RPC is NOT ${network.label}. Use a ${network.label} URL in .env`,
      );
    } catch (e) {
      add("RPC network", "fail", safeMessage(e));
    }
  }

  // 3. Is the Relay program there? (The owner deploys it with their own key.)
  try {
    const result = await rpcCall(
      fetchImpl,
      env.solanaRpcUrl,
      "getAccountInfo",
      [
        RELAY_PROGRAM_ADDRESS,
        { encoding: "base64", dataSlice: { offset: 0, length: 0 } },
      ],
    );
    const account = readAccount(result);
    if (account === null)
      add(
        "Relay program",
        "warn",
        `not deployed on ${network.label} at ${RELAY_PROGRAM_ADDRESS}. The owner deploys it (docs/DEVNET_RELEASE.md)`,
      );
    else
      add(
        "Relay program",
        account.executable ? "pass" : "fail",
        account.executable
          ? `deployed at ${RELAY_PROGRAM_ADDRESS}`
          : `${RELAY_PROGRAM_ADDRESS} exists but is not a program`,
      );
  } catch (e) {
    add("Relay program", "fail", safeMessage(e));
  }

  // 4. Do the supported tokens exist here, with the decimals the program expects?
  const mints = new Map<string, { symbol: string; decimals: number }>();
  for (const pair of SUPPORTED_PAIRS) {
    mints.set(pair.base.mint, pair.base);
    mints.set(pair.quote.mint, pair.quote);
  }
  for (const [mint, asset] of mints) {
    const name = `token ${asset.symbol}`;
    try {
      const result = await rpcCall(
        fetchImpl,
        env.solanaRpcUrl,
        "getAccountInfo",
        [mint, { encoding: "jsonParsed" }],
      );
      const account = readAccount(result);
      if (account === null)
        add(name, "warn", `mint ${mint} does not exist on ${network.label}`);
      else if (account.owner !== TOKEN_PROGRAM_ADDRESS)
        add(name, "fail", `mint ${mint} is not an SPL Token (classic) mint`);
      else if (account.decimals !== asset.decimals)
        add(
          name,
          "fail",
          `mint ${mint} has ${String(account.decimals)} decimals, expected ${asset.decimals}`,
        );
      else add(name, "pass", `mint ${mint} (${asset.decimals} decimals)`);
    } catch (e) {
      add(name, "fail", safeMessage(e));
    }
  }

  // 5. Swaps and prices.
  add(
    "swap venue",
    network.swapsAvailable ? "pass" : "warn",
    network.swapsAvailable
      ? "available on this network"
      : `none on ${network.label} yet: plans can be read but not followed`,
  );
  try {
    const headers: Record<string, string> = {};
    if (env.jupiterApiKey) headers["x-api-key"] = env.jupiterApiKey;
    const res = await fetchImpl(
      `${env.jupiterBaseUrl}/price/v3?ids=${SUPPORTED_PAIRS[0]?.base.mint ?? ""}`,
      { headers, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    add(
      "reference price (Jupiter)",
      res.ok ? "pass" : "warn",
      res.ok
        ? "reachable (reference only: devnet tokens have no value)"
        : res.status === 429
          ? "rate limited. Set JUPITER_API_KEY (free) in .env"
          : `answered HTTP ${res.status}`,
    );
  } catch (e) {
    add("reference price (Jupiter)", "warn", safeMessage(e));
  }

  // 6. Feed policy.
  add(
    "feed policy",
    env.creatorAllowlist.length > 0 ? "pass" : "warn",
    env.creatorAllowlist.length > 0
      ? `${env.creatorAllowlist.length} creator wallet(s) listed; other plans are unlisted`
      : "CREATOR_ALLOWLIST is empty: every plan on the program is listed, including spam",
  );

  return out;
}

/** True when nothing failed (warnings are allowed). */
export function reportOk(results: readonly CheckResult[]): boolean {
  return results.every((r) => r.status !== "fail");
}
