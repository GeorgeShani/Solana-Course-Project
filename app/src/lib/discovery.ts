import {
  ApiContractError,
  ApiRequestError,
  ApiUnavailableError,
  bool,
  isRec,
  num,
  rec,
  str,
  strOrNull,
} from "./api";

/**
 * Client for Relay's discovery API (server/src/discovery): sourced traders, their ideas, each
 * idea's timeline, the changes feed and evidence requests.
 *
 * Everything here is manual coverage: a person at Relay recorded it. JSON from the network is
 * `unknown` until a parser below has checked every field; nothing is cast. Unknown stays unknown
 * (`null`), and the screens say "Unknown" rather than guessing.
 */

// ---------------------------------------------------------------------------------------- types

export type RelationshipBasis =
  "original" | "creator_confirmed" | "editorially_associated" | "uncertain";
export type IdentityBasis = Exclude<RelationshipBasis, "original">;
export type Availability = "available" | "unavailable" | "removed" | "unknown";

export interface SourceView {
  id: string;
  provider: string;
  url: string;
  recordType: string;
  /** What the source says about its own publication time. Null when unknown. */
  publishedAt: string | null;
  /** When Relay captured it. */
  retrievedAt: string;
  availability: {
    state: Availability;
    observedAt: string;
    note: string | null;
  };
  /** The permitted excerpt; null when the source was removed (a tombstone remains). */
  displayedContent: string | null;
  contentRemoved: boolean;
  contentHash: string;
  curator: string;
}

export interface LinkView {
  kind: string;
  value: string;
  identityBasis: IdentityBasis;
  basisNote: string | null;
}

export interface TraderSummary {
  id: string;
  displayName: string;
  markets: string[];
  participation: "confirmed_participating" | "public_source_only";
  attributionBasis: string;
  coverageLimits: string;
  ownerConfirmed: { by: string; at: string } | null;
  isDemo: boolean;
  ideaCount: number;
  latestSeq: string | null;
}

export interface IdeaSummary {
  id: string;
  title: string;
  assets: string[];
  market: string;
  /** Quoted from the original. Null means the idea states none. */
  statedConditions: string | null;
  trader: { id: string; displayName: string; isDemo: boolean };
  original: SourceView;
  eventCount: number;
  latestSeq: string;
  isDemo: boolean;
}

export interface EventView {
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
  plan: null | { known: boolean; creatorMatchesLinkedWallet: boolean | null };
}

export type RequestStatus =
  "pending_review" | "open" | "answered" | "closed_unresolved" | "rejected";

export interface PublicEvidenceRequest {
  id: string;
  question: string;
  status: "open" | "answered" | "closed_unresolved";
  approvedAt: string | null;
  aboutEventId: string | null;
  publishedEventId: string | null;
  responseEventIds: string[];
  note: string | null;
}

