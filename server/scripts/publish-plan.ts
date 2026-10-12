// Publishes ONE real plan on the network in .env (devnet), signed by the creator's own keypair file.
//
//   bun run --cwd server publish-plan \
//     --keypair <creator keypair file> --pair sol-usdc \
//     --entry-low 140 --entry-high 145 --expires-in 24h \
//     --rationale "why this plan, in your words" --exit-thesis "how you will decide to exit" \
//     [--exit-target 160] [--invalidation 130] [--dry-run]
//
// The text can come from a JSON file instead: --content-file plan.json, with the fields rationale,
// exitThesis and optionally exitTarget and invalidation (prices as text, e.g. "160.50").
//
// What it does: (1) checks the RPC really is devnet and the Relay program is there, (2) validates the
// terms and the text with the same rules as the program and the server, (3) sends `create_plan`
// signed by YOUR key, (4) posts the text to POST /plans/:planPda/confirm, which the server accepts only
// if its hash matches what the chain now holds. --dry-run stops after step 2 and sends nothing.
//
// If step 4 fails (the API is down, say) the plan is already on chain. Re-send only the text:
//   bun run --cwd server publish-plan --confirm-only <planPda> --version 1 <the same text flags>
//
// The key never leaves this machine and is never printed. The creator needs about 0.01 devnet SOL.
// The text is whatever you give it: nothing is filled in, and a plan is an onchain commitment, so do
// not publish placeholder text you would not want to stand behind. Devnet only: test tokens, no value.
import { readFileSync } from "node:fs";
import {
  address,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  getBase64Encoder,
  getI64Codec,
} from "@solana/kit";
import {
  ContentError,
  NETWORKS,
  TermsError,
  contentHash,
  explorerUrl,
  findPair,
  formatUnits,
  validateTerms,
} from "@relay/domain";
import {
  CLOCK_SYSVAR_ADDRESS,
  RELAY_PROGRAM_ADDRESS,
  assertLocalFork,
  createPlanInstruction,
  getPlanAddress,
  getVersionAddress,
  sendInstructions,
} from "@relay/domain/solana";
import { loadEnv } from "../src/shared/env";
import {
  contentFromInput,
  contentInputFromJson,
  parseDuration,
  parseKeypairFile,
  type ContentWire,
} from "../src/shared/publish-input";

const VALUE_FLAGS = [
  "keypair",
  "pair",
  "entry-low",
  "entry-high",
  "expires-in",
  "rationale",
  "exit-thesis",
  "exit-target",
  "invalidation",
  "content-file",
  "api",
  "origin",
  "confirm-only",
  "version",
] as const;
const BOOLEAN_FLAGS = ["dry-run", "help"] as const;

class UsageError extends Error {}

