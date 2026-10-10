import { useEffect, type ReactNode } from "react";
import { MarqueeSign } from "./Marquee";

const SEEN_KEY = "relay:curtain-seen";

/**
 * Runs in <head> before first paint. The curtain opens only when the feed is the first page of the
 * session; reduced motion, a later visit, another landing page or a storage failure skip it.
 */
export const CURTAIN_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{if(location.pathname!=="/"||sessionStorage.getItem("${SEEN_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.curtain="off"}else{sessionStorage.setItem("${SEEN_KEY}","1");d.dataset.curtain="on"}}catch(e){d.dataset.curtain="off"}})();`;

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
  return (
    <div className="drapes" aria-hidden="true">
      <div className="drape drape--left" />
      <div className="drape drape--right" />
    </div>
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
