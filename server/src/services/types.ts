import type { Pair, ReferencePrice } from "@relay/domain";
import type { Address } from "@solana/kit";
import type { PlanAccount, PlanVersionAccount } from "@relay/domain/solana";

/** A Plan account as stored by the Relay program (numbers are exact bigints). */
export type OnchainPlan = PlanAccount;
/** A PlanVersion account as stored by the Relay program. */
export type OnchainVersion = PlanVersionAccount;

/** Everything the server needs from Solana. Tests inject a fake. */
export interface ChainReader {
  readonly programId: Address;
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
}

/** Advisory reference prices. Never used for anything the program enforces. */
export interface PriceSource {
  /** Latest price for the pair's base token in quote units, or null when none is available. */
  get(pair: Pair): Promise<ReferencePrice | null>;
}
