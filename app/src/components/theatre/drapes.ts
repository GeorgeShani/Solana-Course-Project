/**
 * A gentle sway of the side drapes when the reader stamps something. Only a small horizontal
 * translate (a compositor-only transform), never a resize, and never while scrolling: moving the
 * drapes on every screen change made the page feel jerky. Nothing happens under reduced motion.
 */
export function swayDrapes(): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const [side, dx] of [
    ["left", -7],
    ["right", 7],
  ] as const) {
    document
      .querySelector<HTMLElement>(`.drapes .drape--${side}`)
      ?.animate(
        [
          { transform: "translateX(0)" },
          { transform: `translateX(${dx}px)`, offset: 0.4 },
          { transform: "translateX(0)" },
        ],
        { duration: 800, easing: "cubic-bezier(0.45, 0, 0.2, 1)" },
      );
  }
}
