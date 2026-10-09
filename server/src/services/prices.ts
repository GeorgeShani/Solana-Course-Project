import { usdPriceToUnits, type Pair, type ReferencePrice } from "@relay/domain";
import type { Db } from "../db";
import type { Env } from "../env";
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

/**
 * Advisory reference prices from Jupiter Price API v3 (USD per token). The quote token is USDC,
 * assumed to be $1 for display; this is documented and never enforced onchain.
 * Cached per mint with in-flight de-duplication so the keyless 0.5 req/s tier is respected.
 * On failure the last good price is returned unchanged: its old `observedAtMs` makes it go stale
 * in the UI instead of looking fresh.
 */
export function createJupiterPrices(
  env: Pick<Env, "jupiterBaseUrl" | "jupiterApiKey">,
  db?: Db,
): PriceSource {
  const cache = new Map<string, { price: ReferencePrice; fetchedAt: number }>();
  const inflight = new Map<string, Promise<void>>();
  const lastObserved = new Map<string, number>();

  async function refresh(pair: Pair): Promise<void> {
    const mint = pair.base.mint;
    const headers: Record<string, string> = {};
    if (env.jupiterApiKey) headers["x-api-key"] = env.jupiterApiKey;
    const res = await fetch(`${env.jupiterBaseUrl}/price/v3?ids=${mint}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Jupiter price HTTP ${res.status}`);
    const body: unknown = await res.json();
    const usd = readUsdPrice(body, mint);
    if (usd === undefined) throw new Error("Jupiter price missing");
    const units = usdPriceToUnits(usd, pair.quote.decimals);
    const now = Date.now();
    cache.set(mint, { price: { units, observedAtMs: now }, fetchedAt: now });
    if (db && now - (lastObserved.get(mint) ?? 0) >= OBSERVATION_EVERY_MS) {
      lastObserved.set(mint, now);
      await db`insert into price_observations (mint, price_units, source) values (${mint}, ${units.toString()}, 'jupiter-price-v3')`;
    }
  }

  return {
    async get(pair) {
      const mint = pair.base.mint;
      const hit = cache.get(mint);
      if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit.price;
      let p = inflight.get(mint);
      if (!p) {
        p = refresh(pair)
          .catch(() => undefined) // keep serving the last good price; it will read as stale
          .finally(() => inflight.delete(mint));
        inflight.set(mint, p);
      }
      await p;
      return cache.get(mint)?.price ?? null;
    },
  };
}
