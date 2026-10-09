import { concat, decodeAddress, i64le, sha256, u16le, u32le, u64le, u8, utf8 } from './bytes'
import { U64_MAX } from './price'

/**
 * Canonical, binary plan commitments. Two hashes:
 *
 *  content_hash  (offchain; the program stores the 32 bytes)
 *    SHA-256( "relay:plan-content:v1"
 *             || u32le(len) || rationale_utf8
 *             || u32le(len) || exit_thesis_utf8
 *             || u8(has_exit_target)  || u64le(exit_target)
 *             || u8(has_invalidation) || u64le(invalidation) )
 *
 *  terms_hash    (computed onchain by create_plan / revise_plan and recomputed here)
 *    SHA-256( "relay:plan-version:v1" || program_id || plan_pda || u16le(version)
 *             || creator || base_mint || quote_mint || u8(base_decimals) || u8(quote_decimals)
 *             || u64le(entry_low) || u64le(entry_high) || i64le(expires_at)
 *             || content_hash || prev_terms_hash )          // prev is 32 zero bytes for v1
 *
 * Binary, fixed-width, length-prefixed: no field-ordering, number-format or escaping ambiguity.
 * Prices are u64 quote atomic units per one whole base token. Times are unix SECONDS.
 */
export const CONTENT_TAG = 'relay:plan-content:v1'
export const TERMS_TAG = 'relay:plan-version:v1'

export const RATIONALE_MIN_CHARS = 10
export const RATIONALE_MAX_BYTES = 1000
export const EXIT_THESIS_MIN_CHARS = 10
export const EXIT_THESIS_MAX_BYTES = 500

export class ContentError extends RangeError {
  readonly field: string
  constructor(field: string, message: string) {
    super(message)
    this.name = 'ContentError'
    this.field = field
  }
}

export interface PlanContent {
  rationale: string
  exitThesis: string
  /** Quote atomic units per whole base token, or null when the creator gave none. */
  exitTarget: bigint | null
  /** Level at which the thesis is invalid, same unit, or null. */
  invalidation: bigint | null
}

/**
 * Canonicalize by REJECTING, never by transforming. Different runtimes (Bun/JavaScriptCore vs
 * browser/V8) may ship different Unicode data, so silently normalizing could yield different bytes.
 */
function checkText(field: string, s: unknown, minChars: number, maxBytes: number): string {
  if (typeof s !== 'string') throw new ContentError(field, 'Text is required')
  if (!s.isWellFormed()) throw new ContentError(field, 'Text contains invalid characters')
  if (s.includes('\u0000')) throw new ContentError(field, 'Text contains an invalid character')
  if (s !== s.trim()) throw new ContentError(field, 'Remove spaces at the start or end')
  if (s !== s.normalize('NFC')) throw new ContentError(field, 'Text must use composed (NFC) characters')
  if ([...s].length < minChars) throw new ContentError(field, `Write at least ${minChars} characters`)
  if (utf8(s).length > maxBytes) throw new ContentError(field, `Keep this under ${maxBytes} bytes`)
  return s
}

function checkPriceField(field: string, v: bigint | null): bigint | null {
  if (v === null) return null
  if (typeof v !== 'bigint' || v <= 0n || v > U64_MAX) throw new ContentError(field, 'Price must be a positive u64')
  return v
}

/** Validates and returns the content unchanged. Throws ContentError. */
export function validateContent(content: PlanContent): PlanContent {
  return {
    rationale: checkText('rationale', content.rationale, RATIONALE_MIN_CHARS, RATIONALE_MAX_BYTES),
    exitThesis: checkText('exitThesis', content.exitThesis, EXIT_THESIS_MIN_CHARS, EXIT_THESIS_MAX_BYTES),
    exitTarget: checkPriceField('exitTarget', content.exitTarget),
    invalidation: checkPriceField('invalidation', content.invalidation),
  }
}

export function contentPreimage(content: PlanContent): Uint8Array {
  const c = validateContent(content)
  const rationale = utf8(c.rationale)
  const exit = utf8(c.exitThesis)
  return concat([
    utf8(CONTENT_TAG),
    u32le(rationale.length),
    rationale,
    u32le(exit.length),
    exit,
    u8(c.exitTarget === null ? 0 : 1),
    u64le(c.exitTarget ?? 0n),
    u8(c.invalidation === null ? 0 : 1),
    u64le(c.invalidation ?? 0n),
  ])
}

export async function contentHash(content: PlanContent): Promise<Uint8Array> {
  return sha256(contentPreimage(content))
}

export const ZERO_HASH: Uint8Array = new Uint8Array(32)

export interface TermsInput {
  /** Base58 Relay program id. Included so a commitment can't be replayed against another deployment. */
  programId: string
  /** Base58 Plan PDA. */
  plan: string
  version: number
  creator: string
  baseMint: string
  quoteMint: string
  baseDecimals: number
  quoteDecimals: number
  entryLow: bigint
  entryHigh: bigint
  /** Unix seconds. */
  expiresAt: bigint
  contentHash: Uint8Array
  /** 32 zero bytes for version 1. */
  prevTermsHash: Uint8Array
}

export function termsPreimage(t: TermsInput): Uint8Array {
  if (t.contentHash.length !== 32 || t.prevTermsHash.length !== 32) throw new RangeError('Hashes must be 32 bytes')
  if (!Number.isInteger(t.version) || t.version < 1) throw new RangeError('Version must be >= 1')
  if (t.entryLow <= 0n || t.entryHigh < t.entryLow) throw new RangeError('Invalid entry bounds')
  return concat([
    utf8(TERMS_TAG),
    decodeAddress(t.programId),
    decodeAddress(t.plan),
    u16le(t.version),
    decodeAddress(t.creator),
    decodeAddress(t.baseMint),
    decodeAddress(t.quoteMint),
    u8(t.baseDecimals),
    u8(t.quoteDecimals),
    u64le(t.entryLow),
    u64le(t.entryHigh),
    i64le(t.expiresAt),
    t.contentHash,
    t.prevTermsHash,
  ])
}

export async function termsHash(t: TermsInput): Promise<Uint8Array> {
  return sha256(termsPreimage(t))
}
