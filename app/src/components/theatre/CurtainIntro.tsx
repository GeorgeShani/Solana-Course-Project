import { motion, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useStagePointer } from "../../lib/pointer";
import { MarqueeSign } from "./Marquee";

/** The opening is done after 1.2 s; past this the drapes simply rest at the wings. */
const OPENING_MS = 1200;

function end() {
  document.documentElement.dataset.curtain = "off";
}

/**
 * The two burgundy halves and the scalloped valance from the curtain-sol theatre. They rest
 * gathered at the wings and frame every page. On the opening they start closed and gather in one
 * CSS animation that begins before hydration, so a slow script can never hold the stage shut.
 */
export function Drapes() {
  const pointer = useStagePointer();
  const x = useTransform(pointer.x, (v) => v * -4);
  return (
    <motion.div className="drapes" aria-hidden="true" style={{ x }}>
      <div className="drape drape--left" />
      <div className="drape drape--right" />
    </motion.div>
  );
}

/**
 * The marquee sign shown while the drapes part: a returning visitor's first Discover of the
 * session (the boot script in lib/welcome.ts decides). The page is already live underneath; any
 * key, tap, wheel or touch ends the opening at once.
 */
export function CurtainIntro({ sub }: { sub: ReactNode }) {
  useEffect(() => {
    if (document.documentElement.dataset.curtain !== "on") return;
    const timer = window.setTimeout(end, OPENING_MS);
    const opts: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener("keydown", end, opts);
    window.addEventListener("pointerdown", end, opts);
    window.addEventListener("wheel", end, opts);
    window.addEventListener("touchmove", end, opts);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", end);
      window.removeEventListener("pointerdown", end);
      window.removeEventListener("wheel", end);
      window.removeEventListener("touchmove", end);
    };
  }, []);

  return (
    <div className="opening" aria-hidden="true">
      <MarqueeSign sub={sub} />
    </div>
  );
}
