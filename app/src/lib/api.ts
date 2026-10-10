import type { EntryStatus } from "@relay/domain";

/**
 * Client view of the Hono feed contract (server/src/services/plans.ts). JSON from the network is
 * `unknown` until these parsers have checked every field; nothing is cast.
 */

export interface VersionView {
  version: number;
  versionPda: string;
  publishedAt: number;
  expiresAt: number;
  entryLow: string;
  entryHigh: string;
  entryLowUnits: string;
  entryHighUnits: string;
  contentHash: string;
  termsHash: string;
  prevTermsHash: string;
  text: null | {
    rationale: string;
    exitThesis: string;
    exitTarget: string | null;
    invalidation: string | null;
    /** The price the creator saw when publishing, as recorded in the committed text. */
    refPrice: null | { display: string; source: string };
  };
}

export interface PlanCardView {
  planPda: string;
  cluster: "devnet" | "localnet";
  creator: {
    address: string;
    handle: string | null;
    displayName: string | null;
    isDemo: boolean;
  };
  pair: {
    id: string;
    label: string;
    baseSymbol: string;
    quoteSymbol: string;
    baseDecimals: number;
    quoteDecimals: number;
  };
  planStatus: "open" | "closed";
  /**
   * False when Relay's feed policy leaves this plan out of the feed (its creator is not on the
   * allowlist). The plan is real and reachable by link; it is just not listed.
   */
  listed: boolean;
  version: VersionView;
  versionCount: number;
  entry: {
    status: EntryStatus;
    closingSoon: boolean;
    msUntilExpiry: number;
    price: null | { units: string; display: string; observedAtMs: number };
  };
  nowMs: number;
  /** Set only on the dev-only fictional preview; never on data from the API. */
  fictionalPreview?: true;
}

export interface FeedPage {
  items: PlanCardView[];
  nextCursor: string | null;
  nowMs: number;
}

export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

export class ApiContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiContractError";
  }
}

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function rec(v: unknown, path: string): Rec {
  if (!isRec(v)) throw new ApiContractError(`${path} must be an object`);
  return v;
}

function str(v: unknown, path: string): string {
  if (typeof v !== "string")
    throw new ApiContractError(`${path} must be a string`);
  return v;
}

function strOrNull(v: unknown, path: string): string | null {
  return v === null || v === undefined ? null : str(v, path);
}

function num(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isFinite(v))
    throw new ApiContractError(`${path} must be a finite number`);
  return v;
}

function bool(v: unknown, path: string): boolean {
  if (typeof v !== "boolean")
    throw new ApiContractError(`${path} must be a boolean`);
  return v;
}

function digits(v: unknown, path: string): string {
  const s = str(v, path);
  if (!/^\d+$/.test(s))
    throw new ApiContractError(`${path} must be an unsigned integer string`);
  return s;
}

const ENTRY_STATUSES: readonly EntryStatus[] = [
  "in_range",
  "above_range",
  "below_range",
  "expired",
  "closed",
  "price_stale",
  "price_unavailable",
];

function entryStatusOf(v: unknown, path: string): EntryStatus {
  const found = ENTRY_STATUSES.find((s) => s === v);
  if (!found) throw new ApiContractError(`${path} is not a known entry status`);
  return found;
}

function clusterOf(v: unknown, path: string): PlanCardView["cluster"] {
  if (v === "devnet" || v === "localnet") return v;
  throw new ApiContractError(`${path} is not a known cluster`);
}

function planStatusOf(v: unknown, path: string): PlanCardView["planStatus"] {
  if (v === "open" || v === "closed") return v;
  throw new ApiContractError(`${path} must be open or closed`);
}

