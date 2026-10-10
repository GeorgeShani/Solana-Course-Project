import { toHex } from "@relay/domain";
import type { Db } from "../db";
import type { Env } from "../env";
import { ApiError } from "../middleware";
import { isRecord } from "../util";
import { eventHash } from "./hash";

/**
 * Reads for the discovery API: sourced traders, their ideas, and each idea's timeline.
 *
 * Every number and label here comes from rows a person curated and the server recorded. Nothing is
 * fetched from a provider, nothing is inferred, and unknown stays null (the app shows "Unknown").
 *
 * Demo and live data never mix: a server in demo mode serves only demo rows, any other server only
 * live rows.
 */

export type RelationshipBasis =
  "original" | "creator_confirmed" | "editorially_associated" | "uncertain";

export interface SourceView {
  id: string;
  provider: string;
  url: string;
  recordType: string;
  /** What the source says about its own publication time. Null when unknown. */
  publishedAt: string | null;
  /** When Relay captured it. Always known. */
  retrievedAt: string;
  availability: {
    state: "available" | "unavailable" | "removed" | "unknown";
    observedAt: string;
    note: string | null;
  };
  /** The permitted excerpt, or null when the source was removed (the capture stays as a tombstone). */
  displayedContent: string | null;
  contentRemoved: boolean;
  contentHash: string;
  provenance: "manual_coverage";
  curator: string;
}

export interface LinkView {
  kind: string;
  value: string;
  identityBasis: "creator_confirmed" | "editorially_associated" | "uncertain";
  basisNote: string | null;
}

export interface TraderSummary {
  id: string;
  displayName: string;
  markets: string[];
  participation: "confirmed_participating" | "public_source_only";
  attributionBasis: string;
  coverageLimits: string;
  provenance: "manual_coverage";
  ownerConfirmed: { by: string; at: string } | null;
  isDemo: boolean;
  ideaCount: number;
  /** The newest event across this trader's ideas, as a cursor value. Null when there is none. */
  latestSeq: string | null;
}

export interface IdeaSummary {
  id: string;
  title: string;
  assets: string[];
  market: string;
  /** Quoted from the original. Null means the idea states none: "Entry conditions not specified". */
  statedConditions: string | null;
  trader: { id: string; displayName: string; isDemo: boolean };
  original: SourceView;
  eventCount: number;
  latestSeq: string;
  isDemo: boolean;
}

export interface EventView {
  /** The global order, as a decimal string. This is the cursor, not the time. */
  seq: string;
  id: string;
  type: string;
  occurredAt: string | null;
  recordedAt: string;
  source: SourceView | null;
  evidence: { kind: string; ref: string } | null;
  relationship: { basis: RelationshipBasis; note: string | null };
  reviewState: string;
  summary: string;
  hash: string;
  /** For a Relay plan: whether the plan's creator is the trader's confirmed wallet. */
  plan: null | {
    known: boolean;
    creatorMatchesLinkedWallet: boolean | null;
  };
}

export interface IdeaDetail extends IdeaSummary {
  events: EventView[];
  chain: { verified: boolean; checkedEvents: number };
}

