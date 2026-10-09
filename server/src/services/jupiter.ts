import type { Env } from "../env";
import { ApiError } from "../middleware";

export interface BuildParams {
  inputMint: string;
  outputMint: string;
  /** Atomic units of the input token, as a decimal string. */
  amount: string;
  taker: string;
  destinationTokenAccount: string;
  maxAccounts: number;
}

/** Fetches a route as raw instructions. Tests inject a fake. */
export interface JupiterClient {
  /** The raw, untrusted response body. Parse it with parseJupiterBuild. */
  build(params: BuildParams): Promise<unknown>;
}

const TIMEOUT_MS = 8_000;

/**
 * Jupiter Swap API v2 `GET /swap/v2/build`: individual instructions we can compose into our own
 * transaction. The key stays on the server. Only the first venue allowlist applies on a fork.
 */
export function createJupiterClient(
  env: Pick<
    Env,
    "jupiterBaseUrl" | "jupiterApiKey" | "jupiterDexes" | "cluster"
  >,
): JupiterClient {
  return {
    async build(p) {
      const query = new URLSearchParams({
        inputMint: p.inputMint,
        outputMint: p.outputMint,
        amount: p.amount,
        taker: p.taker,
        // Fork liquidity is stale, so allow a wider slippage there.
        slippageBps: env.cluster === "localnet" ? "100" : "50",
        maxAccounts: String(p.maxAccounts),
        transactionVersion: "0",
        // The output must land in the follower's own wSOL token account, never as native SOL.
        wrapAndUnwrapSol: "false",
        destinationTokenAccount: p.destinationTokenAccount,
      });
      if (env.jupiterDexes) query.set("dexes", env.jupiterDexes);

      const headers: Record<string, string> = {};
      if (env.jupiterApiKey) headers["x-api-key"] = env.jupiterApiKey;

      let res: Response;
      try {
        res = await fetch(`${env.jupiterBaseUrl}/swap/v2/build?${query}`, {
          headers,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new ApiError(
          502,
          "route_unavailable",
          "Could not reach the swap router",
        );
      }
      const body: unknown = await res.json().catch(() => null);
      if (res.status === 400) {
        throw new ApiError(
          422,
          "no_route",
          "No route was found for this amount",
        );
      }
      if (!res.ok) {
        throw new ApiError(
          502,
          "route_unavailable",
          "The swap router is unavailable",
        );
      }
      return body;
    },
  };
}
