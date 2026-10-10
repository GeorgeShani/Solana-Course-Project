import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { setCueCursor, useCueCursorPref } from "../../lib/cue-cursor";
import { HEADER_NAV } from "../../lib/nav";
import { Cue } from "../cue/Cue";
import { Icon } from "../ui/Icon";
import { WalletButton } from "../wallet/WalletButton";

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

function CursorSwitch() {
  const on = useCueCursorPref();
  return (
    <button
      type="button"
      className="hdr-btn hdr-btn--icon hdr-btn--cursor"
      aria-pressed={on}
      aria-label="Cue cursor"
      title={on ? "Cue cursor on" : "Cue cursor off"}
      onClick={() => setCueCursor(!on)}
    >
      <Cue pose="mascot" />
    </button>
  );
}

/**
 * The valance over the stage: scalloped burgundy with a brass hem, carrying the small RELAY sign.
 * On desktop it is the header: the app's destinations at left, the network, the Cue cursor switch
 * and the wallet at right. The welcome shows none of it; the bulbs stop under reduced motion.
 */
export function Valance({ clusterLabel }: { clusterLabel: string | null }) {
  return (
    <header className="valance">
      <nav className="topnav" aria-label="Main">
        <ul className="topnav__list">
          {HEADER_NAV.map((t) => (
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
        {clusterLabel && (
          <span className="valance__cluster">{clusterLabel}</span>
        )}
        <CursorSwitch />
        <Link
          to="/account"
          className="hdr-btn hdr-btn--icon hdr-btn--account"
          aria-label="Account"
          title="Account"
          activeProps={{ "aria-current": "page" }}
        >
          <Icon name="account" size={18} />
        </Link>
        <WalletButton />
      </div>
    </header>
  );
}
