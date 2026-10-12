/** Asks the welcome scene to open the curtains, from controls that live outside it. */
export const ENTER_EVENT = "relay:enter";

export function requestEnter() {
  window.dispatchEvent(new Event(ENTER_EVENT));
}
