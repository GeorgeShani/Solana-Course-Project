import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cue } from "../components/cue/Cue";
import { Icon } from "../components/ui/Icon";
import { CLUSTER, CLUSTER_LABEL, NETWORK_INFO, RPC_URL } from "../lib/config";
import { setCueCursor, useCueCursorPref } from "../lib/cue-cursor";
import {
  refreshAuth,
  signInWithGoogle,
  signOut,
  useGoogleAuth,
} from "../features/account/google-auth";
import { useMounted } from "../lib/mounted";
import { requestWelcome } from "../features/onboarding/welcome-state";
import { disconnectWallet, openWalletDialog, useWallet } from "../lib/wallet";

export const Route = createFileRoute("/account")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { auth_error?: "cancelled" | "failed" } => {
    const e = search.auth_error;
    return e === "cancelled" || e === "failed" ? { auth_error: e } : {};
  },
  head: () => ({ meta: [{ title: "Account · Relay" }] }),
  component: Account,
});

function Account() {
  const { auth_error } = Route.useSearch();
  return (
    <section className="page" aria-labelledby="account-title">
      <header className="page__head">
        <h1 id="account-title" className="page__title">
          Account
        </h1>
      </header>

      <div className="acct">
        <GoogleSection authError={auth_error} />
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
                <span className="facts__note">{NETWORK_INFO.note}</span>
              </dd>
            </div>
            <div>
              <dt>RPC</dt>
              <dd className="num facts__id">
                {RPC_URL}
                {RPC_URL.endsWith("/rpc") && (
                  <span className="facts__note">
                    Relay's proxy to its Solana provider. It forwards a fixed
                    set of read, simulate and send calls.
                  </span>
                )}
              </dd>
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
              Relay's usher. Reopen the full welcome any time.
            </p>
            <div className="notice__actions">
              <button
                type="button"
                className="btn btn--glass btn--small"
                onClick={requestWelcome}
              >
                Show welcome
              </button>
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

function GoogleSection({
  authError,
}: {
  authError: "cancelled" | "failed" | undefined;
}) {
  const auth = useGoogleAuth();
  const mounted = useMounted();

  // If we've just come back from the Google callback, refresh auth state once.
  useEffect(() => {
    if (authError === undefined) refreshAuth();
  }, [authError]);

  const loading = !mounted || auth.status === "loading";

  return (
    <section className="panel" aria-labelledby="google-auth-title">
      <h2 id="google-auth-title" className="panel__title">
        Sign in
      </h2>

      {authError === "cancelled" && (
        <p
          className="field__error"
          role="alert"
          style={{ marginBottom: "var(--s2)" }}
        >
          Sign-in was cancelled.
        </p>
      )}
      {authError === "failed" && (
        <p
          className="field__error"
          role="alert"
          style={{ marginBottom: "var(--s2)" }}
        >
          Sign-in failed. Please try again.
        </p>
      )}

      {loading ? (
        <p className="page__text" aria-busy="true">
          Checking sign-in…
        </p>
      ) : auth.status === "signed_in" ? (
        <div className="acct-google">
          {auth.user.picture ? (
            <img
              src={auth.user.picture}
              alt=""
              width={48}
              height={48}
              className="acct-google__avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="acct-google__avatar acct-google__avatar--placeholder">
              <Icon name="account" size={24} />
            </span>
          )}
          <div className="acct-google__info">
            <p className="acct-google__name">{auth.user.name}</p>
            <p className="page__text page__text--quiet">{auth.user.email}</p>
          </div>
          <button
            id="google-sign-out-btn"
            type="button"
            className="btn btn--ghost btn--small"
            data-tone="danger"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="acct-google">
          <p className="page__text page__text--quiet" style={{ flexGrow: 1 }}>
            Optional. Discovering ideas, opening sources and watching need no
            account.
          </p>
          <button
            id="google-sign-in-btn"
            type="button"
            className="btn btn--google"
            onClick={signInWithGoogle}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      )}
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
              search={{ tab: "receipts" }}
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
    <section
      className="panel panel--pointer-only"
      aria-labelledby="prefs-title"
    >
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
