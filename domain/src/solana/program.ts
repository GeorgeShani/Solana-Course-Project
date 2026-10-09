/**
 * The Relay program client, built on @solana/kit. This module is the single place that knows the
 * program's address, discriminators, account layouts and PDA seeds, so the app, the server and
 * the scripts cannot drift apart. Tests check it against the generated IDL and the Rust program.
 *
 * Accounts are Anchor accounts: an 8-byte discriminator followed by the Borsh fields.
 */
import {
  address,
  fixCodecSize,
  getAddressCodec,
  getAddressEncoder,
  getBytesCodec,
  getI64Codec,
  getProgramDerivedAddress,
  getStructCodec,
  getU16Codec,
  getU64Codec,
  getU8Codec,
  type Address,
  type Decoder,
  type ReadonlyUint8Array,
} from "@solana/kit";
import { concat, u16le, u64le, utf8 } from "../bytes";
import idl from "./relay.idl.json";

interface NamedDiscriminator {
  name: string;
  discriminator: number[];
}

function discriminatorOf(
  items: readonly NamedDiscriminator[],
  name: string,
): Uint8Array {
  const item = items.find((i) => i.name === name);
  if (!item)
    throw new Error(
      `relay.idl.json has no entry named ${name}. Run \`bun run sync-idl\`.`,
    );
  return Uint8Array.from(item.discriminator);
}

export const RELAY_PROGRAM_ADDRESS: Address = address(idl.address);

export const INSTRUCTION_DISCRIMINATORS = {
  createPlan: discriminatorOf(idl.instructions, "create_plan"),
  revisePlan: discriminatorOf(idl.instructions, "revise_plan"),
  closePlan: discriminatorOf(idl.instructions, "close_plan"),
  beginFollow: discriminatorOf(idl.instructions, "begin_follow"),
  finishFollow: discriminatorOf(idl.instructions, "finish_follow"),
};

export const ACCOUNT_DISCRIMINATORS = {
  plan: discriminatorOf(idl.accounts, "Plan"),
  planVersion: discriminatorOf(idl.accounts, "PlanVersion"),
  followReceipt: discriminatorOf(idl.accounts, "FollowReceipt"),
};

// ------------------------------------------------------------------------------- well-known ids