function parseArgs(argv: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? "";
    if (!token.startsWith("--")) throw new UsageError(`Unexpected "${token}"`);
    const name = token.slice(2);
    if (BOOLEAN_FLAGS.some((f) => f === name)) {
      out.set(name, "true");
      continue;
    }
    if (!VALUE_FLAGS.some((f) => f === name))
      throw new UsageError(`Unknown option --${name}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--"))
      throw new UsageError(`--${name} needs a value`);
    out.set(name, value);
    i++;
  }
  return out;
}

function need(args: Map<string, string>, name: string): string {
  const value = args.get(name);
  if (value === undefined || value === "")
    throw new UsageError(`--${name} is required`);
  return value;
}

const LAMPORTS_NEEDED = 10_000_000n; // 0.01 SOL: plan rent (about 0.004) and the fee, with room

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.has("help")) {
    console.log(
      readFileSync(new URL(import.meta.url), "utf8")
        .split("\n")
        .filter((l) => l.startsWith("//"))
        .map((l) => l.replace(/^\/\/ ?/, ""))
        .join("\n"),
    );
    return;
  }

  const env = loadEnv();
  const pair = findPair(args.get("pair") ?? "sol-usdc", env.cluster);
  if (!pair) throw new UsageError(`--pair is not supported on ${env.cluster}`);

  // The text first: it needs no key and no network, so mistakes show up before anything else.
  const fileText = args.get("content-file");
  const input = fileText
    ? contentInputFromJson(readFileSync(fileText, "utf8"))
    : {
        rationale: args.get("rationale"),
        exitThesis: args.get("exit-thesis"),
        exitTarget: args.get("exit-target"),
        invalidation: args.get("invalidation"),
      };
  const { content, wire } = contentFromInput(input, pair.quote.decimals);

  const apiBase =
    args.get("api") ?? process.env.API_URL ?? "http://127.0.0.1:3001";
  const origin = args.get("origin") ?? env.appOrigin;

  const onlyPlan = args.get("confirm-only");
  if (onlyPlan !== undefined) {
    const version = Number(args.get("version") ?? "1");
    if (!Number.isInteger(version) || version < 1)
      throw new UsageError("--version must be a whole number from 1");
    await confirm(apiBase, origin, onlyPlan, version, wire);
    console.log(`Text confirmed for ${onlyPlan} (version ${version}).`);
    return;
  }

  const rpc = createSolanaRpc(env.solanaRpcUrl);
  if (env.cluster === "devnet") {
    const genesis = await rpc.getGenesisHash().send();
    if (genesis !== NETWORKS.devnet.genesisHash)
      throw new Error(
        "The RPC in .env is not Solana devnet (its genesis hash differs). Relay runs on devnet only, so nothing was sent.",
      );
  } else {
    assertLocalFork(env.solanaRpcUrl, "publish-plan");
  }
  const program = await rpc
    .getAccountInfo(address(RELAY_PROGRAM_ADDRESS), { encoding: "base64" })
    .send();
  if (!program.value?.executable)
    throw new Error(
      `The Relay program ${RELAY_PROGRAM_ADDRESS} is not deployed on this network, so a plan cannot be created.`,
    );

  const clock = await rpc
    .getAccountInfo(CLOCK_SYSVAR_ADDRESS, { encoding: "base64" })
    .send();
  if (!clock.value) throw new Error("Could not read the chain clock");
  const nowSec = Number(
    getI64Codec().decode(
      Uint8Array.from(getBase64Encoder().encode(clock.value.data[0])),
      32,
    ),
  );
  const terms = validateTerms({
    pairId: pair.id,
    entryLow: need(args, "entry-low"),
    entryHigh: need(args, "entry-high"),
    expiresAtSec: nowSec + parseDuration(need(args, "expires-in")),
    nowSec,
  });

  const keyFile = need(args, "keypair");
  const signer = await createKeyPairSignerFromBytes(
    parseKeypairFile(readFileSync(keyFile, "utf8")),
  );
  const balance = (await rpc.getBalance(signer.address).send()).value;
  const dryRun = args.has("dry-run");
  if (balance < LAMPORTS_NEEDED) {
    const message = `The creator ${signer.address} has ${formatUnits(balance, 9)} SOL; it needs about 0.01 devnet SOL (free from faucet.solana.com, or a transfer).`;
    if (!dryRun) throw new Error(message);
    console.warn(`Warning: ${message}`);
  }

  const planId = BigInt(Date.now());
  const plan = await getPlanAddress(signer.address, planId);
  const version = await getVersionAddress(plan, 1);
  const hash = await contentHash(content);

  console.log(`Network:    ${NETWORKS[env.cluster].label}`);
  console.log(`Creator:    ${signer.address}`);
  console.log(`Pair:       ${pair.label}`);
  console.log(
    `Entry:      ${formatUnits(terms.entryLow, pair.quote.decimals)} to ${formatUnits(terms.entryHigh, pair.quote.decimals)} ${pair.quote.symbol} per ${pair.base.symbol}`,
  );
  console.log(
    `Expires:    ${new Date(Number(terms.expiresAt) * 1000).toISOString()} (chain time)`,
  );
  console.log(`Text hash:  ${Buffer.from(hash).toString("hex")}`);
  console.log(`Plan:       ${plan}`);
  if (
    env.creatorAllowlist.length > 0 &&
    !env.creatorAllowlist.includes(signer.address)
  )
    console.warn(
      "Warning: CREATOR_ALLOWLIST does not include this creator, so the plan will be reachable by link but marked Unlisted in the feed.",
    );
  if (dryRun) {
    console.log("\nDry run: nothing was sent.");
    return;
  }

  const signature = await sendInstructions(
    rpc,
    [
      createPlanInstruction({
        creator: signer.address,
        plan,
        version,
        baseMint: address(pair.base.mint),
        quoteMint: address(pair.quote.mint),
        planId,
        entryLow: terms.entryLow,
        entryHigh: terms.entryHigh,
        expiresAt: terms.expiresAt,
        contentHash: hash,
      }),
    ],
    signer,
  );
  console.log(`\nCommitted onchain. Transaction ${signature}`);
  const tx = explorerUrl("tx", signature, env.cluster);
  if (tx) console.log(tx);

  try {
    await confirm(apiBase, origin, plan, 1, wire);
  } catch (e) {
    console.error(
      `\nThe plan IS onchain, but its text was not stored: ${e instanceof Error ? e.message : String(e)}`,
    );
    console.error(
      `Send the text again with: bun run --cwd server publish-plan --confirm-only ${plan} --version 1 <the same text flags>`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`Text confirmed. Open it: ${origin}/plans/${plan}`);
}

/** Posts the plan text. The chain may need a moment to be readable by the server, so a 404 is retried. */
async function confirm(
  apiBase: string,
  origin: string,
  plan: string,
  version: number,
  wire: ContentWire,
): Promise<void> {
  let last = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${apiBase}/plans/${plan}/confirm`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ version, content: wire }),
    });
    if (res.ok) return;
    last = `${res.status} ${(await res.text()).slice(0, 300)}`;
    if (res.status !== 404) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`confirm failed: ${last}`);
}

try {
  await main();
} catch (e) {
  if (
    e instanceof UsageError ||
    e instanceof ContentError ||
    e instanceof TermsError ||
    e instanceof RangeError ||
    e instanceof SyntaxError
  ) {
    console.error(e.message);
    console.error("Run with --help for the options.");
  } else {
    console.error(e instanceof Error ? e.message : String(e));
  }
  process.exit(1);
}
