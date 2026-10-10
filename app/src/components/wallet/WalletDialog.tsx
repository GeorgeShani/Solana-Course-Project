import { useEffect, useRef } from "react";
import { CLUSTER, CLUSTER_LABEL } from "../../lib/config";
import { shortAddress } from "../../lib/format";
import {
  abandonConnect,
  closeWalletDialog,
  connectWallet,
  useWallet,
  type WalletEntry,
} from "../../lib/wallet";
import { Cue } from "../cue/Cue";
import { Icon } from "../ui/Icon";

const INSTALL = [
  { name: "Phantom", href: "https://phantom.com/download" },
  { name: "Solflare", href: "https://solflare.com/download" },
  { name: "Backpack", href: "https://backpack.app/downloads" },
];

function WalletMark({ w }: { w: WalletEntry }) {
  return w.icon ? (
    <img className="wallet-mark" src={w.icon} alt="" width={32} height={32} />
  ) : (
    <span className="wallet-mark wallet-mark--blank" aria-hidden="true">
      {w.name.slice(0, 1)}
    </span>
  );
}

/**
 * Choosing and connecting a wallet. Connecting shares the public address only: no signature is
 * requested here, ever. A closed or declined prompt is a choice (cancelled), not an error.
 */
export function WalletDialog() {
  const { state, wallets, dialogOpen } = useWallet();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (dialogOpen && !d.open) d.showModal();
    if (!dialogOpen && d.open) d.close();
  }, [dialogOpen]);

  const onClose = () => {
    if (state.status === "connecting") abandonConnect();
    closeWalletDialog();
  };

  return (
    <dialog
      ref={ref}
      className="wallet-dialog"
      aria-labelledby="wallet-title"
      data-cursor="native"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      <div className="wallet-dialog__body">
        <header className="wallet-dialog__head">
          <h2 id="wallet-title" className="wallet-dialog__title">
            {state.status === "connected"
              ? "Wallet connected"
              : "Connect a wallet"}
          </h2>
          <button
            type="button"
            className="btn btn--icon btn--ghost"
            onClick={() => ref.current?.close()}
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        {state.status === "connecting" ? (
          <div className="wallet-dialog__state" role="status">
            <span className="spinner" aria-hidden="true" />
            <p className="wallet-dialog__lead">
              Approve the connection in {state.wallet.name}
            </p>
            <p className="wallet-dialog__text">
              Relay asks for your address only. Connecting never signs anything.
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={abandonConnect}
            >
              Stop waiting
            </button>
          </div>
        ) : state.status === "connected" ? (
          <div className="wallet-dialog__state" role="status">
            <Icon name="in-range" size={40} className="wallet-dialog__ok" />
            <p className="wallet-dialog__lead">
              {state.wallet.name} ·{" "}
              <span className="num">{shortAddress(state.account.address)}</span>
            </p>
            <p className="wallet-dialog__text">
              Trades still need your approval in the wallet, one at a time.
            </p>
            <button
              type="button"
              className="btn btn--primary btn--large btn--block"
              onClick={() => ref.current?.close()}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {state.status === "cancelled" && (
              <p className="wallet-dialog__notice" role="status">
                Connection cancelled in {state.wallet.name}. Nothing was shared.
              </p>
            )}
            {state.status === "failed" && (
              <p
                className="wallet-dialog__notice wallet-dialog__notice--error"
                role="alert"
              >
                Couldn't connect to {state.wallet.name}: {state.message}.
              </p>
            )}
            {wallets.length > 0 ? (
              <ul className="wallet-list">
                {wallets.map((w) => (
                  <li key={w.name}>
                    <button
                      type="button"
                      className="wallet-option"
                      onClick={() => void connectWallet(w)}
                    >
                      <WalletMark w={w} />
                      <span className="wallet-option__name">{w.name}</span>
                      <span className="wallet-option__meta">
                        {state.status !== "disconnected" && state.wallet === w
                          ? "Try again"
                          : "Detected"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="wallet-missing">
                <Cue pose="unavailable" className="wallet-missing__cue" />
                <div>
                  <p className="wallet-dialog__lead">
                    No Solana wallet in this browser
                  </p>
                  <ol className="wallet-missing__steps">
                    <li>Install a wallet extension.</li>
                    <li>Reload this page.</li>
                    <li>Choose it here.</li>
                  </ol>
                  <p className="wallet-missing__links">
                    {INSTALL.map((w) => (
                      <a
                        key={w.name}
                        href={w.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {w.name}
                        <Icon name="external" size={14} />
                      </a>
                    ))}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <p className="wallet-dialog__foot">
          <Icon name="chain" size={14} />
          {CLUSTER === "localnet"
            ? `${CLUSTER_LABEL[CLUSTER]}: use a test wallet. This build trades on a local copy of Solana.`
            : `Network: ${CLUSTER_LABEL[CLUSTER]}.`}
        </p>
      </div>
    </dialog>
  );
}
