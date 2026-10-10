import { sha256, utf8 } from "@relay/domain";
import type { TransactionSQL } from "bun";
import type { Db } from "../db";
import type { Env } from "../env";
import { ApiError } from "../middleware";
import { isRecord } from "../util";
import { DISCOVERY_WRITE_LOCK, insertEvent } from "./apply";
import { parsePublicUrl, parseText } from "./curation";

/**
 * Evidence requests: a reader asks a narrow question about an idea, anyone may submit a supporting
 * reference, and a reviewer at Relay decides what becomes part of the public timeline.
 *
 * What this is NOT: a judge of truth. Nothing certifies that a claim is true or false. A reviewer
 * adds a plain event, written by the reviewer, that points at the reference, and the timeline says
 * who reviewed it and how the reference relates to the idea.
 *
 *   - A visitor is an anonymous browser session: a random token held in a cookie, stored only as its
 *     SHA-256. It does NOT identify a person and does not stop one person opening many.
 *   - A request is private until a reviewer approves it; a submission is private until accepted, and
 *     then only the reviewer's summary and the validated link are public. The submitter's own words
 *     are shown to reviewers only.
 *   - Submitted links are validated and stored. The server never fetches them.
 *   - There is no public route that reviews anything: review is an internal command that needs
 *     database access (scripts/review.ts), so no caller can approve their own submission.
 */

export const REQUEST_STATUSES = [
  "pending_review",
  "open",
  "answered",
  "closed_unresolved",
  "rejected",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Limits per anonymous session, so one browser cannot flood the reviewers. */
export const LIMITS = {
  requestsPerDay: 5,
  submissionsPerDay: 10,
  submissionsPerRequest: 3,
  /** Open work waiting for review on one idea, across all visitors. */
  pendingPerIdea: 25,
  pendingSubmissionsPerRequest: 25,
} as const;

const SESSION_DAYS = 30;
const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;
const ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const REQUEST_ID = /^er_[a-z0-9]{16}$/;
const SUBMISSION_ID = /^es_[a-z0-9]{16}$/;
const LINK = /(https?:\/\/|www\.)/i;

type Row = Record<string, unknown>;
const rows = (result: unknown[]): Row[] => result.filter(isRecord);
const str = (r: Row, k: string): string => {
  const v = r[k];
  if (typeof v !== "string") throw new Error(`column ${k} is not text`);
  return v;
};
const strOrNull = (r: Row, k: string): string | null => {
  const v = r[k];
  return typeof v === "string" ? v : null;
};
const iso = (r: Row, k: string): string | null => {
  const v = r[k];
  return v instanceof Date ? v.toISOString() : null;
};
const count = (r: Row, k: string): number => {
  const v = r[k];
  return typeof v === "number"
    ? v
    : typeof v === "string" || typeof v === "bigint"
      ? Number(v)
      : 0;
};

/** A random id like `er_k3j9x0a1b2c3d4e5`. 16 characters from [a-z0-9] is about 82 bits. */
export function newId(prefix: "er" | "es"): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}_${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** A session token is 32 random bytes in base64url; only its SHA-256 is stored. */
export function newSessionToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "base64url",
  );
}

export async function hashToken(token: string): Promise<Uint8Array> {
  return sha256(utf8(`relay:visitor-session:v1:${token}`));
}

/** The question with case and whitespace folded, so "Is  this real?" and "is this real?" match. */
export async function questionKey(question: string): Promise<Uint8Array> {
  return sha256(
    utf8(
      `relay:evidence-question:v1:${question.toLowerCase().replace(/\s+/g, " ")}`,
    ),
  );
}

function problem(code: string, problems: string[]): never {
  throw new ApiError(400, code, problems.join("; "));
}

/** Text from a visitor: plain, one line, bounded. Throws a 400 listing what is wrong. */
function visitorText(
  value: unknown,
  label: string,
  min: number,
  max: number,
): string {
  const problems: string[] = [];
  const text = parseText(value, label, max, problems);
  if (problems.length === 0 && [...text].length < min)
    problems.push(`${label} must be at least ${min} characters`);
  if (problems.length > 0) problem("invalid_text", problems);
  return text;
}

// ===================================================================================== public

export interface EvidenceDeps {
  env: Env;
  db: Db;
}

