import {
  ContentError,
  SUPPORTED_PAIRS,
  contentHash,
  decodeAddress,
  entryStatus,
  findPairByMints,
  formatUnits,
  parsePrice,
  termsHash,
  toHex,
  validateContent,
  type EntryStatus,
  type Pair,
  type PlanContent,
  type ReferencePrice,
} from "@relay/domain";
import type { Db } from "../db";
import type { Env } from "../env";
import { ApiError } from "../middleware";
import { isRecord } from "../util";
import { decodeCursor, encodeCursor, rankFeed } from "./feed-rank";
import type {
  ChainReader,
  OnchainPlan,
  OnchainVersion,
  PriceSource,
} from "./types";

// ------------------------------------------------------------------------------------------ views

export interface VersionView {
  version: number;
  versionPda: string;
  publishedAt: number;
  expiresAt: number;
  /** Human decimals, e.g. "180". */
  entryLow: string;
  entryHigh: string;
  /** Raw u64 price units as decimal strings, for exact client math. */
  entryLowUnits: string;
  entryHighUnits: string;
  contentHash: string;
  termsHash: string;
  prevTermsHash: string;
  /** Null when the version exists onchain but its text was never submitted or verified. */
  text: null | {
    rationale: string;
    exitThesis: string;
    exitTarget: string | null;
    invalidation: string | null;
    refPrice: null | { units: string; display: string; source: string };
  };
}

export interface PlanCardView {
  planPda: string;
  cluster: Env["cluster"];
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
    baseMint: string;
    quoteMint: string;
    baseDecimals: number;
    quoteDecimals: number;
  };
  planStatus: "open" | "closed";
  /** Latest known version. */
  version: VersionView;
  versionCount: number;
  /** Entry status of the latest version. Advisory: never a recommendation. */
  entry: {
    status: EntryStatus;
    closingSoon: boolean;
    msUntilExpiry: number;
    price: null | { units: string; display: string; observedAtMs: number };
  };
  /** "Now" used for this view in ms: the chain clock (on a fork it can differ from wall time). */
  nowMs: number;
}

export interface PlanDetailView extends PlanCardView {
  versions: VersionView[];
}

export interface FeedPage {
  items: PlanCardView[];
  nextCursor: string | null;
  nowMs: number;
}

// ---------------------------------------------------------------------------------------- service

export interface PlanServiceDeps {
  env: Env;
  db: Db;
  chain: ChainReader;
  prices: PriceSource;
}

const SYNC_MIN_INTERVAL_MS = 5_000;
const REF_PRICE_WINDOW_SEC = 300;

const bi = (v: unknown) => BigInt(String(v));
const hex = (v: Uint8Array) => toHex(new Uint8Array(v));

interface RefPriceRow {
  price_units: string;
  source: string;
  observed_at: Date;
}

interface PlanRow {
  plan_pda: string;
  cluster: Env["cluster"];
  creator_address: string;
  onchain_plan_id: string;
  base_mint: string;
  quote_mint: string;
  base_decimals: number;
  quote_decimals: number;
  status: "open" | "closed";
  handle: string | null;
  display_name: string | null;
  is_demo: boolean | null;
}

interface VersionRow {
  plan_pda: string;
  version: number;
  version_pda: string;
  entry_low: string;
  entry_high: string;
  expires_at: string;
  published_at: string;
  content_hash: Uint8Array;
  prev_terms_hash: Uint8Array;
  terms_hash: Uint8Array;
  rationale: string | null;
  exit_thesis: string | null;
  exit_target: string | null;
  invalidation: string | null;
  ref_price_units: string | null;
  ref_price_source: string | null;
}

function pairOf(row: Pick<PlanRow, "base_mint" | "quote_mint">): Pair {
  const pair = findPairByMints(row.base_mint, row.quote_mint);
  if (!pair)
    throw new Error(
      `Plan uses an unsupported pair ${row.base_mint}/${row.quote_mint}`,
    );
  return pair;
}

