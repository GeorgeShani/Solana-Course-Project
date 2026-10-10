import { createServerFn } from "@tanstack/react-start";
import { ApiContractError, fetchFeedPage, type FeedPage } from "./api";

export type FeedLoad =
  | { ok: true; page: FeedPage; receivedAt: number }
  | { ok: false; kind: "unavailable" | "contract"; message: string; receivedAt: number };

/**
 * Fetches the first feed page during server render so the first paint is a real card. Talks to the
 * Hono server directly (INTERNAL_API_URL, server-only); the browser later uses the same-origin /api.
 * Never throws: an unreachable API becomes an explicit "unavailable" result.
 */
export const getFirstFeedPage = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeedLoad> => {
    const base = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:3001";
    try {
      const page = await fetchFeedPage(base, null, { signal: AbortSignal.timeout(4000) });
      return { ok: true, page, receivedAt: Date.now() };
    } catch (e) {
      return {
        ok: false,
        kind: e instanceof ApiContractError ? "contract" : "unavailable",
        message: e instanceof Error ? e.message : "Relay's service did not respond",
        receivedAt: Date.now(),
      };
    }
  },
);
