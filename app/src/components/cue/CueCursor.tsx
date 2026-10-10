import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CUE_REACT_EVENT, useCueCursorPref } from "../../lib/cue-cursor";
import { Cue, type CuePose } from "./Cue";

/** Decorative stage areas opt in; everything else keeps the native pointer. */
const ZONE = "[data-cursor-zone]";

/** Over these the native cursor returns and Cue steps out of the way. */
const NATIVE = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "summary",
  "label",
  "dialog",
  "[role='button']",
  "[role='tab']",
  "[role='switch']",
  "[role='dialog']",
  "[contenteditable]",
  "[data-cursor='native']",
].join(",");

/** Elements that carry text directly: Cue never sits on words. */
const TEXT = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "LI",
  "DT",
  "DD",
  "BLOCKQUOTE",
  "FIGCAPTION",
  "SPAN",
  "TIME",
  "STRONG",
  "EM",
  "SMALL",
  "CODE",
]);

const REACT_MS = 1100;
const FOLLOW = { stiffness: 520, damping: 38, mass: 0.45 };

function isOpenStage(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (!target.closest(ZONE)) return false;
  if (target.closest(NATIVE)) return false;
  return !TEXT.has(target.tagName);
}

/**
 * Cue as the pointer over the stage on desktop: a brass tip marks the exact hotspot and a 34px Cue
 * follows just behind it on a stiff spring. It never takes pointer events and never moves controls.
 * The native cursor is hidden only while Cue is actually drawn over open stage; text, controls,
 * forms and dialogs keep the system cursor. Off for touch, reduced motion and when switched off.
 */
export function CueCursor() {
  const enabled = useCueCursorPref();
  const rootRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<CuePose>("mascot");
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const bodyX = useSpring(x, FOLLOW);
  const bodyY = useSpring(y, FOLLOW);

  useEffect(() => {
    const doc = document.documentElement;
    const node = rootRef.current;
    if (!enabled || !node) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let px = -100;
    let py = -100;
    let target: EventTarget | null = null;
    let reactTimer = 0;
    let reacting = false;
    let live = false;

    const paint = () => {
      frame = 0;
      x.set(px);
      y.set(py);
      const show = isOpenStage(target);
      const state = show ? "show" : reacting ? "react" : "hide";
      if (node.dataset.state !== state) node.dataset.state = state;
      if (show) doc.dataset.cueCursor = "show";
      else delete doc.dataset.cueCursor;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      target = e.target;
      schedule();
    };
    const onLeave = () => {
      target = null;
      schedule();
    };
    const onReact = () => {
      reacting = true;
      setPose("saved");
      window.clearTimeout(reactTimer);
      reactTimer = window.setTimeout(() => {
        reacting = false;
        setPose("mascot");
        schedule();
      }, REACT_MS);
      schedule();
    };

    const start = () => {
      live = true;
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onMove, { passive: true });
      doc.addEventListener("pointerleave", onLeave);
      window.addEventListener("blur", onLeave);
      window.addEventListener(CUE_REACT_EVENT, onReact);
    };
    const stop = () => {
      live = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      doc.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener(CUE_REACT_EVENT, onReact);
      cancelAnimationFrame(frame);
      frame = 0;
      node.dataset.state = "hide";
      delete doc.dataset.cueCursor;
    };
    const sync = () => {
      const want = fine.matches && !calm.matches;
      if (want && !live) start();
      else if (!want && live) stop();
    };
    sync();
    fine.addEventListener("change", sync);
    calm.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      calm.removeEventListener("change", sync);
      window.clearTimeout(reactTimer);
      stop();
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  return (
    <div
      ref={rootRef}
      className="cue-cursor"
      data-state="hide"
      aria-hidden="true"
    >
      <motion.div className="cue-cursor__tip" style={{ x, y }} />
      <motion.div className="cue-cursor__body" style={{ x: bodyX, y: bodyY }}>
        <Cue pose={pose} />
      </motion.div>
    </div>
  );
}
