import { useEffect, type RefObject } from "react";

/** Finish from the last card without scrolling through an empty closing screen. */
export function useFeedEnding(
  feed: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onFinish: () => void,
) {
  useEffect(() => {
    const root = feed.current;
    if (!root || !enabled) return;
    const atEnd = () =>
      root.scrollTop + root.clientHeight >= root.scrollHeight - 2;
    const contentCanScroll = (target: EventTarget | null) => {
      let node = target instanceof Element ? target : null;
      while (node && node !== root) {
        if (
          node instanceof HTMLElement &&
          /^(auto|scroll)$/.test(getComputedStyle(node).overflowY) &&
          node.scrollTop + node.clientHeight < node.scrollHeight - 2
        )
          return true;
        node = node.parentElement;
      }
      return false;
    };
    let lastWheelTime = 0;
    let wheelStartedAtEnd = false;
    const onWheel = (event: WheelEvent) => {
      // Finish on a fresh gesture at the last card, not on momentum arriving from the previous one.
      const now = performance.now();
      if (now - lastWheelTime > 160)
        wheelStartedAtEnd = atEnd() && !contentCanScroll(event.target);
      lastWheelTime = now;
      if (
        event.ctrlKey ||
        event.deltaY <= 0 ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        !wheelStartedAtEnd ||
        !atEnd() ||
        contentCanScroll(event.target)
      )
        return;
      event.preventDefault();
      onFinish();
    };
    let startY: number | undefined;
    let startedAtEnd = false;
    const onTouchStart = (event: TouchEvent) => {
      startY =
        event.touches.length === 1 ? event.touches[0]?.clientY : undefined;
      startedAtEnd = atEnd() && !contentCanScroll(event.target);
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (
        !startedAtEnd ||
        startY === undefined ||
        y === undefined ||
        event.touches.length !== 1 ||
        startY - y <= 0 ||
        !atEnd() ||
        contentCanScroll(event.target)
      )
        return;
      event.preventDefault();
      if (startY - y < 36) return;
      startY = undefined;
      onFinish();
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
    };
  }, [feed, enabled, onFinish]);
}
