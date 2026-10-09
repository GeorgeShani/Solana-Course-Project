import {
  USDC,
  effectivePriceCeil,
  fillPosition,
  findPairByMints,
  formatUnits,
  parseJupiterBuild,
  parseUnits,
  type JupiterBuild,
} from "@relay/domain";
import {
  INSTRUCTION_DISCRIMINATORS,
  RELAY_PROGRAM_ADDRESS,
  composeFollowTx,
  customErrorCode,
  getAssociatedTokenAddress,
  parseAnchorErrorName,
  priorityFeeMicroLamports,
  relayErrorByCode,
  relayErrorByName,
  type ComposedFollowTx,
} from "@relay/domain/solana";
import {
  address,
  getBase58Encoder,
  signature as toSignature,
  type Address,
  type Blockhash,
} from "@solana/kit";
import type { Db } from "../db";
import type { Env } from "../env";
import { ApiError } from "../middleware";
import { isRecord } from "../util";
import { friendlyFollowError } from "./follow-errors";
import type { JupiterClient } from "./jupiter";
import type { ChainReader, ChainTransaction, OnchainPlan } from "./types";

/** Demo limits on a single approved trade, in USDC atomic units (6 decimals). */
export const MIN_QUOTE_UNITS = 1_000_000n; // 1 USDC
export const MAX_QUOTE_UNITS = 1_000_000_000n; // 1,000 USDC

const EXPIRY_MARGIN_SEC = 20;
const QUOTE_TTL_MS = 30_000;
const MAX_ACCOUNT_STEPS = [40, 32, 24];
const SIMULATION_COMPUTE_LIMIT = 1_400_000;
const PRIORITY_FEE_CAP_MICRO_LAMPORTS = 5_000_000n;
const TX_SIZE_LIMIT = 1232;
const BASE_FEE_LAMPORTS = 5_000n;
/** Rent for the 140-byte FollowReceipt account: (128 + 140) * 6960 lamports. */
const RECEIPT_RENT_LAMPORTS = 1_865_280n;

export interface FollowServiceDeps {
  env: Env;
  db: Db;
  chain: ChainReader;
  jupiter: JupiterClient;
}

export interface QuoteResponse {
  summary: {
    planPda: string;
    version: number;
    follower: string;
    pay: { units: string; display: string; symbol: string };
    receive: { units: string; display: string; symbol: string };
    /** The least the swap will deliver; below this it fails instead of filling. */
    minimumReceive: { units: string; display: string; symbol: string };
    /** Quote units per whole base token, using the expected output. */
    effectivePrice: { units: string; display: string };
    entryRange: { low: string; high: string };
    /** "may_fail_near_upper_bound" when the guaranteed minimum would breach the plan's range. */
    check: "ok" | "may_fail_near_upper_bound";
    routeLabels: string[];
    fees: {
      networkLamports: string;
      priorityLamports: string;
      receiptRentLamports: string;
    };
    planExpiresAt: number;
    quoteExpiresAtMs: number;
  };
  /** Everything the client needs to rebuild the identical transaction itself. */
  compose: {
    build: unknown;
    blockhash: string;
    lastValidBlockHeight: string;
    nonce: string;
    computeUnitLimit: number;
    maxQuoteIn: string;
  };
}

export interface ExecutionView {
  signature: string;
  status: "recorded" | "failed";
  follower: string;
  planPda: string;
  version: number;
  receiptPda: string | null;
  quoteSpent: string | null;
  baseReceived: string | null;
  effectivePrice: string | null;
  errorCode: number | null;
  errorName: string | null;
  errorMessage: string | null;
  slot: string | null;
  blockTime: number | null;
}

interface ExecutionRow {
  tx_signature: string;
  status: "recorded" | "failed";
  follower: string;
  plan_pda: string;
  version: number;
  receipt_pda: string | null;
  quote_spent: string | null;
  base_received: string | null;
  effective_price: string | null;
  error_code: number | null;
  error_name: string | null;
  slot: string | null;
  block_time: string | null;
}

