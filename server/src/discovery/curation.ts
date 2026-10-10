import { decodeAddress } from "@relay/domain";
import { isRecord } from "../util";

/**
 * The curation file: owner-reviewed traders, their captured public statements, and the ideas and
 * updates that follow from them. This module only VALIDATES. It never fetches a URL (a submitted
 * link is data, not an address to visit) and never writes anything; `apply.ts` does that.
 *
 * Everything is manual coverage: a person looked at the source and typed what it says. Nothing
 * here claims automated monitoring. Real traders must carry an owner confirmation; only a file
 * marked `"demo": true` (clearly fictional, never served next to live data) may omit it.
 */

export const PARTICIPATION = [
  "confirmed_participating",
  "public_source_only",
] as const;
export const LINK_KINDS = [
  "x",
  "telegram",
  "website",
  "youtube",
  "wallet",
  "other",
] as const;
export const IDENTITY_BASES = [
  "creator_confirmed",
  "editorially_associated",
  "uncertain",
] as const;
export const AVAILABILITY = [
  "available",
  "unavailable",
  "removed",
  "unknown",
] as const;
export const RECORD_TYPES = [
  "post",
  "thread",
  "article",
  "video",
  "other",
] as const;
export const PROVIDERS = [
  "x",
  "telegram",
  "website",
  "youtube",
  "other",
] as const;
export const EVENT_TYPES = [
  "source_added",
  "update_published",
  "evidence_added",
  "discrepancy_flagged",
  "response_added",
  "relay_plan_published",
  "onchain_activity",
  "source_unavailable",
  "correction",
] as const;
export const EVIDENCE_KINDS = [
  "transaction",
  "relay_plan",
  "url",
  "source_record",
] as const;
/** Review states a curator may set. `pending` and `rejected` belong to the evidence-request flow. */
export const CURATED_REVIEW_STATES = ["not_required", "reviewed"] as const;

export type Participation = (typeof PARTICIPATION)[number];
export type LinkKind = (typeof LINK_KINDS)[number];
export type IdentityBasis = (typeof IDENTITY_BASES)[number];
export type Availability = (typeof AVAILABILITY)[number];
export type RecordType = (typeof RECORD_TYPES)[number];
export type Provider = (typeof PROVIDERS)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type CuratedReviewState = (typeof CURATED_REVIEW_STATES)[number];

export interface CuratedLink {
  kind: LinkKind;
  value: string;
  identityBasis: IdentityBasis;
  basisNote: string | null;
}

export interface CuratedAvailability {
  state: Availability;
  observedAt: Date;
  note: string | null;
}

export interface CuratedSource {
  id: string;
  provider: Provider;
  providerId: string | null;
  url: string;
  recordType: RecordType;
  publishedAt: Date | null;
  retrievedAt: Date;
  displayedContent: string | null;
  /** Oldest first. Never empty. */
  availability: CuratedAvailability[];
}

export interface CuratedEvent {
  id: string;
  type: EventType;
  occurredAt: Date | null;
  sourceId: string | null;
  evidence: { kind: EvidenceKind; ref: string } | null;
  relationshipBasis: IdentityBasis;
  basisNote: string | null;
  reviewState: CuratedReviewState;
  summary: string;
}

export interface CuratedIdea {
  id: string;
  sourceId: string;
  title: string;
  assets: string[];
  market: string;
  statedConditions: string | null;
  events: CuratedEvent[];
}

export interface CuratedTrader {
  id: string;
  displayName: string;
  markets: string[];
  attributionBasis: string;
  participation: Participation;
  coverageLimits: string;
  curator: string;
  ownerConfirmed: { by: string; at: string } | null;
  links: CuratedLink[];
  sources: CuratedSource[];
  ideas: CuratedIdea[];
}

export interface Curation {
  /** True only for the clearly fictional development file. */
  demo: boolean;
  traders: CuratedTrader[];
}

export class CurationError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(
      `The curation file has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`,
    );
    this.name = "CurationError";
    this.problems = problems;
  }
}

// ----------------------------------------------------------------------------------- limits

const MAX_TRADERS = 20;
const MAX_PER_TRADER = 50;
const ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const ASSET = /^[A-Z0-9][A-Z0-9._:-]{0,23}$/;
const ISO_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;
/** Dates this far ahead of "now" are refused: a capture or an event cannot be in the future. */
const FUTURE_SKEW_MS = 5 * 60 * 1000;

