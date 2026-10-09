import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createSolanaRpc,
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
  type Transaction,
} from "@solana/kit";

export type SolanaRpc = ReturnType<typeof createSolanaRpc>;

/**
 * Polls until the cluster reports a confirmation status for the signature.
 * Returns true when the transaction succeeded and false when it landed with an error.
 */
export async function waitForSignature(
  rpc: SolanaRpc,
  signature: Signature,
  timeoutMs = 30_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const status = value[0];
    if (status?.confirmationStatus) return status.err === null;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The transaction was not confirmed in time");
}

/** Signs an already-composed transaction with a local key, sends it and waits for the result. */
export async function sendSigned(
  rpc: SolanaRpc,
  transaction: Transaction,
  signer: KeyPairSigner,
  options: { skipPreflight?: boolean } = {},
): Promise<{ signature: Signature; succeeded: boolean }> {
  const signed = await signTransaction([signer.keyPair], transaction);
  const signature = getSignatureFromTransaction(signed);
  await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signed), {
      encoding: "base64",
      skipPreflight: options.skipPreflight ?? false,
    })
    .send();
  return { signature, succeeded: await waitForSignature(rpc, signature) };
}

/**
 * Builds, signs (with `payer`, who is also the fee payer), sends and confirms a transaction made
 * of the given instructions. Throws if it fails. For scripts, tests and local tooling.
 */
export async function sendInstructions(
  rpc: SolanaRpc,
  instructions: Instruction[],
  payer: KeyPairSigner,
): Promise<Signature> {
  const { value: latest } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(payer.address, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latest, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );
  const { signature, succeeded } = await sendSigned(
    rpc,
    compileTransaction(message),
    payer,
  );
  if (!succeeded) throw new Error(`Transaction ${signature} failed`);
  return signature;
}
