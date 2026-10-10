import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Cue } from "../components/cue/Cue";
import { Icon } from "../components/ui/Icon";
import { CLUSTER, CLUSTER_LABEL, RPC_URL } from "../lib/config";
import { setCueCursor, useCueCursorPref } from "../lib/cue-cursor";
import { useMounted } from "../lib/mounted";
import { disconnectWallet, openWalletDialog, useWallet } from "../lib/wallet";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account · Relay" }] }),
  component: Account,
});

function Account() {
  return (
    <section className="page" aria-labelledby="account-title">
      <header className="page__head">
        <h1 id="account-title" className="page__title">
          Account
        </h1>
        <span className="storage-note">
          <Icon name="shield" size={13} />
          No sign-up
        </span>
      </header>

      <div className="acct">
        <WalletSection />
        <Preferences />

        <section className="panel" aria-labelledby="network-title">
          <h2 id="network-title" className="panel__title">
            Network
          </h2>
          <dl className="facts">
            <div>
              <dt>Cluster</dt>
              <dd>
                {CLUSTER_LABEL[CLUSTER]}
                {CLUSTER === "localnet" && (
                  <span className="facts__note">
                    Surfpool mainnet fork. Test funds only.
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>RPC</dt>
              <dd className="num facts__id">{RPC_URL}</dd>
            </div>
          </dl>
        </section>

        <section className="panel acct-cue" aria-labelledby="cue-title">
          <Cue pose="mascot" className="acct-cue__art" />
          <div>
            <h2 id="cue-title" className="panel__title">
              Cue
            </h2>
            <p className="page__text">
              Relay's usher. Replay the opening any time.
            </p>
            <div className="notice__actions">
              <Link
                to="/"
                search={{ welcome: true }}
                className="btn btn--glass btn--small"
              >
                Meet Cue again
              </Link>
              <Link to="/demo" className="btn btn--ghost btn--small">
                Try the demo
              </Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function WalletSection() {
  const mounted = useMounted();
  const { state, wallets } = useWallet();
  const connected = state.status === "connected" ? state : null;

  return (
    <section className="panel" aria-labelledby="wallet-title">
      <h2 id="wallet-title" className="panel__title">
        Wallet
      </h2>
      {!mounted ? (
        <p className="page__text" aria-busy="true">
          Checking for a wallet…
        </p>
      ) : connected ? (
        <div className="acct-wallet">
          <span className="acct-wallet__mark">
            {connected.wallet.icon ? (
              <img src={connected.wallet.icon} alt="" width={40} height={40} />
            ) : (
              <Icon name="wallet" size={22} />
            )}
          </span>
          <div className="acct-wallet__who">
            <p className="acct-wallet__name">
              {connected.wallet.name}
              <span className="wallet-btn__dot" aria-hidden="true" />
              <span className="sr-only">connected</span>
            </p>
            <p className="num facts__id">{connected.account.address}</p>
          </div>
          <div className="acct-wallet__actions">
            <Link
              to="/watchlist"
              search={{ tab: "history" }}
              className="btn btn--glass btn--small"
            >
              Follow history
            </Link>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              data-tone="danger"
              onClick={() => void disconnectWallet()}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="acct-wallet">
          <span className="acct-wallet__mark">
            <Icon name="wallet" size={22} />
          </span>
          <div className="acct-wallet__who">
            <p className="acct-wallet__name">
              {state.status === "connecting"
                ? `Waiting for ${state.wallet.name}…`
                : "Not connected"}
            </p>
            <p className="page__text page__text--quiet">
              {wallets.length === 0
                ? "No Solana wallet found in this browser."
                : "Only needed to follow a plan. Connecting shares your address, nothing more."}
            </p>
          </div>
          <div className="acct-wallet__actions">
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={openWalletDialog}
            >
              {wallets.length === 0 ? "How to get one" : "Connect wallet"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Preferences() {
  const on = useCueCursorPref();
  const mounted = useMounted();
  const [blocked, setBlocked] = useState(false);
  return (
    <section className="panel" aria-labelledby="prefs-title">
      <h2 id="prefs-title" className="panel__title">
        Preferences
      </h2>
      <div className="pref">
        <div className="pref__text">
          <p className="pref__label" id="pref-cursor">
            Cue follows your pointer
          </p>
          <p className="page__text page__text--quiet" id="pref-cursor-note">
            Desktop with a mouse only. Off when your device asks for reduced
            motion. Text, buttons and forms always keep the normal cursor.
          </p>
          {blocked && (
            <p className="field__error" role="alert">
              Couldn't save: this browser is blocking local storage.
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={mounted ? on : true}
          aria-labelledby="pref-cursor"
          aria-describedby="pref-cursor-note"
          onClick={() => setBlocked(!setCueCursor(!on))}
        />
      </div>
    </section>
  );
}