function parseVersion(v: unknown, path: string): VersionView {
  const r = rec(v, path);
  const text =
    r.text === null || r.text === undefined
      ? null
      : rec(r.text, `${path}.text`);
  const ref =
    text === null || text.refPrice === null || text.refPrice === undefined
      ? null
      : rec(text.refPrice, `${path}.text.refPrice`);
  return {
    version: num(r.version, `${path}.version`),
    versionPda: str(r.versionPda, `${path}.versionPda`),
    publishedAt: num(r.publishedAt, `${path}.publishedAt`),
    expiresAt: num(r.expiresAt, `${path}.expiresAt`),
    entryLow: str(r.entryLow, `${path}.entryLow`),
    entryHigh: str(r.entryHigh, `${path}.entryHigh`),
    entryLowUnits: digits(r.entryLowUnits, `${path}.entryLowUnits`),
    entryHighUnits: digits(r.entryHighUnits, `${path}.entryHighUnits`),
    contentHash: str(r.contentHash, `${path}.contentHash`),
    termsHash: str(r.termsHash, `${path}.termsHash`),
    prevTermsHash: str(r.prevTermsHash, `${path}.prevTermsHash`),
    text: text && {
      rationale: str(text.rationale, `${path}.text.rationale`),
      exitThesis: str(text.exitThesis, `${path}.text.exitThesis`),
      exitTarget: strOrNull(text.exitTarget, `${path}.text.exitTarget`),
      invalidation: strOrNull(text.invalidation, `${path}.text.invalidation`),
      refPrice: ref && {
        display: str(ref.display, `${path}.text.refPrice.display`),
        source: str(ref.source, `${path}.text.refPrice.source`),
      },
    },
  };
}

export function parsePlanCard(v: unknown, path = "card"): PlanCardView {
  const r = rec(v, path);
  const creator = rec(r.creator, `${path}.creator`);
  const pair = rec(r.pair, `${path}.pair`);
  const entry = rec(r.entry, `${path}.entry`);
  const price =
    entry.price === null ? null : rec(entry.price, `${path}.entry.price`);
  return {
    planPda: str(r.planPda, `${path}.planPda`),
    cluster: clusterOf(r.cluster, `${path}.cluster`),
    creator: {
      address: str(creator.address, `${path}.creator.address`),
      handle: strOrNull(creator.handle, `${path}.creator.handle`),
      displayName: strOrNull(
        creator.displayName,
        `${path}.creator.displayName`,
      ),
      isDemo: bool(creator.isDemo, `${path}.creator.isDemo`),
    },
    pair: {
      id: str(pair.id, `${path}.pair.id`),
      label: str(pair.label, `${path}.pair.label`),
      baseSymbol: str(pair.baseSymbol, `${path}.pair.baseSymbol`),
      quoteSymbol: str(pair.quoteSymbol, `${path}.pair.quoteSymbol`),
      baseDecimals: num(pair.baseDecimals, `${path}.pair.baseDecimals`),
      quoteDecimals: num(pair.quoteDecimals, `${path}.pair.quoteDecimals`),
    },
    planStatus: planStatusOf(r.planStatus, `${path}.planStatus`),
    listed: bool(r.listed, `${path}.listed`),
    version: parseVersion(r.version, `${path}.version`),
    versionCount: num(r.versionCount, `${path}.versionCount`),
    entry: {
      status: entryStatusOf(entry.status, `${path}.entry.status`),
      closingSoon: bool(entry.closingSoon, `${path}.entry.closingSoon`),
      msUntilExpiry: num(entry.msUntilExpiry, `${path}.entry.msUntilExpiry`),
      price: price && {
        units: digits(price.units, `${path}.entry.price.units`),
        display: str(price.display, `${path}.entry.price.display`),
        observedAtMs: num(
          price.observedAtMs,
          `${path}.entry.price.observedAtMs`,
        ),
      },
    },
    nowMs: num(r.nowMs, `${path}.nowMs`),
  };
}

export function parseFeedPage(v: unknown): FeedPage {
  const r = rec(v, "feed");
  if (!Array.isArray(r.items))
    throw new ApiContractError("feed.items must be an array");
  return {
    items: r.items.map((item, i) => parsePlanCard(item, `feed.items[${i}]`)),
    nextCursor: strOrNull(r.nextCursor, "feed.nextCursor"),
    nowMs: num(r.nowMs, "feed.nowMs"),
  };
}

export function feedPath(cursor?: string | null): string {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `/feed?${qs}` : "/feed";
}

/** Fetches and validates one feed page from `${base}/feed`. Network failure and 5xx mean "unavailable". */
export async function fetchFeedPage(
  base: string,
  cursor?: string | null,
  init?: RequestInit,
): Promise<FeedPage> {
  return parseFeedPage(await getJson(`${base}${feedPath(cursor)}`, init));
}

/** Every committed version of one plan, oldest first, from `${base}/plans/:pda`. */
export async function fetchPlanVersions(
  base: string,
  planPda: string,
  init?: RequestInit,
): Promise<VersionView[]> {
  const r = rec(
    await getJson(`${base}/plans/${encodeURIComponent(planPda)}`, init),
    "plan",
  );
  if (!Array.isArray(r.versions))
    throw new ApiContractError("plan.versions must be an array");
  return r.versions.map((v, i) => parseVersion(v, `plan.versions[${i}]`));
}

