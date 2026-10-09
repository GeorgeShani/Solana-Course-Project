import { describe, expect, it } from "bun:test";
import {
  effectivePriceCeil,
  effectivePriceFloor,
  fillPosition,
  minBaseForHigh,
  parsePrice,
  pricePosition,
  U64_MAX,
  usdPriceToUnits,
} from "../src/index";

const LOW = 180_000_000n; // $180 per SOL
const HIGH = 185_000_000n;
const SOL_DEC = 9;

describe("price units", () => {
  it("parses decimal prices into quote atomic units", () => {
    expect(parsePrice("183.20", 6)).toBe(183_200_000n);
    expect(() => parsePrice("0", 6)).toThrow();
    expect(() => parsePrice("0.0000001", 6)).toThrow();
    expect(() => parsePrice("18446744073709.551616", 6)).toThrow(/too large/); // U64_MAX + 1
    expect(parsePrice("18446744073709.551615", 6)).toBe(U64_MAX);
  });

  it("converts an advisory USD price, rounding to quote decimals", () => {
    expect(usdPriceToUnits(183.2, 6)).toBe(183_200_000n);
    expect(usdPriceToUnits("110.123456789", 6)).toBe(110_123_457n);
    expect(() => usdPriceToUnits(0, 6)).toThrow();
    expect(() => usdPriceToUnits(NaN, 6)).toThrow();
  });

  it("computes the effective price with explicit rounding", () => {
    // 100 USDC for exactly 0.5 SOL = $200
    expect(effectivePriceCeil(100_000_000n, 500_000_000n, SOL_DEC)).toBe(
      200_000_000n,
    );
    expect(effectivePriceFloor(100_000_000n, 500_000_000n, SOL_DEC)).toBe(
      200_000_000n,
    );
    // 100 USDC for 0.906237946 SOL: not exact, ceil is one above floor
    const floor = effectivePriceFloor(100_000_000n, 906_237_946n, SOL_DEC);
    expect(effectivePriceCeil(100_000_000n, 906_237_946n, SOL_DEC)).toBe(
      floor + 1n,
    );
    expect(() => effectivePriceCeil(0n, 1n, SOL_DEC)).toThrow();
    expect(() => effectivePriceFloor(1n, 0n, SOL_DEC)).toThrow();
  });

  it("classifies a reference price with inclusive boundaries", () => {
    expect(pricePosition(LOW - 1n, LOW, HIGH)).toBe("below_range");
    expect(pricePosition(LOW, LOW, HIGH)).toBe("in_range");
    expect(pricePosition(HIGH, LOW, HIGH)).toBe("in_range");
    expect(pricePosition(HIGH + 1n, LOW, HIGH)).toBe("above_range");
  });

  it("classifies a fill exactly like the program (cross-multiplication, no rounding)", () => {
    // Pay exactly high price for 1 SOL: in range. One quote unit more: above. One less than low: below.
    const one = 1_000_000_000n;
    const f = (spent: bigint) =>
      fillPosition({
        quoteSpent: spent,
        baseReceived: one,
        baseDecimals: SOL_DEC,
        entryLow: LOW,
        entryHigh: HIGH,
      });
    expect(f(HIGH)).toBe("in_range");
    expect(f(HIGH + 1n)).toBe("above_range");
    expect(f(LOW)).toBe("in_range");
    expect(f(LOW - 1n)).toBe("below_range");
    // Fractional: 92.5 USDC for 0.5 SOL is exactly $185.
    expect(
      fillPosition({
        quoteSpent: 92_500_000n,
        baseReceived: 500_000_000n,
        baseDecimals: SOL_DEC,
        entryLow: LOW,
        entryHigh: HIGH,
      }),
    ).toBe("in_range");
    // One lamport less received makes the price strictly above 185.
    expect(
      fillPosition({
        quoteSpent: 92_500_000n,
        baseReceived: 499_999_999n,
        baseDecimals: SOL_DEC,
        entryLow: LOW,
        entryHigh: HIGH,
      }),
    ).toBe("above_range");
  });

  it("does not overflow at u64 extremes (bigint math)", () => {
    expect(
      fillPosition({
        quoteSpent: U64_MAX,
        baseReceived: U64_MAX,
        baseDecimals: 9,
        entryLow: 1n,
        entryHigh: U64_MAX,
      }),
    ).toBe("in_range");
  });

  it("finds the minimum output that keeps a fill at or below the high bound", () => {
    const min = minBaseForHigh(100_000_000n, SOL_DEC, HIGH); // ceil(100e6 * 1e9 / 185e6)
    expect(min).toBe(540_540_541n);
    expect(
      fillPosition({
        quoteSpent: 100_000_000n,
        baseReceived: min,
        baseDecimals: SOL_DEC,
        entryLow: 1n,
        entryHigh: HIGH,
      }),
    ).toBe("in_range");
    expect(
      fillPosition({
        quoteSpent: 100_000_000n,
        baseReceived: min - 1n,
        baseDecimals: SOL_DEC,
        entryLow: 1n,
        entryHigh: HIGH,
      }),
    ).toBe("above_range");
  });
});
