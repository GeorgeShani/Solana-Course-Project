import { createBrowserStore } from "../../lib/storage/browser-store";

/**
 * Watched traders. Like watched plans, this lives in this browser only and needs no wallet. Each
 * entry remembers the newest plan it had seen, so the Watchlist can say what is new since.
 */
export const CREATOR_WATCH_KEY = "relay:watched-traders";

export interface WatchedCreator {
  address: string;
  label: string;
  /** Wall-clock ms when it was watched. */
  savedAt: number;
  /** Unix seconds of the newest plan when watched, or null when it had none. */
  seenPublishedAt: number | null;
}

const EMPTY: readonly WatchedCreator[] = [];
const isInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v);

/** Parses the stored JSON defensively: anything unexpected is dropped, never thrown. */
export function parseCreatorWatchList(raw: string | null): WatchedCreator[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: WatchedCreator[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const address: unknown = Reflect.get(item, "address");
    const label: unknown = Reflect.get(item, "label");
    const savedAt: unknown = Reflect.get(item, "savedAt");
    const seenPublishedAt: unknown = Reflect.get(item, "seenPublishedAt");
    if (typeof address !== "string" || address === "" || seen.has(address))
      continue;
    seen.add(address);
    out.push({
      address,
      label: typeof label === "string" ? label.slice(0, 120) : address,
      savedAt:
        typeof savedAt === "number" && Number.isFinite(savedAt) ? savedAt : 0,
      seenPublishedAt: isInt(seenPublishedAt) ? seenPublishedAt : null,
    });
  }
  return out;
}

const store = createBrowserStore<readonly WatchedCreator[]>({
  key: CREATOR_WATCH_KEY,
  empty: EMPTY,
  parse: parseCreatorWatchList,
  serialize: (list) => JSON.stringify(list),
});

const read = store.read;
const write = store.write;

/** Adds or removes a trader. Returns the new watching state, or null when storage is unavailable. */
export function toggleWatchedCreator(
  address: string,
  label: string,
  seenPublishedAt: number | null,
): boolean | null {
  const list = read();
  const watching = list.some((w) => w.address === address);
  const next = watching
    ? list.filter((w) => w.address !== address)
    : [...list, { address, label, savedAt: Date.now(), seenPublishedAt }];
  return write(next) ? !watching : null;
}

export function removeWatchedCreator(address: string): boolean {
  return write(read().filter((w) => w.address !== address));
}

export const useWatchedCreators = store.use;
