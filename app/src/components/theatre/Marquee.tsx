import { Link } from "@tanstack/react-router";

const BULBS = 13;

function Bulbs() {
  return (
    <span className="marquee__bulbs" aria-hidden="true">
      {Array.from({ length: BULBS }, (_, i) => (
        <span key={i} className="marquee__bulb" />
      ))}
    </span>
  );
}

/** The lit RELAY sign over the stage. The bulbs chase slowly and stop under reduced motion. */
export function Marquee({ clusterLabel }: { clusterLabel: string | null }) {
  return (
    <header className="marquee">
      <Link to="/" className="marquee__sign" aria-label="Relay, go to the feed">
        <Bulbs />
        <span className="marquee__word">RELAY</span>
        <Bulbs />
      </Link>
      {clusterLabel && <span className="marquee__cluster">{clusterLabel}</span>}
    </header>
  );
}
