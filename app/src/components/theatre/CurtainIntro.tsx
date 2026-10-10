import { motion, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { useStagePointer } from "../../lib/pointer";
import { MarqueeSign } from "./Marquee";

export const SEEN_KEY = "relay:curtain-seen";
/** Set once a visitor has walked through the welcome scene; returning visitors skip it. */
export const ENTERED_KEY = "relay:entered";

/**
 * Runs in <head> before first paint and picks the stage's first state:
 * - data-welcome="on": a first visit to the feed (or `?welcome`), with the curtains closed and Cue
 *   in front until the visitor chooses to enter. Deep links (`?plan=`) and the preview skip it.
 * - data-curtain="on": a returning visitor's first feed of the session gets the short opening.
 * Reduced motion keeps the welcome (it is content) but drops the opening; storage failures skip both.
 */
export const CURTAIN_BOOT_SCRIPT = `(function(){var d=document.documentElement;d.dataset.welcome="off";d.dataset.curtain="off";try{if(location.pathname!=="/")return;var q=new URLSearchParams(location.search);if(q.has("welcome")||(!localStorage.getItem("${ENTERED_KEY}")&&!q.has("plan")&&!q.has("preview"))){d.dataset.welcome="on";return}if(!sessionStorage.getItem("${SEEN_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){sessionStorage.setItem("${SEEN_KEY}","1");d.dataset.curtain="on"}}catch(e){}})();`;

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
 * The marquee sign shown while the drapes part, once per session and only on the feed. The feed is
 * already live underneath; any key, tap, wheel or touch ends the opening at once.
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
