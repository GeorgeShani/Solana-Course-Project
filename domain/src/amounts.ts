/**
 * Exact decimal string <-> integer base-unit conversion.
 * Never routes through JavaScript numbers (floats are not allowed in money paths).
 */
const DECIMAL_PATTERN = /^(\d+)(?:\.(\d+))?$/;

function assertDecimals(decimals: number): void {
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 30) {
    throw new RangeError("Unsupported decimals");
  }
}

/** "155.25" with 6 decimals -> 155_250_000n. Throws on anything lossy or ambiguous. */
export function parseUnits(value: string, decimals: number): bigint {
  assertDecimals(decimals);
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) throw new RangeError("Enter a plain decimal number");
  const whole = match[1] ?? "";
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) {
    throw new RangeError(`Use at most ${decimals} decimal places`);
  }
  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

/** 155_250_000n with 6 decimals -> "155.25". Trailing zeros are trimmed. */
export function formatUnits(amount: bigint, decimals: number): string {
  assertDecimals(decimals);
  const negative = amount < 0n;
  const digits = (negative ? -amount : amount)
    .toString()
    .padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}
