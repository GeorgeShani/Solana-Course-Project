// Owner-run preparation: default is a PUBLIC-ONLY preview. --publish reads the owner's local
// dedicated creator key, creates/funds the venue and commits three explicitly labelled test plans.
// It never follows a plan. Re-run the same manifest to resume; a new manifest makes a fresh batch.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  renameSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
  address,
  createSolanaRpc,
  createKeyPairSignerFromBytes,
  getBase64Encoder,
  getI64Codec,
} from "@solana/kit";
import {
  NETWORKS,
  findPair,
  formatUnits,
  contentHash,
  toHex,
} from "@relay/domain";
import {
  CLOCK_SYSVAR_ADDRESS,
  RELAY_PROGRAM_ADDRESS,
  SIMULATED_VENUE_PROGRAM_ADDRESS,
  getVenuePoolAddress,
  getVenueVaultAddress,
  decodeVenuePool,
  initPoolInstruction,
  getPlanAddress,
  getVersionAddress,
  createPlanInstruction,
} from "@relay/domain/solana";
import { loadEnv } from "../src/shared/env";
import { createChain } from "../src/modules/plans/chain";
import { parseKeypairFile } from "../src/shared/publish-input";
import { isRecord } from "../src/shared/util";
import {
  makeRehearsalDrafts,
  rehearsalArgs,
  REHEARSAL_PRICE,
  REHEARSAL_BASE_TARGET,
  fundingTopUp,
  venueFundingInstructions,
} from "../src/shared/rehearsal";
import {
  rehearsalSender,
  parsePendingTransaction,
  type PendingRehearsalTransaction,
} from "../src/shared/rehearsal-send";