export interface TraderDetail extends TraderSummary {
  links: LinkView[];
  ideas: IdeaSummary[];
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** What a reader is watching, and the last event `seq` they have seen for it. */
export interface WatchTarget {
  type: "idea" | "trader";
  id: string;
  /** Events with a larger `seq` are new to this reader. 0 means nothing seen yet. */
  after: string;
}

export interface ChangeEvent {
  seq: string;
  id: string;
  type: string;
  occurredAt: string | null;
  recordedAt: string;
  summary: string;
  relationship: { basis: RelationshipBasis; note: string | null };
  reviewState: string;
  source: {
    id: string;
    url: string;
    availability: SourceView["availability"];
    publishedAt: string | null;
    retrievedAt: string;
  } | null;
  evidence: { kind: string; ref: string } | null;
}

export interface ChangeGroup {
  idea: { id: string; title: string; assets: string[]; traderId: string };
  events: ChangeEvent[];
}

export interface TargetChanges {
  target: WatchTarget;
  /** False when the idea or trader does not exist here (for example demo data on a live server). */
  known: boolean;
  /** Meaningful events after the reader's cursor, grouped by idea, oldest first by `seq`. */
  groups: ChangeGroup[];
  /** Number of meaningful events returned (not the number of events in the target). */
  count: number;
  /** True when more meaningful events exist after the last one returned: ask again from there. */
  hasMore: boolean;
  /**
   * The newest event of any kind in this target. A reader that opens the target may store this as
   * its new cursor: it has then seen everything up to here, including events too minor to list.
   */
  latestSeq: string | null;
}

export interface ChangesResponse {
  items: TargetChanges[];
  /** When the newest curated event was recorded: manual coverage is only as fresh as this. */
  coverage: { kind: "manual_coverage"; lastRecordedAt: string | null };
  asOf: string;
}

export const MAX_WATCH_TARGETS = 50;

// ----------------------------------------------------------------------------------- cursors

function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** An unreadable cursor means "from the start", like the plan feed. */
function decodeCursor(
  cursor: string | undefined,
): Record<string, unknown> | null {
  if (!cursor || cursor.length > 200) return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString(),
    );
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readLimit(limit: number | undefined): number {
  if (limit === undefined) return 10;
  if (!Number.isInteger(limit))
    throw new ApiError(400, "invalid_limit", "limit must be an integer");
  return Math.min(Math.max(limit, 1), 30);
}

const ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;

// -------------------------------------------------------------------------------- row helpers

type Row = Record<string, unknown>;

function rows(result: unknown[]): Row[] {
  return result.filter(isRecord);
}

const text = (r: Row, k: string): string => {
  const v = r[k];
  if (typeof v !== "string") throw new Error(`column ${k} is not text`);
  return v;
};
const textOrNull = (r: Row, k: string): string | null => {
  const v = r[k];
  return typeof v === "string" ? v : null;
};
const dateOrNull = (r: Row, k: string): string | null => {
  const v = r[k];
  return v instanceof Date ? v.toISOString() : null;
};
const dateReq = (r: Row, k: string): string => {
  const v = dateOrNull(r, k);
  if (v === null) throw new Error(`column ${k} is not a time`);
  return v;
};
const list = (r: Row, k: string): string[] => {
  const v = r[k];
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
};
const count = (r: Row, k: string): number => {
  const v = r[k];
  return typeof v === "number"
    ? v
    : typeof v === "string" || typeof v === "bigint"
      ? Number(v)
      : 0;
};
const seqOrNull = (r: Row, k: string): string | null => {
  const v = r[k];
  return typeof v === "string" || typeof v === "number" || typeof v === "bigint"
    ? String(v)
    : null;
};
const bytesOf = (r: Row, k: string): Uint8Array => {
  const v = r[k];
  return v instanceof Uint8Array ? new Uint8Array(v) : new Uint8Array();
};

const AVAILABILITY = [
  "available",
  "unavailable",
  "removed",
  "unknown",
] as const;
const BASES = [
  "original",
  "creator_confirmed",
  "editorially_associated",
  "uncertain",
] as const;
const IDENTITY = [
  "creator_confirmed",
  "editorially_associated",
  "uncertain",
] as const;

function oneOf<T extends string>(r: Row, k: string, choices: readonly T[]): T {
  const v = r[k];
  const found = choices.find((c) => c === v);
  if (found === undefined)
    throw new Error(`column ${k} holds an unknown value`);
  return found;
}

// ------------------------------------------------------------------------------------ service

/** A piece of SQL built with the `db` tag, spliced into a larger query. */
type Fragment = PromiseLike<unknown>;

export interface DiscoveryServiceDeps {
  env: Env;
  db: Db;
}

export function createDiscoveryService({ env, db }: DiscoveryServiceDeps) {
  const demo = env.demoMode;

  function traderSummary(r: Row): TraderSummary {
    const by = textOrNull(r, "owner_confirmed_by");
    const at = r.owner_confirmed_at;
    return {
      id: text(r, "id"),
      displayName: text(r, "display_name"),
      markets: list(r, "markets"),
      participation: oneOf(r, "participation", [
        "confirmed_participating",
        "public_source_only",
      ] as const),
      attributionBasis: text(r, "attribution_basis"),
      coverageLimits: text(r, "coverage_limits"),
      provenance: "manual_coverage",
      ownerConfirmed:
        by !== null && at instanceof Date
          ? { by, at: at.toISOString().slice(0, 10) }
          : by !== null && typeof at === "string"
            ? { by, at: at.slice(0, 10) }
            : null,
      isDemo: r.is_demo === true,
      ideaCount: count(r, "idea_count"),
      latestSeq: seqOrNull(r, "latest_seq"),
    };
  }

  /** Current availability for each source: the latest observation. */
  async function sourcesById(ids: string[]): Promise<Map<string, SourceView>> {
    const out = new Map<string, SourceView>();
    if (ids.length === 0) return out;
    const records = rows(
      await db`
        select s.*, a.state as availability_state, a.observed_at as availability_observed_at,
               a.note as availability_note
        from source_records s
        join lateral (
          select state, observed_at, note from source_availability
          where source_record_id = s.id order by observed_at desc, id desc limit 1
        ) a on true
        where s.id in ${db(ids)}`,
    );
    for (const r of records) {
      const state = oneOf(r, "availability_state", AVAILABILITY);
      const removed = state === "removed";
      out.set(text(r, "id"), {
        id: text(r, "id"),
        provider: text(r, "provider"),
        url: text(r, "url"),
        recordType: text(r, "record_type"),
        publishedAt: dateOrNull(r, "published_at"),
        retrievedAt: dateReq(r, "retrieved_at"),
        availability: {
          state,
          observedAt: dateReq(r, "availability_observed_at"),
          note: textOrNull(r, "availability_note"),
        },
        // A removed source is shown as a tombstone: we keep the fact and the hash, not the words.
        displayedContent: removed ? null : textOrNull(r, "displayed_content"),
        contentRemoved: removed,
        contentHash: toHex(bytesOf(r, "content_hash")),
        provenance: "manual_coverage",
        curator: text(r, "curator"),
      });
    }
    return out;
  }

  async function ideaSummaries(where: Fragment, limit: number) {
    const found = rows(
      await db`
        select i.*, t.display_name as trader_name, t.is_demo as trader_demo,
               (select count(*) from timeline_events e where e.idea_id = i.id) as event_count,
               (select max(e.seq) from timeline_events e where e.idea_id = i.id) as latest_seq
        from ideas i join traders t on t.id = i.trader_id
        where i.is_demo = ${demo} ${where}
        order by latest_seq desc, i.id asc
        limit ${limit + 1}`,
    );
    const sources = await sourcesById([
      ...new Set(found.map((r) => text(r, "source_record_id"))),
    ]);
    const summaries = found.map((r): IdeaSummary => {
      const original = sources.get(text(r, "source_record_id"));
      if (!original) throw new Error(`idea ${text(r, "id")} has no source`);
      return {
        id: text(r, "id"),
        title: text(r, "title"),
        assets: list(r, "assets"),
        market: text(r, "market"),
        statedConditions: textOrNull(r, "stated_conditions"),
        trader: {
          id: text(r, "trader_id"),
          displayName: text(r, "trader_name"),
          isDemo: r.trader_demo === true,
        },
        original,
        eventCount: count(r, "event_count"),
        latestSeq: seqOrNull(r, "latest_seq") ?? "0",
        isDemo: r.is_demo === true,
      };
    });
    return summaries;
  }

  async function listTraders(opts: {
    cursor?: string;
    limit?: number;
  }): Promise<Page<TraderSummary>> {
    const limit = readLimit(opts.limit);
    const after = decodeCursor(opts.cursor)?.id;
    const afterId = typeof after === "string" && ID.test(after) ? after : null;
    const found = rows(
      await db`
        select t.*,
               (select count(*) from ideas i where i.trader_id = t.id) as idea_count,
               (select max(e.seq) from timeline_events e join ideas i on i.id = e.idea_id
                 where i.trader_id = t.id) as latest_seq
        from traders t
        where t.is_demo = ${demo} ${afterId === null ? db`` : db`and t.id > ${afterId}`}
        order by t.id asc
        limit ${limit + 1}`,
    );
    const page = found.slice(0, limit).map(traderSummary);
    const last = page.at(-1);
    return {
      items: page,
      nextCursor:
        found.length > limit && last ? encodeCursor({ id: last.id }) : null,
    };
  }

  async function getTrader(id: string): Promise<TraderDetail> {
    if (!ID.test(id))
      throw new ApiError(400, "invalid_trader", "That is not a trader id");
    const found = rows(
      await db`
        select t.*,
               (select count(*) from ideas i where i.trader_id = t.id) as idea_count,
               (select max(e.seq) from timeline_events e join ideas i on i.id = e.idea_id
                 where i.trader_id = t.id) as latest_seq
        from traders t where t.id = ${id} and t.is_demo = ${demo}`,
    );
    const row = found[0];
    if (!row) throw new ApiError(404, "trader_not_found", "No such trader");
    const links = rows(
      await db`select kind, value, identity_basis, basis_note from trader_links where trader_id = ${id} order by id`,
    ).map((r): LinkView => ({
      kind: text(r, "kind"),
      value: text(r, "value"),
      identityBasis: oneOf(r, "identity_basis", IDENTITY),
      basisNote: textOrNull(r, "basis_note"),
    }));
    const ideas = await ideaSummaries(db`and i.trader_id = ${id}`, 50);
    return { ...traderSummary(row), links, ideas: ideas.slice(0, 50) };
  }

  async function listIdeas(opts: {
    cursor?: string;
    limit?: number;
    traderId?: string;
  }): Promise<Page<IdeaSummary>> {
    const limit = readLimit(opts.limit);
    if (opts.traderId !== undefined && !ID.test(opts.traderId))
      throw new ApiError(400, "invalid_trader", "That is not a trader id");
    const c = decodeCursor(opts.cursor);
    const seq = c?.seq;
    const cid = c?.id;
    // Newest activity first; ties broken by id, so the order is the same on every request.
    const cursorClause =
      typeof seq === "string" &&
      /^\d{1,19}$/.test(seq) &&
      typeof cid === "string" &&
      ID.test(cid)
        ? db`and ((select max(e.seq) from timeline_events e where e.idea_id = i.id) < ${seq}::bigint
               or ((select max(e.seq) from timeline_events e where e.idea_id = i.id) = ${seq}::bigint and i.id > ${cid}))`
        : db``;
    const traderClause =
      opts.traderId === undefined
        ? db``
        : db`and i.trader_id = ${opts.traderId}`;
    const found = await ideaSummaries(
      db`${traderClause} ${cursorClause}`,
      limit,
    );
    const page = found.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page,
      nextCursor:
        found.length > limit && last
          ? encodeCursor({ seq: last.latestSeq, id: last.id })
          : null,
    };
  }

