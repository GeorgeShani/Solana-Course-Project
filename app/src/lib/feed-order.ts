import type { FeedPage, PlanCardView } from "./api";

/**
 * What the reader sees, in order. Once shown, order is fixed: refreshed data updates cards in
 * place, cards that drop out of a refresh stay visible from `seen`, later pages append, and
 * newcomers wait in `pending` instead of being inserted above the reader's position.
 */
export interface FeedOrder {
  pages: FeedPage[];
  order: string[];
  pending: string[];
  seen: Map<string, PlanCardView>;
  /** Pages already folded into `order`. */
  knownPages: number;
}

function ranked(pages: FeedPage[]): { ids: string[]; byId: Map<string, PlanCardView> } {
  const byId = new Map<string, PlanCardView>();
  const ids: string[] = [];
  for (const page of pages)
    for (const c of page.items) {
      if (!byId.has(c.planPda)) ids.push(c.planPda);
      byId.set(c.planPda, c);
    }
  return { ids, byId };
}

export function initialOrder(pages: FeedPage[]): FeedOrder {
  const { ids, byId } = ranked(pages);
  return { pages, order: ids, pending: [], seen: byId, knownPages: pages.length };
}

export function reconcileOrder(prev: FeedOrder, pages: FeedPage[]): FeedOrder {
  const { ids, byId } = ranked(pages);
  const seen = new Map(prev.seen);
  for (const [id, c] of byId) seen.set(id, c);

  if (prev.order.length === 0) return { pages, order: ids, pending: [], seen, knownPages: pages.length };

  const shown = new Set(prev.order);
  const order = [...prev.order];
  for (const page of pages.slice(prev.knownPages))
    for (const c of page.items)
      if (!shown.has(c.planPda)) {
        shown.add(c.planPda);
        order.push(c.planPda);
      }

  const pending = ids.filter((id) => !shown.has(id));
  return { pages, order, pending, seen, knownPages: Math.max(prev.knownPages, pages.length) };
}

/** The reader asked for the newest lineup: adopt the current ranking and clear the pill. */
export function showNewest(prev: FeedOrder): FeedOrder {
  return { ...initialOrder(prev.pages), seen: prev.seen };
}

export function visibleCards(view: FeedOrder): PlanCardView[] {
  return view.order.map((id) => view.seen.get(id)).filter((c): c is PlanCardView => c !== undefined);
}
