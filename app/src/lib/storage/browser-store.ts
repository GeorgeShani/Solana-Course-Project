import { useSyncExternalStore } from "react";

/**
 * The one place Relay reads and writes this browser's localStorage for saved things (watched
 * ideas, profiles, plans, plan creators). Nothing here is sent to a server and nothing needs a
 * wallet or an account.
 *
 * Reads never throw: blocked storage (private mode, a sandboxed frame) reads as empty, and damaged
 * data is the parser's job to drop. Writes report failure instead of pretending, so a button can
 * say "this browser is blocking storage" rather than silently forgetting what was saved.
 */
export interface BrowserStore<T> {
  readonly key: string;
  /** The current value (cached; parsed again only when the stored text changes). */
  read(): T;
  /** Stores a value and tells every subscriber. False when the browser refused. */
  write(value: T): boolean;
  /** React hook: the current value, and the empty value during server render. */
  use(): T;
  /** For tests and "clear my data": forget the cached value so the next read starts from storage. */
  reset(): void;
}

export interface BrowserStoreOptions<T> {
  key: string;
  /** What a missing or unreadable value means. Used during server render, too. */
  empty: T;
  /** Parses stored text defensively. Must never throw. */
  parse(raw: string | null): T;
  serialize(value: T): string;
}

/** The browser's localStorage, or null when it is missing or blocked. */
export function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether saving works right now: a real write and delete of a throwaway key, because some
 * browsers expose localStorage but refuse every write (private mode, full quota).
 */
export function canSaveInBrowser(): boolean {
  const s = browserStorage();
  if (!s) return false;
  const probe = "relay:storage-probe";
  try {
    s.setItem(probe, "1");
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function createBrowserStore<T>(
  options: BrowserStoreOptions<T>,
): BrowserStore<T> {
  const { key, empty, parse, serialize } = options;
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } = { raw: null, value: empty };

  function read(): T {
    const s = browserStorage();
    let raw: string | null = null;
    try {
      raw = s ? s.getItem(key) : null;
    } catch {
      raw = null;
    }
    if (raw !== cache.raw) cache = { raw, value: parse(raw) };
    return cache.value;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function write(value: T): boolean {
    const s = browserStorage();
    if (!s) return false;
    try {
      s.setItem(key, serialize(value));
    } catch {
      return false;
    }
    for (const l of listeners) l();
    return true;
  }

  return {
    key,
    read,
    write,
    use: () => useSyncExternalStore(subscribe, read, () => empty),
    reset: () => {
      cache = { raw: null, value: empty };
      for (const l of listeners) l();
    },
  };
}
