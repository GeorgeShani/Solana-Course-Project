import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useGoogleAuth } from "../../features/account/google-auth";
import { HEADER_NAV } from "../../lib/nav";
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

/**
 * The valance over the stage: scalloped burgundy with a brass hem, carrying the small RELAY sign.
 * On desktop it is the header: the sign at left, the destinations centred, the network, the Cue cursor switch
 * and the wallet at right. The welcome shows none of it; the bulbs stop under reduced motion.
 */
export function Valance({ clusterLabel }: { clusterLabel: string | null }) {
  // The network matters where plans and wallets are; on public discovery it is only noise.
  const path = useRouterState({ select: (s) => s.location.pathname });
  const showNetwork = path.startsWith("/plans") || path === "/account";
  return (
    <header className="valance">
      <Link to="/" className="valance__sign" aria-label="Relay, go to Discover">
        <Bulbs count={7} />
        <span className="valance__word">RELAY</span>
        <Bulbs count={7} />
      </Link>
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
      <div className="valance__end">
        {clusterLabel && showNetwork && (
          <span className="valance__cluster">{clusterLabel}</span>
        )}
        <AccountLink />
        <WalletButton />
      </div>
    </header>
  );
}

/** Shows who is signed in when a Google session exists; never implies the wallet is linked. */
function AccountLink() {
  const auth = useGoogleAuth();
  if (auth.status === "signed_in") {
    const label = `${auth.user.name} · Account`;
    return (
      <Link
        to="/account"
        className="hdr-btn hdr-btn--icon hdr-btn--account hdr-btn--signed-in"
        aria-label={label}
        title={label}
        activeProps={{ "aria-current": "page" }}
      >
        {auth.user.picture ? (
          <img
            className="hdr-btn__avatar"
            src={auth.user.picture}
            alt=""
            width={22}
            height={22}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="hdr-btn__initials" aria-hidden="true">
            {auth.user.name.trim().slice(0, 1).toUpperCase() || "?"}
          </span>
        )}
      </Link>
    );
  }
  return (
    <Link
      to="/account"
      className="hdr-btn hdr-btn--icon hdr-btn--account"
      aria-label="Account"
      title="Account"
      activeProps={{ "aria-current": "page" }}
    >
      <Icon name="account" size={18} />
    </Link>
  );
}