/** Hosts a provider's links may use, so a mistyped link is caught instead of shown to readers. */
const HOSTS: Readonly<Partial<Record<LinkKind, readonly string[]>>> = {
  x: ["x.com", "twitter.com"],
  telegram: ["t.me", "telegram.me"],
  youtube: ["youtube.com", "youtu.be"],
};

// ----------------------------------------------------------------------------------- reader

type Problems = string[];

/** C0 and C1 controls, DEL, and the Unicode line and paragraph separators. */
function hasControlCharacters(v: string): boolean {
  for (const ch of v) {
    const c = ch.codePointAt(0) ?? 0;
    if (c <= 0x1f || (c >= 0x7f && c <= 0x9f) || c === 0x2028 || c === 0x2029)
      return true;
  }
  return false;
}

/** Characters in a code-point sense, matching Postgres `char_length`. */
const length = (s: string) => [...s].length;

export function parseText(
  v: unknown,
  path: string,
  max: number,
  problems: Problems,
): string {
  if (typeof v !== "string") {
    problems.push(`${path} must be text`);
    return "";
  }
  if (v === "") problems.push(`${path} must not be empty`);
  if (v !== v.trim()) problems.push(`${path} has spaces at the start or end`);
  if (v !== v.normalize("NFC")) problems.push(`${path} is not NFC-normalised`);
  if (!v.isWellFormed()) problems.push(`${path} is not well-formed Unicode`);
  // Control characters (including newlines and NUL) have no place in a one-line statement.
  if (hasControlCharacters(v))
    problems.push(`${path} contains control characters`);
  if (length(v) > max)
    problems.push(`${path} is longer than ${max} characters`);
  return v;
}

function parseOptionalText(
  v: unknown,
  path: string,
  max: number,
  problems: Problems,
): string | null {
  return v === null || v === undefined
    ? null
    : parseText(v, path, max, problems);
}

function parseId(v: unknown, path: string, problems: Problems): string {
  if (typeof v !== "string" || !ID.test(v)) {
    problems.push(
      `${path} must be 3 to 64 lowercase letters, digits, "-" or "_", starting with a letter or digit`,
    );
    return "";
  }
  return v;
}

function parseChoice<T extends string>(
  v: unknown,
  choices: readonly T[],
  path: string,
  problems: Problems,
): T | null {
  const found = choices.find((c) => c === v);
  if (found === undefined) {
    problems.push(`${path} must be one of: ${choices.join(", ")}`);
    return null;
  }
  return found;
}

function parseTime(
  v: unknown,
  path: string,
  now: Date,
  problems: Problems,
): Date | null {
  if (typeof v !== "string" || !ISO_TIME.test(v)) {
    problems.push(
      `${path} must be an ISO time with a zone, like 2026-10-10T09:30:00Z`,
    );
    return null;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    problems.push(`${path} is not a real date`);
    return null;
  }
  if (d.getTime() > now.getTime() + FUTURE_SKEW_MS)
    problems.push(`${path} is in the future`);
  return d;
}

function parseOptionalTime(
  v: unknown,
  path: string,
  now: Date,
  problems: Problems,
): Date | null {
  return v === null || v === undefined
    ? null
    : parseTime(v, path, now, problems);
}

function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (/\.(local|internal|lan|home|corp|test|invalid)$/.test(host)) return true;
  // IP literals (v4, or v6 in brackets) are never a public source.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith("[")) return true;
  return !host.includes(".");
}

/**
 * A public https link: no credentials, no port, no IP address, no private or local name. The
 * server never visits it; the check exists so a typo or a hostile link cannot reach readers or a
 * later fetcher.
 */
export function parsePublicUrl(
  v: unknown,
  path: string,
  problems: Problems,
  hosts?: readonly string[],
): string {
  if (typeof v !== "string") {
    problems.push(`${path} must be a link`);
    return "";
  }
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    problems.push(`${path} is not a valid link`);
    return "";
  }
  if (url.protocol !== "https:")
    problems.push(`${path} must start with https://`);
  if (url.username !== "" || url.password !== "")
    problems.push(`${path} must not contain a user name or password`);
  if (url.port !== "") problems.push(`${path} must not name a port`);
  if (isPrivateHost(url.hostname))
    problems.push(
      `${path} must be a public website, not a private or local address`,
    );
  if (
    hosts &&
    !hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
  )
    problems.push(`${path} must be on ${hosts.join(" or ")}`);
  if (url.href.length > 500) problems.push(`${path} is too long`);
  return url.href;
}

