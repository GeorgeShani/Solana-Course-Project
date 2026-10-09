/**
 * Parsing of Jupiter Swap API v2 `GET /swap/v2/build` responses.
 *
 * The response is untrusted input (it comes from a third party through our server), so it arrives
 * as `unknown` and every field the transaction builder relies on is checked here.
 */

export interface JupiterAccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface JupiterInstruction {
  programId: string;
  accounts: JupiterAccountMeta[];
  /** Base64. */
  data: string;
}

export interface JupiterBuild {
  inAmount: bigint;
  outAmount: bigint;
  /** otherAmountThreshold: the guaranteed minimum output after slippage. */
  minOutAmount: bigint;
  slippageBps: number;
  routeLabels: string[];
  computeBudgetInstructions: JupiterInstruction[];
  setupInstructions: JupiterInstruction[];
  swapInstruction: JupiterInstruction;
  cleanupInstruction: JupiterInstruction | null;
  otherInstructions: JupiterInstruction[];
  tipInstruction: JupiterInstruction | null;
  /** Lookup table address -> the addresses it holds. Empty for v1 transactions. */
  addressesByLookupTableAddress: Record<string, string[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(v: unknown, label: string): string {
  if (typeof v !== "string")
    throw new Error(`Jupiter response: ${label} must be a string`);
  return v;
}

function integer(v: unknown, label: string): bigint {
  const s = text(v, label);
  if (!/^\d{1,40}$/.test(s))
    throw new Error(`Jupiter response: ${label} must be an integer string`);
  return BigInt(s);
}

function parseInstruction(v: unknown, label: string): JupiterInstruction {
  if (!isRecord(v))
    throw new Error(`Jupiter response: ${label} must be an object`);
  if (!Array.isArray(v.accounts))
    throw new Error(`Jupiter response: ${label}.accounts must be a list`);
  const accounts = v.accounts.map(
    (a: unknown, i: number): JupiterAccountMeta => {
      if (!isRecord(a))
        throw new Error(
          `Jupiter response: ${label}.accounts[${i}] must be an object`,
        );
      if (
        typeof a.isSigner !== "boolean" ||
        typeof a.isWritable !== "boolean"
      ) {
        throw new Error(
          `Jupiter response: ${label}.accounts[${i}] flags must be booleans`,
        );
      }
      return {
        pubkey: text(a.pubkey, `${label}.accounts[${i}].pubkey`),
        isSigner: a.isSigner,
        isWritable: a.isWritable,
      };
    },
  );
  return {
    programId: text(v.programId, `${label}.programId`),
    accounts,
    data: text(v.data, `${label}.data`),
  };
}

function parseList(v: unknown, label: string): JupiterInstruction[] {
  if (!Array.isArray(v))
    throw new Error(`Jupiter response: ${label} must be a list`);
  return v.map((x: unknown, i: number) =>
    parseInstruction(x, `${label}[${i}]`),
  );
}

function parseOptional(v: unknown, label: string): JupiterInstruction | null {
  return v === null || v === undefined ? null : parseInstruction(v, label);
}

export function parseJupiterBuild(body: unknown): JupiterBuild {
  if (!isRecord(body)) throw new Error("Jupiter response is not an object");

  const lookup: Record<string, string[]> = {};
  const rawTables = body.addressesByLookupTableAddress;
  if (rawTables !== null && rawTables !== undefined) {
    if (!isRecord(rawTables))
      throw new Error("Jupiter response: lookup tables must be an object");
    for (const [key, addresses] of Object.entries(rawTables)) {
      if (!Array.isArray(addresses))
        throw new Error("Jupiter response: lookup table must be a list");
      lookup[key] = addresses.map((a: unknown) =>
        text(a, "lookup table address"),
      );
    }
  }

  const routeLabels: string[] = [];
  if (Array.isArray(body.routePlan)) {
    for (const step of body.routePlan) {
      if (
        isRecord(step) &&
        isRecord(step.swapInfo) &&
        typeof step.swapInfo.label === "string"
      ) {
        routeLabels.push(step.swapInfo.label);
      }
    }
  }

  const slippage = body.slippageBps;
  return {
    inAmount: integer(body.inAmount, "inAmount"),
    outAmount: integer(body.outAmount, "outAmount"),
    minOutAmount: integer(body.otherAmountThreshold, "otherAmountThreshold"),
    slippageBps: typeof slippage === "number" ? slippage : 0,
    routeLabels,
    computeBudgetInstructions: parseList(
      body.computeBudgetInstructions,
      "computeBudgetInstructions",
    ),
    setupInstructions: parseList(body.setupInstructions, "setupInstructions"),
    swapInstruction: parseInstruction(body.swapInstruction, "swapInstruction"),
    cleanupInstruction: parseOptional(
      body.cleanupInstruction,
      "cleanupInstruction",
    ),
    otherInstructions: parseList(body.otherInstructions, "otherInstructions"),
    tipInstruction: parseOptional(body.tipInstruction, "tipInstruction"),
    addressesByLookupTableAddress: lookup,
  };
}
