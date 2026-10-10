import type { Env } from "../env";
import { safeMessage, silentLogger, type Logger } from "../logger";
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

/** The part of `fetch` the client needs, so a test can pass a plain function. */
export type RouteFetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Jupiter Swap API v2 `GET /swap/v2/build`: individual instructions we can compose into our own
 * transaction. The key stays on the server. Only the first venue allowlist applies on a fork.
 *
 * Failures reach the follower as one of a few plain codes, never with Jupiter's own text and never
 * with a URL (the key travels in a header, but a URL can still name internal hosts):
 *   - 422 `no_route`            Jupiter has no route for this amount;
 *   - 429 `rate_limited`        Jupiter's rate limit (or ours); try again in a moment;
 *   - 502 `route_unavailable`   unreachable, timed out, 5xx, or our key was rejected (logged, not shown).
 */
export function createJupiterClient(
  env: Pick<
    Env,
    "jupiterBaseUrl" | "jupiterApiKey" | "jupiterDexes" | "cluster"
  >,
  options: { fetch?: RouteFetch; logger?: Logger } = {},
): JupiterClient {
  const doFetch: RouteFetch =
    options.fetch ?? ((url, init) => fetch(url, init));
  const logger = options.logger ?? silentLogger;
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
        res = await doFetch(`${env.jupiterBaseUrl}/swap/v2/build?${query}`, {
          headers,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (e) {
        logger.warn("route_request_failed", { error: safeMessage(e) });
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
      if (res.status === 429) {
        logger.warn("route_rate_limited", {
          retryAfter: res.headers.get("retry-after"),
        });
        throw new ApiError(
          429,
          "rate_limited",
          "The swap router is busy. Try again in a moment.",
        );
      }
      if (res.status === 401 || res.status === 403) {
        // Our key is wrong or revoked: the operator must fix it, the follower cannot.
        logger.error("route_key_rejected", { status: res.status });
        throw new ApiError(
          502,
          "route_unavailable",
          "The swap router is unavailable",
        );
      }
      if (!res.ok) {
        logger.warn("route_request_failed", { status: res.status });
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