function parseList(
  v: unknown,
  path: string,
  max: number,
  problems: Problems,
  { min = 0 }: { min?: number } = {},
): unknown[] {
  if (v === undefined && min === 0) return [];
  if (!Array.isArray(v)) {
    problems.push(`${path} must be a list`);
    return [];
  }
  if (v.length < min) problems.push(`${path} needs at least ${min}`);
  if (v.length > max) problems.push(`${path} may have at most ${max}`);
  return v.slice(0, max);
}

function parseRecord(
  v: unknown,
  path: string,
  problems: Problems,
): Record<string, unknown> {
  if (!isRecord(v)) {
    problems.push(`${path} must be an object`);
    return {};
  }
  return v;
}

// ------------------------------------------------------------------------------------ parts

function parseLink(
  raw: unknown,
  path: string,
  problems: Problems,
): CuratedLink | null {
  const r = parseRecord(raw, path, problems);
  const kind = parseChoice(r.kind, LINK_KINDS, `${path}.kind`, problems);
  const identityBasis = parseChoice(
    r.identityBasis,
    IDENTITY_BASES,
    `${path}.identityBasis`,
    problems,
  );
  const basisNote = parseOptionalText(
    r.basisNote,
    `${path}.basisNote`,
    300,
    problems,
  );
  if (
    identityBasis &&
    identityBasis !== "creator_confirmed" &&
    basisNote === null
  )
    problems.push(
      `${path}.basisNote is required unless the basis is creator_confirmed`,
    );
  if (!kind || !identityBasis) return null;

  let value: string;
  if (kind === "wallet") {
    value = typeof r.value === "string" ? r.value : "";
    try {
      decodeAddress(value);
    } catch {
      problems.push(`${path}.value must be a Solana wallet address`);
    }
  } else {
    value = parsePublicUrl(r.value, `${path}.value`, problems, HOSTS[kind]);
  }
  return { kind, value, identityBasis, basisNote };
}

function parseSource(
  raw: unknown,
  path: string,
  now: Date,
  problems: Problems,
): CuratedSource | null {
  const r = parseRecord(raw, path, problems);
  const id = parseId(r.id, `${path}.id`, problems);
  const provider = parseChoice(
    r.provider,
    PROVIDERS,
    `${path}.provider`,
    problems,
  );
  const recordType = parseChoice(
    r.recordType,
    RECORD_TYPES,
    `${path}.recordType`,
    problems,
  );
  const url = parsePublicUrl(
    r.url,
    `${path}.url`,
    problems,
    provider ? HOSTS[provider] : undefined,
  );
  const providerId = parseOptionalText(
    r.providerId,
    `${path}.providerId`,
    120,
    problems,
  );
  const publishedAt = parseOptionalTime(
    r.publishedAt,
    `${path}.publishedAt`,
    now,
    problems,
  );
  const retrievedAt = parseTime(
    r.retrievedAt,
    `${path}.retrievedAt`,
    now,
    problems,
  );
  const displayedContent = parseOptionalText(
    r.displayedContent,
    `${path}.displayedContent`,
    500,
    problems,
  );
  if (
    publishedAt &&
    retrievedAt &&
    publishedAt.getTime() > retrievedAt.getTime()
  )
    problems.push(
      `${path}.publishedAt is after retrievedAt: a source cannot be captured before it exists`,
    );

  const availability: CuratedAvailability[] = [];
  const listed = parseList(
    r.availability,
    `${path}.availability`,
    20,
    problems,
  );
  listed.forEach((item, i) => {
    const a = parseRecord(item, `${path}.availability[${i}]`, problems);
    const state = parseChoice(
      a.state,
      AVAILABILITY,
      `${path}.availability[${i}].state`,
      problems,
    );
    const observedAt = parseTime(
      a.observedAt,
      `${path}.availability[${i}].observedAt`,
      now,
      problems,
    );
    const note = parseOptionalText(
      a.note,
      `${path}.availability[${i}].note`,
      300,
      problems,
    );
    if (state && observedAt) availability.push({ state, observedAt, note });
  });
  // No history given: the capture itself is the first observation.
  if (listed.length === 0 && retrievedAt)
    availability.push({
      state: "available",
      observedAt: retrievedAt,
      note: null,
    });
  availability.sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  const seen = new Set<string>();
  for (const a of availability) {
    const key = `${a.observedAt.toISOString()}|${a.state}`;
    if (seen.has(key)) problems.push(`${path}.availability repeats ${key}`);
    seen.add(key);
  }

  if (!provider || !recordType || !retrievedAt) return null;
  return {
    id,
    provider,
    providerId,
    url,
    recordType,
    publishedAt,
    retrievedAt,
    displayedContent,
    availability,
  };
}

