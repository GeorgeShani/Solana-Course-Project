import { useEffect, useRef, type ReactNode } from "react";

/** The same closing and reopening curtains for Discover and Plans. */
export function Curtain({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus({ preventScroll: true });
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => {
        const exit = panel.current?.querySelector<HTMLElement>(
          "[data-curtain-exit]",
        );
        exit?.focus({ preventScroll: true });
        exit?.scrollIntoView({ block: "nearest", behavior: "instant" });
      },
      reduce ? 0 : 1100,
    );
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div
      ref={panel}
      className="showtime"
      data-open={open}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
        if (event.key !== "Tab") return;
        const controls = panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex="0"]',
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (
          event.shiftKey &&
          (event.target === first || event.target === panel.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (event.target === last || event.target === panel.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="showtime__drape showtime__drape--l" aria-hidden="true" />
      <div className="showtime__drape showtime__drape--r" aria-hidden="true" />
      <div className="showtime__stage">{children}</div>
    </div>
  );
}
