import { NETWORKS } from "@relay/domain";
import { useSyncExternalStore } from "react";
import { CLUSTER } from "./config";

/**
 * Browser wallets through the Wallet Standard (https://github.com/wallet-standard): wallets
 * register themselves with the page, so no wallet SDK is bundled. Connecting asks only for the
 * public address; it never asks for a signature. Signing is a separate, explicit step that only
 * the trade review triggers.
 *
 * Everything a wallet hands back is `unknown` until checked here; nothing is cast.
 */

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null;
}

/** A bound method of a wallet feature, or null when the wallet doesn't provide it. */
function method(
  feature: unknown,
  name: string,
): ((...args: unknown[]) => Promise<unknown>) | null {
  if (!isRec(feature)) return null;
  const fn = feature[name];
  if (typeof fn !== "function") return null;
  return async (...args) => {
    const out: unknown = await fn.apply(feature, args);
    return out;
  };
}

export interface WalletEntry {
  name: string;
  /** A data: image URI, or null when the wallet's icon isn't one. */
  icon: string | null;
  features: Rec;
  /** The registered wallet object, kept to read its live accounts. */
  raw: Rec;
}

export interface WalletAccount {
  address: string;
  chains: string[];
  /** The wallet's own account object: signing requests must pass this exact object back. */
  raw: Rec;
}

/** A registered wallet Relay can use: a Solana chain and the standard connect feature. */
export function toWalletEntry(w: unknown): WalletEntry | null {
  if (!isRec(w)) return null;
  const { name, icon, chains, features } = w;
  if (typeof name !== "string" || name.trim() === "") return null;
  if (!Array.isArray(chains) || !isRec(features)) return null;
  if (!chains.some((c) => typeof c === "string" && c.startsWith("solana:")))
    return null;
  if (!method(features["standard:connect"], "connect")) return null;
  return {
    name,
    icon:
      typeof icon === "string" && icon.startsWith("data:image/") ? icon : null,
    features,
    raw: w,
  };
}

export function toWalletAccount(a: unknown): WalletAccount | null {
  if (!isRec(a) || typeof a.address !== "string" || a.address === "")
    return null;
  const chains = Array.isArray(a.chains)
    ? a.chains.filter((c): c is string => typeof c === "string")
    : [];
  return { address: a.address, chains, raw: a };
}

function accountsOf(v: unknown): WalletAccount[] {
  if (!isRec(v) || !Array.isArray(v.accounts)) return [];
  return v.accounts
    .map(toWalletAccount)
    .filter((a): a is WalletAccount => a !== null);
}

/** The person closed or declined the wallet's prompt: a choice, not a failure. */
export function isUserRejection(e: unknown): boolean {
  if (isRec(e) && (e.code === 4001 || e.code === "ACTION_REJECTED"))
    return true;
  const message = e instanceof Error ? e.message : isRec(e) ? e.message : "";
  return (
    typeof message === "string" &&
    /reject|cancel|denied|declin|abort|closed/i.test(message)
  );
}

function messageOf(e: unknown): string {
  const m = e instanceof Error ? e.message : isRec(e) ? e.message : null;
  return typeof m === "string" && m.trim() !== ""
    ? m.trim().replace(/\.$/, "")
    : "The wallet returned an error";
}

export type WalletState =
  | { status: "disconnected" }
  | { status: "connecting"; wallet: WalletEntry }
  | {
      status: "connected";
      wallet: WalletEntry;
      account: WalletAccount;
    }
  | { status: "cancelled"; wallet: WalletEntry }
  | { status: "failed"; wallet: WalletEntry; message: string };

const LAST_WALLET_KEY = "relay:wallet";
const DISCONNECTED: WalletState = { status: "disconnected" };

let wallets: readonly WalletEntry[] = [];
let state: WalletState = DISCONNECTED;
let dialogOpen = false;
let attempt = 0;
let stopEvents: (() => void) | null = null;
let discovered = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(next: WalletState) {
  state = next;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  startDiscovery();
  return () => listeners.delete(cb);
}

function register(...ws: unknown[]) {
  const added = ws
    .map(toWalletEntry)
    .filter((w): w is WalletEntry => w !== null)
    .filter((w) => !wallets.some((x) => x.raw === w.raw));
  if (added.length > 0) {
    wallets = [...wallets, ...added];
    emit();
    reconnect(added);
  }
  return () => {
    wallets = wallets.filter((w) => !ws.includes(w.raw));
    emit();
  };
}

/** The app half of the Wallet Standard handshake; wallets that load later register themselves. */
function startDiscovery() {
  if (discovered || typeof window === "undefined") return;
  discovered = true;
  const api = Object.freeze({ register });
  window.addEventListener("wallet-standard:register-wallet", (e) => {
    if (e instanceof CustomEvent && typeof e.detail === "function")
      e.detail(api);
  });
  window.dispatchEvent(
    new CustomEvent("wallet-standard:app-ready", { detail: api }),
  );
}

function remembered(): string | null {
  try {
    return localStorage.getItem(LAST_WALLET_KEY);
  } catch {
    return null;
  }
}

function remember(name: string | null) {
  try {
    if (name) localStorage.setItem(LAST_WALLET_KEY, name);
    else localStorage.removeItem(LAST_WALLET_KEY);
  } catch {
    // Storage blocked: the wallet just isn't reconnected next visit.
  }
}

