import { pricePosition } from './price'

/**
 * Advisory entry status shown on the feed card. It is NOT enforced anywhere:
 * the binding check is finish_follow in the program. "In plan range" never means safe or profitable.
 *
 * Check order matters and is tested at every boundary:
 *   closed -> expired -> no/old price -> position of price relative to the range.
 */
export type EntryStatus =
  | 'in_range'
  | 'above_range' // UI: "Original entry passed"
  | 'below_range' // UI: "Below plan range"
  | 'expired'
  | 'closed'
  | 'price_stale'
  | 'price_unavailable'

export interface EntryPlanTerms {
  status: 'open' | 'closed'
  entryLow: bigint
  entryHigh: bigint
  /** Unix seconds (chain clock). */
  expiresAt: bigint
}

export interface ReferencePrice {
  /** Quote atomic units per whole base token (see price.ts). */
  units: bigint
  observedAtMs: number
}

export interface EntryStatusInput {
  plan: EntryPlanTerms
  price: ReferencePrice | null
  /** "Now" in ms. In demo mode this must come from the chain clock, not the server wall clock. */
  nowMs: number
  staleAfterMs?: number
  closingSoonMs?: number
}

export interface EntryStatusResult {
  status: EntryStatus
  /** True while open, not expired, and within closingSoonMs of expiry (any price state). */
  closingSoon: boolean
  msUntilExpiry: number
}

export const DEFAULT_STALE_AFTER_MS = 60_000
export const DEFAULT_CLOSING_SOON_MS = 600_000

export function entryStatus(input: EntryStatusInput): EntryStatusResult {
  const { plan, price, nowMs } = input
  const staleAfterMs = input.staleAfterMs ?? DEFAULT_STALE_AFTER_MS
  const closingSoonMs = input.closingSoonMs ?? DEFAULT_CLOSING_SOON_MS
  if (!Number.isFinite(nowMs)) throw new RangeError('nowMs must be finite')

  const expiresMs = Number(plan.expiresAt) * 1000
  const msUntilExpiry = expiresMs - nowMs
  const expired = nowMs >= expiresMs // the exact boundary counts as expired, like the program
  const closingSoon = plan.status === 'open' && !expired && msUntilExpiry <= closingSoonMs
  const result = (status: EntryStatus): EntryStatusResult => ({ status, closingSoon, msUntilExpiry })

  if (plan.status === 'closed') return result('closed')
  if (expired) return result('expired')
  if (!price) return result('price_unavailable')
  // A price from the future can't be trusted at all.
  if (price.observedAtMs > nowMs) return result('price_unavailable')
  if (nowMs - price.observedAtMs > staleAfterMs) return result('price_stale') // exactly stale-after is still fresh
  return result(pricePosition(price.units, plan.entryLow, plan.entryHigh))
}
