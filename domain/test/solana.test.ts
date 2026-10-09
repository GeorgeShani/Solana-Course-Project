import { describe, expect, it } from "bun:test";
import { AccountRole, address, blockhash } from "@solana/kit";
import {
  ACCOUNT_SIZES,
  RELAY_PROGRAM_ADDRESS,
  beginFollowInstruction,
  closePlanInstruction,
  composeFollowTx,
  createPlanInstruction,
  customErrorCode,
  decodeFollowReceipt,
  decodePlan,
  decodePlanVersion,
  encodeFollowReceiptAccount,
  encodePlanAccount,
  encodePlanVersionAccount,
  finishFollowInstruction,
  getAssociatedTokenAddress,
  getPlanAddress,
  getReceiptAddress,
  getVersionAddress,
  parseAnchorErrorName,
  priorityFeeMicroLamports,
  relayErrorByCode,
  relayErrorByName,
  revisePlanInstruction,
} from "../src/solana";
import { parseJupiterBuild } from "../src/jupiter";
import idl from "../src/solana/relay.idl.json";
import fixture from "./fixtures/jupiter-build.json";

const A = address("4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx");
const B = address("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
const SOL = address("So11111111111111111111111111111111111111112");
const USDC = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const hash = (n: number) => new Uint8Array(32).fill(n);

describe("account layouts", () => {
  it("have the sizes the Rust tests assert (discriminator + fields)", () => {
    expect(ACCOUNT_SIZES.plan).toBe(8 + 118);
    expect(ACCOUNT_SIZES.planVersion).toBe(8 + 171);
    expect(ACCOUNT_SIZES.followReceipt).toBe(8 + 132);
  });

  it("round-trip a plan, a version and a receipt", () => {
    const plan = {
      creator: A,
      planId: 7n,
      baseMint: SOL,
      quoteMint: USDC,
      baseDecimals: 9,
      quoteDecimals: 6,
      latestVersion: 3,
      status: "closed" as const,
      createdAt: 1_790_000_000n,
    };
    const bytes = encodePlanAccount({ ...plan, bump: 254 });
    expect(bytes.length).toBe(ACCOUNT_SIZES.plan);
    expect(decodePlan(bytes)).toEqual(plan);

    const version = {
      plan: B,
      version: 2,
      entryLow: 180_000_000n,
      entryHigh: 185_000_000n,
      expiresAt: 1_790_003_600n,
      publishedAt: 1_790_000_100n,
      publishedSlot: 42n,
      contentHash: hash(1),
      prevTermsHash: hash(2),
      termsHash: hash(3),
    };
    const vBytes = encodePlanVersionAccount({ ...version, bump: 255 });
    expect(vBytes.length).toBe(ACCOUNT_SIZES.planVersion);
    expect(decodePlanVersion(vBytes)).toEqual(version);

    const receipt = {
      plan: A,
      version: 1,
      follower: B,
      preBase: 5n,
      preQuote: 1_000_000_000n,
      maxQuoteIn: 200_000_000n,
      quoteSpent: 100_000_000n,
      baseReceived: 546_448_087n,
      status: "recorded" as const,
      recordedAt: 1_790_000_200n,
      slot: 99n,
      nonce: 1n,
    };
    const rBytes = encodeFollowReceiptAccount({ ...receipt, bump: 253 });
    expect(rBytes.length).toBe(ACCOUNT_SIZES.followReceipt);
    expect(decodeFollowReceipt(rBytes)).toEqual(receipt);
  });

  it("refuse an account of the wrong type or a truncated one", () => {
    const version = encodePlanVersionAccount({
      plan: B,
      version: 1,
      entryLow: 1n,
      entryHigh: 2n,
      expiresAt: 3n,
      publishedAt: 4n,
      publishedSlot: 5n,
      contentHash: hash(1),
      prevTermsHash: hash(0),
      termsHash: hash(2),
      bump: 1,
    });
    expect(() => decodePlan(version)).toThrow(/not a Relay Plan/);
    expect(() => decodePlanVersion(version.subarray(0, 100))).toThrow();
    expect(() => decodePlanVersion(new Uint8Array(0))).toThrow();
  });
});

describe("instruction builders match the generated IDL", () => {
  // Distinct addresses so the order of accounts is checked, not just their flags.
  const k0 = address("11111111111111111111111111111112");
  const k1 = address("11111111111111111111111111111113");
  const k2 = address("11111111111111111111111111111114");
  const k3 = address("11111111111111111111111111111115");
  const k4 = address("11111111111111111111111111111116");
  const k5 = address("11111111111111111111111111111117");

  function roleOf(account: {
    writable?: boolean;
    signer?: boolean;
  }): AccountRole {
    if (account.signer)
      return account.writable
        ? AccountRole.WRITABLE_SIGNER
        : AccountRole.READONLY_SIGNER;
    return account.writable ? AccountRole.WRITABLE : AccountRole.READONLY;
  }

  function idlRoles(name: string): AccountRole[] {
    const ix = idl.instructions.find((i) => i.name === name);
    if (!ix) throw new Error(`IDL has no ${name}`);
    return ix.accounts.map(roleOf);
  }

  function idlNames(name: string): string[] {
    const ix = idl.instructions.find((i) => i.name === name);
    if (!ix) throw new Error(`IDL has no ${name}`);
    return ix.accounts.map((a) => a.name);
  }

  const roles = (accounts: readonly { role: AccountRole }[] | undefined) =>
    (accounts ?? []).map((a) => a.role);

  it("create_plan", () => {
    const ix = createPlanInstruction({
      creator: k0,
      plan: k1,
      version: k2,
      baseMint: k3,
      quoteMint: k4,
      planId: 1n,
      entryLow: 1n,
      entryHigh: 2n,
      expiresAt: 3n,
      contentHash: hash(1),
    });
    expect(roles(ix.accounts)).toEqual(idlRoles("create_plan"));
    expect(idlNames("create_plan").slice(0, 5)).toEqual([
      "creator",
      "plan",
      "version",
      "base_mint",
      "quote_mint",
    ]);
    expect(ix.programAddress).toBe(RELAY_PROGRAM_ADDRESS);
    expect(ix.data?.length).toBe(8 + 8 + 8 + 8 + 8 + 32);
  });

  it("revise_plan", () => {
    const ix = revisePlanInstruction({
      creator: k0,
      plan: k1,
      prevVersion: k2,
      newVersion: k3,
      entryLow: 1n,
      entryHigh: 2n,
      expiresAt: 3n,
      contentHash: hash(1),
    });
    expect(roles(ix.accounts)).toEqual(idlRoles("revise_plan"));
    expect(idlNames("revise_plan").slice(0, 4)).toEqual([
      "creator",
      "plan",
      "prev_version",
      "new_version",
    ]);
    expect(ix.data?.length).toBe(8 + 8 + 8 + 8 + 32);
  });

  it("close_plan", () => {
    const ix = closePlanInstruction({ creator: k0, plan: k1 });
    expect(roles(ix.accounts)).toEqual(idlRoles("close_plan"));
    expect(idlNames("close_plan")).toEqual(["creator", "plan"]);
  });

  it("begin_follow", () => {
    const ix = beginFollowInstruction({
      follower: k0,
      plan: k1,
      planVersion: k2,
      receipt: k3,
      followerBase: k4,
      followerQuote: k5,
      version: 1,
      nonce: 1n,
      maxQuoteIn: 1n,
    });
    expect(roles(ix.accounts)).toEqual(idlRoles("begin_follow"));
    expect(idlNames("begin_follow")).toEqual([
      "follower",
      "plan",
      "plan_version",
      "receipt",
      "follower_base",
      "follower_quote",
      "instructions",
      "system_program",
    ]);
    expect(ix.data?.length).toBe(8 + 2 + 8 + 8);
  });

  it("finish_follow (the program reads follower at index 0 and receipt at index 1)", () => {
    const ix = finishFollowInstruction({
      follower: k0,
      receipt: k1,
      followerBase: k2,
      followerQuote: k3,
      planVersion: k4,
      plan: k5,
    });
    expect(roles(ix.accounts)).toEqual(idlRoles("finish_follow"));
    expect(idlNames("finish_follow")).toEqual([
      "follower",
      "receipt",
      "follower_base",
      "follower_quote",
      "plan_version",
      "plan",
    ]);
    expect(ix.accounts?.[0]?.address).toBe(k0);
    expect(ix.accounts?.[1]?.address).toBe(k1);
  });
});

describe("addresses", () => {
  it("derive deterministic, distinct PDAs", async () => {
    const plan = await getPlanAddress(A, 1n);
    expect(await getPlanAddress(A, 1n)).toBe(plan);
    expect(await getPlanAddress(A, 2n)).not.toBe(plan);
    expect(await getPlanAddress(B, 1n)).not.toBe(plan);
    const v1 = await getVersionAddress(plan, 1);
    expect(await getVersionAddress(plan, 2)).not.toBe(v1);
    const receipt = await getReceiptAddress(v1, A, 1n);
    expect(await getReceiptAddress(v1, A, 2n)).not.toBe(receipt);
    expect(await getReceiptAddress(v1, B, 1n)).not.toBe(receipt);
  });

  it("derive the canonical associated token address", async () => {
    // Known value: the associated USDC account of the System Program address.
    const ata = await getAssociatedTokenAddress(
      address("11111111111111111111111111111111"),
      USDC,
    );
    expect(ata.length).toBeGreaterThan(30);
    expect(await getAssociatedTokenAddress(A, USDC)).not.toBe(
      await getAssociatedTokenAddress(A, SOL),
    );
  });
});

describe("composeFollowTx", () => {
  const build = parseJupiterBuild(fixture);
  const latest = {
    blockhash: blockhash("11111111111111111111111111111111"),
    lastValidBlockHeight: 100n,
  };
  const base = async () => ({
    build,
    plan: await getPlanAddress(B, 1n),
    version: 1,
    follower: A,
    baseMint: SOL,
    quoteMint: USDC,
    nonce: 1n,
    maxQuoteIn: 200_000_000n,
    blockhash: latest,
    computeUnitLimit: 400_000,
    computeUnitPriceCap: 5_000_000n,
  });

  it("builds [compute budget, own ATAs, begin, one Jupiter swap, finish] within the size limit", async () => {
    const composed = await composeFollowTx(await base());
    const programs = composed.instructions.map((i) => i.programAddress);
    expect(programs.at(-1)).toBe(RELAY_PROGRAM_ADDRESS);
    expect(programs.at(-2)).toBe(
      address("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
    );
    expect(programs.at(-3)).toBe(RELAY_PROGRAM_ADDRESS);
    expect(programs.filter((p) => p === RELAY_PROGRAM_ADDRESS).length).toBe(2);
    expect(composed.sizeBytes).toBeLessThanOrEqual(1232);
    // exactly one compute-unit-limit instruction (a second one makes a transaction invalid)
    const limits = composed.instructions.filter(
      (i) => i.programAddress.startsWith("ComputeBudget") && i.data?.[0] === 2,
    );
    expect(limits.length).toBe(1);
  });

  it("derives the receipt and token accounts the program expects", async () => {
    const input = await base();
    const composed = await composeFollowTx(input);
    expect(composed.followerBase).toBe(await getAssociatedTokenAddress(A, SOL));
    expect(composed.followerQuote).toBe(
      await getAssociatedTokenAddress(A, USDC),
    );
    const planVersion = await getVersionAddress(input.plan, 1);
    expect(composed.receipt).toBe(await getReceiptAddress(planVersion, A, 1n));
  });

  it("fails closed on anything beyond the expected shape", async () => {
    const input = await base();
    const swap = build.swapInstruction;
    const extra = {
      programId: "11111111111111111111111111111111",
      accounts: [],
      data: "",
    };
    await expect(
      composeFollowTx({
        ...input,
        build: { ...build, otherInstructions: [extra] },
      }),
    ).rejects.toThrow(/extra instructions/);
    await expect(
      composeFollowTx({ ...input, build: { ...build, tipInstruction: extra } }),
    ).rejects.toThrow(/tip/);
    await expect(
      composeFollowTx({
        ...input,
        build: { ...build, cleanupInstruction: extra },
      }),
    ).rejects.toThrow(/cleanup/);
    await expect(
      composeFollowTx({
        ...input,
        build: { ...build, setupInstructions: [extra] },
      }),
    ).rejects.toThrow(/setup/);
    await expect(
      composeFollowTx({
        ...input,
        build: {
          ...build,
          swapInstruction: {
            ...swap,
            programId: "11111111111111111111111111111111",
          },
        },
      }),
    ).rejects.toThrow(/Jupiter/);
  });

  it("rejects a swap that someone else signs or that ignores the follower's accounts", async () => {
    const input = await base();
    const swap = build.swapInstruction;
    const stranger = { pubkey: B, isSigner: true, isWritable: false };
    await expect(
      composeFollowTx({
        ...input,
        build: {
          ...build,
          swapInstruction: { ...swap, accounts: [...swap.accounts, stranger] },
        },
      }),
    ).rejects.toThrow(/follower only/);
    await expect(composeFollowTx({ ...input, follower: B })).rejects.toThrow();
  });

  it("rejects a priority fee above the cap", async () => {
    const input = await base();
    await expect(
      composeFollowTx({ ...input, computeUnitPriceCap: 0n }),
    ).rejects.toThrow(/Priority fee/);
  });
});

describe("error decoding", () => {
  it("looks program errors up by name and code from the IDL", () => {
    const expired = relayErrorByName("PlanExpired");
    expect(expired?.code).toBe(6006);
    expect(relayErrorByCode(6006)?.name).toBe("PlanExpired");
    expect(relayErrorByCode(1)).toBeUndefined();
    expect(relayErrorByName("Nope")).toBeUndefined();
  });

  it("reads the Anchor error name from program logs", () => {
    const logs = [
      "Program X invoke [1]",
      "Program log: AnchorError thrown in programs/relay/src/instructions/begin_follow.rs:67. Error Code: PlanExpired. Error Number: 6006. Error Message: This plan version has expired.",
    ];
    expect(parseAnchorErrorName(logs)).toBe("PlanExpired");
    expect(parseAnchorErrorName(["Program log: all good"])).toBeUndefined();
    expect(parseAnchorErrorName([])).toBeUndefined();
  });

  it("finds a custom error code anywhere in a transaction error", () => {
    expect(customErrorCode({ InstructionError: [4, { Custom: 6006 }] })).toBe(
      6006,
    );
    expect(customErrorCode({ InstructionError: [4, { Custom: 6006n }] })).toBe(
      6006,
    );
    expect(
      customErrorCode({ InstructionError: [0, "AccountNotFound"] }),
    ).toBeUndefined();
    expect(customErrorCode("BlockhashNotFound")).toBeUndefined();
    expect(customErrorCode(null)).toBeUndefined();
  });
});

describe("priorityFeeMicroLamports", () => {
  it("reads the compute-unit price Jupiter asked for", () => {
    const build = parseJupiterBuild(fixture);
    expect(priorityFeeMicroLamports(build)).toBeGreaterThanOrEqual(0n);
    expect(
      priorityFeeMicroLamports({ ...build, computeBudgetInstructions: [] }),
    ).toBe(0n);
  });
});