  async function getIdea(id: string): Promise<IdeaDetail> {
    if (!ID.test(id))
      throw new ApiError(400, "invalid_idea", "That is not an idea id");
    const summary = (await ideaSummaries(db`and i.id = ${id}`, 1))[0];
    if (!summary) throw new ApiError(404, "idea_not_found", "No such idea");

    const stored = rows(
      await db`select * from timeline_events where idea_id = ${id} order by seq asc`,
    );
    const sourceIds = [
      ...new Set(
        stored
          .map((r) => textOrNull(r, "source_record_id"))
          .filter((x): x is string => x !== null),
      ),
    ];
    const sources = await sourcesById(sourceIds);

    // The linked wallets that are confirmed to belong to the trader, for the plan cross-check.
    const wallets = new Set(
      rows(
        await db`select value from trader_links where trader_id = ${summary.trader.id}
                 and kind = 'wallet' and identity_basis = 'creator_confirmed'`,
      ).map((r) => text(r, "value")),
    );
    const planRefs = stored
      .filter((r) => textOrNull(r, "evidence_kind") === "relay_plan")
      .map((r) => text(r, "evidence_ref"));
    const creators = new Map<string, string>();
    if (planRefs.length > 0) {
      for (const r of rows(
        await db`select plan_pda, creator_address from plans
                 where plan_pda in ${db(planRefs)} and cluster = ${env.cluster}`,
      )) {
        creators.set(text(r, "plan_pda"), text(r, "creator_address"));
      }
    }

    // Recompute the chain: each event's hash covers its fields and the previous event's hash.
    let verified = true;
    let prev: Uint8Array | null = null;
    const events: EventView[] = [];
    for (const r of stored) {
      const sourceId = textOrNull(r, "source_record_id");
      const kind = textOrNull(r, "evidence_kind");
      const ref = textOrNull(r, "evidence_ref");
      const occurred = r.occurred_at instanceof Date ? r.occurred_at : null;
      const storedPrev =
        r.prev_hash instanceof Uint8Array ? bytesOf(r, "prev_hash") : null;
      const expected = await eventHash({
        ideaId: id,
        id: text(r, "id"),
        type: text(r, "event_type"),
        occurredAt: occurred,
        sourceRecordId: sourceId,
        evidenceKind: kind,
        evidenceRef: ref,
        relationshipBasis: text(r, "relationship_basis"),
        basisNote: textOrNull(r, "basis_note"),
        revision: count(r, "revision"),
        reviewState: text(r, "review_state"),
        summary: text(r, "summary"),
        prevHash: prev,
      });
      const actual = bytesOf(r, "event_hash");
      const linked =
        (prev === null && storedPrev === null) ||
        (prev !== null &&
          storedPrev !== null &&
          toHex(prev) === toHex(storedPrev));
      if (!linked || toHex(expected) !== toHex(actual)) verified = false;
      prev = actual;

      let plan: EventView["plan"] = null;
      if (kind === "relay_plan" && ref !== null) {
        const creator = creators.get(ref);
        plan = {
          known: creator !== undefined,
          creatorMatchesLinkedWallet:
            creator === undefined ? null : wallets.has(creator),
        };
      }
      events.push({
        seq: String(r.seq),
        id: text(r, "id"),
        type: text(r, "event_type"),
        occurredAt: dateOrNull(r, "occurred_at"),
        recordedAt: dateReq(r, "recorded_at"),
        source: sourceId === null ? null : (sources.get(sourceId) ?? null),
        evidence: kind !== null && ref !== null ? { kind, ref } : null,
        relationship: {
          basis: oneOf(r, "relationship_basis", BASES),
          note: textOrNull(r, "basis_note"),
        },
        reviewState: text(r, "review_state"),
        summary: text(r, "summary"),
        hash: toHex(actual),
        plan,
      });
    }
    // The original statement always comes first. The rest are shown in the order things happened;
    // unknown times use the moment Relay recorded them, and equal times fall back to the global
    // order so the result is the same every time.
    events.sort((a, b) => {
      const ra = a.relationship.basis === "original" ? 0 : 1;
      const rb = b.relationship.basis === "original" ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const ta = Date.parse(a.occurredAt ?? a.recordedAt);
      const tb = Date.parse(b.occurredAt ?? b.recordedAt);
      return ta !== tb ? ta - tb : Number(BigInt(a.seq) - BigInt(b.seq));
    });
    return {
      ...summary,
      events,
      chain: { verified, checkedEvents: stored.length },
    };
  }

