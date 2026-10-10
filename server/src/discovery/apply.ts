import type { TransactionSQL } from "bun";
import type { Db } from "../db";
import { isRecord } from "../util";
import type {
  CuratedEvent,
  CuratedIdea,
  CuratedSource,
  CuratedTrader,
  Curation,
} from "./curation";
import { eventHash, sourceHash } from "./hash";

/**
 * Writes a validated curation file into the discovery tables, in one transaction.
 *
 *   - Idempotent: running the same file again changes nothing and appends no event.
 *   - Append-only where it matters: a source, an idea or an event that already exists must match
 *     the file exactly. If the file disagrees with what is recorded, the whole run is refused and
 *     rolled back. History is corrected by adding a `correction` event, never by editing a row.
 *   - Ordered: all writers take one lock, so `timeline_events.seq` follows commit order and a
 *     reader's cursor can never skip an event that commits late.
 *   - Late arrivals are fine: an event with an earlier `occurredAt` than ones already stored is
 *     appended with a new, larger `seq`, so readers see it as new while the timeline shows it in
 *     its place in time.
 */

/** An arbitrary constant: every discovery writer takes this advisory lock first. */
export const DISCOVERY_WRITE_LOCK = 7_420_004;

export class CurationConflictError extends Error {
  readonly conflicts: readonly string[];
  constructor(conflicts: readonly string[]) {
    super(
      `The curation file contradicts what is already recorded:\n- ${conflicts.join("\n- ")}\nHistory is append-only: add a correction event instead of changing an old entry.`,
    );
    this.name = "CurationConflictError";
    this.conflicts = conflicts;
  }
}

export interface ApplyReport {
  traders: { created: number; updated: number; unchanged: number };
  links: { added: number; changed: number; removed: number };
  sources: { created: number; unchanged: number; availabilityAdded: number };
  ideas: { created: number; unchanged: number };
  events: { appended: number; unchanged: number };
}

