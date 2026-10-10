import { useSyncExternalStore } from "react";

/**
 * The local watch list. Watching needs no wallet and no account: it lives in this browser only
 * (localStorage, plan section F). Each entry keeps a short label so My Plans can list it even when
 * the API is down.
 */
export const WATCH_KEY = "relay:watched";

export interface WatchedPlan {
  planPda: string;
  /** e.g. "SOL / USDC · Mika Tan" */
  label: string;
  /** Wall-clock ms when it was watched. */
  savedAt: number;
}

const EMPTY: readonly WatchedPlan[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; list: readonly WatchedPlan[] } = { raw: null, list: EMPTY };

/** Parses the stored JSON defensively: anything unexpected is dropped, never thrown. */
export function parseWatchList(raw: string | null): WatchedPlan[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: WatchedPlan[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const planPda: unknown = Reflect.get(item, "planPda");
    const label: unknown = Reflect.get(item, "label");
    const savedAt: unknown = Reflect.get(item, "savedAt");
    if (typeof planPda !== "string" || planPda === "" || seen.has(planPda)) continue;
    seen.add(planPda);
    out.push({
      planPda,
      label: typeof label === "string" ? label.slice(0, 120) : planPda,
      savedAt: typeof savedAt === "number" && Number.isFinite(savedAt) ? savedAt : 0,
    });
  }
  return out;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // blocked storage (privacy mode, sandboxed iframe)
  }
}

function read(): readonly WatchedPlan[] {
  const s = storage();
  let raw: string | null = null;
  try {
    raw = s ? s.getItem(WATCH_KEY) : null;
  } catch {
    raw = null;
  }
  if (raw !== cache.raw) cache = { raw, list: parseWatchList(raw) };
  return cache.list;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === WATCH_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(list: readonly WatchedPlan[]): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(WATCH_KEY, JSON.stringify(list));
  } catch {
    return false; // quota or blocked: the toggle reports failure instead of pretending
  }
  for (const l of listeners) l();
  return true;
}

/** Adds or removes a plan. Returns the new watching state, or null when storage is unavailable. */
export function toggleWatched(planPda: string, label: string): boolean | null {
  const list = read();
  const watching = list.some((w) => w.planPda === planPda);
  const next = watching
    ? list.filter((w) => w.planPda !== planPda)
    : [...list, { planPda, label, savedAt: Date.now() }];
  return write(next) ? !watching : null;
}

export function removeWatched(planPda: string): boolean {
  return write(read().filter((w) => w.planPda !== planPda));
}

/** The watch list; empty during server render (it only exists in the browser). */
export function useWatchList(): readonly WatchedPlan[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
