import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { leaveWelcome, requestEnter } from "../../lib/stage";
import { NAV } from "../../lib/nav";

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
  sub?: ReactNode;
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
      {sub && <p className="sign__sub">{sub}</p>}
      <Bulbs count={11} />
    </div>
  );
}

/**
 * The valance over the stage: scalloped burgundy with a brass hem, carrying the small RELAY sign.
 * On desktop it is also the header: the app's navigation inside, a compact set of links on the
 * welcome. The bulbs chase slowly and stop under reduced motion.
 */
export function Valance({ clusterLabel }: { clusterLabel: string | null }) {
  return (
    <header className="valance">
      <nav className="topnav topnav--app" aria-label="Main">
        <ul className="topnav__list">
          {NAV.slice(0, 3).map((t) => (
            <li key={t.to}>
              <Link
                to={t.to}
                className="topnav__link"
                activeOptions={{ exact: t.to === "/", includeSearch: false }}
                activeProps={{ "aria-current": "page" }}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Link to="/" className="valance__sign" aria-label="Relay, go to Discover">
        <Bulbs count={7} />
        <span className="valance__word">RELAY</span>
        <Bulbs count={7} />
      </Link>
      <div className="valance__end">
        <nav className="topnav topnav--app" aria-label="Help and account">
          <ul className="topnav__list">
            <li>
              <Link
                to="/how-it-works"
                className="topnav__link"
                activeProps={{ "aria-current": "page" }}
              >
                How it works
              </Link>
            </li>
            <li>
              <Link
                to="/account"
                className="topnav__link"
                activeProps={{ "aria-current": "page" }}
              >
                Account
              </Link>
            </li>
          </ul>
        </nav>
        <nav className="topnav topnav--welcome" aria-label="Welcome">
          <ul className="topnav__list">
            <li>
              <button
                type="button"
                className="topnav__link"
                onClick={requestEnter}
              >
                Explore
              </button>
            </li>
            <li>
              <Link
                to="/how-it-works"
                className="topnav__link"
                onClick={leaveWelcome}
              >
                How it works
              </Link>
            </li>
            <li>
              <Link
                to="/watchlist"
                className="topnav__link"
                onClick={leaveWelcome}
              >
                Watchlist
              </Link>
            </li>
          </ul>
        </nav>
        {clusterLabel && (
          <span className="valance__cluster">{clusterLabel}</span>
        )}
      </div>
    </header>
  );
}
