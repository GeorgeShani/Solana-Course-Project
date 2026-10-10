// Acts as a follower of the API, end to end, on the Surfpool fork:
//
//   1. pick an in-range plan from GET /feed
//   2. POST /follow/quote, rebuild the transaction locally from the returned inputs, sign, send
//   3. POST /follow/verify (the only thing the client sends is the signature)
//   4. GET /me/executions
//   5. bypass the quote, send a doomed transaction against an expired plan, and verify that it is
//      recorded as FAILED with its reason
//
// Needs the fork, the deployed program, Postgres, a running server (SOLANA_CLUSTER=localnet) and
// seeded plans (bun run --cwd server seed):
//   bun run --cwd server scripts/follow-via-api.ts

import {
  address,
  createSolanaRpc,
  generateKeyPairSigner,
  lamports,
} from "@solana/kit";
import { USDC, parseJupiterBuild } from "@relay/domain";
import {
  TOKEN_PROGRAM_ADDRESS,
  assertLocalFork,
  composeFollowTx,
  getAssociatedTokenAddress,
  sendSigned,
} from "@relay/domain/solana";
import { isRecord } from "../src/util";

const RPC = process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
assertLocalFork(RPC, "follow-via-api");
const API = process.env.API_URL ?? "http://127.0.0.1:3001";
const ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:5173";
const JUPITER = process.env.JUPITER_BASE_URL ?? "https://api.jup.ag";
const DEXES =
  process.env.JUPITER_DEXES ?? "Orca V2,Raydium CLMM,Meteora DLMM,Raydium";
const rpc = createSolanaRpc(RPC);
const USDC_MINT = address(USDC.mint);

async function api(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json: unknown = await res.json();
  if (!isRecord(json)) throw new Error(`unexpected response from ${path}`);
  return { status: res.status, json };
}

function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error("expected a list");
  return value.map((v: unknown) => {
    if (!isRecord(v)) throw new Error("expected an object");
    return v;
  });
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} should be text`);
  return value;
}

async function cheatcode(method: string, params: unknown[]): Promise<void> {
  await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

async function rawBuild(
  follower: string,
  baseMint: string,
  amount: bigint,
): Promise<unknown> {
  const params = new URLSearchParams({
    inputMint: USDC.mint,
    outputMint: baseMint,
    amount: amount.toString(),
    taker: follower,
    slippageBps: "100",
    maxAccounts: "40",
    transactionVersion: "0",
    wrapAndUnwrapSol: "false",
    destinationTokenAccount: await getAssociatedTokenAddress(
      address(follower),
      address(baseMint),
    ),
    dexes: DEXES,
  });
  const res = await fetch(`${JUPITER}/swap/v2/build?${params}`);
  return res.json();
}

async function main() {
  const follower = await generateKeyPairSigner();
  await rpc.requestAirdrop(follower.address, lamports(5_000_000_000n)).send();
  await cheatcode("surfnet_setTokenAccount", [
    follower.address,
    USDC.mint,
    { amount: 1_000_000_000 },
    TOKEN_PROGRAM_ADDRESS,
  ]);
  await new Promise((r) => setTimeout(r, 1500));

  const feed = list((await api("GET", "/feed")).json.items);
  const target = feed.find(
    (i) => isRecord(i.entry) && i.entry.status === "in_range",
  );
  const expired = feed.find(
    (i) => isRecord(i.entry) && i.entry.status === "expired",
  );
  if (!target)
    throw new Error("no in-range plan in the feed. Run the seed first.");
  const planPda = address(text(target.planPda, "planPda"));
  console.log(
    `following ${text(isRecord(target.creator) ? target.creator.displayName : "", "creator")} ${planPda}`,
  );

  // 2. quote -> rebuild locally -> sign -> send
  const q = await api("POST", "/follow/quote", {
    planPda,
    version:
      target.version && isRecord(target.version) ? target.version.version : 1,
    follower: follower.address,
    quoteAmount: "100",
  });
  if (q.status !== 200)
    throw new Error(`quote failed: ${JSON.stringify(q.json)}`);
  const summary = isRecord(q.json.summary) ? q.json.summary : {};
  const c = isRecord(q.json.compose) ? q.json.compose : {};
  console.log(
    `quote: pay ${JSON.stringify(summary.pay)} receive ${JSON.stringify(summary.receive)} min ${JSON.stringify(summary.minimumReceive)} check=${String(summary.check)} route=${JSON.stringify(summary.routeLabels)}`,
  );
  const composed = await composeFollowTx({
    build: parseJupiterBuild(c.build),
    plan: planPda,
    version: Number(isRecord(target.version) ? target.version.version : 1),
    follower: follower.address,
    baseMint: address(
      text(isRecord(target.pair) ? target.pair.baseMint : "", "baseMint"),
    ),
    quoteMint: USDC_MINT,
    nonce: BigInt(text(c.nonce, "nonce")),
    maxQuoteIn: BigInt(text(c.maxQuoteIn, "maxQuoteIn")),
    blockhash: {
      blockhash: (await rpc.getLatestBlockhash().send()).value.blockhash,
      lastValidBlockHeight: BigInt(
        text(c.lastValidBlockHeight, "lastValidBlockHeight"),
      ),
    },
    computeUnitLimit: Number(c.computeUnitLimit),
    computeUnitPriceCap: 5_000_000n,
  });
  const sent = await sendSigned(rpc, composed.transaction, follower);
  console.log(
    `sent ${sent.signature} succeeded=${sent.succeeded} size=${composed.sizeBytes}`,
  );

  // 3. verify: the client only sends the signature
  const v = await api("POST", "/follow/verify", { signature: sent.signature });
  console.log(
    `verify: ${v.status} ${JSON.stringify({ status: v.json.status, quoteSpent: v.json.quoteSpent, baseReceived: v.json.baseReceived, effectivePrice: v.json.effectivePrice })}`,
  );

  // 4. history
  const mine = list(
    (await api("GET", `/me/executions?follower=${follower.address}`)).json
      .items,
  );
  console.log(
    `history: ${mine.length} execution(s), first is ${String(mine[0]?.status)}`,
  );

  // 5. a doomed follow, recorded as failed
  if (expired) {
    const expiredPda = address(text(expired.planPda, "planPda"));
    const build = parseJupiterBuild(
      await rawBuild(
        follower.address,
        text(isRecord(expired.pair) ? expired.pair.baseMint : "", "baseMint"),
        100_000_000n,
      ),
    );
    const doomed = await composeFollowTx({
      build,
      plan: expiredPda,
      version: 1,
      follower: follower.address,
      baseMint: address(
        text(isRecord(expired.pair) ? expired.pair.baseMint : "", "baseMint"),
      ),
      quoteMint: USDC_MINT,
      nonce: 777n,
      maxQuoteIn: 200_000_000n,
      blockhash: (await rpc.getLatestBlockhash().send()).value,
      computeUnitLimit: 400_000,
      computeUnitPriceCap: 5_000_000n,
    });
    const bad = await sendSigned(rpc, doomed.transaction, follower, {
      skipPreflight: true,
    });
    const f = await api("POST", "/follow/verify", { signature: bad.signature });
    console.log(
      `doomed follow: landed succeeded=${bad.succeeded}; verify: ${f.status} ${JSON.stringify({ status: f.json.status, errorName: f.json.errorName, message: f.json.errorMessage, receipt: f.json.receiptPda })}`,
    );
    if (f.json.status !== "failed")
      throw new Error("a failed transaction must be recorded as failed");
  }
  if (v.json.status !== "recorded")
    throw new Error("the in-range follow must be recorded");
  console.log("OK");
}

await main();
