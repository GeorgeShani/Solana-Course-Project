/** Asks the welcome scene to open the curtains, from controls that live outside it (the header). */
export const ENTER_EVENT = "relay:enter";

export function requestEnter() {
  window.dispatchEvent(new Event(ENTER_EVENT));
}

/** Leaving the welcome for another page: the next page is shown normally, with the app's navigation. */
export function leaveWelcome() {
  document.documentElement.dataset.welcome = "off";
}
