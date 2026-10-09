/**
 * Builds the follow transaction with @solana/kit.
 *
 * The SAME function runs on the server (to simulate and quote) and in the browser (so the user
 * signs a transaction the client built itself from the reviewed plan, version and amount):
 *
 *   [compute budget] [create own ATAs] begin_follow  <one Jupiter swap>  finish_follow
 *
 * It fails closed: anything in Jupiter's response beyond what is listed above (tips, extra
 * instructions, cleanup, unexpected signers) throws instead of being passed through.
 */
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  createTransactionMessage,
  getBase64Encoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type AddressesByLookupTableAddress,
  type Blockhash,
  type Instruction,
  type Transaction,
} from "@solana/kit";
import { concat, u32le } from "../bytes";
import type { JupiterBuild, JupiterInstruction } from "../jupiter";
import {
  ATA_PROGRAM_ADDRESS,
  COMPUTE_BUDGET_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  getAssociatedTokenAddress,
  getReceiptAddress,
  getVersionAddress,
} from "./program";
import {
  beginFollowInstruction,
  finishFollowInstruction,
} from "./instructions";

export const JUPITER_PROGRAM_ADDRESSES: readonly Address[] = [
  address("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
];

const SET_COMPUTE_UNIT_LIMIT = 2;
const SET_COMPUTE_UNIT_PRICE = 3;
const base64 = getBase64Encoder();

function roleOf(isSigner: boolean, isWritable: boolean): AccountRole {
  if (isSigner)
    return isWritable
      ? AccountRole.WRITABLE_SIGNER
      : AccountRole.READONLY_SIGNER;
  return isWritable ? AccountRole.WRITABLE : AccountRole.READONLY;
}

function toInstruction(i: JupiterInstruction): Instruction {
  return {
    programAddress: address(i.programId),
    accounts: i.accounts.map((a) => ({
      address: address(a.pubkey),
      role: roleOf(a.isSigner, a.isWritable),
    })),
    data: Uint8Array.from(base64.encode(i.data)),
  };
}

function createAtaIdempotent(
  payer: Address,
  ata: Address,
  owner: Address,
  mint: Address,
): Instruction {
  return {
    programAddress: ATA_PROGRAM_ADDRESS,
    accounts: [
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: ata, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY },
      { address: mint, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: Uint8Array.of(1), // CreateIdempotent
  };
}

function computeBudgetInstructions(
  build: JupiterBuild,
  limit: number | undefined,
  priceCap: bigint,
): Instruction[] {
  const out: Instruction[] = [];
  for (const ix of build.computeBudgetInstructions) {
    if (ix.programId !== COMPUTE_BUDGET_PROGRAM_ADDRESS) {
      throw new Error("Unexpected program in computeBudgetInstructions");
    }
    const data = Uint8Array.from(base64.encode(ix.data));
    if (data[0] === SET_COMPUTE_UNIT_LIMIT) continue; // replaced below: a second limit makes the tx invalid
    if (data[0] === SET_COMPUTE_UNIT_PRICE) {
      const price = new DataView(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      ).getBigUint64(1, true);
      if (price > priceCap)
        throw new Error("Priority fee is above the allowed cap");
    }
    out.push(toInstruction(ix));
  }
  if (limit !== undefined) {
    out.unshift({
      programAddress: COMPUTE_BUDGET_PROGRAM_ADDRESS,
      data: concat([Uint8Array.of(SET_COMPUTE_UNIT_LIMIT), u32le(limit)]),
    });
  }
  return out;
}

/**
 * Checks Jupiter's swap instruction against the same rules the program enforces: a known Jupiter
 * program, the follower as its ONLY signer, and the follower's base and quote accounts present.
 */
export function assertSwapInstruction(
  swap: JupiterInstruction,
  follower: Address,
  followerBase: Address,
  followerQuote: Address,
): void {
  if (!JUPITER_PROGRAM_ADDRESSES.some((a) => a === swap.programId))
    throw new Error("Swap is not routed through Jupiter");
  const signers = swap.accounts.filter((a) => a.isSigner);
  if (signers.length === 0 || signers.some((s) => s.pubkey !== follower)) {
    throw new Error("The swap must be signed by the follower only");
  }
  const touches = (key: Address) => swap.accounts.some((a) => a.pubkey === key);
  if (!touches(followerBase) || !touches(followerQuote)) {
    throw new Error("The swap must use the follower's own token accounts");
  }
}

export interface ComposeFollowInput {
  build: JupiterBuild;
  plan: Address;
  /** The plan version being followed (must be the latest, or the program rejects it). */
  version: number;
  follower: Address;
  baseMint: Address;
  quoteMint: Address;
  /** Client-chosen receipt nonce. */
  nonce: bigint;
  /** The most quote the follower approves spending (atomic units). */
  maxQuoteIn: bigint;
  blockhash: { blockhash: Blockhash; lastValidBlockHeight: bigint };
  /** Compute unit limit (from simulation x 1.2). Omit to leave Jupiter's budget untouched. */
  computeUnitLimit?: number;
  /** Reject priority fees above this many micro-lamports per compute unit. */
  computeUnitPriceCap: bigint;
}

export interface ComposedFollowTx {
  instructions: Instruction[];
  /** Unsigned; sign with the follower's key or wallet. */
  transaction: Transaction;
  /** Wire size in bytes (the limit is 1232). */
  sizeBytes: number;
  receipt: Address;
  followerBase: Address;
  followerQuote: Address;
}

export async function composeFollowTx(
  input: ComposeFollowInput,
): Promise<ComposedFollowTx> {
  const { build, follower, plan } = input;

  // Fail closed on anything beyond the expected shape.
  if (build.otherInstructions.length > 0)
    throw new Error("Unexpected extra instructions from Jupiter");
  if (build.tipInstruction !== null)
    throw new Error("Unexpected tip instruction from Jupiter");
  if (build.cleanupInstruction !== null)
    throw new Error("Unexpected cleanup instruction from Jupiter");
  for (const setup of build.setupInstructions) {
    if (setup.programId !== ATA_PROGRAM_ADDRESS)
      throw new Error("Unexpected setup instruction from Jupiter");
  }

  const followerBase = await getAssociatedTokenAddress(
    follower,
    input.baseMint,
  );
  const followerQuote = await getAssociatedTokenAddress(
    follower,
    input.quoteMint,
  );
  assertSwapInstruction(
    build.swapInstruction,
    follower,
    followerBase,
    followerQuote,
  );

  const planVersion = await getVersionAddress(plan, input.version);
  const receipt = await getReceiptAddress(planVersion, follower, input.nonce);

  const instructions: Instruction[] = [
    ...computeBudgetInstructions(
      build,
      input.computeUnitLimit,
      input.computeUnitPriceCap,
    ),
    createAtaIdempotent(follower, followerQuote, follower, input.quoteMint),
    createAtaIdempotent(follower, followerBase, follower, input.baseMint),
    beginFollowInstruction({
      follower,
      plan,
      planVersion,
      receipt,
      followerBase,
      followerQuote,
      version: input.version,
      nonce: input.nonce,
      maxQuoteIn: input.maxQuoteIn,
    }),
    toInstruction(build.swapInstruction),
    finishFollowInstruction({
      follower,
      receipt,
      followerBase,
      followerQuote,
      planVersion,
      plan,
    }),
  ];

  const tables: AddressesByLookupTableAddress = {};
  for (const [key, addresses] of Object.entries(
    build.addressesByLookupTableAddress,
  )) {
    tables[address(key)] = addresses.map((a) => address(a));
  }

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(follower, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(input.blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
    (m) => compressTransactionMessageUsingAddressLookupTables(m, tables),
  );
  const transaction = compileTransaction(message);
  const sizeBytes = getTransactionEncoder().getSizeFromValue(transaction);

  return {
    instructions,
    transaction,
    sizeBytes,
    receipt,
    followerBase,
    followerQuote,
  };
}

/** The priority fee Jupiter asked for, in micro-lamports per compute unit (0 when none). */
export function priorityFeeMicroLamports(build: JupiterBuild): bigint {
  for (const ix of build.computeBudgetInstructions) {
    const data = Uint8Array.from(base64.encode(ix.data));
    if (data[0] === SET_COMPUTE_UNIT_PRICE) {
      return new DataView(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      ).getBigUint64(1, true);
    }
  }
  return 0n;
}
