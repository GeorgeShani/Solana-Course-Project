// Phase 0 spike: land an UNMODIFIED Jupiter /build swap on a Surfpool mainnet fork.
// Throwaway script; lives in the scratchpad, not the repo.
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const RPC = "http://127.0.0.1:8899";
const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const OUT = new PublicKey(
  process.env.OUT_MINT ?? "So11111111111111111111111111111111111111112",
);
const AMOUNT = process.env.AMOUNT ?? "100000000"; // 100 USDC
const MAX_ACCOUNTS = process.env.MAX_ACCOUNTS ?? "40";
const EXTRA = process.env.EXTRA_QS ?? "";
const conn = new Connection(RPC, "confirmed");

async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`${method}: ${JSON.stringify(j.error)}`);
  return j.result;
}
const ix = (i) =>
  new TransactionInstruction({
    programId: new PublicKey(i.programId),
    keys: i.accounts.map((a) => ({
      pubkey: new PublicKey(a.pubkey),
      isSigner: a.isSigner,
      isWritable: a.isWritable,
    })),
    data: Buffer.from(i.data, "base64"),
  });

const burner = Keypair.generate();
console.log("burner", burner.publicKey.toBase58());

// 1. Fund: SOL for fees + 1000 USDC through cheatcodes
await conn.requestAirdrop(burner.publicKey, 2_000_000_000);
await new Promise((r) => setTimeout(r, 1500));
const fundRes = await rpc("surfnet_setTokenAccount", [
  burner.publicKey.toBase58(),
  USDC.toBase58(),
  { amount: 1_000_000_000 },
  TOKEN_PROGRAM_ID.toBase58(),
]);
console.log("fund USDC cheatcode ->", JSON.stringify(fundRes));
const usdcAta = getAssociatedTokenAddressSync(USDC, burner.publicKey);
const outAta = getAssociatedTokenAddressSync(OUT, burner.publicKey);
console.log(
  "USDC bal",
  JSON.stringify((await conn.getTokenAccountBalance(usdcAta)).value),
);

// 2. /build, unmodified except destination ATA
const qs = new URLSearchParams({
  inputMint: USDC.toBase58(),
  outputMint: OUT.toBase58(),
  amount: AMOUNT,
  taker: burner.publicKey.toBase58(),
  slippageBps: "100",
  maxAccounts: MAX_ACCOUNTS,
  transactionVersion: "0",
  wrapAndUnwrapSol: "false",
  destinationTokenAccount: outAta.toBase58(),
});
const build = await (
  await fetch(`https://api.jup.ag/swap/v2/build?${qs}${EXTRA}`)
).json();
if (!build.swapInstruction) {
  console.log("BUILD FAILED", JSON.stringify(build).slice(0, 500));
  process.exit(2);
}
console.log(
  "route",
  build.routePlan.map((r) => r.swapInfo.label),
  "in",
  build.inAmount,
  "out",
  build.outAmount,
  "min",
  build.otherAmountThreshold,
);
console.log(
  "setup",
  build.setupInstructions.map((i) => i.programId),
  "cleanup",
  build.cleanupInstruction && build.cleanupInstruction.programId,
  "other",
  build.otherInstructions.length,
  "tip",
  !!build.tipInstruction,
);

// 3. Assemble v0
const lutMap = build.addressesByLookupTableAddress ?? {};
const luts = Object.entries(lutMap).map(
  ([k, addrs]) =>
    new AddressLookupTableAccount({
      key: new PublicKey(k),
      state: {
        deactivationSlot: BigInt("18446744073709551615"),
        lastExtendedSlot: 0,
        lastExtendedSlotStartIndex: 0,
        authority: undefined,
        addresses: addrs.map((a) => new PublicKey(a)),
      },
    }),
);
const { blockhash } = await conn.getLatestBlockhash();
const instructions = [
  ...build.computeBudgetInstructions.map(ix),
  ...build.setupInstructions.map(ix),
  ix(build.swapInstruction),
];
const msg = new TransactionMessage({
  payerKey: burner.publicKey,
  recentBlockhash: blockhash,
  instructions,
}).compileToV0Message(luts);
const tx = new VersionedTransaction(msg);
tx.sign([burner]);
console.log("tx bytes (plain /build tx):", tx.serialize().length);