/** A Postgres text[] literal, quoted element by element. */
export function pgTextArray(values: readonly string[]): string {
  return `{${values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

const sameTime = (a: Date | null, b: Date | null) =>
  (a === null ? null : a.getTime()) === (b === null ? null : b.getTime());

function str(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return typeof v === "string" ? v : null;
}

function date(row: Record<string, unknown>, key: string): Date | null {
  const v = row[key];
  return v instanceof Date ? v : null;
}

function textList(row: Record<string, unknown>, key: string): string[] {
  const v = row[key];
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function bytes(row: Record<string, unknown>, key: string): Uint8Array | null {
  const v = row[key];
  return v instanceof Uint8Array ? new Uint8Array(v) : null;
}

type Tx = TransactionSQL;

async function one(
  query: PromiseLike<unknown[]>,
): Promise<Record<string, unknown> | undefined> {
  const rows = await query;
  const first: unknown = rows[0];
  return isRecord(first) ? first : undefined;
}

async function applyTrader(
  tx: Tx,
  t: CuratedTrader,
  demo: boolean,
  report: ApplyReport,
  conflicts: string[],
): Promise<void> {
  const existing = await one(tx`select * from traders where id = ${t.id}`);
  const confirmedBy = t.ownerConfirmed?.by ?? null;
  const confirmedAt = t.ownerConfirmed?.at ?? null;
  if (!existing) {
    await tx`
      insert into traders (id, display_name, markets, attribution_basis, participation, coverage_limits,
                           curator, owner_confirmed_by, owner_confirmed_at, is_demo)
      values (${t.id}, ${t.displayName}, ${pgTextArray(t.markets)}::text[], ${t.attributionBasis},
              ${t.participation}, ${t.coverageLimits}, ${t.curator}, ${confirmedBy}, ${confirmedAt}, ${demo})`;
    report.traders.created++;
  } else {
    if (existing.is_demo !== demo) {
      conflicts.push(
        `trader "${t.id}" exists as ${existing.is_demo === true ? "demo" : "live"} data, the file is ${demo ? "demo" : "live"}`,
      );
      return;
    }
    // Profile text may be corrected in place; the history below it may not.
    const same =
      str(existing, "display_name") === t.displayName &&
      sameList(textList(existing, "markets"), t.markets) &&
      str(existing, "attribution_basis") === t.attributionBasis &&
      str(existing, "participation") === t.participation &&
      str(existing, "coverage_limits") === t.coverageLimits &&
      str(existing, "curator") === t.curator &&
      str(existing, "owner_confirmed_by") === confirmedBy;
    if (same) report.traders.unchanged++;
    else {
      await tx`
        update traders set display_name = ${t.displayName}, markets = ${pgTextArray(t.markets)}::text[],
               attribution_basis = ${t.attributionBasis}, participation = ${t.participation},
               coverage_limits = ${t.coverageLimits}, curator = ${t.curator},
               owner_confirmed_by = ${confirmedBy}, owner_confirmed_at = ${confirmedAt}, updated_at = now()
        where id = ${t.id}`;
      report.traders.updated++;
    }
  }

  // Links are the profile's identity claims: the file is the whole truth, so extras are removed.
  const current: unknown[] =
    await tx`select kind, value, identity_basis, basis_note from trader_links where trader_id = ${t.id}`;
  const keyOf = (kind: string | null, value: string | null) =>
    `${kind}|${value}`;
  const have = new Map<string, Record<string, unknown>>();
  for (const row of current) {
    if (isRecord(row))
      have.set(keyOf(str(row, "kind"), str(row, "value")), row);
  }
  const wanted = new Set<string>();
  for (const l of t.links) {
    const key = keyOf(l.kind, l.value);
    wanted.add(key);
    const row = have.get(key);
    if (!row) {
      await tx`insert into trader_links (trader_id, kind, value, identity_basis, basis_note)
               values (${t.id}, ${l.kind}, ${l.value}, ${l.identityBasis}, ${l.basisNote})`;
      report.links.added++;
    } else if (
      str(row, "identity_basis") !== l.identityBasis ||
      str(row, "basis_note") !== l.basisNote
    ) {
      await tx`update trader_links set identity_basis = ${l.identityBasis}, basis_note = ${l.basisNote}
               where trader_id = ${t.id} and kind = ${l.kind} and value = ${l.value}`;
      report.links.changed++;
    }
  }
  for (const [key, row] of have) {
    if (wanted.has(key)) continue;
    await tx`delete from trader_links where trader_id = ${t.id} and kind = ${str(row, "kind")} and value = ${str(row, "value")}`;
    report.links.removed++;
  }
}

async function applySource(
  tx: Tx,
  traderId: string,
  s: CuratedSource,
  demo: boolean,
  curator: string,
  report: ApplyReport,
  conflicts: string[],
): Promise<void> {
  const hash = await sourceHash({
    url: s.url,
    publishedAt: s.publishedAt,
    retrievedAt: s.retrievedAt,
    displayedContent: s.displayedContent,
  });
  const existing = await one(
    tx`select * from source_records where id = ${s.id}`,
  );
  if (!existing) {
    await tx`
      insert into source_records (id, trader_id, provider, provider_id, url, record_type, published_at,
                                  retrieved_at, displayed_content, content_hash, curator, is_demo)
      values (${s.id}, ${traderId}, ${s.provider}, ${s.providerId}, ${s.url}, ${s.recordType}, ${s.publishedAt},
              ${s.retrievedAt}, ${s.displayedContent}, ${Buffer.from(hash)}, ${curator}, ${demo})`;
    report.sources.created++;
  } else {
    const stored = bytes(existing, "content_hash");
    const same =
      str(existing, "trader_id") === traderId &&
      str(existing, "provider") === s.provider &&
      str(existing, "provider_id") === s.providerId &&
      str(existing, "url") === s.url &&
      str(existing, "record_type") === s.recordType &&
      sameTime(date(existing, "published_at"), s.publishedAt) &&
      sameTime(date(existing, "retrieved_at"), s.retrievedAt) &&
      str(existing, "displayed_content") === s.displayedContent &&
      stored !== null &&
      stored.length === hash.length &&
      stored.every((b, i) => b === hash[i]);
    if (same) report.sources.unchanged++;
    else {
      conflicts.push(
        `source "${s.id}" is already recorded with different content (a recorded capture cannot be edited)`,
      );
      return;
    }
  }
  for (const a of s.availability) {
    const inserted: unknown[] = await tx`
      insert into source_availability (source_record_id, state, observed_at, note)
      values (${s.id}, ${a.state}, ${a.observedAt}, ${a.note})
      on conflict (source_record_id, observed_at, state) do nothing
      returning id`;
    report.sources.availabilityAdded += inserted.length;
  }
}

export interface EventRow {
  id: string;
  type: string;
  occurredAt: Date | null;
  sourceId: string | null;
  evidenceKind: string | null;
  evidenceRef: string | null;
  basis: string;
  basisNote: string | null;
  reviewState: string;
  summary: string;
  dedupe: string;
}

function eventRowOf(e: CuratedEvent): EventRow {
  return {
    id: e.id,
    type: e.type,
    occurredAt: e.occurredAt,
    sourceId: e.sourceId,
    evidenceKind: e.evidence?.kind ?? null,
    evidenceRef: e.evidence?.ref ?? null,
    basis: e.relationshipBasis,
    basisNote: e.basisNote,
    reviewState: e.reviewState,
    summary: e.summary,
    dedupe: `event:${e.id}`,
  };
}

/** The event every idea starts with: its original source, captured. */
export function originEvent(
  idea: CuratedIdea,
  source: CuratedSource,
  curator: string,
): EventRow {
  return {
    id: `${idea.id}-origin`,
    type: "source_added",
    occurredAt: source.publishedAt,
    sourceId: source.id,
    evidenceKind: null,
    evidenceRef: null,
    basis: "original",
    basisNote: null,
    reviewState: "not_required",
    summary: `Original ${source.recordType} on ${source.provider}, captured by ${curator}`,
    dedupe: "origin",
  };
}

/**
 * Appends one event to an idea's timeline: chains it to the idea's previous event and inserts it.
 * Callers hold the discovery write lock (so `seq` follows commit order). Used by the curation
 * loader and by the evidence review commands, so the hash chain has exactly one writer.
 */
export async function insertEvent(
  tx: TransactionSQL,
  ideaId: string,
  e: EventRow,
  demo: boolean,
  curator: string,
  now: Date,
): Promise<void> {
  const last = await one(
    tx`select event_hash from timeline_events where idea_id = ${ideaId} order by seq desc limit 1`,
  );
  const prevHash = last ? bytes(last, "event_hash") : null;
  const hash = await eventHash({
    ideaId,
    id: e.id,
    type: e.type,
    occurredAt: e.occurredAt,
    sourceRecordId: e.sourceId,
    evidenceKind: e.evidenceKind,
    evidenceRef: e.evidenceRef,
    relationshipBasis: e.basis,
    basisNote: e.basisNote,
    revision: 1,
    reviewState: e.reviewState,
    summary: e.summary,
    prevHash,
  });
  await tx`
    insert into timeline_events (id, idea_id, event_type, occurred_at, recorded_at, source_record_id,
                                 evidence_kind, evidence_ref, relationship_basis, basis_note, revision,
                                 review_state, summary, dedupe_key, prev_hash, event_hash, curator, is_demo)
    values (${e.id}, ${ideaId}, ${e.type}, ${e.occurredAt}, ${now}, ${e.sourceId}, ${e.evidenceKind},
            ${e.evidenceRef}, ${e.basis}, ${e.basisNote}, 1, ${e.reviewState}, ${e.summary}, ${e.dedupe},
            ${prevHash === null ? null : Buffer.from(prevHash)}, ${Buffer.from(hash)}, ${curator}, ${demo})`;
}

async function appendEvent(
  tx: Tx,
  ideaId: string,
  e: EventRow,
  demo: boolean,
  curator: string,
  now: Date,
  report: ApplyReport,
  conflicts: string[],
): Promise<void> {
  const existing = await one(
    tx`select * from timeline_events where id = ${e.id}`,
  );
  if (existing) {
    const same =
      str(existing, "idea_id") === ideaId &&
      str(existing, "event_type") === e.type &&
      sameTime(date(existing, "occurred_at"), e.occurredAt) &&
      str(existing, "source_record_id") === e.sourceId &&
      str(existing, "evidence_kind") === e.evidenceKind &&
      str(existing, "evidence_ref") === e.evidenceRef &&
      str(existing, "relationship_basis") === e.basis &&
      str(existing, "basis_note") === e.basisNote &&
      str(existing, "review_state") === e.reviewState &&
      str(existing, "summary") === e.summary;
    if (same) report.events.unchanged++;
    else
      conflicts.push(
        `event "${e.id}" is already recorded differently (add a correction event instead of changing it)`,
      );
    return;
  }
  await insertEvent(tx, ideaId, e, demo, curator, now);
  report.events.appended++;
}

async function applyIdea(
  tx: Tx,
  t: CuratedTrader,
  idea: CuratedIdea,
  demo: boolean,
  now: Date,
  report: ApplyReport,
  conflicts: string[],
): Promise<void> {
  const source = t.sources.find((s) => s.id === idea.sourceId);
  if (!source) return; // parseCuration already refuses this
  const existing = await one(tx`select * from ideas where id = ${idea.id}`);
  if (!existing) {
    await tx`
      insert into ideas (id, trader_id, source_record_id, title, assets, market, stated_conditions, curator, is_demo)
      values (${idea.id}, ${t.id}, ${idea.sourceId}, ${idea.title}, ${pgTextArray(idea.assets)}::text[],
              ${idea.market}, ${idea.statedConditions}, ${t.curator}, ${demo})`;
    report.ideas.created++;
  } else {
    const same =
      str(existing, "trader_id") === t.id &&
      str(existing, "source_record_id") === idea.sourceId &&
      str(existing, "title") === idea.title &&
      sameList(textList(existing, "assets"), idea.assets) &&
      str(existing, "market") === idea.market &&
      str(existing, "stated_conditions") === idea.statedConditions;
    if (same) report.ideas.unchanged++;
    else {
      conflicts.push(
        `idea "${idea.id}" is already recorded differently (add a correction event instead of changing it)`,
      );
      return;
    }
  }
  await appendEvent(
    tx,
    idea.id,
    originEvent(idea, source, t.curator),
    demo,
    t.curator,
    now,
    report,
    conflicts,
  );
  for (const e of idea.events) {
    await appendEvent(
      tx,
      idea.id,
      eventRowOf(e),
      demo,
      t.curator,
      now,
      report,
      conflicts,
    );
  }
}

export async function applyCuration(
  db: Db,
  curation: Curation,
  now: Date = new Date(),
): Promise<ApplyReport> {
  const report: ApplyReport = {
    traders: { created: 0, updated: 0, unchanged: 0 },
    links: { added: 0, changed: 0, removed: 0 },
    sources: { created: 0, unchanged: 0, availabilityAdded: 0 },
    ideas: { created: 0, unchanged: 0 },
    events: { appended: 0, unchanged: 0 },
  };
  const conflicts: string[] = [];
  await db.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${DISCOVERY_WRITE_LOCK})`;
    for (const t of curation.traders) {
      await applyTrader(tx, t, curation.demo, report, conflicts);
      if (conflicts.length > 0) break;
      for (const s of t.sources) {
        await applySource(
          tx,
          t.id,
          s,
          curation.demo,
          t.curator,
          report,
          conflicts,
        );
      }
      for (const idea of t.ideas) {
        await applyIdea(tx, t, idea, curation.demo, now, report, conflicts);
      }
      if (conflicts.length > 0) break;
    }
    // Throwing rolls the whole file back: a half-applied file would leave a false history.
    if (conflicts.length > 0) throw new CurationConflictError(conflicts);
  });
  return report;
}
