import {
  SUPPORTED_PAIRS,
  formatUnits,
  parseJupiterBuild,
  parseUnits,
  type Pair,
} from "@relay/domain";
import { composeFollowTx, waitForSignature } from "@relay/domain/solana";
import {
  address,
  blockhash,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  getTransactionDecoder,
  getTransactionEncoder,
} from "@solana/kit";
import {
  ApiRequestError,
  verifyFollow,
  type ExecutionView,
  type QuoteView,
} from "./api";
import { getRpc } from "./solana";

/** The server's limits on one approved follow (server/src/services/follow.ts), in USDC. */
export const MIN_FOLLOW_USDC = "1";
export const MAX_FOLLOW_USDC = "1000";
/** The server composes with this cap; the client must compose the identical transaction. */
const PRIORITY_FEE_CAP_MICRO_LAMPORTS = 5_000_000n;
const VERIFY_ATTEMPTS = 6;
const VERIFY_GAP_MS = 1500;

export type AmountCheck =
  | { ok: true; units: bigint; text: string }
  | { ok: false; message: string | null };

/** Checks a typed amount against the quote token's decimals and the server's limits. Empty is not an error yet. */
export function checkFollowAmount(raw: string, decimals: number): AmountCheck {
  const text = raw.trim().replace(/,/g, "");
  if (text === "") return { ok: false, message: null };
  let units: bigint;
  try {
    units = parseUnits(text, decimals);
  } catch {
    return {
      ok: false,
      message: `Enter an amount with up to ${decimals} decimals`,
    };
  }
  if (units < parseUnits(MIN_FOLLOW_USDC, decimals))
    return { ok: false, message: `The minimum is ${MIN_FOLLOW_USDC} USDC` };
  if (units > parseUnits(MAX_FOLLOW_USDC, decimals))
    return { ok: false, message: `The maximum is ${MAX_FOLLOW_USDC} USDC` };
  return { ok: true, units, text };
}

export function pairById(id: string): Pair | undefined {
  return SUPPORTED_PAIRS.find((p) => p.id === id);
}

export function formatSol(lamports: bigint): string {
  return formatUnits(lamports, 9);
}

/** Rebuilds, from the quote, exactly the transaction the server simulated. */
export async function composeFromQuote(quote: QuoteView, pair: Pair) {
  const { summary: s, compose: c } = quote;
  return composeFollowTx({
    build: parseJupiterBuild(c.build),
    plan: address(s.planPda),
    version: s.version,
    follower: address(s.follower),
    baseMint: address(pair.base.mint),
    quoteMint: address(pair.quote.mint),
    nonce: BigInt(c.nonce),
    maxQuoteIn: BigInt(c.maxQuoteIn),
    blockhash: {
      blockhash: blockhash(c.blockhash),
      lastValidBlockHeight: BigInt(c.lastValidBlockHeight),
    },
    computeUnitLimit: c.computeUnitLimit,
    computeUnitPriceCap: PRIORITY_FEE_CAP_MICRO_LAMPORTS,
  });
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export class FollowSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FollowSendError";
  }
}

/** Serializes the unsigned transaction for the wallet. */
export function wireOf(
  tx: Awaited<ReturnType<typeof composeFromQuote>>["transaction"],
): Uint8Array {
  return new Uint8Array(getTransactionEncoder().encode(tx));
}

/**
 * Sends a wallet-signed transaction to this build's cluster, after checking the wallet signed the
 * same message Relay reviewed. Returns the signature and whether it landed without an error.
 */
export async function sendSigned(
  unsigned: Uint8Array,
  signed: Uint8Array,
): Promise<{ signature: string; succeeded: boolean }> {
  const decoder = getTransactionDecoder();
  const before = decoder.decode(unsigned);
  const after = decoder.decode(signed);
  if (
    !sameBytes(
      new Uint8Array(before.messageBytes),
      new Uint8Array(after.messageBytes),
    )
  )
    throw new FollowSendError(
      "Your wallet changed the transaction, so Relay didn't send it",
    );
  const signature = getSignatureFromTransaction(after);
  const rpc = getRpc();
  try {
    await rpc
      .sendTransaction(getBase64EncodedWireTransaction(after), {
        encoding: "base64",
        preflightCommitment: "confirmed",
      })
      .send();
  } catch (e) {
    throw new FollowSendError(
      e instanceof Error
        ? `The network refused it: ${e.message}`
        : "The network refused it",
    );
  }
  const succeeded = await waitForSignature(rpc, signature, 45_000);
  return { signature, succeeded };
}

/** Asks the server to read the landed transaction and its receipt. Retries while it isn't visible yet. */
export async function verifyWithRetry(
  base: string,
  signature: string,
): Promise<ExecutionView> {
  for (let i = 1; ; i++) {
    try {
      return await verifyFollow(base, signature);
    } catch (e) {
      const notYet =
        e instanceof ApiRequestError && e.code === "transaction_not_found";
      if (!notYet || i >= VERIFY_ATTEMPTS) throw e;
      await new Promise((r) => setTimeout(r, VERIFY_GAP_MS));
    }
  }
}

/** The follower's token balance for one mint, or null when the cluster can't tell us. */
export async function fetchTokenBalance(
  owner: string,
  mint: string,
): Promise<bigint | null> {
  const res = await getRpc()
    .getTokenAccountsByOwner(
      address(owner),
      { mint: address(mint) },
      { encoding: "jsonParsed" },
    )
    .send();
  let total = 0n;
  for (const item of res.value) {
    const data: unknown = item.account.data;
    const amount = tokenAmountOf(data);
    if (amount === null) return null;
    total += amount;
  }
  return total;
}

function tokenAmountOf(data: unknown): bigint | null {
  const pick = (v: unknown, k: string): unknown =>
    typeof v === "object" && v !== null && k in v
      ? Object.getOwnPropertyDescriptor(v, k)?.value
      : undefined;
  const amount = pick(
    pick(pick(pick(data, "parsed"), "info"), "tokenAmount"),
    "amount",
  );
  return typeof amount === "string" && /^\d+$/.test(amount)
    ? BigInt(amount)
    : null;
}