/** Events that point at a captured source of the same trader. */
const NEEDS_SOURCE: ReadonlySet<EventType> = new Set([
  "source_added",
  "update_published",
  "source_unavailable",
]);
/** Events that must show what they rest on. */
const NEEDS_EVIDENCE: ReadonlySet<EventType> = new Set([
  "evidence_added",
  "discrepancy_flagged",
  "response_added",
  "relay_plan_published",
  "onchain_activity",
]);

function parseEvent(
  raw: unknown,
  path: string,
  now: Date,
  problems: Problems,
): CuratedEvent | null {
  const r = parseRecord(raw, path, problems);
  const id = parseId(r.id, `${path}.id`, problems);
  const type = parseChoice(r.type, EVENT_TYPES, `${path}.type`, problems);
  const occurredAt = parseOptionalTime(
    r.occurredAt,
    `${path}.occurredAt`,
    now,
    problems,
  );
  const sourceId =
    r.sourceId === null || r.sourceId === undefined
      ? null
      : parseId(r.sourceId, `${path}.sourceId`, problems);
  const basis = parseChoice(
    r.relationshipBasis,
    IDENTITY_BASES,
    `${path}.relationshipBasis`,
    problems,
  );
  const basisNote = parseOptionalText(
    r.basisNote,
    `${path}.basisNote`,
    300,
    problems,
  );
  const reviewState =
    r.reviewState === undefined
      ? "not_required"
      : parseChoice(
          r.reviewState,
          CURATED_REVIEW_STATES,
          `${path}.reviewState`,
          problems,
        );
  const summary = parseText(r.summary, `${path}.summary`, 280, problems);

  let evidence: CuratedEvent["evidence"] = null;
  if (r.evidence !== null && r.evidence !== undefined) {
    const e = parseRecord(r.evidence, `${path}.evidence`, problems);
    const kind = parseChoice(
      e.kind,
      EVIDENCE_KINDS,
      `${path}.evidence.kind`,
      problems,
    );
    let ref = "";
    if (kind === "url")
      ref = parsePublicUrl(e.ref, `${path}.evidence.ref`, problems);
    else if (kind === "transaction") {
      ref = typeof e.ref === "string" ? e.ref : "";
      if (!SIGNATURE.test(ref))
        problems.push(`${path}.evidence.ref must be a transaction signature`);
    } else if (kind === "relay_plan") {
      ref = typeof e.ref === "string" ? e.ref : "";
      try {
        decodeAddress(ref);
      } catch {
        problems.push(`${path}.evidence.ref must be a Relay plan address`);
      }
    } else if (kind === "source_record")
      ref = parseId(e.ref, `${path}.evidence.ref`, problems);
    if (kind) evidence = { kind, ref };
  }

  if (!type || !basis || !reviewState) return null;
  if (basis !== "creator_confirmed" && basisNote === null)
    problems.push(
      `${path}.basisNote is required unless the basis is creator_confirmed`,
    );
  if (NEEDS_SOURCE.has(type) && sourceId === null)
    problems.push(`${path}.sourceId is required for ${type}`);
  if (NEEDS_EVIDENCE.has(type) && evidence === null)
    problems.push(`${path}.evidence is required for ${type}`);
  if (
    type === "relay_plan_published" &&
    evidence &&
    evidence.kind !== "relay_plan"
  )
    problems.push(
      `${path}.evidence.kind must be relay_plan for relay_plan_published`,
    );
  if (
    type === "onchain_activity" &&
    evidence &&
    evidence.kind !== "transaction"
  )
    problems.push(
      `${path}.evidence.kind must be transaction for onchain_activity`,
    );
  return {
    id,
    type,
    occurredAt,
    sourceId,
    evidence,
    relationshipBasis: basis,
    basisNote,
    reviewState,
    summary,
  };
}