/** One plan with its live entry status and full version history, from `${base}/plans/:pda`. */
export async function fetchPlan(
  base: string,
  planPda: string,
  init?: RequestInit,
): Promise<{ card: PlanCardView; versions: VersionView[] }> {
  const body = await getJson(
    `${base}/plans/${encodeURIComponent(planPda)}`,
    init,
  );
  const r = rec(body, "plan");
  if (!Array.isArray(r.versions))
    throw new ApiContractError("plan.versions must be an array");
  return {
    card: parsePlanCard(r, "plan"),
    versions: r.versions.map((v, i) => parseVersion(v, `plan.versions[${i}]`)),
  };
}

/** A follow transaction the server verified onchain. Amounts are base units as strings. */
export interface ExecutionView {
  signature: string;
  status: "recorded" | "failed";
  follower: string;
  planPda: string;
  version: number;
  receiptPda: string | null;
  quoteSpent: string | null;
  baseReceived: string | null;
  /** Quote base units per one whole base token. */
  effectivePrice: string | null;
  errorName: string | null;
  errorMessage: string | null;
  slot: string;
  blockTime: number | null;
}

function digitsOrNull(v: unknown, path: string): string | null {
  return v === null || v === undefined ? null : digits(v, path);
}

export function parseExecution(v: unknown, path = "execution"): ExecutionView {
  const r = rec(v, path);
  const status = r.status;
  if (status !== "recorded" && status !== "failed")
    throw new ApiContractError(`${path}.status must be recorded or failed`);
  return {
    signature: str(r.signature, `${path}.signature`),
    status,
    follower: str(r.follower, `${path}.follower`),
    planPda: str(r.planPda, `${path}.planPda`),
    version: num(r.version, `${path}.version`),
    receiptPda: strOrNull(r.receiptPda, `${path}.receiptPda`),
    quoteSpent: digitsOrNull(r.quoteSpent, `${path}.quoteSpent`),
    baseReceived: digitsOrNull(r.baseReceived, `${path}.baseReceived`),
    effectivePrice: digitsOrNull(r.effectivePrice, `${path}.effectivePrice`),
    errorName: strOrNull(r.errorName, `${path}.errorName`),
    errorMessage: strOrNull(r.errorMessage, `${path}.errorMessage`),
    slot: digits(r.slot, `${path}.slot`),
    blockTime:
      r.blockTime === null || r.blockTime === undefined
        ? null
        : num(r.blockTime, `${path}.blockTime`),
  };
}

/** Verified follow transactions for one wallet, from `${base}/me/executions`. Public data. */
export async function fetchExecutions(
  base: string,
  follower: string,
  init?: RequestInit,
): Promise<ExecutionView[]> {
  const r = rec(
    await getJson(
      `${base}/me/executions?follower=${encodeURIComponent(follower)}`,
      init,
    ),
    "executions",
  );
  if (!Array.isArray(r.items))
    throw new ApiContractError("executions.items must be an array");
  return r.items.map((v, i) => parseExecution(v, `executions.items[${i}]`));
}

/** A request the server understood and refused (4xx), with its error code. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

interface Amount {
  units: string;
  display: string;
  symbol: string;
}

/** The server's review of one follow: what it costs, what it gets, and how to rebuild the transaction. */
export interface QuoteView {
  summary: {
    planPda: string;
    version: number;
    follower: string;
    pay: Amount;
    receive: Amount;
    minimumReceive: Amount;
    effectivePrice: { units: string; display: string };
    entryRange: { low: string; high: string };
    check: "ok" | "may_fail_near_upper_bound";
    routeLabels: string[];
    fees: {
      networkLamports: string;
      priorityLamports: string;
      receiptRentLamports: string;
    };
    planExpiresAt: number;
    quoteExpiresAtMs: number;
  };
  compose: {
    /** Jupiter's build response; the domain parser checks it before anything is composed. */
    build: unknown;
    blockhash: string;
    lastValidBlockHeight: string;
    nonce: string;
    computeUnitLimit: number;
    maxQuoteIn: string;
  };
}

function amount(v: unknown, path: string): Amount {
  const r = rec(v, path);
  return {
    units: digits(r.units, `${path}.units`),
    display: str(r.display, `${path}.display`),
    symbol: str(r.symbol, `${path}.symbol`),
  };
}

