import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function Bulbs({ count }: { count: number }) {
  return (
    <span className="bulbs" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="bulb" />
      ))}
    </span>
  );
}

/** The full lit sign from the curtain-sol stage door: the welcome scene and the opening. */
export function MarqueeSign({
  sub,
  titleId,
  heading = false,
}: {
  sub: ReactNode;
  titleId?: string;
  /** The welcome scene's sign is the page heading; the opening's is decoration. */
  heading?: boolean;
}) {
  const Title = heading ? "h1" : "p";
  return (
    <div className="sign">
      <Bulbs count={11} />
      <Title id={titleId} className="sign__title">
        RELAY
      </Title>
      <p className="sign__sub">{sub}</p>
      <Bulbs count={11} />
    </div>
  );
}

/**
 * The valance over the stage: scalloped burgundy with a brass hem, carrying the small RELAY sign.
 * The bulbs chase slowly and stop under reduced motion.
 */
export function Valance({ clusterLabel }: { clusterLabel: string | null }) {
  return (
    <header className="valance">
      <Link to="/" className="valance__sign" aria-label="Relay, go to the feed">
        <Bulbs count={7} />
        <span className="valance__word">RELAY</span>
        <Bulbs count={7} />
      </Link>
      {clusterLabel && <span className="valance__cluster">{clusterLabel}</span>}
    </header>
  );
}
