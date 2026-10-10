import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during SSR and hydration, true afterwards; for browser-only reads that must not mismatch. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
