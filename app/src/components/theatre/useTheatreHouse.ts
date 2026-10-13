import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Mood } from "./Audience";
import { swayDrapes } from "./drapes";

/** Theatre decoration only; it never reacts to prices or trade outcomes. */
export function useTheatreHouse(closed: boolean, enabled = true) {
  const [applause, setApplause] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const wasClosed = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    document.documentElement.dataset.house = "on";
    return () => {
      delete document.documentElement.dataset.house;
      window.clearTimeout(timer.current);
    };
  }, [enabled]);
  useLayoutEffect(() => {
    if (!enabled) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const opening = !closed && wasClosed.current && !reduce;
    wasClosed.current = closed;
    document.documentElement.dataset.showtime = closed
      ? "on"
      : opening
        ? "opening"
        : "off";
    const openingTimer = opening
      ? window.setTimeout(() => {
          document.documentElement.dataset.showtime = "off";
        }, 1200)
      : undefined;
    return () => {
      window.clearTimeout(openingTimer);
      delete document.documentElement.dataset.showtime;
    };
  }, [closed, enabled]);
  const applaud = useCallback(() => {
    swayDrapes();
    setApplause(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setApplause(false), 1800);
  }, []);
  const mood: Mood = closed ? "cheer" : applause ? "clap" : "idle";
  return { mood, applaud };
}