export interface Visitor {
  tokenHash: Uint8Array;
  /** Set when a new session was just created: the route puts it in the cookie. */
  newToken: string | null;
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

export function createEvidenceService({ env, db }: EvidenceDeps) {
  const demo = env.demoMode;

  /** The visitor behind a cookie token, or a brand new one. Never throws for a bad token. */
  async function visitorFor(
    token: string | undefined,
    create: boolean,
  ): Promise<Visitor | null> {
    if (
      token &&
      token.length >= 20 &&
      token.length <= 100 &&
      /^[A-Za-z0-9_-]+$/.test(token)
    ) {
      const tokenHash = await hashToken(token);
      const found = rows(
        await db`update visitor_sessions set last_seen_at = now()
                 where token_hash = ${Buffer.from(tokenHash)} and expires_at > now() returning token_hash`,
      );
      if (found.length > 0) return { tokenHash, newToken: null };
    }
    if (!create) return null;
    const fresh = newSessionToken();
    const tokenHash = await hashToken(fresh);
    await db`insert into visitor_sessions (token_hash, expires_at)
             values (${Buffer.from(tokenHash)}, now() + ${`${SESSION_DAYS} days`}::interval)`;
    return { tokenHash, newToken: fresh };
  }

  async function createRequest(
    visitor: Visitor,
    input: unknown,
  ): Promise<{ request: PrivateRequest; created: boolean }> {
    if (!isRecord(input))
      throw new ApiError(400, "invalid_body", "Body must be an object");
    const ideaId = typeof input.ideaId === "string" ? input.ideaId : "";
    if (!ID.test(ideaId))
      throw new ApiError(400, "invalid_idea", "That is not an idea id");
    const eventId =
      input.eventId === undefined || input.eventId === null
        ? null
        : typeof input.eventId === "string" && ID.test(input.eventId)
          ? input.eventId
          : (() => {
              throw new ApiError(
                400,
                "invalid_event",
                "That is not an event id",
              );
            })();
    const question = visitorText(input.question, "question", 10, 280);
    if (LINK.test(question))
      throw new ApiError(
        400,
        "link_in_question",
        "Ask the question in words. Add a link as a supporting reference after a reviewer opens the request.",
      );

    const idea = rows(
      await db`select id from ideas where id = ${ideaId} and is_demo = ${demo}`,
    )[0];
    if (!idea) throw new ApiError(404, "idea_not_found", "No such idea");
    if (eventId !== null) {
      const event = rows(
        await db`select 1 as found from timeline_events where id = ${eventId} and idea_id = ${ideaId}`,
      )[0];
      if (!event)
        throw new ApiError(
          404,
          "event_not_found",
          "That event is not part of this idea",
        );
    }

    const key = Buffer.from(await questionKey(question));
    const hash = Buffer.from(visitor.tokenHash);
    // The same visitor asking the same thing again gets the same request back, not a second one.
    const existing = rows(
      await db`select * from evidence_requests where idea_id = ${ideaId} and session_hash = ${hash} and question_key = ${key}`,
    )[0];
    if (existing)
      return { request: await privateRequest(existing), created: false };

    const today = rows(
      await db`select count(*) as n from evidence_requests
               where session_hash = ${hash} and created_at > now() - interval '24 hours'`,
    )[0];
    if (today && count(today, "n") >= LIMITS.requestsPerDay)
      throw new ApiError(
        429,
        "too_many_requests",
        "You have asked enough questions for today. Try again tomorrow.",
      );
    const queue = rows(
      await db`select count(*) as n from evidence_requests where idea_id = ${ideaId} and status = 'pending_review'`,
    )[0];
    if (queue && count(queue, "n") >= LIMITS.pendingPerIdea)
      throw new ApiError(
        429,
        "review_queue_full",
        "This idea has many questions waiting for review. Try again later.",
      );

    const id = newId("er");
    await db`insert into evidence_requests (id, idea_id, event_id, question, question_key, session_hash)
             values (${id}, ${ideaId}, ${eventId}, ${question}, ${key}, ${hash})`;
    const row = rows(
      await db`select * from evidence_requests where id = ${id}`,
    )[0];
    if (!row) throw new Error("request vanished");
    return { request: await privateRequest(row), created: true };
  }

  async function createSubmission(
    visitor: Visitor,
    requestId: string,
    input: unknown,
  ): Promise<{ submission: PrivateSubmission; created: boolean }> {
    if (!REQUEST_ID.test(requestId))
      throw new ApiError(400, "invalid_request", "That is not a request id");
    if (!isRecord(input))
      throw new ApiError(400, "invalid_body", "Body must be an object");
    const kind =
      input.kind === "url" || input.kind === "transaction" ? input.kind : null;
    if (kind === null)
      throw new ApiError(
        400,
        "invalid_kind",
        'kind must be "url" or "transaction"',
      );
    const refProblems: string[] = [];
    let ref: string;
    if (kind === "url") ref = parsePublicUrl(input.ref, "ref", refProblems);
    else {
      ref = typeof input.ref === "string" ? input.ref : "";
      if (!SIGNATURE.test(ref))
        refProblems.push("ref must be a transaction signature");
    }
    if (refProblems.length > 0) problem("invalid_reference", refProblems);
    const explanation = visitorText(input.explanation, "explanation", 10, 500);

    // Only a request a reviewer has opened takes submissions.
    const request = rows(
      await db`select r.id, r.status from evidence_requests r join ideas i on i.id = r.idea_id
               where r.id = ${requestId} and i.is_demo = ${demo}`,
    )[0];
    if (!request)
      throw new ApiError(404, "request_not_found", "No such request");
    if (request.status !== "open" && request.status !== "answered")
      throw new ApiError(
        409,
        "request_not_open",
        "This request is not open for supporting references",
      );

    const hash = Buffer.from(visitor.tokenHash);
    const dup = rows(
      await db`select * from evidence_submissions where request_id = ${requestId} and session_hash = ${hash} and ref = ${ref}`,
    )[0];
    if (dup) return { submission: privateSubmission(dup), created: false };

    const mine = rows(
      await db`select count(*) as n from evidence_submissions where request_id = ${requestId} and session_hash = ${hash}`,
    )[0];
    if (mine && count(mine, "n") >= LIMITS.submissionsPerRequest)
      throw new ApiError(
        429,
        "too_many_submissions",
        "You have sent enough references for this request.",
      );
    const today = rows(
      await db`select count(*) as n from evidence_submissions
               where session_hash = ${hash} and created_at > now() - interval '24 hours'`,
    )[0];
    if (today && count(today, "n") >= LIMITS.submissionsPerDay)
      throw new ApiError(
        429,
        "too_many_requests",
        "You have sent enough references for today. Try again tomorrow.",
      );
    const waiting = rows(
      await db`select count(*) as n from evidence_submissions where request_id = ${requestId} and status = 'pending'`,
    )[0];
    if (waiting && count(waiting, "n") >= LIMITS.pendingSubmissionsPerRequest)
      throw new ApiError(
        429,
        "review_queue_full",
        "This request has many references waiting for review.",
      );

    const id = newId("es");
    await db`insert into evidence_submissions (id, request_id, kind, ref, explanation, session_hash)
             values (${id}, ${requestId}, ${kind}, ${ref}, ${explanation}, ${hash})`;
    const row = rows(
      await db`select * from evidence_submissions where id = ${id}`,
    )[0];
    if (!row) throw new Error("submission vanished");
    return { submission: privateSubmission(row), created: true };
  }

  function privateSubmission(r: Row): PrivateSubmission {
    const kind = str(r, "kind");
    const status = str(r, "status");
    return {
      id: str(r, "id"),
      kind: kind === "transaction" ? "transaction" : "url",
      ref: str(r, "ref"),
      status:
        status === "accepted"
          ? "accepted"
          : status === "rejected"
            ? "rejected"
            : "pending",
      createdAt: iso(r, "created_at") ?? "",
      reviewNote: strOrNull(r, "review_note"),
    };
  }

  async function privateRequest(r: Row): Promise<PrivateRequest> {
    const status =
      REQUEST_STATUSES.find((s) => s === r.status) ?? "pending_review";
    const submissions = rows(
      await db`select * from evidence_submissions where request_id = ${str(r, "id")} and session_hash = ${r.session_hash instanceof Uint8Array ? Buffer.from(r.session_hash) : Buffer.alloc(0)} order by created_at`,
    ).map(privateSubmission);
    return {
      id: str(r, "id"),
      ideaId: str(r, "idea_id"),
      eventId: strOrNull(r, "event_id"),
      question: str(r, "question"),
      status,
      createdAt: iso(r, "created_at") ?? "",
      reviewNote: strOrNull(r, "review_note"),
      submissions,
    };
  }

  /** The visitor's own requests, with the state of each. Nobody else's. */
  async function myRequests(visitor: Visitor): Promise<PrivateRequest[]> {
    const found = rows(
      await db`select r.* from evidence_requests r join ideas i on i.id = r.idea_id
               where r.session_hash = ${Buffer.from(visitor.tokenHash)} and i.is_demo = ${demo}
               order by r.created_at desc limit 50`,
    );
    return Promise.all(found.map(privateRequest));
  }

  return { visitorFor, createRequest, createSubmission, myRequests };
}

export type EvidenceService = ReturnType<typeof createEvidenceService>;

// ===================================================================================== review

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

const BASES = [
  "creator_confirmed",
  "editorially_associated",
  "uncertain",
] as const;
export type ReviewBasis = (typeof BASES)[number];

function reviewerName(name: string): string {
  const problems: string[] = [];
  const clean = parseText(name, "reviewer", 80, problems);
  if (problems.length > 0) throw new ReviewError(problems.join("; "));
  return clean;
}

function reviewText(value: string, label: string, max: number): string {
  const problems: string[] = [];
  const clean = parseText(value, label, max, problems);
  if (problems.length > 0) throw new ReviewError(problems.join("; "));
  return clean;
}

export interface PendingWork {
  requests: {
    id: string;
    ideaId: string;
    ideaTitle: string;
    question: string;
    createdAt: string;
  }[];
  submissions: {
    id: string;
    requestId: string;
    question: string;
    kind: string;
    ref: string;
    explanation: string;
    createdAt: string;
  }[];
}

/**
 * What the reviewer commands do. Every function runs in one transaction under the same lock the
 * curation loader takes, so the timeline's `seq` order and hash chain stay consistent. Nothing
 * here is reachable over HTTP.
 */
export function createReviewService({ db }: { db: Db }) {
  async function withLock<T>(
    run: (tx: TransactionSQL) => Promise<T>,
  ): Promise<T> {
    return db.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${DISCOVERY_WRITE_LOCK})`;
      return run(tx);
    });
  }

  async function pending(): Promise<PendingWork> {
    const requests = rows(
      await db`select r.id, r.idea_id, r.question, r.created_at, i.title from evidence_requests r
               join ideas i on i.id = r.idea_id where r.status = 'pending_review' order by r.created_at`,
    ).map((r) => ({
      id: str(r, "id"),
      ideaId: str(r, "idea_id"),
      ideaTitle: str(r, "title"),
      question: str(r, "question"),
      createdAt: iso(r, "created_at") ?? "",
    }));
    const submissions = rows(
      await db`select s.id, s.request_id, s.kind, s.ref, s.explanation, s.created_at, r.question
               from evidence_submissions s join evidence_requests r on r.id = s.request_id
               where s.status = 'pending' and r.status in ('open', 'answered') order by s.created_at`,
    ).map((r) => ({
      id: str(r, "id"),
      requestId: str(r, "request_id"),
      question: str(r, "question"),
      kind: str(r, "kind"),
      ref: str(r, "ref"),
      explanation: str(r, "explanation"),
      createdAt: iso(r, "created_at") ?? "",
    }));
    return { requests, submissions };
  }

  async function requestRow(tx: TransactionSQL, id: string): Promise<Row> {
    if (!REQUEST_ID.test(id))
      throw new ReviewError(`"${id}" is not a request id`);
    const r = rows(
      await tx`select r.*, i.is_demo as idea_demo from evidence_requests r join ideas i on i.id = r.idea_id where r.id = ${id} for update of r`,
    )[0];
    if (!r) throw new ReviewError(`No request ${id}`);
    return r;
  }

  /** Makes a request public as an "Evidence requested" event and opens it for supporting references. */
  async function approveRequest(
    id: string,
    reviewer: string,
    now: Date = new Date(),
  ) {
    const by = reviewerName(reviewer);
    return withLock(async (tx) => {
      const r = await requestRow(tx, id);
      if (r.status !== "pending_review")
        throw new ReviewError(
          `Request ${id} is ${String(r.status)}, not pending_review`,
        );
      const eventId = `req-${id}`;
      await insertEvent(
        tx,
        str(r, "idea_id"),
        {
          id: eventId,
          type: "evidence_requested",
          occurredAt: now,
          sourceId: null,
          evidenceKind: null,
          evidenceRef: null,
          basis: "editorially_associated",
          basisNote: `Asked by a reader; reviewed by ${by}. A question, not a finding.`,
          reviewState: "reviewed",
          summary: str(r, "question"),
          dedupe: `request:${id}`,
        },
        r.idea_demo === true,
        by,
        now,
      );
      await tx`update evidence_requests set status = 'open', reviewed_by = ${by}, reviewed_at = ${now},
               published_event_id = ${eventId} where id = ${id}`;
      return { requestId: id, eventId };
    });
  }

  async function rejectRequest(
    id: string,
    reviewer: string,
    note: string,
    now: Date = new Date(),
  ) {
    const by = reviewerName(reviewer);
    const why = reviewText(note, "note", 300);
    await withLock(async (tx) => {
      const r = await requestRow(tx, id);
      if (r.status !== "pending_review")
        throw new ReviewError(
          `Request ${id} is ${String(r.status)}, not pending_review`,
        );
      await tx`update evidence_requests set status = 'rejected', review_note = ${why}, reviewed_by = ${by},
               reviewed_at = ${now} where id = ${id}`;
    });
  }

  /** Ends a request with no accepted answer, and says so. No verdict about the claim itself. */
  async function closeRequest(
    id: string,
    reviewer: string,
    note: string,
    now: Date = new Date(),
  ) {
    const by = reviewerName(reviewer);
    const why = reviewText(note, "note", 300);
    await withLock(async (tx) => {
      const r = await requestRow(tx, id);
      if (r.status !== "open")
        throw new ReviewError(`Request ${id} is ${String(r.status)}, not open`);
      await tx`update evidence_requests set status = 'closed_unresolved', review_note = ${why},
               reviewed_by = ${by}, reviewed_at = ${now} where id = ${id}`;
    });
  }

  async function submissionRow(tx: TransactionSQL, id: string): Promise<Row> {
    if (!SUBMISSION_ID.test(id))
      throw new ReviewError(`"${id}" is not a submission id`);
    const s = rows(
      await tx`select * from evidence_submissions where id = ${id} for update`,
    )[0];
    if (!s) throw new ReviewError(`No submission ${id}`);
    return s;
  }

  /**
   * Publishes a submission as a "Response added" event. The words are the reviewer's own summary;
   * the submitter's explanation stays private. `basis` says how the reference relates to the idea.
   */
  async function acceptSubmission(
    id: string,
    reviewer: string,
    input: { summary: string; basis: ReviewBasis; basisNote: string | null },
    now: Date = new Date(),
  ) {
    const by = reviewerName(reviewer);
    const summary = reviewText(input.summary, "summary", 280);
    if (!BASES.includes(input.basis))
      throw new ReviewError(`basis must be one of ${BASES.join(", ")}`);
    const note =
      input.basisNote === null
        ? null
        : reviewText(input.basisNote, "basis note", 300);
    if (input.basis !== "creator_confirmed" && note === null)
      throw new ReviewError(
        "A note is required unless the basis is creator_confirmed",
      );
    return withLock(async (tx) => {
      const s = await submissionRow(tx, id);
      if (s.status !== "pending")
        throw new ReviewError(
          `Submission ${id} is ${String(s.status)}, not pending`,
        );
      const r = await requestRow(tx, str(s, "request_id"));
      if (r.status !== "open" && r.status !== "answered")
        throw new ReviewError(
          `Request ${str(r, "id")} is ${String(r.status)}, not open`,
        );
      const eventId = `res-${id}`;
      await insertEvent(
        tx,
        str(r, "idea_id"),
        {
          id: eventId,
          type: "response_added",
          occurredAt: now,
          sourceId: null,
          evidenceKind: str(s, "kind"),
          evidenceRef: str(s, "ref"),
          basis: input.basis,
          basisNote: note,
          reviewState: "reviewed",
          summary,
          dedupe: `submission:${id}`,
        },
        r.idea_demo === true,
        by,
        now,
      );
      await tx`update evidence_submissions set status = 'accepted', reviewed_by = ${by}, reviewed_at = ${now},
               response_event_id = ${eventId} where id = ${id}`;
      await tx`update evidence_requests set status = 'answered' where id = ${str(r, "id")}`;
      return { submissionId: id, eventId };
    });
  }

  async function rejectSubmission(
    id: string,
    reviewer: string,
    note: string,
    now: Date = new Date(),
  ) {
    const by = reviewerName(reviewer);
    const why = reviewText(note, "note", 300);
    await withLock(async (tx) => {
      const s = await submissionRow(tx, id);
      if (s.status !== "pending")
        throw new ReviewError(
          `Submission ${id} is ${String(s.status)}, not pending`,
        );
      await tx`update evidence_submissions set status = 'rejected', review_note = ${why}, reviewed_by = ${by},
               reviewed_at = ${now} where id = ${id}`;
    });
  }

  return {
    pending,
    approveRequest,
    rejectRequest,
    closeRequest,
    acceptSubmission,
    rejectSubmission,
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
