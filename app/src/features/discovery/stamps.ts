import { createBrowserStore } from "../../lib/storage/browser-store";

/**
 * The stamp book: a small game on top of the real evidence workflow. A ticket (an idea or a
 * detected post) can collect three stamps, one for each real thing the reader did with it:
 * looked at it, opened its source, watched it. Stamps count the reader's own actions and nothing
 * else: no streak, no timer, no ranking, no link to any outcome. Kept in this browser only.
 */
export type Stamp = "seen" | "sourced" | "watched";
export const STAMPS: readonly Stamp[] = ["seen", "sourced", "watched"];

export type Book = Readonly<Record<string, readonly Stamp[]>>;

export const STAMP_KEY = "relay:stamps:v1";
const EMPTY: Book = {};
const KEY = /^[a-z0-9:_-]{1,80}$/;

export function parseBook(raw: string | null): Book {
  if (!raw) return EMPTY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (typeof parsed !== "object" || parsed === null) return EMPTY;
  if (Reflect.get(parsed, "v") !== 1) return EMPTY;
  const tickets: unknown = Reflect.get(parsed, "tickets");
  if (typeof tickets !== "object" || tickets === null) return EMPTY;
  const out: Record<string, Stamp[]> = {};
  for (const [key, value] of Object.entries(tickets)) {
    if (!KEY.test(key) || !Array.isArray(value)) continue;
    const got = STAMPS.filter((s) => value.includes(s));
    if (got.length > 0) out[key] = got;
    if (Object.keys(out).length >= 400) break;
  }
  return out;
}

const store = createBrowserStore<Book>({
  key: STAMP_KEY,
  empty: EMPTY,
  parse: parseBook,
  serialize: (book) => JSON.stringify({ v: 1, tickets: book }),
});

export const useStamps = store.use;

/** Adds a stamp. True only when it is new (so the game can celebrate it once). */
export function addStamp(ticket: string, stamp: Stamp): boolean {
  if (!KEY.test(ticket)) return false;
  const book = store.read();
  const have = book[ticket] ?? [];
  if (have.includes(stamp)) return false;
  return store.write({ ...book, [ticket]: [...have, stamp] });
}

export function stampsOf(book: Book, ticket: string): readonly Stamp[] {
  return book[ticket] ?? [];
}

export function totalStamps(book: Book): number {
  return Object.values(book).reduce((n, s) => n + s.length, 0);
}

export interface Level {
  name: "Usher" | "Critic" | "Regular";
  /** Stamps still needed for the next level; null at the top. */
  toNext: number | null;
}

/** A playful title for how much of the evidence workflow the reader has actually done. */
export function levelOf(total: number): Level {
  if (total < 6) return { name: "Usher", toNext: 6 - total };
  if (total < 18) return { name: "Critic", toNext: 18 - total };
  return { name: "Regular", toNext: null };
}