export function parseQuote(v: unknown): QuoteView {
  const r = rec(v, "quote");
  const s = rec(r.summary, "quote.summary");
  const c = rec(r.compose, "quote.compose");
  const price = rec(s.effectivePrice, "quote.summary.effectivePrice");
  const range = rec(s.entryRange, "quote.summary.entryRange");
  const fees = rec(s.fees, "quote.summary.fees");
  const check = s.check;
  if (check !== "ok" && check !== "may_fail_near_upper_bound")
    throw new ApiContractError("quote.summary.check is not a known check");
  if (!Array.isArray(s.routeLabels))
    throw new ApiContractError("quote.summary.routeLabels must be an array");
  return {
    summary: {
      planPda: str(s.planPda, "quote.summary.planPda"),
      version: num(s.version, "quote.summary.version"),
      follower: str(s.follower, "quote.summary.follower"),
      pay: amount(s.pay, "quote.summary.pay"),
      receive: amount(s.receive, "quote.summary.receive"),
      minimumReceive: amount(s.minimumReceive, "quote.summary.minimumReceive"),
      effectivePrice: {
        units: digits(price.units, "quote.summary.effectivePrice.units"),
        display: str(price.display, "quote.summary.effectivePrice.display"),
      },
      entryRange: {
        low: str(range.low, "quote.summary.entryRange.low"),
        high: str(range.high, "quote.summary.entryRange.high"),
      },
      check,
      routeLabels: s.routeLabels.map((l, i) =>
        str(l, `quote.summary.routeLabels[${i}]`),
      ),
      fees: {
        networkLamports: digits(fees.networkLamports, "fees.networkLamports"),
        priorityLamports: digits(
          fees.priorityLamports,
          "fees.priorityLamports",
        ),
        receiptRentLamports: digits(
          fees.receiptRentLamports,
          "fees.receiptRentLamports",
        ),
      },
      planExpiresAt: num(s.planExpiresAt, "quote.summary.planExpiresAt"),
      quoteExpiresAtMs: num(
        s.quoteExpiresAtMs,
        "quote.summary.quoteExpiresAtMs",
      ),
    },
    compose: {
      build: c.build,
      blockhash: str(c.blockhash, "quote.compose.blockhash"),
      lastValidBlockHeight: digits(
        c.lastValidBlockHeight,
        "quote.compose.lastValidBlockHeight",
      ),
      nonce: digits(c.nonce, "quote.compose.nonce"),
      computeUnitLimit: num(
        c.computeUnitLimit,
        "quote.compose.computeUnitLimit",
      ),
      maxQuoteIn: digits(c.maxQuoteIn, "quote.compose.maxQuoteIn"),
    },
  };
}

/** Asks the server for a fresh, simulated follow transaction. Nothing is signed or sent. */
export async function fetchQuote(
  base: string,
  input: {
    planPda: string;
    follower: string;
    version: number;
    quoteAmount: string;
  },
): Promise<QuoteView> {
  return parseQuote(await postJson(`${base}/follow/quote`, input));
}

/** Has the server re-read a landed transaction from the chain and record what it finds. */
export async function verifyFollow(
  base: string,
  signature: string,
): Promise<ExecutionView> {
  return parseExecution(await postJson(`${base}/follow/verify`, { signature }));
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiUnavailableError("Relay's service did not respond");
  }
  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    if (res.ok)
      throw new ApiUnavailableError(
        "Relay's service sent an unreadable response",
      );
  }
  if (res.ok) return parsed;
  const err = isRec(parsed) && isRec(parsed.error) ? parsed.error : null;
  const message =
    err && typeof err.message === "string"
      ? err.message
      : `Request failed (${res.status})`;
  if (res.status >= 500) throw new ApiUnavailableError(message);
  throw new ApiRequestError(
    res.status,
    err && typeof err.code === "string" ? err.code : "request_failed",
    message,
  );
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { accept: "application/json" },
    });
  } catch {
    throw new ApiUnavailableError("Relay's service did not respond");
  }
  if (res.status >= 500 || res.status === 404) {
    throw new ApiUnavailableError(`Relay's service answered ${res.status}`);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiUnavailableError(
      "Relay's service sent an unreadable response",
    );
  }
  if (!res.ok) {
    const message =
      isRec(body) && isRec(body.error) && typeof body.error.message === "string"
        ? body.error.message
        : `Request failed (${res.status})`;
    throw new ApiContractError(message);
  }
  return body;
}