function toExecutionView(row: ExecutionRow): ExecutionView {
  const info = row.error_name ? relayErrorByName(row.error_name) : undefined;
  return {
    signature: row.tx_signature,
    status: row.status,
    follower: row.follower,
    planPda: row.plan_pda,
    version: row.version,
    receiptPda: row.receipt_pda,
    quoteSpent: row.quote_spent,
    baseReceived: row.base_received,
    effectivePrice: row.effective_price,
    errorCode: row.error_code,
    errorName: row.error_name,
    errorMessage: row.error_name
      ? friendlyFollowError(row.error_name).message
      : (info?.message ?? null),
    slot: row.slot,
    blockTime: row.block_time === null ? null : Number(row.block_time),
  };
}

function startsWith(data: Uint8Array, prefix: Uint8Array): boolean {
  return prefix.every((b, i) => data[i] === b);
}

function randomNonce(): bigint {
  return crypto.getRandomValues(new BigUint64Array(1))[0] ?? 1n;
}

function parseAddress(value: unknown, field: string): Address {
  if (typeof value !== "string") {
    throw new ApiError(400, "invalid_input", `${field} is required`);
  }
  try {
    return address(value);
  } catch {
    throw new ApiError(400, "invalid_input", `${field} is not a valid address`);
  }
}