async function main() {
  const args = rehearsalArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "bun run --cwd server rehearse-devnet [--publish --keypair <local creator keypair>] [--manifest <new file for a fresh batch>] [--api <Relay API URL>]",
    );
    console.log(
      "Default: preview public addresses, terms and funding only; no key read, no transaction sent. Devnet only.",
    );
    return;
  }
  const env = loadEnv();
  if (env.cluster !== "devnet")
    throw new Error("This rehearsal is devnet only");
  const creator = address(args.creator);
  const pair = findPair("sol-usdc", "devnet");
  if (!pair) throw new Error("Missing devnet pair");
  if (env.simulatedVenueAdmin && env.simulatedVenueAdmin !== creator)
    throw new Error(
      "SIMULATED_VENUE_ADMIN differs from --creator; review the configuration before publishing",
    );
  if (env.creatorAllowlist.length && !env.creatorAllowlist.includes(creator))
    throw new Error(
      "The creator is not in CREATOR_ALLOWLIST; its new plans would not appear in the feed",
    );
  const rpc = createSolanaRpc(env.solanaRpcUrl);
  const timeout = () => ({ abortSignal: AbortSignal.timeout(15_000) });
  if (
    (await rpc.getGenesisHash().send(timeout())) !== NETWORKS.devnet.genesisHash
  )
    throw new Error("The RPC is not devnet; nothing was signed or sent");
  for (const programAddress of [
    RELAY_PROGRAM_ADDRESS,
    SIMULATED_VENUE_PROGRAM_ADDRESS,
  ]) {
    const program = await rpc
      .getAccountInfo(programAddress, { encoding: "base64" })
      .send(timeout());
    if (!program.value?.executable)
      throw new Error(`Program ${programAddress} is not deployed`);
  }
  const clock = await rpc
    .getAccountInfo(CLOCK_SYSVAR_ADDRESS, { encoding: "base64" })
    .send(timeout());
  if (!clock.value) throw new Error("Chain clock unavailable");
  const nowSec = Number(
    getI64Codec().decode(getBase64Encoder().encode(clock.value.data[0]), 32),
  );
  const manifestPath = resolve(args.manifest);
  let batchId = BigInt(Date.now());
  let createdAtSec = nowSec;
  let pending: PendingRehearsalTransaction | null = null;
  if (existsSync(manifestPath)) {
    const saved: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (
      !isRecord(saved) ||
      saved.schema !== 1 ||
      saved.creator !== creator ||
      typeof saved.batchId !== "string" ||
      !/^\d{1,19}$/.test(saved.batchId) ||
      typeof saved.createdAtSec !== "number" ||
      !Number.isSafeInteger(saved.createdAtSec) ||
      saved.createdAtSec > nowSec
    )
      throw new Error("Invalid or mismatched rehearsal manifest");
    batchId = BigInt(saved.batchId);
    createdAtSec = saved.createdAtSec;
    pending = parsePendingTransaction(saved.pending);
  }
  if (batchId < 0n || batchId + 2n > (1n << 64n) - 1n)
    throw new Error(
      "Batch plan IDs do not fit u64; nothing was signed or sent",
    );
  const drafts = makeRehearsalDrafts(createdAtSec);
  if (!args.publish && createdAtSec + 7 * 86_400 <= nowSec + 60)
    throw new Error(
      "This batch's window has expired. Choose a NEW --manifest path to publish fresh plans; the old history is preserved",
    );
  const baseMint = address(pair.base.mint);
  const quoteMint = address(pair.quote.mint);
  const derived = await getVenuePoolAddress(creator, baseMint, quoteMint);
  const [baseVault, quoteVault] = await Promise.all([
    getVenueVaultAddress(derived.address, baseMint),
    getVenueVaultAddress(derived.address, quoteMint),
  ]);
  const poolAccount = await rpc
    .getAccountInfo(derived.address, {
      encoding: "base64",
      commitment: "confirmed",
    })
    .send(timeout());
  if (poolAccount.value) {
    if (
      poolAccount.value.owner !== SIMULATED_VENUE_PROGRAM_ADDRESS ||
      poolAccount.value.executable
    )
      throw new Error("Pool address has the wrong owner");
    const pool = decodeVenuePool(
      Uint8Array.from(getBase64Encoder().encode(poolAccount.value.data[0])),
    );
    if (
      pool.admin !== creator ||
      pool.baseMint !== baseMint ||
      pool.quoteMint !== quoteMint ||
      pool.bump !== derived.bump ||
      pool.baseDecimals !== pair.base.decimals ||
      pool.price !== REHEARSAL_PRICE
    )
      throw new Error(
        "Existing pool does not match this rehearsal's admin, pair or configured price; no price was changed",
      );
  }
  console.log(
    `Devnet test tokens only. Creator: ${creator}\nPool: ${derived.address}\nConfigured venue price: 100 USDC/SOL (not a live market quote)\nFunding target: 0.02 SOL in the pool's base vault\nWindow ends: ${new Date((createdAtSec + 7 * 86_400) * 1000).toISOString()}`,
  );
  const prepared = await Promise.all(
    drafts.map(async (draft, index) => {
      const planId = batchId + BigInt(index);
      const plan = await getPlanAddress(creator, planId);
      const version = await getVersionAddress(plan, 1);
      const hash = await contentHash(draft.content);
      console.log(
        `\n${draft.label}: ${formatUnits(draft.terms.entryLow, 6)}–${formatUnits(draft.terms.entryHigh, 6)}\nPlan: ${plan}\n${draft.wire.rationale}\n${draft.wire.exitThesis}`,
      );
      return { ...draft, planId, plan, version, hash };
    }),
  );
  console.log(`\nServer setting: SIMULATED_VENUE_ADMIN=${creator}`);
  if (!args.publish) {
    console.log("Preview only: no key read; nothing signed or sent.");
    return;
  }
  if (!args.keypair)
    throw new Error(
      "--publish requires --keypair: use your dedicated devnet creator's LOCAL key file; never upload it",
    );
  const apiUrl = new URL(args.api);
  if (
    apiUrl.protocol !== "https:" &&
    !(
      apiUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(apiUrl.hostname)
    )
  )
    throw new Error("--api must use HTTPS, or HTTP on localhost");
  const signer = await createKeyPairSignerFromBytes(
    parseKeypairFile(readFileSync(args.keypair, "utf8")),
  );
  if (signer.address !== creator)
    throw new Error("The keypair does not belong to the selected creator");
  mkdirSync(dirname(manifestPath), { recursive: true });
  // One lock/journal for this creator across ALL manifest paths: an uncertain
  // earlier funding transaction must block even a brand-new batch.
  const journalDir = resolve(import.meta.dir, "../../.relay");
  mkdirSync(journalDir, { recursive: true });
  const journalPath = resolve(journalDir, `creator-${creator}.json`);
  const lockPath = `${journalPath}.lock`;
  try {
    writeFileSync(lockPath, "Owner rehearsal in progress", { flag: "wx" });
  } catch {
    throw new Error(
      `Another run may be using this creator/pool. Do not run concurrently. If an old process stopped, remove only ${lockPath} before resuming`,
    );
  }
  try {
    const manifest = {
      schema: 1,
      creator,
      batchId: batchId.toString(),
      createdAtSec,
    };
    // A competing invocation may have created the manifest after our public preview.
    if (existsSync(manifestPath)) {
      const current: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (
        !isRecord(current) ||
        current.batchId !== manifest.batchId ||
        current.createdAtSec !== createdAtSec ||
        current.creator !== creator
      )
        throw new Error(
          "The manifest changed during preparation. Re-run the SAME path to resume its saved batch",
        );
    }
    if (!existsSync(manifestPath))
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), {
        flag: "wx",
      });
    const sender = rehearsalSender(rpc, signer, (next) => {
      const journalTemp = `${journalPath}.tmp`;
      writeFileSync(
        journalTemp,
        JSON.stringify(
          { creator, pool: derived.address, manifestPath, pending: next },
          null,
          2,
        ),
      );
      renameSync(journalTemp, journalPath);
      const temp = `${manifestPath}.tmp`;
      writeFileSync(
        temp,
        JSON.stringify({ ...manifest, pending: next }, null, 2),
      );
      renameSync(temp, manifestPath);
    });
    if (existsSync(journalPath)) {
      const journal: unknown = JSON.parse(readFileSync(journalPath, "utf8"));
      if (
        !isRecord(journal) ||
        journal.creator !== creator ||
        journal.pool !== derived.address
      )
        throw new Error(
          "Invalid creator transaction journal; inspect it before resuming",
        );
      const previous = parsePendingTransaction(journal.pending);
      if (previous) await sender.resolve(previous);
    }
    if (pending) await sender.resolve(pending);
    if (createdAtSec + 7 * 86_400 <= nowSec + 60)
      throw new Error(
        "This batch has expired. Pending transactions are resolved. Choose a NEW --manifest path for a fresh batch",
      );
    const currentPool = await rpc
      .getAccountInfo(derived.address, {
        encoding: "base64",
        commitment: "confirmed",
      })
      .send(timeout());
    if (!currentPool.value)
      console.log(
        `Pool created: ${await sender.send([initPoolInstruction({ admin: creator, pool: derived.address, baseMint, quoteMint, price: REHEARSAL_PRICE })])}`,
      );
    // First sync any previous deposit, so a retry cannot add the same funding twice.
    console.log(
      `Vaults ready: ${await sender.send(venueFundingInstructions(creator, derived.address, baseVault, quoteVault, 0n))}`,
    );
    const chain = createChain(env.solanaRpcUrl, "devnet");
    const before = await chain.getVenuePool(creator, pair);
    if (!before)
      throw new Error(
        "Pool vaults not confirmed yet; resume this same manifest after checking the transaction",
      );
    if (before.data.price !== REHEARSAL_PRICE)
      throw new Error(
        "Venue price changed during setup; review it before funding or publishing",
      );
    const topUp = fundingTopUp(before.baseAvailable, REHEARSAL_BASE_TARGET);
    if (topUp > 0n)
      console.log(
        `Pool funded: ${await sender.send(venueFundingInstructions(creator, derived.address, baseVault, quoteVault, topUp))}`,
      );
    const funded = await chain.getVenuePool(creator, pair);
    if (!funded || funded.baseAvailable < REHEARSAL_BASE_TARGET)
      throw new Error(
        "Pool funding is not confirmed; check the transaction before resuming",
      );
    for (const draft of prepared) {
      const existing = await chain.getPlan(draft.plan);
      if (existing) {
        const version = await chain.getVersion(draft.plan, 1);
        if (
          existing.creator !== creator ||
          existing.latestVersion !== 1 ||
          existing.status !== "open" ||
          existing.planId !== draft.planId ||
          existing.baseMint !== baseMint ||
          existing.quoteMint !== quoteMint ||
          !version ||
          toHex(version.data.contentHash) !== toHex(draft.hash) ||
          version.data.entryLow !== draft.terms.entryLow ||
          version.data.entryHigh !== draft.terms.entryHigh ||
          version.data.expiresAt !== draft.terms.expiresAt
        )
          throw new Error(
            `Existing plan ${draft.plan} differs from the saved batch; refused to overwrite or duplicate it`,
          );
        console.log(`Already onchain: ${draft.plan}`);
      } else {
        console.log(
          `Plan committed: ${await sender.send([createPlanInstruction({ creator, plan: draft.plan, version: draft.version, baseMint, quoteMint, planId: draft.planId, ...draft.terms, contentHash: draft.hash })])}`,
        );
      }
      const confirmed = await fetch(
        `${args.api.replace(/\/$/, "")}/plans/${draft.plan}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: env.appOrigin,
          },
          body: JSON.stringify({ version: 1, content: draft.wire }),
          signal: AbortSignal.timeout(20_000),
        },
      );
      if (!confirmed.ok)
        throw new Error(
          `Plan is onchain but text confirmation returned ${confirmed.status}. Resume the SAME manifest to confirm it; do not create a new batch`,
        );
      console.log(`Text confirmed: ${draft.plan}`);
    }
    console.log(
      "Preparation confirmed. Restart the API with the printed public admin setting. Sign in, connect a separate devnet follower wallet funded with faucet USDC, review a 1-USDC follow on the in-range test plan, then approve it yourself.",
    );
  } finally {
    unlinkSync(lockPath);
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Rehearsal failed; check the saved manifest before resuming",
  );
  process.exitCode = 1;
});
