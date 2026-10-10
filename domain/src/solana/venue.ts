/**
 * Client for the simulated swap venue (program/programs/simulated_venue), the swap route Relay uses
 * on devnet where there is no Jupiter market. Labelled "Simulated swap venue (devnet)" wherever it
 * is shown.
 *
 * Like program.ts this is the single place that knows the venue's address, account layout, PDA
 * seeds and instruction formats. A shared test vector (domain/test-vectors/venue.json) is read by
 * the Rust unit tests and the TypeScript tests, so the two sides cannot drift apart.
 *
 * The venue has no authority over Relay. Relay never trusts it: the follow program measures what
 * the follower's own token accounts really did.
 */
import {
  AccountRole,
  address,
  getAddressDecoder,
  getAddressEncoder,
  getBase64Decoder,
  getBase64Encoder,
  getProgramDerivedAddress,
  type Address,
  type Instruction,
} from "@solana/kit";
import { concat, u64le, utf8 } from "../bytes";
import type { JupiterBuild, JupiterInstruction } from "../jupiter";
import {
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  getAssociatedTokenAddress,
} from "./program";

/**
 * The venue's program address. This is a PLACEHOLDER until the owner deploys the venue with their
 * own keypair: `bun run scripts/set-program-id.ts <relay id> --venue <venue id>` rewrites it here
 * and in program/programs/relay/src/constants.rs, and a test checks that both agree.
 */
export const SIMULATED_VENUE_PROGRAM_ADDRESS: Address = address(
  "3A7tcXdJPRbBTJXvaLpn6vqddkJT8NQG8cgsubYgEmXa",
);

export const SIMULATED_VENUE_LABEL = "Simulated swap venue (devnet)";

/** Bytes in a pool account. */
export const VENUE_POOL_SIZE = 108;

const TAG_INIT_POOL = 0;
const TAG_SET_PRICE = 1;
const TAG_SWAP = 2;

const { WRITABLE_SIGNER, READONLY_SIGNER, WRITABLE, READONLY } = AccountRole;
const addressEncoder = getAddressEncoder();
const addressDecoder = getAddressDecoder();
const base64Decoder = getBase64Decoder();
const base64Encoder = getBase64Encoder();

// --------------------------------------------------------------------------------------- errors

/** Custom error codes returned by the venue program (VenueError in lib.rs). */
const VENUE_ERRORS: Readonly<
  Record<number, { name: string; message: string }>
> = {
  1: {
    name: "BadInstruction",
    message: "The venue did not understand the request",
  },
  2: { name: "MissingSignature", message: "The request was not signed" },
  3: {
    name: "WrongPoolAddress",
    message: "That is not the venue's pool address",
  },
  4: { name: "PoolNotReady", message: "The venue's pool is not set up yet" },
  5: { name: "PoolExists", message: "That pool already exists" },
  6: { name: "NotAdmin", message: "Only the pool's admin can do that" },
  7: { name: "InvalidPrice", message: "The pool price must be above zero" },
  8: { name: "InvalidMint", message: "That token cannot be used in a pool" },
  9: { name: "WrongVault", message: "The pool's token vaults do not match" },
  10: {
    name: "WrongTokenAccount",
    message: "The token accounts do not belong to the follower",
  },
  11: { name: "WrongTokenProgram", message: "The token program is wrong" },
  12: {
    name: "NothingToReceive",
    message: "That amount is too small to receive anything",
  },
  13: {
    name: "SlippageExceeded",
    message: "The venue's price moved. Review the trade again",
  },
  14: { name: "MathOverflow", message: "That amount is too large" },
};

export function venueErrorByCode(
  code: number,
): { name: string; message: string } | undefined {
  return VENUE_ERRORS[code];
}

// ------------------------------------------------------------------------------------ addresses

/**
 * ["pool", admin, base_mint, quote_mint] under the venue program. `programAddress` is only for the
 * shared test vector, which must not change when a deployment swaps in its own program id.
 */
export async function getVenuePoolAddress(
  admin: Address,
  baseMint: Address,
  quoteMint: Address,
  programAddress: Address = SIMULATED_VENUE_PROGRAM_ADDRESS,
): Promise<{ address: Address; bump: number }> {
  const [found, bump] = await getProgramDerivedAddress({
    programAddress,
    seeds: [
      utf8("pool"),
      addressEncoder.encode(admin),
      addressEncoder.encode(baseMint),
      addressEncoder.encode(quoteMint),
    ],
  });
  return { address: found, bump };
}

/** A pool's vault for `mint`: the pool's associated token account. */
export function getVenueVaultAddress(
  pool: Address,
  mint: Address,
): Promise<Address> {
  return getAssociatedTokenAddress(pool, mint);
}

// --------------------------------------------------------------------------------- pool account

export interface VenuePool {
  bump: number;
  baseDecimals: number;
  admin: Address;
  baseMint: Address;
  quoteMint: Address;
  /** Quote atomic units per one whole base token (the same unit as Relay's plan prices). */
  price: bigint;
}