export interface IdeaDetail extends IdeaSummary {
  events: EventView[];
  evidenceRequests: PublicEvidenceRequest[];
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

export interface WatchTarget {
  type: "idea" | "trader";
  id: string;
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
  known: boolean;
  groups: ChangeGroup[];
  count: number;
  hasMore: boolean;
  latestSeq: string | null;
}

export interface ChangesResponse {
  items: TargetChanges[];
  coverage: { lastRecordedAt: string | null };
  asOf: string;
}

export interface PrivateSubmission {
  id: string;
  kind: "url" | "transaction";
  ref: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  reviewNote: string | null;
}

export interface PrivateRequest {
  id: string;
  ideaId: string;
  eventId: string | null;
  question: string;
  status: RequestStatus;
  createdAt: string;
  reviewNote: string | null;
  submissions: PrivateSubmission[];
}

// ------------------------------------------------------------------------------------- parsers

const BASES: readonly RelationshipBasis[] = [
  "original",
  "creator_confirmed",
  "editorially_associated",
  "uncertain",
];
const AVAILABILITY: readonly Availability[] = [
  "available",
  "unavailable",
  "removed",
  "unknown",
];
const REQUEST_STATUSES: readonly RequestStatus[] = [
  "pending_review",
  "open",
  "answered",
  "closed_unresolved",
  "rejected",
];

function choice<T extends string>(
  v: unknown,
  choices: readonly T[],
  path: string,
): T {
  const found = choices.find((c) => c === v);
  if (found === undefined)
    throw new ApiContractError(`${path} is not a value Relay knows`);
  return found;
}

function list(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new ApiContractError(`${path} must be a list`);
  return v;
}

function strings(v: unknown, path: string): string[] {
  return list(v, path).map((x, i) => str(x, `${path}[${i}]`));
}

function seq(v: unknown, path: string): string {
  const s = str(v, path);
  if (!/^\d{1,19}$/.test(s))
    throw new ApiContractError(`${path} must be an event sequence number`);
  return s;
}

function availability(v: unknown, path: string): SourceView["availability"] {
  const r = rec(v, path);
  return {
    state: choice(r.state, AVAILABILITY, `${path}.state`),
    observedAt: str(r.observedAt, `${path}.observedAt`),
    note: strOrNull(r.note, `${path}.note`),
  };
}

export function parseSource(v: unknown, path = "source"): SourceView {
  const r = rec(v, path);
  return {
    id: str(r.id, `${path}.id`),
    provider: str(r.provider, `${path}.provider`),
    url: str(r.url, `${path}.url`),
    recordType: str(r.recordType, `${path}.recordType`),
    publishedAt: strOrNull(r.publishedAt, `${path}.publishedAt`),
    retrievedAt: str(r.retrievedAt, `${path}.retrievedAt`),
    availability: availability(r.availability, `${path}.availability`),
    displayedContent: strOrNull(r.displayedContent, `${path}.displayedContent`),
    contentRemoved: bool(r.contentRemoved, `${path}.contentRemoved`),
    contentHash: str(r.contentHash, `${path}.contentHash`),
    curator: str(r.curator, `${path}.curator`),
  };
}

function parseRelationship(
  v: unknown,
  path: string,
): EventView["relationship"] {
  const r = rec(v, path);
  return {
    basis: choice(r.basis, BASES, `${path}.basis`),
    note: strOrNull(r.note, `${path}.note`),
  };
}

function parseEvidence(
  v: unknown,
  path: string,
): { kind: string; ref: string } | null {
  if (v === null || v === undefined) return null;
  const r = rec(v, path);
  return { kind: str(r.kind, `${path}.kind`), ref: str(r.ref, `${path}.ref`) };
}

export function parseTraderSummary(v: unknown, path = "trader"): TraderSummary {
  const r = rec(v, path);
  const confirmed =
    r.ownerConfirmed === null || r.ownerConfirmed === undefined
      ? null
      : rec(r.ownerConfirmed, `${path}.ownerConfirmed`);
  return {
    id: str(r.id, `${path}.id`),
    displayName: str(r.displayName, `${path}.displayName`),
    markets: strings(r.markets, `${path}.markets`),
    participation: choice(
      r.participation,
      ["confirmed_participating", "public_source_only"] as const,
      `${path}.participation`,
    ),
    attributionBasis: str(r.attributionBasis, `${path}.attributionBasis`),
    coverageLimits: str(r.coverageLimits, `${path}.coverageLimits`),
    ownerConfirmed: confirmed && {
      by: str(confirmed.by, `${path}.ownerConfirmed.by`),
      at: str(confirmed.at, `${path}.ownerConfirmed.at`),
    },
    isDemo: bool(r.isDemo, `${path}.isDemo`),
    ideaCount: num(r.ideaCount, `${path}.ideaCount`),
    latestSeq:
      r.latestSeq === null ? null : seq(r.latestSeq, `${path}.latestSeq`),
  };
}

export function parseIdeaSummary(v: unknown, path = "idea"): IdeaSummary {
  const r = rec(v, path);
  const trader = rec(r.trader, `${path}.trader`);
  return {
    id: str(r.id, `${path}.id`),
    title: str(r.title, `${path}.title`),
    assets: strings(r.assets, `${path}.assets`),
    market: str(r.market, `${path}.market`),
    statedConditions: strOrNull(r.statedConditions, `${path}.statedConditions`),
    trader: {
      id: str(trader.id, `${path}.trader.id`),
      displayName: str(trader.displayName, `${path}.trader.displayName`),
      isDemo: bool(trader.isDemo, `${path}.trader.isDemo`),
    },
    original: parseSource(r.original, `${path}.original`),
    eventCount: num(r.eventCount, `${path}.eventCount`),
    latestSeq: seq(r.latestSeq, `${path}.latestSeq`),
    isDemo: bool(r.isDemo, `${path}.isDemo`),
  };
}

export function parseEvent(v: unknown, path = "event"): EventView {
  const r = rec(v, path);
  const plan =
    r.plan === null || r.plan === undefined
      ? null
      : rec(r.plan, `${path}.plan`);
  return {
    seq: seq(r.seq, `${path}.seq`),
    id: str(r.id, `${path}.id`),
    type: str(r.type, `${path}.type`),
    occurredAt: strOrNull(r.occurredAt, `${path}.occurredAt`),
    recordedAt: str(r.recordedAt, `${path}.recordedAt`),
    source:
      r.source === null || r.source === undefined
        ? null
        : parseSource(r.source, `${path}.source`),
    evidence: parseEvidence(r.evidence, `${path}.evidence`),
    relationship: parseRelationship(r.relationship, `${path}.relationship`),
    reviewState: str(r.reviewState, `${path}.reviewState`),
    summary: str(r.summary, `${path}.summary`),
    hash: str(r.hash, `${path}.hash`),
    plan: plan && {
      known: bool(plan.known, `${path}.plan.known`),
      creatorMatchesLinkedWallet:
        plan.creatorMatchesLinkedWallet === null
          ? null
          : bool(
              plan.creatorMatchesLinkedWallet,
              `${path}.plan.creatorMatchesLinkedWallet`,
            ),
    },
  };
}

function parsePublicRequest(v: unknown, path: string): PublicEvidenceRequest {
  const r = rec(v, path);
  return {
    id: str(r.id, `${path}.id`),
    question: str(r.question, `${path}.question`),
    status: choice(
      r.status,
      ["open", "answered", "closed_unresolved"] as const,
      `${path}.status`,
    ),
    approvedAt: strOrNull(r.approvedAt, `${path}.approvedAt`),
    aboutEventId: strOrNull(r.aboutEventId, `${path}.aboutEventId`),
    publishedEventId: strOrNull(r.publishedEventId, `${path}.publishedEventId`),
    responseEventIds: strings(r.responseEventIds, `${path}.responseEventIds`),
    note: strOrNull(r.note, `${path}.note`),
  };
}

export function parseIdeaDetail(v: unknown): IdeaDetail {
  const r = rec(v, "idea");
  const chain = rec(r.chain, "idea.chain");
  return {
    ...parseIdeaSummary(r, "idea"),
    events: list(r.events, "idea.events").map((e, i) =>
      parseEvent(e, `idea.events[${i}]`),
    ),
    evidenceRequests: list(r.evidenceRequests, "idea.evidenceRequests").map(
      (e, i) => parsePublicRequest(e, `idea.evidenceRequests[${i}]`),
    ),
    chain: {
      verified: bool(chain.verified, "idea.chain.verified"),
      checkedEvents: num(chain.checkedEvents, "idea.chain.checkedEvents"),
    },
  };
}

function parseLink(v: unknown, path: string): LinkView {
  const r = rec(v, path);
  return {
    kind: str(r.kind, `${path}.kind`),
    value: str(r.value, `${path}.value`),
    identityBasis: choice(
      r.identityBasis,
      ["creator_confirmed", "editorially_associated", "uncertain"] as const,
      `${path}.identityBasis`,
    ),
    basisNote: strOrNull(r.basisNote, `${path}.basisNote`),
  };
}

export function parseTraderDetail(v: unknown): TraderDetail {
  const r = rec(v, "trader");
  return {
    ...parseTraderSummary(r, "trader"),
    links: list(r.links, "trader.links").map((l, i) =>
      parseLink(l, `trader.links[${i}]`),
    ),
    ideas: list(r.ideas, "trader.ideas").map((x, i) =>
      parseIdeaSummary(x, `trader.ideas[${i}]`),
    ),
  };
}

function parsePage<T>(
  v: unknown,
  path: string,
  item: (x: unknown, p: string) => T,
): Page<T> {
  const r = rec(v, path);
  return {
    items: list(r.items, `${path}.items`).map((x, i) =>
      item(x, `${path}.items[${i}]`),
    ),
    nextCursor: strOrNull(r.nextCursor, `${path}.nextCursor`),
  };
}

function parseChangeEvent(v: unknown, path: string): ChangeEvent {
  const r = rec(v, path);
  const source =
    r.source === null || r.source === undefined
      ? null
      : rec(r.source, `${path}.source`);
  return {
    seq: seq(r.seq, `${path}.seq`),
    id: str(r.id, `${path}.id`),
    type: str(r.type, `${path}.type`),
    occurredAt: strOrNull(r.occurredAt, `${path}.occurredAt`),
    recordedAt: str(r.recordedAt, `${path}.recordedAt`),
    summary: str(r.summary, `${path}.summary`),
    relationship: parseRelationship(r.relationship, `${path}.relationship`),
    reviewState: str(r.reviewState, `${path}.reviewState`),
    source: source && {
      id: str(source.id, `${path}.source.id`),
      url: str(source.url, `${path}.source.url`),
      availability: availability(
        source.availability,
        `${path}.source.availability`,
      ),
      publishedAt: strOrNull(source.publishedAt, `${path}.source.publishedAt`),
      retrievedAt: str(source.retrievedAt, `${path}.source.retrievedAt`),
    },
    evidence: parseEvidence(r.evidence, `${path}.evidence`),
  };
}

export function parseChanges(v: unknown): ChangesResponse {
  const r = rec(v, "changes");
  const coverage = rec(r.coverage, "changes.coverage");
  return {
    items: list(r.items, "changes.items").map((x, i): TargetChanges => {
      const t = rec(x, `changes.items[${i}]`);
      const target = rec(t.target, `changes.items[${i}].target`);
      return {
        target: {
          type: choice(
            target.type,
            ["idea", "trader"] as const,
            `changes.items[${i}].target.type`,
          ),
          id: str(target.id, `changes.items[${i}].target.id`),
          after: seq(target.after, `changes.items[${i}].target.after`),
        },
        known: bool(t.known, `changes.items[${i}].known`),
        groups: list(t.groups, `changes.items[${i}].groups`).map(
          (g, j): ChangeGroup => {
            const gr = rec(g, `changes.items[${i}].groups[${j}]`);
            const idea = rec(gr.idea, `changes.items[${i}].groups[${j}].idea`);
            return {
              idea: {
                id: str(idea.id, "idea.id"),
                title: str(idea.title, "idea.title"),
                assets: strings(idea.assets, "idea.assets"),
                traderId: str(idea.traderId, "idea.traderId"),
              },
              events: list(
                gr.events,
                `changes.items[${i}].groups[${j}].events`,
              ).map((e, k) =>
                parseChangeEvent(
                  e,
                  `changes.items[${i}].groups[${j}].events[${k}]`,
                ),
              ),
            };
          },
        ),
        count: num(t.count, `changes.items[${i}].count`),
        hasMore: bool(t.hasMore, `changes.items[${i}].hasMore`),
        latestSeq:
          t.latestSeq === null
            ? null
            : seq(t.latestSeq, `changes.items[${i}].latestSeq`),
      };
    }),
    coverage: {
      lastRecordedAt: strOrNull(
        coverage.lastRecordedAt,
        "changes.coverage.lastRecordedAt",
      ),
    },
    asOf: str(r.asOf, "changes.asOf"),
  };
}

function parsePrivateSubmission(v: unknown, path: string): PrivateSubmission {
  const r = rec(v, path);
  return {
    id: str(r.id, `${path}.id`),
    kind: choice(r.kind, ["url", "transaction"] as const, `${path}.kind`),
    ref: str(r.ref, `${path}.ref`),
    status: choice(
      r.status,
      ["pending", "accepted", "rejected"] as const,
      `${path}.status`,
    ),
    createdAt: str(r.createdAt, `${path}.createdAt`),
    reviewNote: strOrNull(r.reviewNote, `${path}.reviewNote`),
  };
}

export function parsePrivateRequest(
  v: unknown,
  path = "request",
): PrivateRequest {
  const r = rec(v, path);
  return {
    id: str(r.id, `${path}.id`),
    ideaId: str(r.ideaId, `${path}.ideaId`),
    eventId: strOrNull(r.eventId, `${path}.eventId`),
    question: str(r.question, `${path}.question`),
    status: choice(r.status, REQUEST_STATUSES, `${path}.status`),
    createdAt: str(r.createdAt, `${path}.createdAt`),
    reviewNote: strOrNull(r.reviewNote, `${path}.reviewNote`),
    submissions: list(r.submissions, `${path}.submissions`).map((s, i) =>
      parsePrivateSubmission(s, `${path}.submissions[${i}]`),
    ),
  };
}

// ------------------------------------------------------------------------------------ fetching

/** A thing the server says does not exist here (as opposed to the service being down). */
export class DiscoveryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscoveryNotFoundError";
  }
}

