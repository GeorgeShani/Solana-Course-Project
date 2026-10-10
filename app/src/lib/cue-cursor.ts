import { useSyncExternalStore } from "react";

/**
 * Whether Cue follows the pointer over the stage. On by default; the choice lives in this browser.
 * The cursor itself only ever appears for a fine pointer without reduced motion (CueCursor).
 */
export const CUE_CURSOR_KEY = "relay:cue-cursor";
export const CUE_REACT_EVENT = "relay:cue-react";

const listeners = new Set<() => void>();

export function parseCueCursorPref(raw: string | null): boolean {
  return raw !== "off";
}

function read(): boolean {
  try {
    return parseCueCursorPref(localStorage.getItem(CUE_CURSOR_KEY));
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CUE_CURSOR_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns false when storage is blocked, so the switch can say the choice wasn't kept. */
export function setCueCursor(on: boolean): boolean {
  try {
    localStorage.setItem(CUE_CURSOR_KEY, on ? "on" : "off");
  } catch {
    return false;
  }
  for (const l of listeners) l();
  return true;
}

export function useCueCursorPref(): boolean {
  return useSyncExternalStore(subscribe, read, () => true);
}

/** Cue reacts once (a watched item, for now). Harmless when the cursor is off. */
export function cueReact() {
  window.dispatchEvent(new Event(CUE_REACT_EVENT));
}
