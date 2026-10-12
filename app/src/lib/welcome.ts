/**
 * The welcome scene's state. It is a browser preference, never a URL parameter:
 *
 * - `relay:welcome:v2` = "seen" once a visitor has chosen an action in the welcome.
 * - `relay:entered` = "1" is the older flag; it still counts, so existing users are not shown the
 *   full welcome again, but they can reopen it with "Meet Cue".
 * - `relay:curtain-seen` (sessionStorage) limits the short curtain transition to once per session.
 *
 * `?welcome` is kept only as a compatibility trigger: it opens the same welcome and is then
 * replaced by the clean path.
 */
export const WELCOME_KEY = "relay:welcome:v2";
export const WELCOME_SEEN = "seen";
/** Written by earlier builds when a visitor entered. */
export const LEGACY_ENTERED_KEY = "relay:entered";
export const CURTAIN_SESSION_KEY = "relay:curtain-seen";

/** Fired by `requestWelcome` so the mounted welcome scene resets itself. */
export const WELCOME_EVENT = "relay:welcome";

/**
 * Runs in <head> before first paint and picks the stage's first state on `/` only:
 * - data-welcome="on": a first visit (or the `?welcome` compatibility link): curtains closed, Cue
 *   in front until the visitor chooses. Deep links (`?plan=`) and the dev preview skip it.
 * - data-curtain="on": a returning visitor's first Discover of the session gets the short opening,
 *   unless reduced motion is on.
 * Every other path gets neither, so a deep link is never blocked. Storage failures skip both.
 */
export const WELCOME_BOOT_SCRIPT = `(function(){var d=document.documentElement;d.dataset.welcome="off";d.dataset.curtain="off";try{if(location.pathname!=="/")return;var q=new URLSearchParams(location.search);var seen=localStorage.getItem("${WELCOME_KEY}")==="${WELCOME_SEEN}"||localStorage.getItem("${LEGACY_ENTERED_KEY}")==="1";if(q.has("welcome")||(!seen&&!q.has("plan")&&!q.has("preview"))){d.dataset.welcome="on";return}if(!sessionStorage.getItem("${CURTAIN_SESSION_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){sessionStorage.setItem("${CURTAIN_SESSION_KEY}","1");d.dataset.curtain="on"}}catch(e){}})();`;

/** Remember that the visitor has been through the welcome (this browser only). */
export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_KEY, WELCOME_SEEN);
    sessionStorage.setItem(CURTAIN_SESSION_KEY, "1");
  } catch {
    // Storage blocked: the welcome simply shows again next time.
  }
}

/** Reopen the full welcome from anywhere (header or Account). The URL does not change. */
export function requestWelcome(): void {
  document.documentElement.dataset.welcome = "on";
  window.dispatchEvent(new Event(WELCOME_EVENT));
}

/** Leaving the welcome for another page: that page is shown normally, with the app's navigation. */
export function leaveWelcome(): void {
  document.documentElement.dataset.welcome = "off";
}