/** tag u8 | bump u8 | base_decimals u8 | reserved u8 | admin 32 | base 32 | quote 32 | price u64 LE */
export function encodeVenuePool(pool: VenuePool): Uint8Array {
  const out = new Uint8Array(VENUE_POOL_SIZE);
  out[0] = 1;
  out[1] = pool.bump;
  out[2] = pool.baseDecimals;
  out.set(addressEncoder.encode(pool.admin), 4);
  out.set(addressEncoder.encode(pool.baseMint), 36);
  out.set(addressEncoder.encode(pool.quoteMint), 68);
  out.set(u64le(pool.price), 100);
  return out;
}

export function decodeVenuePool(bytes: Uint8Array): VenuePool {
  if (bytes.length !== VENUE_POOL_SIZE || bytes[0] !== 1)
    throw new Error("Not a simulated venue pool account");
  const key = (from: number) => addressDecoder.decode(bytes, from);
  return {
    bump: bytes[1] ?? 0,
    baseDecimals: bytes[2] ?? 0,
    admin: key(4),
    baseMint: key(36),
    quoteMint: key(68),
    price: new DataView(bytes.buffer, bytes.byteOffset + 100, 8).getBigUint64(
      0,
      true,
    ),
  };
}

// --------------------------------------------------------------------------------------- price

/** floor(amountIn * 10^baseDecimals / price): base atomic units for `amountIn` quote units. */
export function venueSwapOut(
  amountIn: bigint,
  price: bigint,
  baseDecimals: number,
): bigint {
  if (price <= 0n) throw new RangeError("The pool price must be above zero");
  if (amountIn < 0n) throw new RangeError("Amount must not be negative");
  return (amountIn * 10n ** BigInt(baseDecimals)) / price;
}

// -------------------------------------------------------------------------------- instructions

export function initPoolInstruction(args: {
  admin: Address;
  pool: Address;
  baseMint: Address;
  quoteMint: Address;
  price: bigint;
}): Instruction {
  return {
    programAddress: SIMULATED_VENUE_PROGRAM_ADDRESS,
    accounts: [
      { address: args.admin, role: WRITABLE_SIGNER },
      { address: args.pool, role: WRITABLE },
      { address: args.baseMint, role: READONLY },
      { address: args.quoteMint, role: READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: READONLY },
    ],
    data: concat([Uint8Array.of(TAG_INIT_POOL), u64le(args.price)]),
  };
}

export function setPriceInstruction(args: {
  admin: Address;
  pool: Address;
  price: bigint;
}): Instruction {
  return {
    programAddress: SIMULATED_VENUE_PROGRAM_ADDRESS,
    accounts: [
      { address: args.admin, role: READONLY_SIGNER },
      { address: args.pool, role: WRITABLE },
    ],
    data: concat([Uint8Array.of(TAG_SET_PRICE), u64le(args.price)]),
  };
}

/**
 * The follower's swap. Accounts: user (signer), user quote, user base, pool, quote vault, base
 * vault, token program. The user is the ONLY signer, which is what Relay's layout rule requires.
 */
export function swapInstruction(args: {
  user: Address;
  userQuote: Address;
  userBase: Address;
  pool: Address;
  quoteVault: Address;
  baseVault: Address;
  amountIn: bigint;
  minOut: bigint;
}): Instruction {
  return {
    programAddress: SIMULATED_VENUE_PROGRAM_ADDRESS,
    accounts: [
      { address: args.user, role: WRITABLE_SIGNER },
      { address: args.userQuote, role: WRITABLE },
      { address: args.userBase, role: WRITABLE },
      { address: args.pool, role: READONLY },
      { address: args.quoteVault, role: WRITABLE },
      { address: args.baseVault, role: WRITABLE },
      { address: TOKEN_PROGRAM_ADDRESS, role: READONLY },
    ],
    data: concat([
      Uint8Array.of(TAG_SWAP),
      u64le(args.amountIn),
      u64le(args.minOut),
    ]),
  };
}

// ------------------------------------------------------------------- as a Jupiter-shaped route

function roleFlags(role: AccountRole): {
  isSigner: boolean;
  isWritable: boolean;
} {
  return {
    isSigner: role === WRITABLE_SIGNER || role === READONLY_SIGNER,
    isWritable: role === WRITABLE_SIGNER || role === WRITABLE,
  };
}

function toRouteInstruction(ix: Instruction): JupiterInstruction {
  return {
    programId: ix.programAddress,
    accounts: (ix.accounts ?? []).map((a) => ({
      pubkey: a.address,
      ...roleFlags(a.role),
    })),
    data: base64Decoder.decode(ix.data ?? new Uint8Array()),
  };
}

/**
 * The swap route for a pool, in the same shape the follow composer already takes for Jupiter
 * (`JupiterBuild`): no setup, no cleanup, no compute budget, no lookup tables. The minimum output
 * equals the expected output: the venue's price is whatever its admin set, so the swap fails
 * (spending nothing) if that price changes between the quote and the signature.
 */
