import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AccountRole, address, blockhash } from "@solana/kit";
import {
  DEVNET_USDC,
  JUP,
  SOL,
  USDC,
  findPairByMints,
  findPair,
  pairsFor,
} from "../src/assets";
import { NETWORKS } from "../src/networks";
import { parseJupiterBuild } from "../src/jupiter";
import { toHex } from "../src/bytes";
import {
  JUPITER_PROGRAM_ADDRESSES,
  SIMULATED_VENUE_LABEL,
  SIMULATED_VENUE_PROGRAM_ADDRESS,
  VENUE_POOL_SIZE,
  assertVenueSwap,
  buildVenueRoute,
  composeFollowTx,
  decodeVenuePool,
  encodeVenuePool,
  getAssociatedTokenAddress,
  getVenuePoolAddress,
  getVenueVaultAddress,
  initPoolInstruction,
  setPriceInstruction,
  swapInstruction,
  swapProgramsFor,
  venueErrorByCode,
  venueRouteJson,
  venueSwapOut,
} from "../src/solana";
import vectors from "../test-vectors/venue.json";
import jupiterFixture from "./fixtures/jupiter-build.json";

const FOLLOWER = address("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
const ADMIN = address("4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx");
const PLAN = address("Dzm5tgMCdhJZfXeHYuALst4hvZYiCebfyKf1ctx6WBF6");
const SOL_MINT = address(SOL.mint);
const QUOTE_MINT = address(DEVNET_USDC.mint);
const BLOCKHASH = {
  blockhash: blockhash("11111111111111111111111111111111"),
  lastValidBlockHeight: 1_000n,
};

function flags(role: AccountRole) {
  return {
    isSigner:
      role === AccountRole.WRITABLE_SIGNER ||
      role === AccountRole.READONLY_SIGNER,
    isWritable:
      role === AccountRole.WRITABLE_SIGNER || role === AccountRole.WRITABLE,
  };
}

const bytes = (data?: ArrayLike<number>) => Uint8Array.from(data ?? []);

describe("the shared venue vector (Rust reads the same file)", () => {
  it("has at least two cases and a placeholder program id", () => {
    expect(vectors.cases.length).toBeGreaterThanOrEqual(2);
  });

  for (const c of vectors.cases) {
    it(`TypeScript derives exactly what the file says: ${c.name}`, async () => {
      const program = address(vectors.program);
      const admin = address(c.admin);
      const base = address(c.baseMint);
      const quote = address(c.quoteMint);
      const user = address(c.user);

      const pool = await getVenuePoolAddress(admin, base, quote, program);
      expect(pool.address).toBe(address(c.pool));
      expect(pool.bump).toBe(c.bump);
      expect(await getVenueVaultAddress(pool.address, base)).toBe(
        address(c.baseVault),
      );
      expect(await getVenueVaultAddress(pool.address, quote)).toBe(
        address(c.quoteVault),
      );
      expect(await getAssociatedTokenAddress(user, base)).toBe(
        address(c.userBase),
      );
      expect(await getAssociatedTokenAddress(user, quote)).toBe(
        address(c.userQuote),
      );

      const price = BigInt(c.price);
      const amountIn = BigInt(c.amountIn);
      const out = venueSwapOut(amountIn, price, c.baseDecimals);
      expect(out.toString()).toBe(c.expectedOut);

      const state = {
        bump: pool.bump,
        baseDecimals: c.baseDecimals,
        admin,
        baseMint: base,
        quoteMint: quote,
        price,
      };
      expect(toHex(encodeVenuePool(state))).toBe(c.poolBytesHex);
      expect(decodeVenuePool(encodeVenuePool(state))).toEqual(state);

      expect(
        toHex(
          bytes(
            initPoolInstruction({
              admin,
              pool: pool.address,
              baseMint: base,
              quoteMint: quote,
              price,
            }).data,
          ),
        ),
      ).toBe(c.initPoolDataHex);
      expect(
        toHex(
          bytes(setPriceInstruction({ admin, pool: pool.address, price }).data),
        ),
      ).toBe(c.setPriceDataHex);

      const swap = swapInstruction({
        user,
        userQuote: address(c.userQuote),
        userBase: address(c.userBase),
        pool: pool.address,
        quoteVault: address(c.quoteVault),
        baseVault: address(c.baseVault),
        amountIn,
        minOut: out,
      });
      expect(toHex(bytes(swap.data))).toBe(c.swap.dataHex);
      expect(
        (swap.accounts ?? []).map((a) => ({
          address: a.address,
          ...flags(a.role),
        })),
      ).toEqual(
        c.swap.accounts.map((a) => ({ ...a, address: address(a.address) })),
      );
    });
  }
});

describe("price math", () => {
  it("floors, like the program", () => {
    expect(venueSwapOut(100_000_000n, 150_000_000n, 9)).toBe(666_666_666n);
    expect(venueSwapOut(10_000_000n, 350_000n, 6)).toBe(28_571_428n);
    expect(venueSwapOut(0n, 1n, 9)).toBe(0n);
  });

  it("refuses a zero price and a negative amount", () => {
    expect(() => venueSwapOut(1n, 0n, 9)).toThrow(RangeError);
    expect(() => venueSwapOut(-1n, 1n, 9)).toThrow(RangeError);
  });
});

describe("the pool account", () => {
  it("rejects anything that is not exactly a pool", () => {
    const good = encodeVenuePool({
      bump: 255,
      baseDecimals: 9,
      admin: ADMIN,
      baseMint: SOL_MINT,
      quoteMint: QUOTE_MINT,
      price: 1n,
    });
    expect(good.length).toBe(VENUE_POOL_SIZE);
    expect(() => decodeVenuePool(good.slice(1))).toThrow();
    const wrongTag = Uint8Array.from(good);
    wrongTag[0] = 0;
    expect(() => decodeVenuePool(wrongTag)).toThrow();
  });

  it("maps the program's error codes to plain text", () => {
    expect(venueErrorByCode(6)?.name).toBe("NotAdmin");
    expect(venueErrorByCode(13)?.name).toBe("SlippageExceeded");
    expect(venueErrorByCode(999)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------- the route

async function route(amountIn = 100_000_000n, price = 150_000_000n) {
  const pool = await getVenuePoolAddress(ADMIN, SOL_MINT, QUOTE_MINT);
  const state = {
    bump: pool.bump,
    baseDecimals: 9,
    admin: ADMIN,
    baseMint: SOL_MINT,
    quoteMint: QUOTE_MINT,
    price,
  };
  const build = await buildVenueRoute({
    pool: state,
    poolAddress: pool.address,
    follower: FOLLOWER,
    amountIn,
  });
  return { build, pool, state };
}

describe("buildVenueRoute", () => {
  it("is labelled as simulated, has no setup, cleanup, tips or compute budget", async () => {
    const { build } = await route();
    expect(build.routeLabels).toEqual([SIMULATED_VENUE_LABEL]);
    expect(SIMULATED_VENUE_LABEL).toContain("Simulated");
    expect(build.setupInstructions).toEqual([]);
    expect(build.cleanupInstruction).toBeNull();
    expect(build.tipInstruction).toBeNull();
    expect(build.otherInstructions).toEqual([]);
    expect(build.computeBudgetInstructions).toEqual([]);
    expect(build.addressesByLookupTableAddress).toEqual({});
  });

  it("quotes the floor of what the pool will pay and asks for no less", async () => {
    const { build } = await route();
    expect(build.inAmount).toBe(100_000_000n);
    expect(build.outAmount).toBe(666_666_666n);
    expect(build.minOutAmount).toBe(666_666_666n);
  });

  it("refuses an amount that buys nothing", async () => {
    await expect(route(1n, 18_000_000_000_000_000_000n)).rejects.toThrow(
      /too small/,
    );
  });

  it("survives a trip through JSON as a Jupiter-shaped response", async () => {
    const { build } = await route();
    const wire = JSON.parse(JSON.stringify(venueRouteJson(build)));
    const parsed = parseJupiterBuild(wire);
    expect(parsed.outAmount).toBe(build.outAmount);
    expect(parsed.minOutAmount).toBe(build.minOutAmount);
    expect(parsed.routeLabels).toEqual([SIMULATED_VENUE_LABEL]);
    expect(parsed.swapInstruction).toEqual(build.swapInstruction);
  });
});

describe("assertVenueSwap", () => {
  const expected = {
    follower: FOLLOWER,
    baseMint: SOL_MINT,
    quoteMint: QUOTE_MINT,
    maxQuoteIn: 100_000_000n,
  };

  it("accepts the route it builds and reports what it will do", async () => {
    const { build, pool } = await route();
    const checked = await assertVenueSwap(build.swapInstruction, expected);
    expect(checked).toEqual({
      pool: pool.address,
      amountIn: 100_000_000n,
      minOut: 666_666_666n,
    });
  });

  it("refuses everything that is not exactly that", async () => {
    const { build } = await route();
    const good = build.swapInstruction;
    const reject = async (
      mutate: (i: typeof good) => typeof good,
      why: RegExp,
    ) => {
      await expect(
        assertVenueSwap(mutate(structuredClone(good)), expected),
      ).rejects.toThrow(why);
    };
    const stranger = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

    await reject(
      (i) => ({ ...i, programId: JUPITER_PROGRAM_ADDRESSES[0] ?? "" }),
      /simulated venue/,
    );
    await reject(
      (i) => ({ ...i, accounts: i.accounts.slice(0, 6) }),
      /Unexpected accounts/,
    );
    await reject(
      (i) => ({ ...i, accounts: [...i.accounts, ...i.accounts.slice(0, 1)] }),
      /Unexpected accounts/,
    );
    // The wrong person pays, or somebody else's token accounts are used.
    await reject(
      (i) => ({
        ...i,
        accounts: i.accounts.map((a, n) =>
          n === 0 ? { ...a, pubkey: stranger } : a,
        ),
      }),
      /own accounts/,
    );
    await reject(
      (i) => ({
        ...i,
        accounts: i.accounts.map((a, n) =>
          n === 1 ? { ...a, pubkey: stranger } : a,
        ),
      }),
      /own accounts/,
    );
    await reject(
      (i) => ({
        ...i,
        accounts: i.accounts.map((a, n) =>
          n === 2 ? { ...a, pubkey: stranger } : a,
        ),
      }),
      /own accounts/,
    );
    // Vaults that do not belong to the named pool.
    await reject(
      (i) => ({
        ...i,
        accounts: i.accounts.map((a, n) =>
          n === 4 ? { ...a, pubkey: stranger } : a,
        ),
      }),
      /own accounts/,
    );
    await reject(
      (i) => ({
        ...i,
        accounts: i.accounts.map((a, n) =>
          n === 5 ? { ...a, pubkey: stranger } : a,
        ),
      }),
      /own accounts/,
    );
    // A signer that is not the follower, or a writable/signing pool.
    await reject(
      (i) => ({
        ...i,
        accounts: i.accounts.map((a, n) =>
          n === 3 ? { ...a, isSigner: true } : a,
        ),
      }),
      /own accounts/,
    );
    await reject(
      (i) => ({
        ...i,
        accounts: i.accounts.map((a, n) =>
          n === 3 ? { ...a, isWritable: true } : a,
        ),
      }),
      /own accounts/,
    );
    // The wrong token program.
    await reject(
      (i) => ({
        ...i,
        accounts: i.accounts.map((a, n) =>
          n === 6 ? { ...a, pubkey: stranger } : a,
        ),
      }),
      /own accounts/,
    );
  });

  it("refuses data that is not exactly one swap, and an amount above what was approved", async () => {
    const { build } = await route();
    const good = build.swapInstruction;
    const data = Uint8Array.from(atob(good.data), (c) => c.charCodeAt(0));
    const withData = (d: Uint8Array) => ({
      ...good,
      data: btoa(String.fromCharCode(...d)),
    });

    await expect(
      assertVenueSwap(withData(data.slice(0, 16)), expected),
    ).rejects.toThrow(/Unexpected venue instruction/);
    await expect(
      assertVenueSwap(withData(Uint8Array.of(...data, 0)), expected),
    ).rejects.toThrow(/Unexpected venue instruction/);
    const wrongTag = Uint8Array.from(data);
    wrongTag[0] = 1;
    await expect(assertVenueSwap(withData(wrongTag), expected)).rejects.toThrow(
      /Unexpected venue instruction/,
    );
    // Approved 50 USDC, but the swap spends 100.
    await expect(
      assertVenueSwap(good, { ...expected, maxQuoteIn: 50_000_000n }),
    ).rejects.toThrow(/more than the follower approved/);
    // A swap that guarantees nothing.
    const noMin = Uint8Array.from(data);
    noMin.fill(0, 9, 17);
    await expect(assertVenueSwap(withData(noMin), expected)).rejects.toThrow(
      /no minimum output/,
    );
  });
});

// ---------------------------------------------------------------------------- the composer

describe("composeFollowTx through the venue", () => {
  async function compose(
    overrides: Partial<Parameters<typeof composeFollowTx>[0]> = {},
  ) {
    const { build } = await route();
    return composeFollowTx({
      build,
      plan: PLAN,
      version: 1,
      follower: FOLLOWER,
      baseMint: SOL_MINT,
      quoteMint: QUOTE_MINT,
      nonce: 7n,
      maxQuoteIn: 100_000_000n,
      blockhash: BLOCKHASH,
      computeUnitPriceCap: 5_000_000n,
      swapPrograms: swapProgramsFor("devnet"),
      ...overrides,
    });
  }

  it("builds: own token accounts, begin, ONE venue swap, finish, small enough to send", async () => {
    const tx = await compose();
    const programs = tx.instructions.map((i) => i.programAddress);
    expect(
      programs.filter((p) => p === SIMULATED_VENUE_PROGRAM_ADDRESS),
    ).toHaveLength(1);
    // [create quote ATA, create base ATA, begin, swap, finish]
    expect(tx.instructions).toHaveLength(5);
    expect(programs[3]).toBe(SIMULATED_VENUE_PROGRAM_ADDRESS);
    expect(tx.sizeBytes).toBeLessThan(900);
  });

  it("is refused where only Jupiter is allowed (the default), and the reverse on devnet", async () => {
    await expect(compose({ swapPrograms: undefined })).rejects.toThrow(
      /Jupiter/,
    );
    const jup = parseJupiterBuild(jupiterFixture);
    await expect(
      composeFollowTx({
        build: jup,
        plan: PLAN,
        version: 1,
        follower: address(
          jupiterFixture.swapInstruction.accounts.find(
            (a: { isSigner: boolean }) => a.isSigner,
          )?.pubkey ?? FOLLOWER,
        ),
        baseMint: SOL_MINT,
        quoteMint: address(USDC.mint),
        nonce: 1n,
        maxQuoteIn: 100_000_000n,
        blockhash: BLOCKHASH,
        computeUnitPriceCap: 5_000_000n,
        swapPrograms: swapProgramsFor("devnet"),
      }),
    ).rejects.toThrow(/simulated venue/);
  });

  it("refuses a swap that spends more than the follower approved", async () => {
    await expect(compose({ maxQuoteIn: 99_999_999n })).rejects.toThrow(
      /more than the follower approved/,
    );
  });

  it("refuses a venue swap for somebody else's accounts", async () => {
    await expect(compose({ follower: ADMIN })).rejects.toThrow();
  });

  it("allows the right program per network", () => {
    expect(swapProgramsFor("devnet")).toEqual([
      SIMULATED_VENUE_PROGRAM_ADDRESS,
    ]);
    expect(swapProgramsFor("localnet")).toEqual(JUPITER_PROGRAM_ADDRESSES);
  });
});

// ----------------------------------------------------------------- assets and networks

describe("assets by network", () => {
  it("devnet has one pair: SOL against the devnet USDC test token", () => {
    expect(pairsFor("devnet").map((p) => p.id)).toEqual(["sol-usdc"]);
    expect(pairsFor("devnet")[0]?.quote.mint).toBe(
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    );
    expect(pairsFor("localnet").map((p) => p.id)).toEqual([
      "sol-usdc",
      "jup-usdc",
    ]);
  });

  it("looks a pair up by mints only in the network that owns it", () => {
    expect(findPairByMints(SOL.mint, DEVNET_USDC.mint, "devnet")?.id).toBe(
      "sol-usdc",
    );
    expect(findPairByMints(SOL.mint, USDC.mint, "devnet")).toBeUndefined();
    expect(
      findPairByMints(SOL.mint, DEVNET_USDC.mint, "localnet"),
    ).toBeUndefined();
    expect(findPairByMints(JUP.mint, USDC.mint, "devnet")).toBeUndefined();
    // Without a network every network is searched.
    expect(findPairByMints(SOL.mint, DEVNET_USDC.mint)?.id).toBe("sol-usdc");
    expect(findPairByMints(JUP.mint, USDC.mint)?.id).toBe("jup-usdc");
  });

  it("finds a pair by id per network, defaulting to the test fork", () => {
    expect(findPair("jup-usdc")?.base.symbol).toBe("JUP");
    expect(findPair("jup-usdc", "devnet")).toBeUndefined();
    expect(findPair("sol-usdc", "devnet")?.quote.mint).toBe(DEVNET_USDC.mint);
  });

  it("says where each network swaps, and keeps devnet swaps off until verified end to end", () => {
    expect(NETWORKS.localnet.swapVenue).toBe("jupiter");
    expect(NETWORKS.devnet.swapVenue).toBe("simulated_venue");
    expect(NETWORKS.devnet.swapsAvailable).toBe(false);
  });
});

// -------------------------------------------------------------- Rust and TypeScript agree

describe("the Rust constants equal the TypeScript ones", () => {
  const rust = readFileSync(
    join(
      import.meta.dir,
      "..",
      "..",
      "program",
      "programs",
      "relay",
      "src",
      "constants.rs",
    ),
    "utf8",
  );
  const literal = (name: string) => {
    const m = new RegExp(
      `pub const ${name}:[^=]+=\\s*pubkey!\\("([1-9A-HJ-NP-Za-km-z]{32,44})"\\)`,
    ).exec(rust);
    if (!m?.[1]) throw new Error(`constants.rs has no ${name}`);
    return m[1];
  };

  it("mints and swap programs", () => {
    expect(literal("WSOL_MINT")).toBe(SOL.mint);
    expect(literal("USDC_MINT")).toBe(USDC.mint); // the default build
    expect(literal("JUP_MINT")).toBe(JUP.mint);
    expect(literal("VENUE_PROGRAM_ID")).toBe(SIMULATED_VENUE_PROGRAM_ADDRESS);
    expect(JUPITER_PROGRAM_ADDRESSES).toContain(
      address(rust.match(/JUP6[1-9A-HJ-NP-Za-km-z]{39}/)?.[0] ?? ""),
    );
  });

  it("the devnet USDC mint appears in the devnet section of constants.rs", () => {
    expect(rust).toContain(`pubkey!("${DEVNET_USDC.mint}")`);
  });
});
