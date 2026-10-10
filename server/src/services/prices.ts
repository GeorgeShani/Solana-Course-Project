import { usdPriceToUnits, type Pair, type ReferencePrice } from "@relay/domain";
import type { Db } from "../db";
import type { Env } from "../env";
import { safeMessage, silentLogger, type Logger } from "../logger";
import { isRecord } from "../util";
import type { PriceSource } from "./types";

/** Reads `{ [mint]: { usdPrice } }` from an unknown Jupiter Price v3 response. */
function readUsdPrice(body: unknown, mint: string): number | undefined {
  if (!isRecord(body)) return undefined;
  const entry = body[mint];
  if (!isRecord(entry)) return undefined;
  return typeof entry.usdPrice === "number" ? entry.usdPrice : undefined;
}

const TTL_MS = 10_000;
const TIMEOUT_MS = 6_000;
const OBSERVATION_EVERY_MS = 60_000;
/** After a failure, wait this long before asking again; it doubles up to the cap. */
export const BACKOFF_START_MS = 2_000;
export const BACKOFF_CAP_MS = 60_000;

/** A failed price request. Carries the provider's own retry hint when it sent one. */
class PriceFetchError extends Error {
  readonly retryAfterMs: number | null;
  constructor(message: string, retryAfterMs: number | null = null) {
    super(message);
    this.name = "PriceFetchError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** `Retry-After` in seconds (the form Jupiter uses), capped so one header cannot park us for long. */
function retryAfterMs(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, BACKOFF_CAP_MS);
}

/** The part of `fetch` the price source needs, so a test can pass a plain function. */
export type PriceFetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Advisory reference prices from Jupiter Price API v3 (USD per token). The quote token is USDC,
 * assumed to be $1 for display; this is documented and never enforced onchain.
 *
 * Cached per mint with in-flight de-duplication so the keyless 0.5 req/s tier is respected. When
 * Jupiter fails or rate-limits (HTTP 429), the source stops asking for a growing interval (or the
 * `Retry-After` it was given) instead of retrying on every request, and serves the last good price
 * unchanged: its old `observedAtMs` makes it go stale in the UI instead of looking fresh.
 */
export function createJupiterPrices(
  env: Pick<Env, "jupiterBaseUrl" | "jupiterApiKey">,
  db?: Db,
  options: { fetch?: PriceFetch; logger?: Logger; now?: () => number } = {},
): PriceSource {
  const doFetch: PriceFetch =
    options.fetch ?? ((url, init) => fetch(url, init));
  const logger = options.logger ?? silentLogger;
  const clock = options.now ?? Date.now;
  const cache = new Map<string, { price: ReferencePrice; fetchedAt: number }>();
  const inflight = new Map<string, Promise<void>>();
  const lastObserved = new Map<string, number>();
  let failures = 0;
  let retryNotBefore = 0;

  async function refresh(pair: Pair): Promise<void> {
    const mint = pair.base.mint;
    const headers: Record<string, string> = {};
    if (env.jupiterApiKey) headers["x-api-key"] = env.jupiterApiKey;
    const res = await doFetch(`${env.jupiterBaseUrl}/price/v3?ids=${mint}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429)
      throw new PriceFetchError(
        "Jupiter price rate limit",
        retryAfterMs(res.headers.get("retry-after")),
      );
    if (!res.ok) throw new PriceFetchError(`Jupiter price HTTP ${res.status}`);
    const body: unknown = await res.json();
    const usd = readUsdPrice(body, mint);
    if (usd === undefined) throw new PriceFetchError("Jupiter price missing");
    const units = usdPriceToUnits(usd, pair.quote.decimals);
    const now = clock();
    cache.set(mint, { price: { units, observedAtMs: now }, fetchedAt: now });
    if (failures > 0) {
      logger.info("price_source_recovered", { afterFailures: failures });
      failures = 0;
      retryNotBefore = 0;
    }
    if (db && now - (lastObserved.get(mint) ?? 0) >= OBSERVATION_EVERY_MS) {
      lastObserved.set(mint, now);
      // The observation is a record for later; losing one must not discard a good price.
      await db`insert into price_observations (mint, price_units, source) values (${mint}, ${units.toString()}, 'jupiter-price-v3')`.catch(
        (e: unknown) =>
          logger.warn("price_observation_not_saved", {
            error: safeMessage(e),
          }),
      );
    }
  }

  function noteFailure(error: unknown): void {
    failures++;
    const own = Math.min(
      BACKOFF_START_MS * 2 ** Math.min(failures - 1, 10),
      BACKOFF_CAP_MS,
    );
    const hinted = error instanceof PriceFetchError ? error.retryAfterMs : null;
    const wait = hinted === null ? own : Math.max(own, hinted);
    retryNotBefore = clock() + wait;
    // One line per failure streak step, not per request: the log shows the backoff, not a flood.
    logger.warn("price_source_failed", {
      error: safeMessage(error),
      failures,
      retryInMs: wait,
    });
  }

  return {
    async get(pair) {
      const mint = pair.base.mint;
      const hit = cache.get(mint);
      const now = clock();
      if (hit && now - hit.fetchedAt < TTL_MS) return hit.price;
      // Backing off: serve what we have (it reads as stale) and do not ask Jupiter again yet.
      if (now < retryNotBefore) return hit?.price ?? null;
      let p = inflight.get(mint);
      if (!p) {
        p = refresh(pair)
          .catch(noteFailure)
          .finally(() => inflight.delete(mint));
        inflight.set(mint, p);
      }
      await p;
      return cache.get(mint)?.price ?? null;
    },
  };
}