  // -------------------------------------------------------------------------------- changes

  /**
   * "What changed since I last checked?" for a bounded set of watched targets.
   *
   * A reader sends what it watches and the last `seq` it has seen for each; the server returns the
   * MEANINGFUL events after that, grouped under their idea. Meaningful means a sourced update, new
   * evidence, a discrepancy, a reviewed response, an added source, a correction, a Relay plan, or
   * the idea's original source becoming unavailable. The first capture of an idea, plain on-chain
   * activity and an unreviewed response are not changes. The server never marks anything read: the
   * reader decides when it has seen an event, and stores a cursor for it.
   *
   * Cursors are event `seq` values, not times, so tied times, late arrivals (a new event dated
   * earlier than ones already seen) and duplicates cannot hide or repeat an event.
   */
  async function getChanges(
    targets: WatchTarget[],
    opts: { limit?: number } = {},
  ): Promise<ChangesResponse> {
    if (targets.length > MAX_WATCH_TARGETS)
      throw new ApiError(
        400,
        "too_many_targets",
        `Watch at most ${MAX_WATCH_TARGETS} things at once`,
      );
    const limit = readLimit(opts.limit);
    const items: TargetChanges[] = [];

    for (const target of targets) {
      const scope =
        target.type === "idea"
          ? db`i.id = ${target.id}`
          : db`i.trader_id = ${target.id}`;
      const known =
        rows(
          await db`select 1 as found from ${
            target.type === "idea" ? db`ideas` : db`traders`
          } i where i.id = ${target.id} and i.is_demo = ${demo}`,
        ).length > 0;
      if (!known) {
        items.push({
          target,
          known: false,
          groups: [],
          count: 0,
          hasMore: false,
          latestSeq: null,
        });
        continue;
      }
      const latest = rows(
        await db`select max(e.seq) as latest from timeline_events e join ideas i on i.id = e.idea_id
                 where ${scope} and i.is_demo = ${demo}`,
      )[0];
      const found = rows(
        await db`
          select e.*, i.title, i.assets, i.trader_id, i.source_record_id as idea_source
          from timeline_events e join ideas i on i.id = e.idea_id
          where ${scope} and i.is_demo = ${demo} and e.seq > ${target.after}::bigint
            and (
              e.event_type in ('update_published', 'evidence_added', 'discrepancy_flagged',
                               'relay_plan_published', 'correction')
              or (e.event_type = 'response_added' and e.review_state = 'reviewed')
              or (e.event_type = 'source_added' and e.relationship_basis <> 'original')
              or (e.event_type = 'source_unavailable' and e.source_record_id = i.source_record_id)
            )
          order by e.seq asc
          limit ${limit + 1}`,
      );
      const page = found.slice(0, limit);
      const sources = await sourcesById([
        ...new Set(
          page
            .map((r) => textOrNull(r, "source_record_id"))
            .filter((x): x is string => x !== null),
        ),
      ]);
      const groups = new Map<string, ChangeGroup>();
      for (const r of page) {
        const ideaId = text(r, "idea_id");
        let group = groups.get(ideaId);
        if (!group) {
          group = {
            idea: {
              id: ideaId,
              title: text(r, "title"),
              assets: list(r, "assets"),
              traderId: text(r, "trader_id"),
            },
            events: [],
          };
          groups.set(ideaId, group);
        }
        const sourceId = textOrNull(r, "source_record_id");
        const source = sourceId === null ? undefined : sources.get(sourceId);
        const kind = textOrNull(r, "evidence_kind");
        const ref = textOrNull(r, "evidence_ref");
        group.events.push({
          seq: String(r.seq),
          id: text(r, "id"),
          type: text(r, "event_type"),
          occurredAt: dateOrNull(r, "occurred_at"),
          recordedAt: dateReq(r, "recorded_at"),
          summary: text(r, "summary"),
          relationship: {
            basis: oneOf(r, "relationship_basis", BASES),
            note: textOrNull(r, "basis_note"),
          },
          reviewState: text(r, "review_state"),
          source: source
            ? {
                id: source.id,
                url: source.url,
                availability: source.availability,
                publishedAt: source.publishedAt,
                retrievedAt: source.retrievedAt,
              }
            : null,
          evidence: kind !== null && ref !== null ? { kind, ref } : null,
        });
      }
      items.push({
        target,
        known: true,
        groups: [...groups.values()],
        count: page.length,
        hasMore: found.length > limit,
        latestSeq: latest ? seqOrNull(latest, "latest") : null,
      });
    }

    const newest = rows(
      await db`select max(e.recorded_at) as at from timeline_events e join ideas i on i.id = e.idea_id
               where i.is_demo = ${demo}`,
    )[0];
    return {
      items,
      coverage: {
        kind: "manual_coverage",
        lastRecordedAt: newest ? dateOrNull(newest, "at") : null,
      },
      asOf: new Date().toISOString(),
    };
  }

  return { listTraders, getTrader, listIdeas, getIdea, getChanges };
}

export type DiscoveryService = ReturnType<typeof createDiscoveryService>;
