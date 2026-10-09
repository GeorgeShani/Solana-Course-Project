import { AccountRole, type Address, type Instruction } from "@solana/kit";
import { concat, i64le, u16le, u64le } from "../bytes";
import {
  INSTRUCTIONS_SYSVAR_ADDRESS,
  INSTRUCTION_DISCRIMINATORS,
  RELAY_PROGRAM_ADDRESS,
  SYSTEM_PROGRAM_ADDRESS,
} from "./program";

const { WRITABLE_SIGNER, READONLY_SIGNER, WRITABLE, READONLY } = AccountRole;

function require32(bytes: Uint8Array, label: string): Uint8Array {
  if (bytes.length !== 32) throw new RangeError(`${label} must be 32 bytes`);
  return bytes;
}

// Account order and flags below mirror the Anchor `#[derive(Accounts)]` structs. A test compares
// them with the generated IDL, so a change in the program fails the build instead of the chain.

export function createPlanInstruction(args: {
  creator: Address;
  plan: Address;
  version: Address;
  baseMint: Address;
  quoteMint: Address;
  planId: bigint;
  entryLow: bigint;
  entryHigh: bigint;
  expiresAt: bigint;
  contentHash: Uint8Array;
}): Instruction {
  return {
    programAddress: RELAY_PROGRAM_ADDRESS,
    accounts: [
      { address: args.creator, role: WRITABLE_SIGNER },
      { address: args.plan, role: WRITABLE },
      { address: args.version, role: WRITABLE },
      { address: args.baseMint, role: READONLY },
      { address: args.quoteMint, role: READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: READONLY },
    ],
    data: concat([
      INSTRUCTION_DISCRIMINATORS.createPlan,
      u64le(args.planId),
      u64le(args.entryLow),
      u64le(args.entryHigh),
      i64le(args.expiresAt),
      require32(args.contentHash, "contentHash"),
    ]),
  };
}

export function revisePlanInstruction(args: {
  creator: Address;
  plan: Address;
  prevVersion: Address;
  newVersion: Address;
  entryLow: bigint;
  entryHigh: bigint;
  expiresAt: bigint;
  contentHash: Uint8Array;
}): Instruction {
  return {
    programAddress: RELAY_PROGRAM_ADDRESS,
    accounts: [
      { address: args.creator, role: WRITABLE_SIGNER },
      { address: args.plan, role: WRITABLE },
      { address: args.prevVersion, role: READONLY },
      { address: args.newVersion, role: WRITABLE },
      { address: SYSTEM_PROGRAM_ADDRESS, role: READONLY },
    ],
    data: concat([
      INSTRUCTION_DISCRIMINATORS.revisePlan,
      u64le(args.entryLow),
      u64le(args.entryHigh),
      i64le(args.expiresAt),
      require32(args.contentHash, "contentHash"),
    ]),
  };
}

export function closePlanInstruction(args: {
  creator: Address;
  plan: Address;
}): Instruction {
  return {
    programAddress: RELAY_PROGRAM_ADDRESS,
    accounts: [
      { address: args.creator, role: READONLY_SIGNER },
      { address: args.plan, role: WRITABLE },
    ],
    data: INSTRUCTION_DISCRIMINATORS.closePlan,
  };
}

export function beginFollowInstruction(args: {
  follower: Address;
  plan: Address;
  planVersion: Address;
  receipt: Address;
  followerBase: Address;
  followerQuote: Address;
  version: number;
  nonce: bigint;
  maxQuoteIn: bigint;
}): Instruction {
  return {
    programAddress: RELAY_PROGRAM_ADDRESS,
    accounts: [
      { address: args.follower, role: WRITABLE_SIGNER },
      { address: args.plan, role: READONLY },
      { address: args.planVersion, role: READONLY },
      { address: args.receipt, role: WRITABLE },
      { address: args.followerBase, role: READONLY },
      { address: args.followerQuote, role: READONLY },
      { address: INSTRUCTIONS_SYSVAR_ADDRESS, role: READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: READONLY },
    ],
    data: concat([
      INSTRUCTION_DISCRIMINATORS.beginFollow,
      u16le(args.version),
      u64le(args.nonce),
      u64le(args.maxQuoteIn),
    ]),
  };
}

export function finishFollowInstruction(args: {
  follower: Address;
  receipt: Address;
  followerBase: Address;
  followerQuote: Address;
  planVersion: Address;
  plan: Address;
}): Instruction {
  return {
    programAddress: RELAY_PROGRAM_ADDRESS,
    accounts: [
      { address: args.follower, role: READONLY_SIGNER },
      { address: args.receipt, role: WRITABLE },
      { address: args.followerBase, role: READONLY },
      { address: args.followerQuote, role: READONLY },
      { address: args.planVersion, role: READONLY },
      { address: args.plan, role: READONLY },
    ],
    data: INSTRUCTION_DISCRIMINATORS.finishFollow,
  };
}
