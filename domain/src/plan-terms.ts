import { findPair, type Pair } from './assets'
import { parsePrice } from './price'

/** Limits that the Anchor program enforces too (constants.rs). Keep both in sync. */
export const MIN_WINDOW_SEC = 60
export const MAX_WINDOW_SEC = 7 * 24 * 60 * 60
export const MAX_VERSIONS = 16

export class TermsError extends RangeError {
  readonly field: string
  constructor(field: string, message: string) {
    super(message)
    this.name = 'TermsError'
    this.field = field
  }
}

export interface PlanTermsInput {
  pairId: unknown
  /** Decimal strings, e.g. "180.00". */
  entryLow: unknown
  entryHigh: unknown
  /** Unix seconds. */
  expiresAtSec: unknown
  /** Chain "now" in unix seconds (not the wall clock in demo mode). */
  nowSec: number
}

export interface PlanTerms {
  pair: Pair
  entryLow: bigint
  entryHigh: bigint
  expiresAt: bigint
}

/** Validates user-supplied terms into integers. Throws TermsError with the offending field. */
export function validateTerms(input: PlanTermsInput): PlanTerms {
  const pair = typeof input.pairId === 'string' ? findPair(input.pairId) : undefined
  if (!pair) throw new TermsError('pairId', 'Choose a supported pair')

  const parse = (field: string, v: unknown): bigint => {
    // Strings only: a JS number like 155 would already have lost its decimal text.
    if (typeof v !== 'string') throw new TermsError(field, 'Enter a price')
    try {
      return parsePrice(v, pair.quote.decimals)
    } catch (e) {
      throw new TermsError(field, e instanceof Error ? e.message : 'Invalid price')
    }
  }
  const entryLow = parse('entryLow', input.entryLow)
  const entryHigh = parse('entryHigh', input.entryHigh)
  if (entryLow > entryHigh) throw new TermsError('entryHigh', 'The top of the range must be at or above the bottom')

  const exp = input.expiresAtSec
  if (typeof exp !== 'number' || !Number.isSafeInteger(exp)) throw new TermsError('expiresAt', 'Choose when the window closes')
  if (exp < input.nowSec + MIN_WINDOW_SEC) throw new TermsError('expiresAt', 'The window must stay open at least 1 minute')
  if (exp > input.nowSec + MAX_WINDOW_SEC) throw new TermsError('expiresAt', 'The window can stay open at most 7 days')

  return { pair, entryLow, entryHigh, expiresAt: BigInt(exp) }
}
