import { parsePrice, validateContent, type PlanContent } from "@relay/domain";
import { isRecord } from "./util";

/**
 * The input side of scripts/publish-plan.ts, kept apart from the chain and the network so it can be
 * tested. Nothing here invents a value: a missing or malformed field is an error that names it.
 */

/** "90m", "6h" or "2d" in seconds. Whole numbers only; the program checks the 1 minute to 7 day window. */
export function parseDuration(text: string): number {
  const match = /^(\d+)([mhd])$/.exec(text.trim());
  const amount = match?.[1];
  const unit = match?.[2];
  if (amount === undefined || unit === undefined)
    throw new RangeError(
      `"${text}" is not a duration. Use a whole number and m, h or d, for example 90m, 6h or 2d`,
    );
  const perUnit = unit === "m" ? 60 : unit === "h" ? 3600 : 86_400;
  const seconds = Number(amount) * perUnit;
  if (!Number.isSafeInteger(seconds) || seconds <= 0)
    throw new RangeError(`"${text}" is not a usable duration`);
  return seconds;
}

/** The 64 bytes of a keypair file as `solana-keygen` writes it. Never echoes any of the bytes. */
export function parseKeypairBytes(json: unknown): Uint8Array {
  if (
    !Array.isArray(json) ||
    json.length !== 64 ||
    !json.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  )
    throw new Error(
      "That file is not a Solana keypair (expected a JSON array of 64 bytes, as solana-keygen writes it)",
    );
  return Uint8Array.from(json);
}

/**
 * The text of a keypair file. A malformed file must not be quoted back: JSON.parse's own message can
 * include a fragment of the text, and this text is a secret key.
 */
export function parseKeypairFile(text: string): Uint8Array {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return parseKeypairBytes(json);
}

export interface ContentInput {
  rationale?: unknown;
  exitThesis?: unknown;
  exitTarget?: unknown;
  invalidation?: unknown;
}

/** What POST /plans/:planPda/confirm takes: the text, and prices as decimal strings. */
export interface ContentWire {
  rationale: string;
  exitThesis: string;
  exitTarget: string | null;
  invalidation: string | null;
}

function optionalPrice(
  field: string,
  value: unknown,
  quoteDecimals: number,
): { units: bigint | null; text: string | null } {
  if (value === undefined || value === null || value === "")
    return { units: null, text: null };
  // A JS number such as 160.10 has already lost its decimal text, so only strings are taken.
  if (typeof value !== "string")
    throw new RangeError(
      `${field} must be written as text, for example "160.50"`,
    );
  try {
    return {
      units: parsePrice(value.trim(), quoteDecimals),
      text: value.trim(),
    };
  } catch (e) {
    throw new RangeError(
      `${field}: ${e instanceof Error ? e.message : "not a valid price"}`,
    );
  }
}

/**
 * The plan's text, validated with the same rules the program's hash and the server use. Returns the
 * value that is hashed (`content`) and the exact body to confirm with (`wire`).
 */
export function contentFromInput(
  input: ContentInput,
  quoteDecimals: number,
): { content: PlanContent; wire: ContentWire } {
  if (typeof input.rationale !== "string")
    throw new RangeError(
      "rationale is required: why this plan, in your own words",
    );
  if (typeof input.exitThesis !== "string")
    throw new RangeError("exitThesis is required: how you will decide to exit");
  const target = optionalPrice("exitTarget", input.exitTarget, quoteDecimals);
  const invalidation = optionalPrice(
    "invalidation",
    input.invalidation,
    quoteDecimals,
  );
  const content = validateContent({
    rationale: input.rationale,
    exitThesis: input.exitThesis,
    exitTarget: target.units,
    invalidation: invalidation.units,
  });
  return {
    content,
    wire: {
      rationale: content.rationale,
      exitThesis: content.exitThesis,
      exitTarget: target.text,
      invalidation: invalidation.text,
    },
  };
}

/** The text of a --content-file: a JSON object with the same four fields. */
export function contentInputFromJson(text: string): ContentInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SyntaxError("The content file is not valid JSON");
  }
  if (!isRecord(parsed))
    throw new SyntaxError("The content file must be a JSON object");
  return {
    rationale: parsed.rationale,
    exitThesis: parsed.exitThesis,
    exitTarget: parsed.exitTarget,
    invalidation: parsed.invalidation,
  };
}
