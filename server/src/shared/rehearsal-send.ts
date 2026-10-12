import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransaction,
  type Instruction,
  type KeyPairSigner,
  type Signature,
} from "@solana/kit";
import { signature as signatureFromText } from "@solana/kit";
import type { SolanaRpc } from "@relay/domain/solana";
import { isRecord } from "./util";

export interface PendingRehearsalTransaction {
  signature: Signature;
  lastValidBlockHeight: string;
}

export function parsePendingTransaction(
  value: unknown,
): PendingRehearsalTransaction | null {
  if (value === undefined || value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.signature !== "string" ||
    !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(value.signature) ||
    typeof value.lastValidBlockHeight !== "string" ||
    !/^\d+$/.test(value.lastValidBlockHeight)
  )
    throw new Error(
      "Invalid pending transaction in rehearsal manifest; inspect it before resuming",
    );
  // Kit's guard validates the signature length/encoding, with no type assertion.
  return {
    signature: signatureFromText(value.signature),
    lastValidBlockHeight: value.lastValidBlockHeight,
  };
}

export function pendingOutcome(
  status: { confirmationStatus: string | null; err: unknown } | null,
  blockHeight: bigint,
  lastValidBlockHeight: bigint,
): "confirmed" | "failed" | "expired" | "pending" {
  if (
    status?.confirmationStatus === "confirmed" ||
    status?.confirmationStatus === "finalized"
  )
    return status.err === null ? "confirmed" : "failed";
  // A processed transaction might still land; don't treat it as absent even after the deadline.
  if (status) return "pending";
  return blockHeight > lastValidBlockHeight ? "expired" : "pending";
}

/** Keep the signature before sending. An uncertain transaction blocks all new sends on resume. */
export function rehearsalSender(
  rpc: SolanaRpc,
  signer: KeyPairSigner,
  save: (pending: PendingRehearsalTransaction | null) => void,
) {
  const timeout = () => ({ abortSignal: AbortSignal.timeout(15_000) });
  async function resolve(pending: PendingRehearsalTransaction): Promise<void> {
    const { value } = await rpc
      .getSignatureStatuses([pending.signature], {
        searchTransactionHistory: true,
      })
      .send(timeout());
    const height = await rpc
      .getBlockHeight({ commitment: "confirmed" })
      .send(timeout());
    const outcome = pendingOutcome(
      value[0] ?? null,
      height,
      BigInt(pending.lastValidBlockHeight),
    );
    if (outcome === "pending")
      throw new Error(
        `Transaction ${pending.signature} is not resolved. Nothing else was sent; resume the SAME manifest after it confirms or its blockhash expires`,
      );
    save(null);
    if (outcome === "failed")
      throw new Error(
        `Transaction ${pending.signature} failed. No successful setup or publication is claimed. Check the failure before resuming`,
      );
  }
  async function send(instructions: Instruction[]): Promise<Signature> {
    const { value: latest } = await rpc
      .getLatestBlockhash({ commitment: "confirmed" })
      .send(timeout());
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(signer.address, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latest, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    );
    const signed = await signTransaction(
      [signer.keyPair],
      compileTransaction(message),
    );
    const sig = getSignatureFromTransaction(signed);
    const pending = {
      signature: sig,
      lastValidBlockHeight: latest.lastValidBlockHeight.toString(),
    };
    save(pending);
    console.log(`Sending ${sig} (saved in the manifest before submission)`);
    await rpc
      .sendTransaction(getBase64EncodedWireTransaction(signed), {
        encoding: "base64",
        skipPreflight: false,
      })
      .send(timeout());
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const { value } = await rpc.getSignatureStatuses([sig]).send(timeout());
      const status = value[0];
      if (
        status?.confirmationStatus === "confirmed" ||
        status?.confirmationStatus === "finalized"
      ) {
        await resolve(pending);
        return sig;
      }
      await new Promise((done) => setTimeout(done, 500));
    }
    throw new Error(
      `Transaction ${sig} is not confirmed yet; resume the SAME manifest. The pending signature prevents a duplicate funding transaction`,
    );
  }
  return { send, resolve };
}