async function request(
  url: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<unknown> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(json === undefined ? {} : { "content-type": "application/json" }),
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch {
    throw new ApiUnavailableError("Relay's service did not respond");
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    if (res.ok)
      throw new ApiUnavailableError(
        "Relay's service sent an unreadable response",
      );
  }
  if (res.ok) return body;
  const err = isRec(body) && isRec(body.error) ? body.error : null;
  const message =
    err && typeof err.message === "string"
      ? err.message
      : `Request failed (${res.status})`;
  if (res.status === 404) throw new DiscoveryNotFoundError(message);
  if (res.status >= 500) throw new ApiUnavailableError(message);
  throw new ApiRequestError(
    res.status,
    err && typeof err.code === "string" ? err.code : "request_failed",
    message,
  );
}

const enc = encodeURIComponent;

export async function fetchTraders(
  base: string,
  cursor?: string | null,
): Promise<Page<TraderSummary>> {
  const qs = cursor ? `?cursor=${enc(cursor)}` : "";
  return parsePage(
    await request(`${base}/discovery/traders${qs}`),
    "traders",
    parseTraderSummary,
  );
}

export async function fetchTrader(
  base: string,
  id: string,
): Promise<TraderDetail> {
  return parseTraderDetail(
    await request(`${base}/discovery/traders/${enc(id)}`),
  );
}

