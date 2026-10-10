// End-to-end proof of Phase 3 on a Surfpool mainnet fork with the REAL Jupiter route:
//
//   1. a creator publishes a plan (onchain, with a hash-committed text)
//   2. a follower swaps USDC for SOL through Jupiter inside begin_follow / finish_follow
//   3. the program records a receipt from the observed balance changes
//   4. time travels past the plan's expiry and a late follow is attempted directly against the
//      program with preflight disabled, so the failure lands onchain
//
// Run (fork must be running with the relay program deployed, see docs/spikes/surfpool-jupiter.md):
//   bun run --cwd domain demo:follow
//
// Burner keys only: never use a key that holds mainnet funds with a fork.

import {
  address,
  createSolanaRpc,
  generateKeyPairSigner,
  getBase64Encoder,
  getI64Codec,
  lamports,
  type Address,
} from "@solana/kit";
import {
  SOL,
  USDC,
  contentHash,
  formatUnits,
  parseJupiterBuild,
  parsePrice,
  type JupiterBuild,
} from "../src/index";
import {
  CLOCK_SYSVAR_ADDRESS,
  RELAY_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  composeFollowTx,
  sendInstructions,
  sendSigned,
  createPlanInstruction,
  decodeFollowReceipt,
  getAssociatedTokenAddress,
  getPlanAddress,
  getVersionAddress,
  assertLocalFork,
} from "../src/solana";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const RPC = process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
assertLocalFork(RPC, "follow-demo");
const JUPITER = process.env.JUPITER_BASE_URL ?? "https://api.jup.ag";
const DEXES =
  process.env.JUPITER_DEXES ?? "Orca V2,Raydium CLMM,Meteora DLMM,Raydium";
const rpc = createSolanaRpc(RPC);
const base64 = getBase64Encoder();
const SOL_MINT = address(SOL.mint);
const USDC_MINT = address(USDC.mint);

async function cheatcode(method: string, params: unknown[]): Promise<void> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body: unknown = await res.json();
  if (isRecord(body) && body.error) {
    throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  }
}

async function chainNowSec(): Promise<number> {
  const { value } = await rpc
    .getAccountInfo(CLOCK_SYSVAR_ADDRESS, { encoding: "base64" })
    .send();
  if (!value) throw new Error("clock unavailable");
  const bytes = Uint8Array.from(base64.encode(value.data[0]));
  return Number(getI64Codec().decode(bytes, 32));
}

async function fund(owner: Address, usdc: number): Promise<void> {
  await rpc.requestAirdrop(owner, lamports(5_000_000_000n)).send();
  await cheatcode("surfnet_setTokenAccount", [
    owner,
    USDC.mint,
    { amount: usdc },
    TOKEN_PROGRAM_ADDRESS,
  ]);
  await new Promise((r) => setTimeout(r, 1200));
}

async function solPriceUnits(): Promise<bigint> {
  const res = await fetch(`${JUPITER}/price/v3?ids=${SOL.mint}`);
  const body: unknown = await res.json();
  const entry = isRecord(body) ? body[SOL.mint] : undefined;
  if (isRecord(entry) && typeof entry.usdPrice === "number") {
    return parsePrice(entry.usdPrice.toFixed(6), USDC.decimals);
  }
  throw new Error("could not read the SOL price");
}

async function fetchBuild(
  follower: Address,
  usdcAmount: bigint,
): Promise<JupiterBuild> {
  const params = new URLSearchParams({
    inputMint: USDC.mint,
    outputMint: SOL.mint,
    amount: usdcAmount.toString(),
    taker: follower,
    slippageBps: "100",
    maxAccounts: "40",
    transactionVersion: "0",
    wrapAndUnwrapSol: "false",
    destinationTokenAccount: await getAssociatedTokenAddress(
      follower,
      SOL_MINT,
    ),
    dexes: DEXES,
  });
  const res = await fetch(`${JUPITER}/swap/v2/build?${params}`);
  const body: unknown = await res.json();
  if (!res.ok)
    throw new Error(`Jupiter /build failed: ${JSON.stringify(body)}`);
  return parseJupiterBuild(body);
}