export function createFollowService(deps: FollowServiceDeps) {
  const { env, db, chain, jupiter } = deps;

  async function loadPlan(planPda: Address): Promise<OnchainPlan> {
    let plan: OnchainPlan | null;
    try {
      plan = await chain.getPlan(planPda);
    } catch (e) {
      if (
        e instanceof Error &&
        /not owned|discriminator|not a Relay/i.test(e.message)
      ) {
        throw new ApiError(
          400,
          "not_a_relay_account",
          "That address is not a Relay plan",
        );
      }
      throw new ApiError(
        503,
        "chain_unavailable",
        "Solana is unreachable right now",
      );
    }
    if (!plan)
      throw new ApiError(404, "plan_not_found", "No such plan onchain");
    return plan;
  }

  // ----------------------------------------------------------------------------------- quote

  async function quote(input: unknown): Promise<QuoteResponse> {
    if (!isRecord(input))
      throw new ApiError(400, "invalid_input", "Body must be an object");
    const planPda = parseAddress(input.planPda, "planPda");
    const follower = parseAddress(input.follower, "follower");
    const version = input.version;
    if (
      typeof version !== "number" ||
      !Number.isInteger(version) ||
      version < 1
    ) {
      throw new ApiError(
        400,
        "invalid_input",
        "version must be a positive integer",
      );
    }

    const plan = await loadPlan(planPda);
    const pair = findPairByMints(plan.baseMint, plan.quoteMint);
    if (!pair)
      throw new ApiError(
        422,
        "unsupported_pair",
        "This plan uses an unsupported pair",
      );

    let quoteIn: bigint;
    try {
      if (typeof input.quoteAmount !== "string")
        throw new RangeError("Enter an amount");
      quoteIn = parseUnits(input.quoteAmount, pair.quote.decimals);
    } catch (e) {
      throw new ApiError(
        400,
        "invalid_amount",
        e instanceof Error ? e.message : "Invalid amount",
      );
    }
    if (quoteIn < MIN_QUOTE_UNITS || quoteIn > MAX_QUOTE_UNITS) {
      throw new ApiError(
        400,
        "invalid_amount",
        `Amount must be between ${formatUnits(MIN_QUOTE_UNITS, USDC.decimals)} and ${formatUnits(MAX_QUOTE_UNITS, USDC.decimals)} ${USDC.symbol}`,
      );
    }

    // Plan state, from the chain (the program re-checks all of this when the user signs).
    if (plan.status === "closed")
      throw new ApiError(409, "plan_closed", "The creator closed this plan");
    if (version !== plan.latestVersion) {
      throw new ApiError(
        409,
        "stale_version",
        "The plan was updated. Review the latest version.",
      );
    }
    const latest = await chain.getVersion(planPda, plan.latestVersion);
    if (!latest)
      throw new ApiError(404, "version_not_found", "No such version onchain");
    const nowSec = (await chain.nowMs()) / 1000;
    if (nowSec + EXPIRY_MARGIN_SEC >= Number(latest.data.expiresAt)) {
      throw new ApiError(
        409,
        "plan_expired",
        "This plan's entry window has closed or is about to close.",
      );
    }

    // Route, then the shared composer: the exact transaction the client will rebuild and sign.
    const nonce = randomNonce();
    const blockhash = await chain.getLatestBlockhash();
    const base = address(pair.base.mint);
    const quoteMint = address(pair.quote.mint);
    const destination = await getAssociatedTokenAddress(follower, base);

    let rawBuild: unknown = null;
    let build: JupiterBuild | null = null;
    let composed: ComposedFollowTx | null = null;
    for (const maxAccounts of MAX_ACCOUNT_STEPS) {
      rawBuild = await jupiter.build({
        inputMint: pair.quote.mint,
        outputMint: pair.base.mint,
        amount: quoteIn.toString(),
        taker: follower,
        destinationTokenAccount: destination,
        maxAccounts,
      });
      build = parseBuild(rawBuild);
      composed = await compose(build, {
        plan: planPda,
        version,
        follower,
        base,
        quote: quoteMint,
        nonce,
        maxQuoteIn: quoteIn,
        blockhash,
        limit: SIMULATION_COMPUTE_LIMIT,
      });
      if (composed.sizeBytes <= TX_SIZE_LIMIT) break;
      composed = null;
    }
    if (!build || !composed) {
      throw new ApiError(
        422,
        "route_too_complex",
        "Route too complex. Try a smaller amount.",
      );
    }

    // Tier 2 (advisory, before signing): is the price this route gives inside the plan's range?
    const range = {
      entryLow: latest.data.entryLow,
      entryHigh: latest.data.entryHigh,
      baseDecimals: pair.base.decimals,
    };
    const expected = fillPosition({
      quoteSpent: quoteIn,
      baseReceived: build.outAmount,
      ...range,
    });
    if (expected === "above_range") reject("PriceAboveRange");
    if (expected === "below_range") reject("PriceBelowRange");
    const worst = fillPosition({
      quoteSpent: quoteIn,
      baseReceived: build.minOutAmount,
      ...range,
    });

    // Dry-run it. A transaction that would fail is never handed out for signing.
    const sim = await chain.simulate(composed.transaction);
    if (!sim.ok) {
      console.error(
        "follow simulation failed:",
        JSON.stringify(sim.error, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
        sim.logs.slice(-6),
      );
      const name =
        parseAnchorErrorName(sim.logs) ??
        relayErrorByCode(customErrorCode(sim.error) ?? -1)?.name;
      reject(name ?? "SwapWouldFail");
    }
    const limit = Math.min(
      SIMULATION_COMPUTE_LIMIT,
      Math.max(100_000, Math.ceil((sim.unitsConsumed ?? 400_000) * 1.2)),
    );
    const expectedPrice = effectivePriceCeil(
      quoteIn,
      build.outAmount,
      pair.base.decimals,
    );
    const priorityLamports =
      (priorityFeeMicroLamports(build) * BigInt(limit) + 999_999n) / 1_000_000n;
    return {
      summary: {
        planPda,
        version,
        follower,
        pay: {
          units: quoteIn.toString(),
          display: formatUnits(quoteIn, pair.quote.decimals),
          symbol: pair.quote.symbol,
        },
        receive: {
          units: build.outAmount.toString(),
          display: formatUnits(build.outAmount, pair.base.decimals),
          symbol: pair.base.symbol,
        },
        minimumReceive: {
          units: build.minOutAmount.toString(),
          display: formatUnits(build.minOutAmount, pair.base.decimals),
          symbol: pair.base.symbol,
        },
        effectivePrice: {
          units: expectedPrice.toString(),
          display: formatUnits(expectedPrice, pair.quote.decimals),
        },
        entryRange: {
          low: formatUnits(latest.data.entryLow, pair.quote.decimals),
          high: formatUnits(latest.data.entryHigh, pair.quote.decimals),
        },
        check: worst === "in_range" ? "ok" : "may_fail_near_upper_bound",
        routeLabels: build.routeLabels,
        fees: {
          networkLamports: BASE_FEE_LAMPORTS.toString(),
          priorityLamports: priorityLamports.toString(),
          receiptRentLamports: RECEIPT_RENT_LAMPORTS.toString(),
        },
        planExpiresAt: Number(latest.data.expiresAt),
        quoteExpiresAtMs: Date.now() + QUOTE_TTL_MS,
      },
      compose: {
        build: rawBuild,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight.toString(),
        nonce: nonce.toString(),
        computeUnitLimit: limit,
        maxQuoteIn: quoteIn.toString(),
      },
    };
  }

  /** Throws the consumer-facing rejection for a Relay error name. */
  function reject(errorName: string): never {
    const friendly = friendlyFollowError(errorName);
    throw new ApiError(422, friendly.code, friendly.message);
  }

  function parseBuild(raw: unknown): JupiterBuild {
    try {
      return parseJupiterBuild(raw);
    } catch {
      throw new ApiError(
        502,
        "route_invalid",
        "The swap router returned an unusable route",
      );
    }
  }

  async function compose(
    build: JupiterBuild,
    o: {
      plan: Address;
      version: number;
      follower: Address;
      base: Address;
      quote: Address;
      nonce: bigint;
      maxQuoteIn: bigint;
      blockhash: { blockhash: Blockhash; lastValidBlockHeight: bigint };
      limit: number;
    },
  ): Promise<ComposedFollowTx> {
    try {
      return await composeFollowTx({
        build,
        plan: o.plan,
        version: o.version,
        follower: o.follower,
        baseMint: o.base,
        quoteMint: o.quote,
        nonce: o.nonce,
        maxQuoteIn: o.maxQuoteIn,
        blockhash: o.blockhash,
        computeUnitLimit: o.limit,
        computeUnitPriceCap: PRIORITY_FEE_CAP_MICRO_LAMPORTS,
      });
    } catch (e) {
      // composeFollowTx fails closed on anything it does not recognise. Keep the detail in logs.
      console.error(
        "follow route rejected:",
        e instanceof Error ? e.message : e,
      );
      throw new ApiError(
        502,
        "route_rejected",
        "The swap route did not pass our safety checks",
      );
    }
  }

  // ---------------------------------------------------------------------------------- verify

  /** Finds the begin_follow instruction and returns the accounts and version it names. */
  function findBegin(tx: ChainTransaction) {
    for (const ix of tx.instructions) {
      if (ix.programId !== RELAY_PROGRAM_ADDRESS) continue;
      if (!startsWith(ix.data, INSTRUCTION_DISCRIMINATORS.beginFollow))
        continue;
      const [follower, plan, , receipt] = ix.accounts;
      if (!follower || !plan || !receipt) continue;
      const version = new DataView(
        ix.data.buffer,
        ix.data.byteOffset,
        ix.data.byteLength,
      ).getUint16(8, true);
      return { follower, plan, receipt, version };
    }
    return null;
  }

  async function verify(input: unknown): Promise<ExecutionView> {
    if (!isRecord(input) || typeof input.signature !== "string") {
      throw new ApiError(400, "invalid_input", "signature is required");
    }
    let sig: ReturnType<typeof toSignature>;
    try {
      sig = toSignature(input.signature);
      if (getBase58Encoder().encode(sig).length !== 64)
        throw new Error("length");
    } catch {
      throw new ApiError(
        400,
        "invalid_signature",
        "That is not a transaction signature",
      );
    }

    let tx: ChainTransaction | null;
    try {
      tx = await chain.getTransaction(sig);
    } catch {
      throw new ApiError(
        503,
        "chain_unavailable",
        "Solana is unreachable right now",
      );
    }
    if (!tx)
      throw new ApiError(
        404,
        "transaction_not_found",
        "Not confirmed yet. Try again in a moment.",
      );

    const begin = findBegin(tx);
    if (!begin)
      throw new ApiError(
        400,
        "not_a_follow",
        "That transaction is not a Relay follow",
      );

    if (tx.error !== null) {
      // Failed stays failed: record why, never anything that looks like a participation.
      const errorCode = customErrorCode(tx.error) ?? null;
      const name =
        parseAnchorErrorName(tx.logs) ??
        (errorCode === null ? undefined : relayErrorByCode(errorCode)?.name) ??
        null;
      await db`
        insert into executions (cluster, tx_signature, follower, plan_pda, version, status, error_code, error_name, slot, block_time, fee_lamports)
        values (${env.cluster}, ${sig}, ${begin.follower}, ${begin.plan}, ${begin.version}, 'failed', ${errorCode}, ${name},
                ${tx.slot.toString()}, ${tx.blockTime}, ${tx.feeLamports.toString()})
        on conflict (tx_signature) do nothing`;
      return readExecution(sig);
    }

    // It landed. The receipt account is the evidence: read it, never trust the request.
    let receipt;
    try {
      receipt = await chain.getFollowReceipt(begin.receipt);
    } catch {
      throw new ApiError(
        502,
        "receipt_invalid",
        "The receipt account is not a Relay receipt",
      );
    }
    if (
      !receipt ||
      receipt.status !== "recorded" ||
      receipt.follower !== begin.follower ||
      receipt.plan !== begin.plan ||
      receipt.version !== begin.version
    ) {
      throw new ApiError(
        409,
        "receipt_missing",
        "The transaction landed but no matching receipt was found",
      );
    }
    const plan = await loadPlan(begin.plan);
    const effective = effectivePriceCeil(
      receipt.quoteSpent,
      receipt.baseReceived,
      plan.baseDecimals,
    );
    await db`
      insert into executions (cluster, tx_signature, follower, plan_pda, version, receipt_pda, status,
                              quote_spent, base_received, effective_price, slot, block_time, fee_lamports)
      values (${env.cluster}, ${sig}, ${begin.follower}, ${begin.plan}, ${begin.version}, ${begin.receipt}, 'recorded',
              ${receipt.quoteSpent.toString()}, ${receipt.baseReceived.toString()}, ${effective.toString()},
              ${tx.slot.toString()}, ${tx.blockTime}, ${tx.feeLamports.toString()})
      on conflict (tx_signature) do update
        set status = excluded.status, receipt_pda = excluded.receipt_pda, quote_spent = excluded.quote_spent,
            base_received = excluded.base_received, effective_price = excluded.effective_price,
            error_code = null, error_name = null, updated_at = now()
        where executions.status <> 'recorded'`;
    return readExecution(sig);
  }

  async function readExecution(signature: string): Promise<ExecutionView> {
    const rows: ExecutionRow[] =
      await db`select * from executions where tx_signature = ${signature}`;
    const row: ExecutionRow | undefined = rows[0];
    if (!row)
      throw new ApiError(404, "execution_not_found", "No such execution");
    return toExecutionView(row);
  }

  // -------------------------------------------------------------------------------- history

  async function executionsFor(
    followerInput: unknown,
  ): Promise<ExecutionView[]> {
    const follower = parseAddress(followerInput, "follower");
    const rows: ExecutionRow[] = await db`
      select * from executions where follower = ${follower} and cluster = ${env.cluster}
      order by created_at desc, id desc limit 50`;
    return rows.map(toExecutionView);
  }

  return { quote, verify, executionsFor };
}

export type FollowService = ReturnType<typeof createFollowService>;