export async function fetchIdeas(
  base: string,
  opts: { cursor?: string | null; trader?: string } = {},
): Promise<Page<IdeaSummary>> {
  const params = new URLSearchParams();
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.trader) params.set("trader", opts.trader);
  const qs = params.size > 0 ? `?${params}` : "";
  return parsePage(
    await request(`${base}/discovery/ideas${qs}`),
    "ideas",
    parseIdeaSummary,
  );
}

export async function fetchIdea(base: string, id: string): Promise<IdeaDetail> {
  return parseIdeaDetail(await request(`${base}/discovery/ideas/${enc(id)}`));
}

/** `watch=idea:<id>:<seq>` for each target. The server returns what is new after each seq. */
export function changesPath(targets: readonly WatchTarget[]): string {
  const params = new URLSearchParams();
  for (const t of targets)
    params.append("watch", `${t.type}:${t.id}:${t.after}`);
  const qs = params.toString();
  return `/discovery/changes${qs ? `?${qs}` : ""}`;
}

export async function fetchChanges(
  base: string,
  targets: readonly WatchTarget[],
): Promise<ChangesResponse> {
  return parseChanges(await request(`${base}${changesPath(targets)}`));
}

export async function askForEvidence(
  base: string,
  input: { ideaId: string; eventId?: string | null; question: string },
): Promise<{ request: PrivateRequest; created: boolean }> {
  const r = rec(
    await request(`${base}/discovery/evidence-requests`, {
      method: "POST",
      json: input.eventId
        ? input
        : { ideaId: input.ideaId, question: input.question },
    }),
    "response",
  );
  return {
    request: parsePrivateRequest(r.request, "response.request"),
    created: bool(r.created, "response.created"),
  };
}