export async function buildVenueRoute(args: {
  pool: VenuePool;
  poolAddress: Address;
  follower: Address;
  amountIn: bigint;
}): Promise<JupiterBuild> {
  const { pool, follower } = args;
  const out = venueSwapOut(args.amountIn, pool.price, pool.baseDecimals);
  if (out <= 0n)
    throw new RangeError("That amount is too small to receive anything");
  const [userQuote, userBase, quoteVault, baseVault] = await Promise.all([
    getAssociatedTokenAddress(follower, pool.quoteMint),
    getAssociatedTokenAddress(follower, pool.baseMint),
    getVenueVaultAddress(args.poolAddress, pool.quoteMint),
    getVenueVaultAddress(args.poolAddress, pool.baseMint),
  ]);
  const swap = swapInstruction({
    user: follower,
    userQuote,
    userBase,
    pool: args.poolAddress,
    quoteVault,
    baseVault,
    amountIn: args.amountIn,
    minOut: out,
  });
  return {
    inAmount: args.amountIn,
    outAmount: out,
    minOutAmount: out,
    slippageBps: 0,
    routeLabels: [SIMULATED_VENUE_LABEL],
    computeBudgetInstructions: [],
    setupInstructions: [],
    swapInstruction: toRouteInstruction(swap),
    cleanupInstruction: null,
    otherInstructions: [],
    tipInstruction: null,
    addressesByLookupTableAddress: {},
  };
}

/** The `GET /swap/v2/build`-shaped JSON for the same route, which `parseJupiterBuild` accepts. */
export function venueRouteJson(route: JupiterBuild): Record<string, unknown> {
  return {
    inAmount: route.inAmount.toString(),
    outAmount: route.outAmount.toString(),
    otherAmountThreshold: route.minOutAmount.toString(),
    slippageBps: route.slippageBps,
    routePlan: route.routeLabels.map((label) => ({ swapInfo: { label } })),
    computeBudgetInstructions: [],
    setupInstructions: [],
    swapInstruction: route.swapInstruction,
    cleanupInstruction: null,
    otherInstructions: [],
    tipInstruction: null,
    addressesByLookupTableAddress: {},
  };
}

// ------------------------------------------------------------------------------------- checks

/**
 * Checks a venue swap instruction on its own, from the instruction alone (no network): exactly the
 * shape `swapInstruction` builds, for THIS follower, with THEIR associated token accounts, a vault
 * pair that really belongs to the named pool, and the amounts the follower approved. Throws
 * otherwise. The server runs it on its own output and the browser runs it on what it received.
 */
export async function assertVenueSwap(
  swap: JupiterInstruction,
  expected: {
    follower: Address;
    baseMint: Address;
    quoteMint: Address;
    /** The most quote the follower approved spending. */
    maxQuoteIn: bigint;
  },
): Promise<{ pool: Address; amountIn: bigint; minOut: bigint }> {
  if (swap.programId !== SIMULATED_VENUE_PROGRAM_ADDRESS)
    throw new Error("Swap is not routed through the simulated venue");
  const data = Uint8Array.from(base64Encoder.encode(swap.data));
  if (data.length !== 17 || data[0] !== TAG_SWAP)
    throw new Error("Unexpected venue instruction");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const amountIn = view.getBigUint64(1, true);
  const minOut = view.getBigUint64(9, true);
  if (amountIn <= 0n || amountIn > expected.maxQuoteIn)
    throw new Error("The swap spends more than the follower approved");
  if (minOut <= 0n) throw new Error("The swap has no minimum output");

  if (swap.accounts.length !== 7)
    throw new Error("Unexpected accounts on the venue swap");
  const [user, userQuote, userBase, pool, quoteVault, baseVault, tokenProgram] =
    swap.accounts;
  if (
    !user ||
    !userQuote ||
    !userBase ||
    !pool ||
    !quoteVault ||
    !baseVault ||
    !tokenProgram
  )
    throw new Error("Unexpected accounts on the venue swap");

  const wantQuote = await getAssociatedTokenAddress(
    expected.follower,
    expected.quoteMint,
  );
  const wantBase = await getAssociatedTokenAddress(
    expected.follower,
    expected.baseMint,
  );
  const wantQuoteVault = await getVenueVaultAddress(
    address(pool.pubkey),
    expected.quoteMint,
  );
  const wantBaseVault = await getVenueVaultAddress(
    address(pool.pubkey),
    expected.baseMint,
  );

  const ok =
    user.pubkey === expected.follower &&
    user.isSigner &&
    userQuote.pubkey === wantQuote &&
    !userQuote.isSigner &&
    userBase.pubkey === wantBase &&
    !userBase.isSigner &&
    !pool.isSigner &&
    !pool.isWritable &&
    quoteVault.pubkey === wantQuoteVault &&
    !quoteVault.isSigner &&
    baseVault.pubkey === wantBaseVault &&
    !baseVault.isSigner &&
    tokenProgram.pubkey === TOKEN_PROGRAM_ADDRESS &&
    !tokenProgram.isSigner;
  if (!ok)
    throw new Error("The venue swap does not use the follower's own accounts");
  return { pool: address(pool.pubkey), amountIn, minOut };
}