function parseIdea(
  raw: unknown,
  path: string,
  now: Date,
  problems: Problems,
): CuratedIdea | null {
  const r = parseRecord(raw, path, problems);
  const id = parseId(r.id, `${path}.id`, problems);
  // The idea's first event is "<id>-origin", which must still fit the 64-character id limit.
  if (id.length > 56) problems.push(`${path}.id is longer than 56 characters`);
  const sourceId = parseId(r.sourceId, `${path}.sourceId`, problems);
  const title = parseText(r.title, `${path}.title`, 140, problems);
  const market = parseText(r.market, `${path}.market`, 40, problems);
  const statedConditions = parseOptionalText(
    r.statedConditions,
    `${path}.statedConditions`,
    300,
    problems,
  );
  const assets = parseList(r.assets, `${path}.assets`, 8, problems, {
    min: 1,
  }).map((a, i) => {
    if (typeof a !== "string" || !ASSET.test(a)) {
      problems.push(
        `${path}.assets[${i}] must be a ticker like SOL or BTC (capitals, digits, . _ : -)`,
      );
      return "";
    }
    return a;
  });
  const events = parseList(r.events, `${path}.events`, MAX_PER_TRADER, problems)
    .map((e, i) => parseEvent(e, `${path}.events[${i}]`, now, problems))
    .filter((e): e is CuratedEvent => e !== null);
  return { id, sourceId, title, assets, market, statedConditions, events };
}

function parseTrader(
  raw: unknown,
  path: string,
  now: Date,
  demo: boolean,
  defaultCurator: string | null,
  problems: Problems,
): CuratedTrader | null {
  const r = parseRecord(raw, path, problems);
  const id = parseId(r.id, `${path}.id`, problems);
  const displayName = parseText(
    r.displayName,
    `${path}.displayName`,
    80,
    problems,
  );
  const markets = parseList(r.markets, `${path}.markets`, 8, problems, {
    min: 1,
  }).map((m, i) => parseText(m, `${path}.markets[${i}]`, 40, problems));
  const attributionBasis = parseText(
    r.attributionBasis,
    `${path}.attributionBasis`,
    300,
    problems,
  );
  const participation = parseChoice(
    r.participation,
    PARTICIPATION,
    `${path}.participation`,
    problems,
  );
  const coverageLimits = parseText(
    r.coverageLimits,
    `${path}.coverageLimits`,
    300,
    problems,
  );
  const curator =
    r.curator === undefined && defaultCurator !== null
      ? defaultCurator
      : parseText(r.curator, `${path}.curator`, 80, problems);

  let ownerConfirmed: CuratedTrader["ownerConfirmed"] = null;
  if (r.ownerConfirmed !== undefined && r.ownerConfirmed !== null) {
    const o = parseRecord(r.ownerConfirmed, `${path}.ownerConfirmed`, problems);
    const by = parseText(o.by, `${path}.ownerConfirmed.by`, 80, problems);
    const at = typeof o.at === "string" && DAY.test(o.at) ? o.at : "";
    if (at === "" || Number.isNaN(new Date(`${at}T00:00:00Z`).getTime()))
      problems.push(`${path}.ownerConfirmed.at must be a date like 2026-10-10`);
    else if (
      new Date(`${at}T00:00:00Z`).getTime() >
      now.getTime() + FUTURE_SKEW_MS
    )
      problems.push(`${path}.ownerConfirmed.at is in the future`);
    ownerConfirmed = { by, at };
  }
  if (!demo && ownerConfirmed === null)
    problems.push(
      `${path}.ownerConfirmed is required: a real trader needs the owner's confirmation of the source and who they are`,
    );
  if (demo && ownerConfirmed !== null)
    problems.push(`${path}.ownerConfirmed must not be set in a demo file`);

  const links = parseList(r.links, `${path}.links`, MAX_PER_TRADER, problems, {
    min: 1,
  })
    .map((l, i) => parseLink(l, `${path}.links[${i}]`, problems))
    .filter((l): l is CuratedLink => l !== null);
  const linkKeys = new Set<string>();
  for (const l of links) {
    const key = `${l.kind}|${l.value}`;
    if (linkKeys.has(key)) problems.push(`${path}.links repeats ${key}`);
    linkKeys.add(key);
  }
  const sources = parseList(
    r.sources,
    `${path}.sources`,
    MAX_PER_TRADER,
    problems,
  )
    .map((s, i) => parseSource(s, `${path}.sources[${i}]`, now, problems))
    .filter((s): s is CuratedSource => s !== null);
  const ideas = parseList(r.ideas, `${path}.ideas`, MAX_PER_TRADER, problems)
    .map((s, i) => parseIdea(s, `${path}.ideas[${i}]`, now, problems))
    .filter((s): s is CuratedIdea => s !== null);

  if (!participation) return null;
  return {
    id,
    displayName,
    markets,
    attributionBasis,
    participation,
    coverageLimits,
    curator,
    ownerConfirmed,
    links,
    sources,
    ideas,
  };
}

