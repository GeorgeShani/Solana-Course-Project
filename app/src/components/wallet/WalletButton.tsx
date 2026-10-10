import { Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { shortAddress } from "../../lib/format";
import {
  disconnectWallet,
  openWalletDialog,
  useWallet,
} from "../../lib/wallet";
import { Icon } from "../ui/Icon";

/** The header's wallet control: connect, or the connected address with copy, account and disconnect. */
export function WalletButton() {
  const { state } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (state.status !== "connected") {
    const busy = state.status === "connecting";
    return (
      <button
        type="button"
        className="hdr-btn wallet-btn"
        onClick={openWalletDialog}
        aria-busy={busy}
      >
        <Icon name="wallet" size={16} />
        {busy ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.account.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="wallet-menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="hdr-btn wallet-btn"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="wallet-btn__dot" aria-hidden="true" />
        <span className="num">{shortAddress(state.account.address)}</span>
        <span className="sr-only">, {state.wallet.name} connected</span>
        <Icon name="details" size={14} />
      </button>
      {open && (
        <div id={menuId} className="wallet-menu__pop" data-cursor="native">
          <p className="wallet-menu__who">
            {state.wallet.name}
            <span className="num">{shortAddress(state.account.address)}</span>
          </p>
          <button
            type="button"
            className="wallet-menu__item"
            onClick={() => void copy()}
          >
            <Icon name="copy" size={16} />
            {copied ? "Copied" : "Copy address"}
          </button>
          <Link
            to="/account"
            className="wallet-menu__item"
            onClick={() => setOpen(false)}
          >
            <Icon name="account" size={16} />
            Account
          </Link>
          <button
            type="button"
            className="wallet-menu__item"
            onClick={() => {
              setOpen(false);
              void disconnectWallet();
            }}
          >
            <Icon name="close" size={16} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