// 4. Simulate then send
const sim = await conn.simulateTransaction(tx, { sigVerify: false });
console.log(
  "simulate err:",
  JSON.stringify(sim.value.err),
  "CU:",
  sim.value.unitsConsumed,
);
if (sim.value.err) {
  console.log((sim.value.logs ?? []).slice(-12).join("\n"));
  process.exit(3);
}
const sig = await conn.sendTransaction(tx, { skipPreflight: false });
await conn.confirmTransaction(sig, "confirmed");
console.log("LANDED", sig);
console.log(
  "USDC after",
  JSON.stringify(
    (await conn.getTokenAccountBalance(usdcAta)).value.uiAmountString,
  ),
);
console.log(
  "OUT after",
  JSON.stringify((await conn.getTokenAccountBalance(outAta)).value),
);

// 5. Offline size with the REAL Relay begin/finish account lists (dummy keys, 26-byte begin, 8-byte finish data)
const relayProgram = Keypair.generate().publicKey;
const plan = Keypair.generate().publicKey,
  version = Keypair.generate().publicKey,
  receipt = Keypair.generate().publicKey;
const SYSVAR_IX = new PublicKey("Sysvar1nstructions1111111111111111111111111");
const SYSTEM = new PublicKey("11111111111111111111111111111111");
const begin = new TransactionInstruction({
  programId: relayProgram,
  data: Buffer.alloc(8 + 2 + 8 + 8),
  keys: [
    { pubkey: burner.publicKey, isSigner: true, isWritable: true },
    { pubkey: plan, isSigner: false, isWritable: false },
    { pubkey: version, isSigner: false, isWritable: false },
    { pubkey: receipt, isSigner: false, isWritable: true },
    { pubkey: outAta, isSigner: false, isWritable: false },
    { pubkey: usdcAta, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_IX, isSigner: false, isWritable: false },
    { pubkey: SYSTEM, isSigner: false, isWritable: false },
  ],
});
const finish = new TransactionInstruction({
  programId: relayProgram,
  data: Buffer.alloc(8),
  keys: [
    { pubkey: burner.publicKey, isSigner: true, isWritable: false },
    { pubkey: plan, isSigner: false, isWritable: false },
    { pubkey: version, isSigner: false, isWritable: false },
    { pubkey: receipt, isSigner: false, isWritable: true },
    { pubkey: outAta, isSigner: false, isWritable: false },
    { pubkey: usdcAta, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ],
});
const atas = [
  createAssociatedTokenAccountIdempotentInstruction(
    burner.publicKey,
    usdcAta,
    burner.publicKey,
    USDC,
  ),
  createAssociatedTokenAccountIdempotentInstruction(
    burner.publicKey,
    outAta,
    burner.publicKey,
    OUT,
  ),
];
const swapOnly = [
  ...build.computeBudgetInstructions.map(ix),
  ...atas,
  begin,
  ix(build.swapInstruction),
  finish,
];
try {
  const m2 = new TransactionMessage({
    payerKey: burner.publicKey,
    recentBlockhash: blockhash,
    instructions: swapOnly,
  }).compileToV0Message(luts);
  const t2 = new VersionedTransaction(m2);
  t2.sign([burner]);
  const n = t2.serialize().length;
  console.log(
    `OFFLINE SIZE with begin+swap+finish: ${n} bytes (limit 1232) -> ${n <= 1232 ? "FITS" : "TOO BIG"}; static keys ${m2.staticAccountKeys.length}, lut-resolved ${m2.addressTableLookups.reduce((a, l) => a + l.readonlyIndexes.length + l.writableIndexes.length, 0)}`,
  );
} catch (e) {
  console.log("OFFLINE SIZE failed:", e.message);
}