export async function sendReference(
  base: string,
  requestId: string,
  input: { kind: "url" | "transaction"; ref: string; explanation: string },
): Promise<{ submission: PrivateSubmission; created: boolean }> {
  const r = rec(
    await request(
      `${base}/discovery/evidence-requests/${enc(requestId)}/submissions`,
      {
        method: "POST",
        json: input,
      },
    ),
    "response",
  );
  return {
    submission: parsePrivateSubmission(r.submission, "response.submission"),
    created: bool(r.created, "response.created"),
  };
}

export async function fetchMyRequests(base: string): Promise<PrivateRequest[]> {
  const r = rec(await request(`${base}/discovery/me/requests`), "response");
  return list(r.items, "response.items").map((x, i) =>
    parsePrivateRequest(x, `response.items[${i}]`),
  );
}

// -------------------------------------------------------------------------------------- labels

/**
 * What each kind of timeline event is called. The vocabulary follows the product brief: a
 * statement is not proof of a trade, and "verified" is reserved for facts Relay can establish.
 */
export const EVENT_LABEL: Record<string, { label: string; meaning: string }> = {
  source_added: {
    label: "Source added",
    meaning: "A public statement Relay captured. The link opens the original.",
  },
  update_published: {
    label: "Public statement",
    meaning:
      "A later public statement about this idea. A statement is not proof that a trade happened.",
  },
  evidence_added: {
    label: "Evidence added",
    meaning:
      "A reference Relay's curator linked. How it relates to the idea is stated below it.",
  },
  discrepancy_flagged: {
    label: "Discrepancy flagged",
    meaning: "Two things that do not match. It is flagged, not judged.",
  },
  evidence_requested: {
    label: "Evidence requested",
    meaning:
      "A reader asked a question about this idea. A question is not a finding.",
  },
  response_added: {
    label: "Response added",
    meaning:
      "A reference a reviewer published in answer. It does not say the claim is true or false.",
  },
  relay_plan_published: {
    label: "Published through Relay",
    meaning:
      "A plan the trader signed on Solana through Relay: the only kind that can be reviewed as a trade.",
  },
  onchain_activity: {
    label: "On-chain activity",
    meaning:
      "A transaction read from Solana. It is shown only when the link to the trader is stated.",
  },
  source_unavailable: {
    label: "Source unavailable",
    meaning:
      "A source Relay captured can no longer be opened. The record of it remains.",
  },
  correction: {
    label: "Correction",
    meaning:
      "Relay corrected something it recorded earlier. The earlier entry stays visible.",
  },
};