function versionView(v: VersionRow, quoteDecimals: number): VersionView {
  return {
    version: v.version,
    versionPda: v.version_pda,
    publishedAt: Number(v.published_at),
    expiresAt: Number(v.expires_at),
    entryLow: formatUnits(bi(v.entry_low), quoteDecimals),
    entryHigh: formatUnits(bi(v.entry_high), quoteDecimals),
    entryLowUnits: String(v.entry_low),
    entryHighUnits: String(v.entry_high),
    contentHash: hex(v.content_hash),
    termsHash: hex(v.terms_hash),
    prevTermsHash: hex(v.prev_terms_hash),
    text:
      v.rationale === null || v.exit_thesis === null
        ? null
        : {
            rationale: v.rationale,
            exitThesis: v.exit_thesis,
            exitTarget:
              v.exit_target === null
                ? null
                : formatUnits(bi(v.exit_target), quoteDecimals),
            invalidation:
              v.invalidation === null
                ? null
                : formatUnits(bi(v.invalidation), quoteDecimals),
            refPrice:
              v.ref_price_units === null
                ? null
                : {
                    units: String(v.ref_price_units),
                    display: formatUnits(bi(v.ref_price_units), quoteDecimals),
                    source: v.ref_price_source ?? "unknown",
                  },
          },
  };
}

