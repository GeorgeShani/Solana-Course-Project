import { useEffect } from "react";

const SEEN_KEY = "relay:curtain-seen";

/**
 * Runs in <head> before first paint: skips the curtain when it already opened this session or
 * when the visitor prefers reduced motion. Storage failures also skip it.
 */
export const CURTAIN_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem("${SEEN_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.curtain="off"}else{sessionStorage.setItem("${SEEN_KEY}","1");d.dataset.curtain="on"}}catch(e){d.dataset.curtain="off"}})();`;

function end() {
  document.documentElement.dataset.curtain = "off";
}

/**
 * The opening curtain: two velvet halves that part to the wings once per session (≤ 1.2 s).
 * It never gates the feed: the overlay ignores pointer input, the feed underneath is already live,
 * and any key, tap or scroll ends it at once.
 */
export function CurtainIntro() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.curtain !== "on") return;
    const timer = window.setTimeout(end, 1300);
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
    <div className="curtain" aria-hidden="true">
      <div className="curtain__valance" />
      <div className="curtain__half curtain__half--left" />
      <div className="curtain__half curtain__half--right" />
    </div>
  );
}
