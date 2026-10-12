import { useQuery } from "@tanstack/react-query";
import { fetchFeedPage, type PlanCardView } from "./api";
import { API_URL } from "../../lib/config";

/**
 * A wallet that has published plans through Relay. The server has no trader or source index yet,
 * so this is derived from the feed: the only identity it can support is the wallet that signed the
 * plans, plus the profile name Relay itself holds for that wallet (seeded demo creators are marked).
 */
export interface PlanCreatorView {
  address: string;
  handle: string | null;
  displayName: string | null;
  isDemo: boolean;
  /** Newest first. */
  plans: PlanCardView[];
  /** Unix seconds of the newest published version. */
  latestPublishedAt: number;
}

export interface PlanCreatorIndex {
  creators: PlanCreatorView[];
  /** True when the page limit stopped the walk before the feed ended. */
  truncated: boolean;
  nowMs: number;
}

const MAX_PAGES = 10;

export function groupCreators(
  items: readonly PlanCardView[],
): PlanCreatorView[] {
  const byAddress = new Map<string, PlanCreatorView>();
  for (const card of items) {
    const known = byAddress.get(card.creator.address);
    if (known) {
      known.plans.push(card);
      known.latestPublishedAt = Math.max(
        known.latestPublishedAt,
        card.version.publishedAt,
      );
    } else {
      byAddress.set(card.creator.address, {
        ...card.creator,
        plans: [card],
        latestPublishedAt: card.version.publishedAt,
      });
    }
  }
  const traders = [...byAddress.values()];
  for (const t of traders)
    t.plans.sort((a, b) => b.version.publishedAt - a.version.publishedAt);
  // Wallets with a real profile first, then seeded demo creators, then bare wallets; newest within each.
  const rank = (t: PlanCreatorView) =>
    t.isDemo ? 1 : t.displayName || t.handle ? 0 : 2;
  return traders.sort(
    (a, b) => rank(a) - rank(b) || b.latestPublishedAt - a.latestPublishedAt,
  );
}

export async function fetchCreatorIndex(
  base: string,
): Promise<PlanCreatorIndex> {
  const items: PlanCardView[] = [];
  let cursor: string | null = null;
  let nowMs = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const next = await fetchFeedPage(base, cursor);
    items.push(...next.items);
    nowMs = next.nowMs;
    cursor = next.nextCursor;
    if (!cursor) break;
  }
  return { creators: groupCreators(items), truncated: cursor !== null, nowMs };
}

export function useCreatorIndex() {
  return useQuery({
    queryKey: ["traders"],
    queryFn: () => fetchCreatorIndex(API_URL),
    staleTime: 30_000,
    retry: 1,
  });
}
