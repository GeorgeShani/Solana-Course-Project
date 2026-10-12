import { concat, sha256, u32le, utf8 } from "@relay/domain";

/**
 * Tamper evidence for the discovery tables. Each preimage is a fixed domain tag followed by
 * length-prefixed UTF-8 fields (no JSON, so key order and number formatting cannot differ).
 *
 * Honest limit: this makes a partial edit of the stored history DETECTABLE (a changed field or a
 * removed middle event breaks the chain). It does not stop whoever runs the database from
 * rewriting every hash, and it does not prove a source existed before Relay captured it.
 */

const field = (value: string | null): Uint8Array => {
  const bytes = utf8(value ?? "");
  return concat([u32le(bytes.length), bytes]);
};

/** Times are hashed as UTC ISO strings with milliseconds, or as the empty string when unknown. */
const time = (value: Date | null): string | null =>
  value === null ? null : value.toISOString();

export interface SourceHashInput {
  url: string;
  publishedAt: Date | null;
  retrievedAt: Date;
  displayedContent: string | null;
}

export function sourcePreimage(s: SourceHashInput): Uint8Array {
  return concat([
    utf8("relay:source-record:v1"),
    field(s.url),
    field(time(s.publishedAt)),
    field(time(s.retrievedAt)),
    field(s.displayedContent),
  ]);
}

export const sourceHash = (s: SourceHashInput) => sha256(sourcePreimage(s));

export interface EventHashInput {
  ideaId: string;
  id: string;
  type: string;
  occurredAt: Date | null;
  sourceRecordId: string | null;
  evidenceKind: string | null;
  evidenceRef: string | null;
  relationshipBasis: string;
  basisNote: string | null;
  revision: number;
  reviewState: string;
  summary: string;
  /** The previous event of the same idea, or null for the first. */
  prevHash: Uint8Array | null;
}

export function eventPreimage(e: EventHashInput): Uint8Array {
  return concat([
    utf8("relay:timeline-event:v1"),
    field(e.ideaId),
    field(e.id),
    field(e.type),
    field(time(e.occurredAt)),
    field(e.sourceRecordId),
    field(e.evidenceKind),
    field(e.evidenceRef),
    field(e.relationshipBasis),
    field(e.basisNote),
    field(String(e.revision)),
    field(e.reviewState),
    field(e.summary),
    e.prevHash ?? new Uint8Array(32),
  ]);
}

export const eventHash = (e: EventHashInput) => sha256(eventPreimage(e));