export const SYSTEM_PROGRAM_ADDRESS: Address = address(
  "11111111111111111111111111111111",
);
export const TOKEN_PROGRAM_ADDRESS: Address = address(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
export const ATA_PROGRAM_ADDRESS: Address = address(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);
export const INSTRUCTIONS_SYSVAR_ADDRESS: Address = address(
  "Sysvar1nstructions1111111111111111111111111",
);
export const CLOCK_SYSVAR_ADDRESS: Address = address(
  "SysvarC1ock11111111111111111111111111111111",
);
export const COMPUTE_BUDGET_PROGRAM_ADDRESS: Address = address(
  "ComputeBudget111111111111111111111111111111",
);

// ---------------------------------------------------------------------------------------- PDAs

const addressEncoder = getAddressEncoder();

async function pda(seeds: ReadonlyUint8Array[]): Promise<Address> {
  const [found] = await getProgramDerivedAddress({
    programAddress: RELAY_PROGRAM_ADDRESS,
    seeds,
  });
  return found;
}

/** ["plan", creator, plan_id u64 LE] */
export function getPlanAddress(
  creator: Address,
  planId: bigint,
): Promise<Address> {
  return pda([utf8("plan"), addressEncoder.encode(creator), u64le(planId)]);
}

/** ["version", plan, version u16 LE] */
export function getVersionAddress(
  plan: Address,
  version: number,
): Promise<Address> {
  return pda([utf8("version"), addressEncoder.encode(plan), u16le(version)]);
}

/** ["receipt", plan_version, follower, nonce u64 LE] */
export function getReceiptAddress(
  planVersion: Address,
  follower: Address,
  nonce: bigint,
): Promise<Address> {
  return pda([
    utf8("receipt"),
    addressEncoder.encode(planVersion),
    addressEncoder.encode(follower),
    u64le(nonce),
  ]);
}

/** The follower's associated token account for `mint` (the only token accounts the program accepts). */
export async function getAssociatedTokenAddress(
  owner: Address,
  mint: Address,
): Promise<Address> {
  const [found] = await getProgramDerivedAddress({
    programAddress: ATA_PROGRAM_ADDRESS,
    seeds: [
      addressEncoder.encode(owner),
      addressEncoder.encode(TOKEN_PROGRAM_ADDRESS),
      addressEncoder.encode(mint),
    ],
  });
  return found;
}

// ---------------------------------------------------------------------------- account layouts

const hash32 = fixCodecSize(getBytesCodec(), 32);

const planCodec = getStructCodec([
  ["creator", getAddressCodec()],
  ["planId", getU64Codec()],
  ["baseMint", getAddressCodec()],
  ["quoteMint", getAddressCodec()],
  ["baseDecimals", getU8Codec()],
  ["quoteDecimals", getU8Codec()],
  ["latestVersion", getU16Codec()],
  ["status", getU8Codec()], // 0 = Open, 1 = Closed
  ["createdAt", getI64Codec()],
  ["bump", getU8Codec()],
]);

const planVersionCodec = getStructCodec([
  ["plan", getAddressCodec()],
  ["version", getU16Codec()],
  ["entryLow", getU64Codec()],
  ["entryHigh", getU64Codec()],
  ["expiresAt", getI64Codec()],
  ["publishedAt", getI64Codec()],
  ["publishedSlot", getU64Codec()],
  ["contentHash", hash32],
  ["prevTermsHash", hash32],
  ["termsHash", hash32],
  ["bump", getU8Codec()],
]);

const followReceiptCodec = getStructCodec([
  ["plan", getAddressCodec()],
  ["version", getU16Codec()],
  ["follower", getAddressCodec()],
  ["preBase", getU64Codec()],
  ["preQuote", getU64Codec()],
  ["maxQuoteIn", getU64Codec()],
  ["quoteSpent", getU64Codec()],
  ["baseReceived", getU64Codec()],
  ["status", getU8Codec()], // 0 = Pending, 1 = Recorded
  ["recordedAt", getI64Codec()],
  ["slot", getU64Codec()],
  ["nonce", getU64Codec()],
  ["bump", getU8Codec()],
]);

/** Exact on-chain sizes (discriminator + fields). Used as getProgramAccounts size filters. */
export const ACCOUNT_SIZES = {
  plan: 8 + planCodec.fixedSize,
  planVersion: 8 + planVersionCodec.fixedSize,
  followReceipt: 8 + followReceiptCodec.fixedSize,
};

function decodeAccount<T>(
  bytes: ReadonlyUint8Array,
  discriminator: Uint8Array,
  decoder: Decoder<T>,
  label: string,
): T {
  const head = bytes.subarray(0, 8);
  if (bytes.length < 8 || !discriminator.every((b, i) => b === head[i])) {
    throw new Error(`Account is not a Relay ${label}`);
  }
  return decoder.decode(bytes.subarray(8));
}

export interface PlanAccount {
  creator: Address;
  planId: bigint;
  baseMint: Address;
  quoteMint: Address;
  baseDecimals: number;
  quoteDecimals: number;
  latestVersion: number;
  status: "open" | "closed";
  /** Unix seconds. */
  createdAt: bigint;
}

export interface PlanVersionAccount {
  plan: Address;
  version: number;
  entryLow: bigint;
  entryHigh: bigint;
  /** Unix seconds. */
  expiresAt: bigint;
  publishedAt: bigint;
  publishedSlot: bigint;
  contentHash: Uint8Array;
  prevTermsHash: Uint8Array;
  termsHash: Uint8Array;
}

export interface FollowReceiptAccount {
  plan: Address;
  version: number;
  follower: Address;
  preBase: bigint;
  preQuote: bigint;
  maxQuoteIn: bigint;
  quoteSpent: bigint;
  baseReceived: bigint;
  status: "pending" | "recorded";
  recordedAt: bigint;
  slot: bigint;
  nonce: bigint;
}

export function decodePlan(bytes: ReadonlyUint8Array): PlanAccount {
  const p = decodeAccount(
    bytes,
    ACCOUNT_DISCRIMINATORS.plan,
    planCodec,
    "Plan",
  );
  if (p.status !== 0 && p.status !== 1)
    throw new Error(`Unknown plan status ${p.status}`);
  return {
    creator: p.creator,
    planId: p.planId,
    baseMint: p.baseMint,
    quoteMint: p.quoteMint,
    baseDecimals: p.baseDecimals,
    quoteDecimals: p.quoteDecimals,
    latestVersion: p.latestVersion,
    status: p.status === 0 ? "open" : "closed",
    createdAt: p.createdAt,
  };
}

export function decodePlanVersion(
  bytes: ReadonlyUint8Array,
): PlanVersionAccount {
  const v = decodeAccount(
    bytes,
    ACCOUNT_DISCRIMINATORS.planVersion,
    planVersionCodec,
    "PlanVersion",
  );
  return {
    plan: v.plan,
    version: v.version,
    entryLow: v.entryLow,
    entryHigh: v.entryHigh,
    expiresAt: v.expiresAt,
    publishedAt: v.publishedAt,
    publishedSlot: v.publishedSlot,
    contentHash: Uint8Array.from(v.contentHash),
    prevTermsHash: Uint8Array.from(v.prevTermsHash),
    termsHash: Uint8Array.from(v.termsHash),
  };
}

export function decodeFollowReceipt(
  bytes: ReadonlyUint8Array,
): FollowReceiptAccount {
  const r = decodeAccount(
    bytes,
    ACCOUNT_DISCRIMINATORS.followReceipt,
    followReceiptCodec,
    "FollowReceipt",
  );
  if (r.status !== 0 && r.status !== 1)
    throw new Error(`Unknown receipt status ${r.status}`);
  return {
    plan: r.plan,
    version: r.version,
    follower: r.follower,
    preBase: r.preBase,
    preQuote: r.preQuote,
    maxQuoteIn: r.maxQuoteIn,
    quoteSpent: r.quoteSpent,
    baseReceived: r.baseReceived,
    status: r.status === 0 ? "pending" : "recorded",
    recordedAt: r.recordedAt,
    slot: r.slot,
    nonce: r.nonce,
  };
}

/** Test helper: the exact bytes the program would store, used to round-trip the codecs. */
export function encodePlanVersionAccount(
  v: PlanVersionAccount & { bump: number },
): Uint8Array {
  return concat([
    ACCOUNT_DISCRIMINATORS.planVersion,
    planVersionCodec.encode(v),
  ]);
}

export function encodePlanAccount(
  p: PlanAccount & { bump: number },
): Uint8Array {
  return concat([
    ACCOUNT_DISCRIMINATORS.plan,
    planCodec.encode({ ...p, status: p.status === "open" ? 0 : 1 }),
  ]);
}

export function encodeFollowReceiptAccount(
  r: FollowReceiptAccount & { bump: number },
): Uint8Array {
  return concat([
    ACCOUNT_DISCRIMINATORS.followReceipt,
    followReceiptCodec.encode({ ...r, status: r.status === "pending" ? 0 : 1 }),
  ]);
}

// ------------------------------------------------------------------------------------- errors

export interface RelayErrorInfo {
  code: number;
  name: string;
  message: string;
}

/** The program's custom errors, from the IDL (codes start at 6000). */
export const RELAY_ERRORS: readonly RelayErrorInfo[] = idl.errors.map((e) => ({
  code: e.code,
  name: e.name,
  message: e.msg,
}));

export function relayErrorByName(name: string): RelayErrorInfo | undefined {
  return RELAY_ERRORS.find((e) => e.name === name);
}

export function relayErrorByCode(code: number): RelayErrorInfo | undefined {
  return RELAY_ERRORS.find((e) => e.code === code);
}

/**
 * Finds the Anchor error name in program logs, e.g.
 * "Program log: AnchorError thrown in ... Error Code: PlanExpired. Error Number: 6006. ..."
 */
export function parseAnchorErrorName(
  logs: readonly string[],
): string | undefined {
  for (const line of logs) {
    const match = /Error Code: ([A-Za-z0-9_]+)\./.exec(line);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

/** Digs the `Custom` program error code out of a transaction error object, if there is one. */
export function customErrorCode(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    if (
      "Custom" in err &&
      (typeof err.Custom === "number" || typeof err.Custom === "bigint")
    ) {
      return Number(err.Custom);
    }
    for (const value of Object.values(err)) {
      const found = customErrorCode(value);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}
