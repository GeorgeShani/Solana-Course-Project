/**
 * The welcome scene's state. A load of `/` shows the closed-curtain welcome every time, including
 * when this browser already has `relay:welcome:v2` or the older `relay:entered` flag. Deep links
 * (`?plan=`, `?preview=`) and every other path skip it. The header mark reopens the same scene
 * from inside the app without a reload.
 *
 * `?welcome` is kept only as a compatibility trigger on `/` and is then replaced by the clean path.
 */
export const WELCOME_KEY = "relay:welcome:v2";
export const WELCOME_SEEN = "seen";
/** Written by earlier builds when a visitor entered. */
export const LEGACY_ENTERED_KEY = "relay:entered";
export const CURTAIN_SESSION_KEY = "relay:curtain-seen";

/** Fired by `requestWelcome` so the mounted welcome scene resets itself. */
export const WELCOME_EVENT = "relay:welcome";

/**
 * Runs in <head> before first paint. `/` opens on the welcome. A plan deep link and the dev
 * preview skip it, and every other path gets neither, so a deep link is never blocked.
 */
export const WELCOME_BOOT_SCRIPT = `(function(){var d=document.documentElement;d.dataset.welcome="off";d.dataset.curtain="off";try{if(location.pathname!=="/")return;var q=new URLSearchParams(location.search);if(q.has("plan")||q.has("preview"))return;d.dataset.welcome="on"}catch(e){}})();`;

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
