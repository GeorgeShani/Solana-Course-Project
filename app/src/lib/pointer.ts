import { useMotionValue, useSpring, type MotionValue } from "motion/react";
import { useEffect } from "react";

const SPRING = { stiffness: 90, damping: 18, mass: 0.6 };

/**
 * The pointer's position over the stage as two springs in [-1, 1] (0 = centre). Only a fine
 * pointer drives them, and never under reduced motion: on touch and for calm users they stay at 0,
 * so everything that follows them simply stands still. Pointer events are folded into one write per
 * animation frame and never touch React state.
 */
export function useStagePointer(): {
  x: MotionValue<number>;
  y: MotionValue<number>;
} {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let px = 0;
    let py = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          rawX.set(px);
          rawY.set(py);
        });
    };
    const rest = () => {
      rawX.set(0);
      rawY.set(0);
    };

    let listening = false;
    const sync = () => {
      const on = fine.matches && !calm.matches;
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", rest);
      } else {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", rest);
        rest();
      }
    };
    sync();
    fine.addEventListener("change", sync);
    calm.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      fine.removeEventListener("change", sync);
      calm.removeEventListener("change", sync);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", rest);
    };
  }, [rawX, rawY]);

  return { x, y };
}

/** Moves Cue's pupils (CSS custom properties on `el`) inside a bounded range, in SVG units. */
export function useCueGaze(
  el: { current: HTMLElement | null },
  pointer: { x: MotionValue<number>; y: MotionValue<number> },
  range = { x: 5, y: 3.5 },
) {
  useEffect(() => {
    const set = () => {
      const node = el.current;
      if (!node) return;
      node.style.setProperty(
        "--cue-look-x",
        `${(pointer.x.get() * range.x).toFixed(2)}px`,
      );
      node.style.setProperty(
        "--cue-look-y",
        `${(pointer.y.get() * range.y).toFixed(2)}px`,
      );
    };
    const offX = pointer.x.on("change", set);
    const offY = pointer.y.on("change", set);
    return () => {
      offX();
      offY();
    };
  }, [el, pointer.x, pointer.y, range.x, range.y]);
}