export function createPlanService(deps: PlanServiceDeps) {
  const { env, db, chain, prices } = deps;
  let lastSyncAt = 0;
  let syncing: Promise<void> | undefined;

  // ---------------------------------------------------------------------------- chain -> database

  async function upsertPlan(pda: string, p: OnchainPlan): Promise<void> {
    await db`
      insert into plans (plan_pda, cluster, creator_address, onchain_plan_id, base_mint, quote_mint,
                         base_decimals, quote_decimals, latest_version, status, created_at_chain)
      values (${pda}, ${env.cluster}, ${p.creator}, ${p.planId.toString()}, ${p.baseMint}, ${p.quoteMint},
              ${p.baseDecimals}, ${p.quoteDecimals}, ${p.latestVersion}, ${p.status}, ${p.createdAt.toString()})
      on conflict (plan_pda) do update
        set latest_version = excluded.latest_version, status = excluded.status, updated_at = now()`;
  }

  async function insertVersion(pda: string, v: OnchainVersion): Promise<void> {
    await db`
      insert into plan_versions (plan_pda, version, version_pda, entry_low, entry_high, expires_at, published_at,
                                 published_slot, content_hash, prev_terms_hash, terms_hash)
      values (${v.plan}, ${v.version}, ${pda}, ${v.entryLow.toString()}, ${v.entryHigh.toString()}, ${v.expiresAt.toString()},
              ${v.publishedAt.toString()}, ${v.publishedSlot.toString()}, ${Buffer.from(v.contentHash)},
              ${Buffer.from(v.prevTermsHash)}, ${Buffer.from(v.termsHash)})
      on conflict (plan_pda, version) do nothing`;
  }

  /**
   * Copies plan and version accounts from the chain into the database. The accounts are the
   * authority; this is idempotent. Throttled because the feed may call it on every request.
   */
  async function sync(opts: { force?: boolean } = {}): Promise<void> {
    if (syncing) return syncing;
    if (!opts.force && Date.now() - lastSyncAt < SYNC_MIN_INTERVAL_MS) return;
    syncing = (async () => {
      const [plans, versions] = await Promise.all([
        chain.listPlans(),
        chain.listVersions(),
      ]);
      for (const { pda, data } of plans) {
        if (!findPairByMints(data.baseMint, data.quoteMint)) continue;
        await upsertPlan(pda, data);
      }
      const known = new Set(plans.map((p) => p.pda));
      for (const { pda, data } of versions.sort(
        (a, b) => a.data.version - b.data.version,
      )) {
        if (known.has(data.plan)) await insertVersion(pda, data);
      }
      lastSyncAt = Date.now();
    })().finally(() => {
      syncing = undefined;
    });
    return syncing;
  }

  // ----------------------------------------------------------------------------------- confirm

  function parseContent(raw: unknown, quoteDecimals: number): PlanContent {
    if (!isRecord(raw))
      throw new ApiError(400, "invalid_content", "content is required");
    const c = raw;
    const text = (field: string): string => {
      const v = c[field];
      if (typeof v !== "string")
        throw new ApiError(400, "invalid_content", `${field} must be text`);
      return v;
    };
    const price = (field: string): bigint | null => {
      const v = c[field];
      if (v === undefined || v === null) return null;
      if (typeof v !== "string")
        throw new ApiError(
          400,
          "invalid_content",
          `${field} must be a decimal string`,
        );
      try {
        return parsePrice(v, quoteDecimals);
      } catch (e) {
        throw new ApiError(
          400,
          "invalid_content",
          `${field}: ${e instanceof Error ? e.message : "invalid price"}`,
        );
      }
    };
    try {
      return validateContent({
        rationale: text("rationale"),
        exitThesis: text("exitThesis"),
        exitTarget: price("exitTarget"),
        invalidation: price("invalidation"),
      });
    } catch (e) {
      if (e instanceof ContentError)
        throw new ApiError(400, "invalid_content", `${e.field}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Accepts the offchain text of a version ONLY if its hash equals the content_hash stored in the
   * onchain PlanVersion account. The chain proves who published; nobody is trusted to say so.
   * Idempotent: confirming the same text again is a no-op.
   */
  async function confirm(
    planPda: string,
    input: { version: unknown; content: unknown },
  ): Promise<PlanDetailView> {
    try {
      decodeAddress(planPda);
    } catch {
      throw new ApiError(400, "invalid_plan", "Plan address is not valid");
    }
    const versionNo = input.version;
    if (
      typeof versionNo !== "number" ||
      !Number.isInteger(versionNo) ||
      versionNo < 1 ||
      versionNo > 0xffff
    ) {
      throw new ApiError(
        400,
        "invalid_version",
        "version must be a positive integer",
      );
    }

    let plan: OnchainPlan | null;
    let ver: { pda: string; data: OnchainVersion } | null;
    try {
      plan = await chain.getPlan(planPda);
      ver = plan ? await chain.getVersion(planPda, versionNo) : null;
    } catch (e) {
      // Wrong owner or wrong account type: never trust it.
      if (e instanceof Error && /not owned|discriminator/i.test(e.message)) {
        throw new ApiError(
          400,
          "not_a_relay_account",
          "That address is not a Relay plan",
        );
      }
      throw new ApiError(
        503,
        "chain_unavailable",
        "Solana is unreachable right now",
      );
    }
    if (!plan)
      throw new ApiError(404, "plan_not_found", "No such plan onchain");
    if (!ver)
      throw new ApiError(404, "version_not_found", "No such version onchain");
    const pair = findPairByMints(plan.baseMint, plan.quoteMint);
    if (!pair)
      throw new ApiError(
        422,
        "unsupported_pair",
        "This plan uses an unsupported pair",
      );

    const content = parseContent(input.content, plan.quoteDecimals);
    const computed = await contentHash(content);
    if (toHex(computed) !== toHex(ver.data.contentHash)) {
      throw new ApiError(
        409,
        "content_mismatch",
        "This text does not match the plan committed onchain",
      );
    }
    // Cross-check: TS and the program must agree on the terms hash. A mismatch means the two
    // implementations diverged, which must never be hidden.
    const recomputed = await termsHash({
      programId: chain.programId,
      plan: planPda,
      version: ver.data.version,
      creator: plan.creator,
      baseMint: plan.baseMint,
      quoteMint: plan.quoteMint,
      baseDecimals: plan.baseDecimals,
      quoteDecimals: plan.quoteDecimals,
      entryLow: ver.data.entryLow,
      entryHigh: ver.data.entryHigh,
      expiresAt: ver.data.expiresAt,
      contentHash: ver.data.contentHash,
      prevTermsHash: ver.data.prevTermsHash,
    });
    if (toHex(recomputed) !== toHex(ver.data.termsHash)) {
      throw new ApiError(
        422,
        "terms_hash_mismatch",
        "The onchain terms hash does not match the expected value",
      );
    }

    await upsertPlan(planPda, plan);
    // Earlier versions must exist first because of the foreign key and hash chain.
    for (let n = 1; n < ver.data.version; n++) {
      const earlier = await chain.getVersion(planPda, n);
      if (earlier) await insertVersion(earlier.pda, earlier.data);
    }
    await insertVersion(ver.pda, ver.data);

    // Reference price at the moment of publication, taken from our own observations (never from the
    // request). On a fork the chain clock can differ from wall time, so convert before matching.
    const chainNow = await chain.nowMs();
    const wallPublishedSec =
      Number(ver.data.publishedAt) - Math.round((chainNow - Date.now()) / 1000);
    const refRows: RefPriceRow[] = await db`
      select price_units, source, observed_at from price_observations
      where mint = ${plan.baseMint}
        and observed_at between to_timestamp(${wallPublishedSec - REF_PRICE_WINDOW_SEC}) and to_timestamp(${wallPublishedSec + REF_PRICE_WINDOW_SEC})
      order by abs(extract(epoch from observed_at) - ${wallPublishedSec}) limit 1`;
    const ref: RefPriceRow | undefined = refRows[0];

    await db`
      insert into plan_version_content (plan_pda, version, rationale, exit_thesis, exit_target, invalidation,
                                        ref_price_units, ref_price_source, ref_price_observed_at)
      values (${planPda}, ${ver.data.version}, ${content.rationale}, ${content.exitThesis},
              ${content.exitTarget === null ? null : content.exitTarget.toString()},
              ${content.invalidation === null ? null : content.invalidation.toString()},
              ${ref ? String(ref.price_units) : null}, ${ref ? ref.source : null}, ${ref ? ref.observed_at : null})
      on conflict (plan_pda, version) do nothing`;

    return detail(planPda);
  }

  // ------------------------------------------------------------------------------------- reads

  async function currentPrices(
    rows: PlanRow[],
    offsetMs: number,
  ): Promise<Map<string, ReferencePrice | null>> {
    const bases = new Map<string, Pair>();
    for (const r of rows) bases.set(r.base_mint, pairOf(r));
    const out = new Map<string, ReferencePrice | null>();
    await Promise.all(
      [...bases].map(async ([mint, pair]) => {
        const p = await prices.get(pair).catch(() => null);
        // Move the wall-clock observation into the chain-clock frame used for "now".
        out.set(
          mint,
          p
            ? { units: p.units, observedAtMs: p.observedAtMs + offsetMs }
            : null,
        );
      }),
    );
    return out;
  }

  async function loadVersions(
    planPdas: string[],
  ): Promise<Map<string, VersionRow[]>> {
    const result = new Map<string, VersionRow[]>();
    if (planPdas.length === 0) return result;
    const rows: VersionRow[] = await db`
      select v.*, c.rationale, c.exit_thesis, c.exit_target, c.invalidation, c.ref_price_units, c.ref_price_source
      from plan_versions v
      left join plan_version_content c on c.plan_pda = v.plan_pda and c.version = v.version
      where v.plan_pda in ${db(planPdas)}
      order by v.plan_pda, v.version`;
    for (const r of rows) {
      const list = result.get(r.plan_pda) ?? [];
      list.push(r);
      result.set(r.plan_pda, list);
    }
    return result;
  }

  function card(
    row: PlanRow,
    versions: VersionRow[],
    price: ReferencePrice | null,
    nowMs: number,
  ): PlanCardView {
    const pair = pairOf(row);
    const latest = versions.at(-1);
    if (!latest) throw new Error(`Plan ${row.plan_pda} has no versions`);
    const status = entryStatus({
      plan: {
        status: row.status,
        entryLow: bi(latest.entry_low),
        entryHigh: bi(latest.entry_high),
        expiresAt: bi(latest.expires_at),
      },
      price,
      nowMs,
    });
    return {
      planPda: row.plan_pda,
      cluster: row.cluster,
      creator: {
        address: row.creator_address,
        handle: row.handle,
        displayName: row.display_name,
        isDemo: row.is_demo ?? false,
      },
      pair: {
        id: pair.id,
        label: pair.label,
        baseSymbol: pair.base.symbol,
        quoteSymbol: pair.quote.symbol,
        baseMint: pair.base.mint,
        quoteMint: pair.quote.mint,
        baseDecimals: pair.base.decimals,
        quoteDecimals: pair.quote.decimals,
      },
      planStatus: row.status,
      version: versionView(latest, pair.quote.decimals),
      versionCount: versions.length,
      entry: {
        status: status.status,
        closingSoon: status.closingSoon,
        msUntilExpiry: status.msUntilExpiry,
        price: price
          ? {
              units: price.units.toString(),
              display: formatUnits(price.units, pair.quote.decimals),
              observedAtMs: price.observedAtMs,
            }
          : null,
      },
      nowMs,
    };
  }

  async function feed(opts: {
    cursor?: string;
    pairId?: string;
    limit?: number;
  }): Promise<FeedPage> {
    await sync().catch(() => undefined); // a chain hiccup must not take the feed down; stale rows still serve
    const nowMs = await chain.nowMs().catch(() => Date.now());
    const offsetMs = nowMs - Date.now();
    const pair = opts.pairId
      ? SUPPORTED_PAIRS.find((p) => p.id === opts.pairId)
      : undefined;
    if (opts.pairId && !pair)
      throw new ApiError(400, "invalid_pair", "Unknown pair");

    const rows: PlanRow[] = await db`
      select p.plan_pda, p.cluster, p.creator_address, p.onchain_plan_id, p.base_mint, p.quote_mint,
             p.base_decimals, p.quote_decimals, p.status, cr.handle, cr.display_name, cr.is_demo
      from plans p left join creators cr on cr.address = p.creator_address
      where p.cluster = ${env.cluster}
        and exists (select 1 from plan_versions v where v.plan_pda = p.plan_pda)
        ${pair ? db`and p.base_mint = ${pair.base.mint}` : db``}`;
    const versions = await loadVersions(rows.map((r) => r.plan_pda));
    const priceByMint = await currentPrices(rows, offsetMs);

    const cards = rows.map((r) =>
      card(
        r,
        versions.get(r.plan_pda) ?? [],
        priceByMint.get(r.base_mint) ?? null,
        nowMs,
      ),
    );
    const ranked = rankFeed(
      cards.map((c) => ({
        c,
        planPda: c.planPda,
        status: c.entry.status,
        publishedAt: c.version.publishedAt,
        expiresAt: c.version.expiresAt,
      })),
      Math.floor(nowMs / 1000),
    ).map((x) => x.c);

    const limit = Math.min(Math.max(opts.limit ?? 10, 1), 30);
    const offset = decodeCursor(opts.cursor);
    const items = ranked.slice(offset, offset + limit);
    return {
      items,
      nextCursor:
        offset + limit < ranked.length ? encodeCursor(offset + limit) : null,
      nowMs,
    };
  }

  async function detail(planPda: string): Promise<PlanDetailView> {
    try {
      decodeAddress(planPda);
    } catch {
      throw new ApiError(400, "invalid_plan", "Plan address is not valid");
    }
    const rows: PlanRow[] = await db`
      select p.plan_pda, p.cluster, p.creator_address, p.onchain_plan_id, p.base_mint, p.quote_mint,
             p.base_decimals, p.quote_decimals, p.status, cr.handle, cr.display_name, cr.is_demo
      from plans p left join creators cr on cr.address = p.creator_address
      where p.plan_pda = ${planPda} and p.cluster = ${env.cluster}`;
    const row: PlanRow | undefined = rows[0];
    if (!row) throw new ApiError(404, "plan_not_found", "No such plan");
    const versions = (await loadVersions([planPda])).get(planPda) ?? [];
    if (versions.length === 0)
      throw new ApiError(404, "plan_not_found", "No such plan");
    const nowMs = await chain.nowMs().catch(() => Date.now());
    const priceByMint = await currentPrices([row], nowMs - Date.now());
    const base = card(
      row,
      versions,
      priceByMint.get(row.base_mint) ?? null,
      nowMs,
    );
    const quoteDecimals = pairOf(row).quote.decimals;
    return {
      ...base,
      versions: versions.map((v) => versionView(v, quoteDecimals)),
    };
  }

  return { sync, confirm, feed, detail };
}

export type PlanService = ReturnType<typeof createPlanService>;