/** Rules that need several parts of the file at once. */
function crossCheck(traders: CuratedTrader[], problems: Problems): void {
  const traderIds = new Set<string>();
  const sourceIds = new Set<string>();
  const ideaIds = new Set<string>();
  const eventIds = new Set<string>();
  for (const t of traders) {
    const tp = `trader "${t.id}"`;
    if (traderIds.has(t.id)) problems.push(`${tp} appears twice`);
    traderIds.add(t.id);
    const own = new Map<string, CuratedSource>();
    for (const s of t.sources) {
      if (sourceIds.has(s.id)) problems.push(`source "${s.id}" appears twice`);
      sourceIds.add(s.id);
      own.set(s.id, s);
    }
    const hasConfirmedWallet = t.links.some(
      (l) => l.kind === "wallet" && l.identityBasis === "creator_confirmed",
    );
    for (const idea of t.ideas) {
      const ip = `idea "${idea.id}" of ${tp}`;
      if (ideaIds.has(idea.id))
        problems.push(`idea "${idea.id}" appears twice`);
      ideaIds.add(idea.id);
      if (!own.has(idea.sourceId))
        problems.push(
          `${ip} names source "${idea.sourceId}", which is not one of this trader's sources`,
        );
      for (const e of idea.events) {
        const ep = `event "${e.id}" of ${ip}`;
        if (eventIds.has(e.id)) problems.push(`event "${e.id}" appears twice`);
        eventIds.add(e.id);
        const source = e.sourceId === null ? undefined : own.get(e.sourceId);
        if (e.sourceId !== null && !source)
          problems.push(
            `${ep} names source "${e.sourceId}", which is not one of this trader's sources`,
          );
        if (e.type === "update_published" && e.sourceId === idea.sourceId)
          problems.push(
            `${ep} is an update, so it needs its own source, not the original`,
          );
        if (e.type === "source_unavailable" && source) {
          const latest = source.availability.at(-1)?.state;
          if (latest !== "unavailable" && latest !== "removed")
            problems.push(
              `${ep} says the source is unavailable, but its availability history ends in "${latest}"`,
            );
        }
        if (e.evidence?.kind === "source_record" && !own.has(e.evidence.ref))
          problems.push(
            `${ep} points at source "${e.evidence.ref}", which is not one of this trader's sources`,
          );
        if (e.type === "relay_plan_published" && !hasConfirmedWallet)
          problems.push(
            `${ep} attaches a Relay plan, but ${tp} has no wallet link with basis creator_confirmed`,
          );
      }
    }
  }
}

/**
 * Validates a parsed curation file. Throws a `CurationError` listing every problem at once.
 * `now` is a parameter so tests can fix the clock.
 */
export function parseCuration(raw: unknown, now: Date = new Date()): Curation {
  const problems: Problems = [];
  const root = parseRecord(raw, "the file", problems);
  const demo = root.demo === true;
  if (root.demo !== undefined && typeof root.demo !== "boolean")
    problems.push('"demo" must be true or false');
  const defaultCurator =
    root.curator === undefined
      ? null
      : parseText(root.curator, "curator", 80, problems);
  const traders = parseList(root.traders, "traders", MAX_TRADERS, problems)
    .map((t, i) =>
      parseTrader(t, `traders[${i}]`, now, demo, defaultCurator, problems),
    )
    .filter((t): t is CuratedTrader => t !== null);
  if (problems.length === 0) crossCheck(traders, problems);
  if (problems.length > 0) throw new CurationError(problems);
  return { demo, traders };
}
