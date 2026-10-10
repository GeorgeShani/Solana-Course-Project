import { useSyncExternalStore } from "react";
import type { WatchTarget } from "./discovery";

/**
 * What this browser follows in Relay's discovery coverage: ideas and traders, each with a cursor.
 *
 * The cursor is the sequence number of the last timeline event the reader has seen. "Since your
 * last visit" is every meaningful event after it. Nothing is stored on the server and the server
 * never marks anything read: a cursor moves only when the reader opens the idea or taps "Mark as
 * read", never because a list was fetched or scrolled past.
 *
 * Sequence numbers can exceed 2^53, so they are decimal strings and compared as bigints.
 */
export const DISCOVERY_WATCH_KEY = "relay:discovery-watch:v1";
/** The server accepts at most this many targets per request (MAX_WATCH_TARGETS). */
export const MAX_WATCHED = 50;

export interface WatchedItem {
  type: WatchTarget["type"];
  id: string;
  /** Shown while the service is unreachable, e.g. "SOL range idea · Example Trader". */
  label: string;
  /** The last event seq the reader has seen; "0" means nothing yet. */
  after: string;
  /** Wall-clock ms when it was watched. */
  savedAt: number;
}

const EMPTY: readonly WatchedItem[] = [];
const ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const SEQ = /^\d{1,19}$/;

function isSeq(v: unknown): v is string {
  return typeof v === "string" && SEQ.test(v);
}

/** The larger of two sequence numbers. */
export function maxSeq(a: string, b: string): string {
  return BigInt(b) > BigInt(a) ? b : a;
}

export function seqGreater(a: string, b: string): boolean {
  return BigInt(a) > BigInt(b);
}

/**
 * Parses the stored JSON defensively. Anything unexpected is dropped, never thrown: a damaged
 * entry must not hide the rest, and a cursor that cannot be read becomes "0" (show everything)
 * rather than skipping events.
 */
export function parseDiscoveryWatch(raw: string | null): WatchedItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  if (Reflect.get(parsed, "v") !== 1) return [];
  const items: unknown = Reflect.get(parsed, "items");
  if (!Array.isArray(items)) return [];
  const out: WatchedItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const type: unknown = Reflect.get(item, "type");
    const id: unknown = Reflect.get(item, "id");
    const label: unknown = Reflect.get(item, "label");
    const after: unknown = Reflect.get(item, "after");
    const savedAt: unknown = Reflect.get(item, "savedAt");
    if (type !== "idea" && type !== "trader") continue;
    if (typeof id !== "string" || !ID.test(id)) continue;
    const key = `${type}:${id}`;
    if (seen.has(key) || out.length >= MAX_WATCHED) continue;
    seen.add(key);
    out.push({
      type,
      id,
      label: typeof label === "string" && label ? label.slice(0, 160) : id,
      after: isSeq(after) ? String(BigInt(after)) : "0",
      savedAt:
        typeof savedAt === "number" && Number.isFinite(savedAt) ? savedAt : 0,
    });
  }
  return out;
}

export function serializeDiscoveryWatch(list: readonly WatchedItem[]): string {
  return JSON.stringify({ v: 1, items: list });
}

export function toTargets(list: readonly WatchedItem[]): WatchTarget[] {
  return list.map((w) => ({ type: w.type, id: w.id, after: w.after }));
}

export function isWatched(
  list: readonly WatchedItem[],
  type: WatchTarget["type"],
  id: string,
): boolean {
  return list.some((w) => w.type === type && w.id === id);
}

// ------------------------------------------------------------------------------- the store

const listeners = new Set<() => void>();
let cache: { raw: string | null; list: readonly WatchedItem[] } = {
  raw: null,
  list: EMPTY,
};

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function read(): readonly WatchedItem[] {
  const s = storage();
  let raw: string | null = null;
  try {
    raw = s ? s.getItem(DISCOVERY_WATCH_KEY) : null;
  } catch {
    raw = null;
  }
  if (raw !== cache.raw) cache = { raw, list: parseDiscoveryWatch(raw) };
  return cache.list;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === DISCOVERY_WATCH_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(list: readonly WatchedItem[]): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(DISCOVERY_WATCH_KEY, serializeDiscoveryWatch(list));
  } catch {
    return false;
  }
  for (const l of listeners) l();
  return true;
}

export type WatchResult =
  | { ok: true; watching: boolean }
  | { ok: false; reason: "storage_unavailable" | "limit_reached" };

/**
 * Starts or stops watching. A new watch begins at `seenSeq`, the newest event the reader is
 * looking at right now, so only later events count as new. Unknown means "0".
 */
export function toggleWatch(
  type: WatchTarget["type"],
  id: string,
  label: string,
  seenSeq: string | null,
): WatchResult {
  const list = read();
  const watching = isWatched(list, type, id);
  if (!watching && list.length >= MAX_WATCHED)
    return { ok: false, reason: "limit_reached" };
  const next = watching
    ? list.filter((w) => !(w.type === type && w.id === id))
    : [
        ...list,
        {
          type,
          id,
          label,
          after: seenSeq !== null && isSeq(seenSeq) ? seenSeq : "0",
          savedAt: Date.now(),
        },
      ];
  return write(next)
    ? { ok: true, watching: !watching }
    : { ok: false, reason: "storage_unavailable" };
}

export function removeWatch(type: WatchTarget["type"], id: string): boolean {
  return write(read().filter((w) => !(w.type === type && w.id === id)));
}

/**
 * Records that the reader has now seen events up to `seq`. The cursor only moves forward, and
 * only for something already watched. Returns whether anything changed.
 */
export function markSeen(
  type: WatchTarget["type"],
  id: string,
  seq: string,
): boolean {
  if (!isSeq(seq)) return false;
  const list = read();
  let changed = false;
  const next = list.map((w) => {
    if (w.type !== type || w.id !== id || !seqGreater(seq, w.after)) return w;
    changed = true;
    return { ...w, after: String(BigInt(seq)) };
  });
  return changed ? write(next) : false;
}

export function useDiscoveryWatch(): readonly WatchedItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
