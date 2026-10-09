import { describe, expect, it } from 'bun:test'
import { entryStatus, type EntryPlanTerms, type ReferencePrice } from '../src/index'

const NOW = 1_790_000_000_000 // ms
const plan = (over: Partial<EntryPlanTerms> = {}): EntryPlanTerms => ({
  status: 'open',
  entryLow: 180_000_000n,
  entryHigh: 185_000_000n,
  expiresAt: BigInt(NOW / 1000 + 3600), // one hour from now
  ...over,
})
const price = (units: bigint, ageMs = 1000): ReferencePrice => ({ units, observedAtMs: NOW - ageMs })
const status = (p: EntryPlanTerms, pr: ReferencePrice | null, nowMs = NOW) => entryStatus({ plan: p, price: pr, nowMs }).status

describe('entryStatus', () => {
  it('classifies the price against the range, inclusive at both bounds', () => {
    expect(status(plan(), price(183_200_000n))).toBe('in_range')
    expect(status(plan(), price(180_000_000n))).toBe('in_range')
    expect(status(plan(), price(185_000_000n))).toBe('in_range')
    expect(status(plan(), price(185_000_001n))).toBe('above_range')
    expect(status(plan(), price(179_999_999n))).toBe('below_range')
  })

  it('treats the exact expiry instant as expired', () => {
    const p = plan()
    const expiresMs = Number(p.expiresAt) * 1000
    const fresh = (at: number): ReferencePrice => ({ units: 183_000_000n, observedAtMs: at - 1000 })
    expect(status(p, fresh(expiresMs - 1), expiresMs - 1)).toBe('in_range')
    expect(status(p, fresh(expiresMs), expiresMs)).toBe('expired')
    expect(status(p, fresh(expiresMs + 1), expiresMs + 1)).toBe('expired')
  })

  it('closed wins over expired, expired wins over price state', () => {
    const past = plan({ expiresAt: BigInt(NOW / 1000 - 10) })
    expect(status(past, price(183_000_000n))).toBe('expired')
    expect(status({ ...past, status: 'closed' }, price(183_000_000n))).toBe('closed')
    expect(status(plan({ status: 'closed' }), null)).toBe('closed')
    expect(status(past, null)).toBe('expired')
  })

  it('reports missing, stale and future-dated prices instead of a range position', () => {
    expect(status(plan(), null)).toBe('price_unavailable')
    expect(status(plan(), price(183_000_000n, 60_000))).toBe('in_range') // exactly 60s old is still fresh
    expect(status(plan(), price(183_000_000n, 60_001))).toBe('price_stale')
    expect(status(plan(), { units: 183_000_000n, observedAtMs: NOW + 1 })).toBe('price_unavailable')
    // A stale price never reports a range position, even one far outside the range.
    expect(status(plan(), price(999_000_000n, 120_000))).toBe('price_stale')
  })

  it('flags closing soon only while open and not expired', () => {
    const near = plan({ expiresAt: BigInt(NOW / 1000 + 600) })
    expect(entryStatus({ plan: near, price: price(183_000_000n), nowMs: NOW }).closingSoon).toBe(true) // exactly 10 min
    const far = plan({ expiresAt: BigInt(NOW / 1000 + 601) })
    expect(entryStatus({ plan: far, price: price(183_000_000n), nowMs: NOW }).closingSoon).toBe(false)
    const expired = plan({ expiresAt: BigInt(NOW / 1000) })
    expect(entryStatus({ plan: expired, price: null, nowMs: NOW }).closingSoon).toBe(false)
    expect(entryStatus({ plan: { ...near, status: 'closed' }, price: null, nowMs: NOW }).closingSoon).toBe(false)
  })

  it('reports time left', () => {
    expect(entryStatus({ plan: plan(), price: null, nowMs: NOW }).msUntilExpiry).toBe(3_600_000)
  })

  it('honours custom stale and closing-soon thresholds', () => {
    expect(entryStatus({ plan: plan(), price: price(183_000_000n, 5001), nowMs: NOW, staleAfterMs: 5000 }).status).toBe('price_stale')
    expect(entryStatus({ plan: plan(), price: null, nowMs: NOW, closingSoonMs: 7_200_000 }).closingSoon).toBe(true)
  })

  it('rejects a non-finite clock', () => {
    expect(() => entryStatus({ plan: plan(), price: null, nowMs: NaN })).toThrow()
  })
})