async function main() {
  const creator = await generateKeyPairSigner();
  const follower = await generateKeyPairSigner();
  await fund(creator.address, 0);
  await fund(follower.address, 1_000_000_000);

  // 1. Publish a plan around the live price (+/- 5%), open for 10 minutes of CHAIN time.
  const price = await solPriceUnits();
  const entryLow = (price * 95n) / 100n;
  const entryHigh = (price * 105n) / 100n;
  const now = await chainNowSec();
  const expiresAt = BigInt(now + 600);
  const content = await contentHash({
    rationale: "Demo plan: buying SOL near the current price.",
    exitThesis: "Demo exit thesis, not a stop-loss order.",
    exitTarget: null,
    invalidation: null,
  });
  const planId = BigInt(Date.now());
  const plan = await getPlanAddress(creator.address, planId);
  await sendInstructions(
    rpc,
    [
      createPlanInstruction({
        creator: creator.address,
        plan,
        version: await getVersionAddress(plan, 1),
        baseMint: SOL_MINT,
        quoteMint: USDC_MINT,
        planId,
        entryLow,
        entryHigh,
        expiresAt,
        contentHash: content,
      }),
    ],
    creator,
  );
  console.log(
    `plan ${plan}  range $${formatUnits(entryLow, 6)} - $${formatUnits(entryHigh, 6)}  expires in 10 min (chain time)  program ${RELAY_PROGRAM_ADDRESS}`,
  );

  const spend = 100_000_000n; // 100 USDC

  async function followOnce(nonce: bigint, skipPreflight: boolean) {
    const build = await fetchBuild(follower.address, spend);
    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    const composed = await composeFollowTx({
      build,
      plan,
      version: 1,
      follower: follower.address,
      baseMint: SOL_MINT,
      quoteMint: USDC_MINT,
      nonce,
      maxQuoteIn: spend * 2n,
      blockhash,
      computeUnitLimit: 400_000,
      computeUnitPriceCap: 5_000_000n,
    });
    console.log(
      `  tx ${composed.sizeBytes}/1232 bytes, route: ${build.routeLabels.join(" > ")}`,
    );
    const { signature, succeeded } = await sendSigned(
      rpc,
      composed.transaction,
      follower,
      { skipPreflight },
    );
    return { signature, succeeded, receipt: composed.receipt };
  }

  // 2 + 3. A follow inside the window records a receipt.
  console.log("follow #1 (inside the window):");
  const ok = await followOnce(1n, false);
  if (!ok.succeeded) throw new Error("expected the first follow to succeed");
  const { value: receiptInfo } = await rpc
    .getAccountInfo(ok.receipt, { encoding: "base64" })
    .send();
  if (!receiptInfo) throw new Error("receipt account missing");
  const receipt = decodeFollowReceipt(base64.encode(receiptInfo.data[0]));
  console.log(
    `  RECORDED  spent ${formatUnits(receipt.quoteSpent, 6)} USDC, received ${formatUnits(receipt.baseReceived, 9)} SOL  (${ok.signature})`,
  );

  // 4. Past expiry the same follow fails onchain. skipPreflight so the failure lands and is visible.
  await cheatcode("surfnet_timeTravel", [
    { absoluteTimestamp: (now + 2 * 3600) * 1000 },
  ]);
  console.log(
    "follow #2 (after time travel past expiry, preflight skipped so the failure lands):",
  );
  const late = await followOnce(2n, true);
  const tx = await rpc
    .getTransaction(late.signature, {
      encoding: "json",
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    })
    .send();
  const reason =
    tx?.meta?.logMessages?.find((l) => l.includes("Error Code:")) ??
    "no error log found";
  console.log(`  FAILED ONCHAIN: ${reason.trim()}`);
  const { value: lateReceipt } = await rpc
    .getAccountInfo(late.receipt, { encoding: "base64" })
    .send();
  console.log(
    `  receipt account exists: ${lateReceipt !== null}  (must be false)`,
  );
  if (lateReceipt || late.succeeded) {
    throw new Error("the late follow must fail and leave no receipt");
  }
  console.log("OK");
}

await main();
