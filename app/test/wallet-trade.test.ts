import { describe, expect, test } from "bun:test";
import { ApiContractError, parseQuote } from "../src/lib/api";
import { parseCueCursorPref } from "../src/lib/cue-cursor";
import { checkFollowAmount } from "../src/lib/follow";
import {
  isUserRejection,
  toWalletAccount,
  toWalletEntry,
} from "../src/lib/wallet";

const connect = { version: "1.0.0", connect: async () => ({ accounts: [] }) };

describe("wallet discovery", () => {
  test("accepts a Solana wallet with standard:connect", () => {
    const w = toWalletEntry({
      name: "Test",
      icon: "data:image/svg+xml;base64,AA==",
      chains: ["solana:mainnet"],
      features: { "standard:connect": connect },
    });
    expect(w?.name).toBe("Test");
    expect(w?.icon).toBe("data:image/svg+xml;base64,AA==");
  });

  test("drops an icon that isn't a data: image", () => {
    const w = toWalletEntry({
      name: "Test",
      icon: "https://example.com/icon.png",
      chains: ["solana:devnet"],
      features: { "standard:connect": connect },
    });
    expect(w?.icon).toBeNull();
  });

  test("rejects wallets without a Solana chain, a name or connect", () => {
    const features = { "standard:connect": connect };
    expect(
      toWalletEntry({ name: "Eth", chains: ["eip155:1"], features }),
    ).toBeNull();
    expect(
      toWalletEntry({ name: " ", chains: ["solana:mainnet"], features }),
    ).toBeNull();
    expect(
      toWalletEntry({
        name: "NoConnect",
        chains: ["solana:mainnet"],
        features: { "standard:connect": { version: "1.0.0" } },
      }),
    ).toBeNull();
    expect(toWalletEntry(null)).toBeNull();
  });

  test("accounts need an address; chains keep only strings", () => {
    expect(toWalletAccount({ address: "" })).toBeNull();
    expect(
      toWalletAccount({ address: "abc", chains: ["solana:mainnet", 7] })
        ?.chains,
    ).toEqual(["solana:mainnet"]);
  });
});

describe("wallet rejection", () => {
  test("a declined prompt is a choice, not a failure", () => {
    expect(isUserRejection({ code: 4001, message: "x" })).toBe(true);
    expect(isUserRejection(new Error("User rejected the request."))).toBe(true);
    expect(isUserRejection(new Error("Approval was cancelled"))).toBe(true);
  });

  test("real errors stay errors", () => {
    expect(isUserRejection(new Error("Wallet is locked"))).toBe(false);
    expect(isUserRejection({ code: -32603, message: "Internal error" })).toBe(
      false,
    );
    expect(isUserRejection(undefined)).toBe(false);
  });
});

describe("follow amount", () => {
  test("empty asks for nothing yet", () => {
    expect(checkFollowAmount("  ", 6)).toEqual({ ok: false, message: null });
  });

  test("valid amounts become integer units", () => {
    expect(checkFollowAmount("25.5", 6)).toEqual({
      ok: true,
      units: 25_500_000n,
      text: "25.5",
    });
    expect(checkFollowAmount("1,000", 6)).toEqual({
      ok: true,
      units: 1_000_000_000n,
      text: "1000",
    });
  });

  test("limits and precision are explained", () => {
    expect(checkFollowAmount("0.5", 6)).toEqual({
      ok: false,
      message: "The minimum is 1 USDC",
    });
    expect(checkFollowAmount("1000.01", 6)).toEqual({
      ok: false,
      message: "The maximum is 1000 USDC",
    });
    expect(checkFollowAmount("1.0000001", 6)).toEqual({
      ok: false,
      message: "Enter an amount with up to 6 decimals",
    });
    expect(checkFollowAmount("abc", 6).ok).toBe(false);
  });
});

const QUOTE = {
  summary: {
    planPda: "Plan111",
    version: 1,
    follower: "Follower111",
    pay: { units: "25000000", display: "25", symbol: "USDC" },
    receive: { units: "170000000", display: "0.17", symbol: "SOL" },
    minimumReceive: { units: "169000000", display: "0.169", symbol: "SOL" },
    effectivePrice: { units: "147058823", display: "147.058823" },
    entryRange: { low: "140", high: "150" },
    check: "ok",
    routeLabels: ["Whirlpool"],
    fees: {
      networkLamports: "5000",
      priorityLamports: "1000",
      receiptRentLamports: "2000000",
    },
    planExpiresAt: 1_800_000_000,
    quoteExpiresAtMs: 1_800_000_000_000,
  },
  compose: {
    build: { anything: true },
    blockhash: "Hash111",
    lastValidBlockHeight: "123",
    nonce: "7",
    computeUnitLimit: 400_000,
    maxQuoteIn: "25000000",
  },
};

describe("quote contract", () => {
  test("a well-formed quote parses", () => {
    const q = parseQuote(QUOTE);
    expect(q.summary.minimumReceive.display).toBe("0.169");
    expect(q.summary.check).toBe("ok");
    expect(q.compose.nonce).toBe("7");
  });

  test("an unknown check or non-integer amounts are rejected", () => {
    expect(() =>
      parseQuote({ ...QUOTE, summary: { ...QUOTE.summary, check: "fine" } }),
    ).toThrow(ApiContractError);
    expect(() =>
      parseQuote({
        ...QUOTE,
        summary: {
          ...QUOTE.summary,
          minimumReceive: { units: "1.5", display: "x", symbol: "SOL" },
        },
      }),
    ).toThrow(ApiContractError);
    expect(() =>
      parseQuote({ ...QUOTE, compose: { ...QUOTE.compose, nonce: 7 } }),
    ).toThrow(ApiContractError);
  });
});

describe("cue cursor preference", () => {
  test("on unless switched off", () => {
    expect(parseCueCursorPref(null)).toBe(true);
    expect(parseCueCursorPref("on")).toBe(true);
    expect(parseCueCursorPref("off")).toBe(false);
  });
});
