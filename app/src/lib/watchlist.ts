import type { EntryStatus } from "@relay/domain";
import { useSyncExternalStore } from "react";
import type { PlanCardView } from "./api";

/**
 * The local watch list. Watching needs no wallet and no account: it lives in this browser only
 * (localStorage, plan section F). Each entry keeps a short label so My Plans can list it even when
 * the API is down.
 */
export const WATCH_KEY = "relay:watched";

/** What the plan looked like at the moment it was watched, so My Plans can show what changed. */
export interface WatchSnapshot {
  status: EntryStatus;
  version: number;
  /** Reference price in quote base units, or null when there was none. */
  priceUnits: string | null;
  quoteDecimals: number;
  entryLow: string;
  entryHigh: string;
  /** Unix seconds. */
  expiresAt: number;
}

export interface WatchedPlan {
  planPda: string;
  /** e.g. "SOL / USDC · Mika Tan" */
  label: string;
  /** Wall-clock ms when it was watched. */
  savedAt: number;
  /** Missing for plans watched before snapshots existed. */
  snapshot?: WatchSnapshot;
}

const STATUSES: readonly EntryStatus[] = [
  "in_range",
  "above_range",
  "below_range",
  "expired",
  "closed",
  "price_stale",
  "price_unavailable",
];

function isStatus(v: unknown): v is EntryStatus {
  return STATUSES.some((s) => s === v);
}

const isInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v);
const isDecimal = (v: unknown): v is string =>
  typeof v === "string" && /^\d{1,20}(\.\d{1,18})?$/.test(v);

export function parseSnapshot(v: unknown): WatchSnapshot | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  const status: unknown = Reflect.get(v, "status");
  const version: unknown = Reflect.get(v, "version");
  const priceUnits: unknown = Reflect.get(v, "priceUnits");
  const quoteDecimals: unknown = Reflect.get(v, "quoteDecimals");
  const entryLow: unknown = Reflect.get(v, "entryLow");
  const entryHigh: unknown = Reflect.get(v, "entryHigh");
  const expiresAt: unknown = Reflect.get(v, "expiresAt");
  if (
    !isStatus(status) ||
    !isInt(version) ||
    !(
      priceUnits === null ||
      (typeof priceUnits === "string" && /^\d{1,30}$/.test(priceUnits))
    ) ||
    !isInt(quoteDecimals) ||
    quoteDecimals < 0 ||
    quoteDecimals > 18 ||
    !isDecimal(entryLow) ||
    !isDecimal(entryHigh) ||
    !isInt(expiresAt)
  ) {
    return undefined;
  }
  return {
    status,
    version,
    priceUnits,
    quoteDecimals,
    entryLow,
    entryHigh,
    expiresAt,
  };
}

/** The plan as the reader sees it now, kept so the Watchlist can show what changed since. */
export function snapshotOf(
  card: PlanCardView,
  status: EntryStatus,
): WatchSnapshot {
  return {
    status,
    version: card.version.version,
    priceUnits: card.entry.price?.units ?? null,
    quoteDecimals: card.pair.quoteDecimals,
    entryLow: card.version.entryLow,
    entryHigh: card.version.entryHigh,
    expiresAt: card.version.expiresAt,
  };
}

const EMPTY: readonly WatchedPlan[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; list: readonly WatchedPlan[] } = {
  raw: null,
  list: EMPTY,
};

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
    if (typeof planPda !== "string" || planPda === "" || seen.has(planPda))
      continue;
    seen.add(planPda);
    const snapshot = parseSnapshot(Reflect.get(item, "snapshot"));
    out.push({
      planPda,
      label: typeof label === "string" ? label.slice(0, 120) : planPda,
      savedAt:
        typeof savedAt === "number" && Number.isFinite(savedAt) ? savedAt : 0,
      ...(snapshot ? { snapshot } : {}),
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
export function toggleWatched(
  planPda: string,
  label: string,
  snapshot?: WatchSnapshot,
): boolean | null {
  const list = read();
  const watching = list.some((w) => w.planPda === planPda);
  const next = watching
    ? list.filter((w) => w.planPda !== planPda)
    : [
        ...list,
        {
          planPda,
          label,
          savedAt: Date.now(),
          ...(snapshot ? { snapshot } : {}),
        },
      ];
  return write(next) ? !watching : null;
}

export function removeWatched(planPda: string): boolean {
  return write(read().filter((w) => w.planPda !== planPda));
}

/** The watch list; empty during server render (it only exists in the browser). */
export function useWatchList(): readonly WatchedPlan[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