/** A wallet the visitor used before reconnects silently; if it would prompt, it simply doesn't. */
function reconnect(added: readonly WalletEntry[]) {
  if (state.status !== "disconnected") return;
  const name = remembered();
  const w = added.find((x) => x.name === name);
  if (w) void connectWallet(w, { silent: true });
}

function watchAccounts(w: WalletEntry) {
  stopEvents?.();
  stopEvents = null;
  const events = w.features["standard:events"];
  const on = isRec(events) ? events.on : null;
  if (typeof on !== "function") return;
  const off: unknown = on.call(events, "change", (props: unknown) => {
    if (!isRec(props) || !("accounts" in props)) return;
    if (state.status !== "connected" || state.wallet !== w) return;
    const next = accountsOf(props)[0];
    if (!next) {
      setState(DISCONNECTED);
      remember(null);
    } else if (next.address !== state.account.address) {
      setState({ ...state, account: next });
    }
  });
  if (typeof off === "function") stopEvents = () => off();
}

export async function connectWallet(
  w: WalletEntry,
  options: { silent?: boolean } = {},
): Promise<void> {
  const mine = ++attempt;
  const connect = method(w.features["standard:connect"], "connect");
  if (!connect) {
    setState({
      status: "failed",
      wallet: w,
      message: "This wallet doesn't support connecting",
    });
    return;
  }
  if (!options.silent) setState({ status: "connecting", wallet: w });
  try {
    const out = await connect(options.silent ? { silent: true } : undefined);
    if (mine !== attempt) return;
    const solana = (a: WalletAccount) =>
      a.chains.length === 0 || a.chains.some((c) => c.startsWith("solana:"));
    const account =
      accountsOf(out).find(solana) ?? accountsOf(w.raw).find(solana);
    if (!account) {
      if (options.silent) return;
      setState({
        status: "failed",
        wallet: w,
        message: "The wallet didn't share a Solana account",
      });
      return;
    }
    setState({ status: "connected", wallet: w, account });
    remember(w.name);
    watchAccounts(w);
  } catch (e) {
    if (mine !== attempt || options.silent) return;
    setState(
      isUserRejection(e)
        ? { status: "cancelled", wallet: w }
        : { status: "failed", wallet: w, message: messageOf(e) },
    );
  }
}

/** Stops waiting for a pending connection. The wallet's own prompt may stay open; its answer is ignored. */
export function abandonConnect() {
  attempt++;
  if (state.status !== "connected") setState(DISCONNECTED);
}

export async function disconnectWallet(): Promise<void> {
  attempt++;
  const w = state.status === "connected" ? state.wallet : null;
  stopEvents?.();
  stopEvents = null;
  remember(null);
  setState(DISCONNECTED);
  const disconnect =
    w && method(w.features["standard:disconnect"], "disconnect");
  try {
    await disconnect?.();
  } catch {
    // Relay already forgot the account; the wallet's own state isn't ours to fix.
  }
}

/** The Wallet Standard chain id for this build's cluster, when the account lists it. */
function chainFor(account: WalletAccount): string | undefined {
  const id = NETWORKS[CLUSTER].walletChain;
  return account.chains.includes(id) ? id : undefined;
}

export class WalletSignError extends Error {
  readonly cancelled: boolean;
  constructor(message: string, cancelled: boolean) {
    super(message);
    this.name = "WalletSignError";
    this.cancelled = cancelled;
  }
}

/**
 * Asks the connected wallet to sign (not send) one transaction. Relay sends it itself, to the
 * cluster this build runs on, so a wallet set to another network can't broadcast it there.
 */
export async function signWithWallet(wire: Uint8Array): Promise<Uint8Array> {
  if (state.status !== "connected")
    throw new WalletSignError("Connect a wallet first", false);
  const { wallet, account } = state;
  const sign = method(
    wallet.features["solana:signTransaction"],
    "signTransaction",
  );
  if (!sign)
    throw new WalletSignError(
      `${wallet.name} can't sign a transaction for Relay to send`,
      false,
    );
  const chain = chainFor(account);
  let out: unknown;
  try {
    out = await sign({
      account: account.raw,
      transaction: wire,
      ...(chain ? { chain } : {}),
    });
  } catch (e) {
    throw new WalletSignError(
      isUserRejection(e)
        ? "You declined in your wallet. Nothing was signed."
        : messageOf(e),
      isUserRejection(e),
    );
  }
  const first: unknown = Array.isArray(out) ? out[0] : undefined;
  if (!isRec(first) || !(first.signedTransaction instanceof Uint8Array))
    throw new WalletSignError(
      "The wallet didn't return a signed transaction",
      false,
    );
  return first.signedTransaction;
}

export function openWalletDialog() {
  dialogOpen = true;
  if (state.status === "cancelled" || state.status === "failed")
    state = DISCONNECTED;
  emit();
}

export function closeWalletDialog() {
  dialogOpen = false;
  emit();
}

interface Snapshot {
  state: WalletState;
  wallets: readonly WalletEntry[];
  dialogOpen: boolean;
}

let snap: Snapshot = { state, wallets, dialogOpen };
const SERVER: Snapshot = {
  state: DISCONNECTED,
  wallets: [],
  dialogOpen: false,
};

function read(): Snapshot {
  if (
    snap.state !== state ||
    snap.wallets !== wallets ||
    snap.dialogOpen !== dialogOpen
  )
    snap = { state, wallets, dialogOpen };
  return snap;
}

export function useWallet(): Snapshot {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}
