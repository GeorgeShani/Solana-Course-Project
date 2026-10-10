import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let now = 0;

function tick() {
  now = Math.floor(Date.now() / 1000) * 1000;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === undefined) {
    tick();
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  return now || Math.floor(Date.now() / 1000) * 1000;
}

/**
 * Wall-clock ms, ticking once per second, shared by every subscriber. Null during server render and
 * hydration, so time-relative text renders identically on both sides and only then starts moving.
 */
export function useWallClock(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