export function eventLabel(type: string): { label: string; meaning: string } {
  return (
    EVENT_LABEL[type] ?? {
      label: "Update",
      meaning: "An entry on this idea's timeline.",
    }
  );
}

export const RELATIONSHIP_LABEL: Record<RelationshipBasis, string> = {
  original: "Original statement",
  creator_confirmed: "Confirmed by the trader",
  editorially_associated: "Linked by Relay's curator",
  uncertain: "Link uncertain",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: "Source available when captured",
  unavailable: "Source unavailable",
  removed: "Removed by its author. The text is no longer shown",
  unknown: "Availability unknown",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending_review: "Waiting for a reviewer",
  open: "Open: a reviewer approved this question",
  answered: "A reviewer published a reference",
  closed_unresolved: "Closed without an answer",
  rejected: "Not accepted by a reviewer",
};

/** "10 Oct 2026, 09:30 UTC", always in UTC so it reads the same on every machine. Null is unknown. */
export function formatWhen(iso: string | null): string {
  if (iso === null) return "Unknown";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Unknown";
  return `${new Date(t).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

export const PROVIDER_LABEL: Record<string, string> = {
  x: "X",
  telegram: "Telegram",
  website: "Website",
  youtube: "YouTube",
  other: "Other",
};

export const PARTICIPATION_LABEL: Record<
  TraderSummary["participation"],
  string
> = {
  confirmed_participating: "Agreed to take part",
  public_source_only: "Public sources only. Not a partner or endorsement",
};

// -------------------------------------------------------------------------- form validation

/** The same limits the server enforces (server/src/discovery/evidence.ts), so a form can say so early. */
export const QUESTION_MIN = 10;
export const QUESTION_MAX = 280;
export const EXPLANATION_MIN = 10;
export const EXPLANATION_MAX = 500;
const LINK = /(https?:\/\/|www\.)/i;
const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

function controlCharacters(text: string): boolean {
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c <= 0x1f || (c >= 0x7f && c <= 0x9f) || c === 0x2028 || c === 0x2029)
      return true;
  }
  return false;
}

/** A problem with a question, in words, or null when it can be sent. */
export function questionProblem(question: string): string | null {
  const text = question.trim();
  const length = [...text].length;
  if (length < QUESTION_MIN)
    return `Write at least ${QUESTION_MIN} characters.`;
  if (length > QUESTION_MAX)
    return `Keep it to ${QUESTION_MAX} characters or fewer.`;
  if (controlCharacters(text))
    return "Write it on one line, without special characters.";
  if (LINK.test(text))
    return "Ask in words. You can add a link as a supporting reference once a reviewer opens the question.";
  return null;
}

export function referenceProblem(
  kind: "url" | "transaction",
  ref: string,
  explanation: string,
): string | null {
  const r = ref.trim();
  if (kind === "url") {
    let url: URL | null = null;
    try {
      url = new URL(r);
    } catch {
      url = null;
    }
    if (!url || url.protocol !== "https:")
      return "Use a full link that starts with https://.";
  } else if (!SIGNATURE.test(r)) {
    return "That is not a transaction signature.";
  }
  const e = explanation.trim();
  const length = [...e].length;
  if (length < EXPLANATION_MIN)
    return `Explain in at least ${EXPLANATION_MIN} characters what this shows.`;
  if (length > EXPLANATION_MAX)
    return `Keep the explanation to ${EXPLANATION_MAX} characters or fewer.`;
  if (controlCharacters(e))
    return "Write the explanation on one line, without special characters.";
  return null;
}

/** Only an https link is ever turned into a clickable link; anything else stays text. */
export function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
