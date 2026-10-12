import type { Pair, ReferencePrice } from "@relay/domain";
import type { Address, Blockhash, Signature, Transaction } from "@solana/kit";
import type {
  FollowReceiptAccount,
  PlanAccount,
  PlanVersionAccount,
} from "@relay/domain/solana";

/** A Plan account as stored by the Relay program (numbers are exact bigints). */
export type OnchainPlan = PlanAccount;
/** A PlanVersion account as stored by the Relay program. */
export type OnchainVersion = PlanVersionAccount;

/** The outcome of simulating a transaction (nothing is sent). */
export interface SimulationResult {
  ok: boolean;
  unitsConsumed: number | null;
  logs: string[];
  /** The raw transaction error, if any (for mapping to a reason). */
  error: unknown;
}

/** One top-level instruction of a confirmed transaction, with account keys resolved. */
export interface ChainInstruction {
  programId: Address;
  accounts: Address[];
  data: Uint8Array;
}

/** A confirmed transaction as the verifier needs it. */
export interface ChainTransaction {
  signature: string;
  slot: bigint;
  blockTime: number | null;
  feeLamports: bigint;
  /** The raw transaction error, or null when it succeeded. */
  error: unknown;
  logs: string[];
  instructions: ChainInstruction[];
}

/** Everything the server needs from Solana. Tests inject a fake. */
export interface ChainReader {
  readonly programId: Address;
  /** Asks the RPC for its current slot. Throws when the RPC cannot answer (used by readiness). */
  health(): Promise<{ slot: bigint }>;
  /** Cluster time in ms. On a fork this follows time travel; elsewhere it is the wall clock. */
  nowMs(): Promise<number>;
  /** Null when the account does not exist. Throws if it exists but is not a Relay Plan account. */
  getPlan(planPda: string): Promise<OnchainPlan | null>;
  getVersion(
    planPda: string,
    version: number,
  ): Promise<{ pda: string; data: OnchainVersion } | null>;
  listPlans(): Promise<{ pda: string; data: OnchainPlan }[]>;
  listVersions(): Promise<{ pda: string; data: OnchainVersion }[]>;
  getLatestBlockhash(): Promise<{
    blockhash: Blockhash;
    lastValidBlockHeight: bigint;
  }>;
  /** Dry-runs an unsigned transaction. Never throws for a failing transaction. */
  simulate(transaction: Transaction): Promise<SimulationResult>;
  /** Null when the cluster does not know the signature (yet). */
  getTransaction(signature: Signature): Promise<ChainTransaction | null>;
  /** Null when absent. Throws if it exists but is not a Relay FollowReceipt. */
  getFollowReceipt(receiptPda: string): Promise<FollowReceiptAccount | null>;
}

/** Advisory reference prices. Never used for anything the program enforces. */
export interface PriceSource {
  /** Latest price for the pair's base token in quote units, or null when none is available. */
  get(pair: Pair): Promise<ReferencePrice | null>;
}
