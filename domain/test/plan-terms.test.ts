import { describe, expect, it } from 'bun:test'
import { MAX_WINDOW_SEC, MIN_WINDOW_SEC, TermsError, validateTerms } from '../src/index'

const NOW = 1_790_000_000
const ok = { pairId: 'sol-usdc', entryLow: '180', entryHigh: '185.5', expiresAtSec: NOW + 3600, nowSec: NOW }

describe('validateTerms', () => {
  it('turns good input into integers', () => {
    const t = validateTerms(ok)
    expect(t.pair.id).toBe('sol-usdc')
    expect(t.entryLow).toBe(180_000_000n)
    expect(t.entryHigh).toBe(185_500_000n)
    expect(t.expiresAt).toBe(BigInt(NOW + 3600))
  })

  it('allows a single-price range', () => {
    expect(validateTerms({ ...ok, entryLow: '183', entryHigh: '183' }).entryLow).toBe(183_000_000n)
  })

  const bad = (over: object, field: string) => {
    try {
      validateTerms({ ...ok, ...over })
      throw new Error('expected a TermsError')
    } catch (e) {
      expect(e).toBeInstanceOf(TermsError)
      expect((e as TermsError).field).toBe(field)
    }
  }

  it('rejects unsupported pairs and non-string prices', () => {
    bad({ pairId: 'bonk-usdc' }, 'pairId')
    bad({ pairId: 5 }, 'pairId')
    bad({ entryLow: 180 }, 'entryLow') // a JS number is rejected, strings only
    bad({ entryHigh: '1e3' }, 'entryHigh')
    bad({ entryLow: '0' }, 'entryLow')
    bad({ entryHigh: '180.0000001' }, 'entryHigh') // more than 6 decimals
  })

  it('rejects an inverted range', () => {
    bad({ entryLow: '186', entryHigh: '185' }, 'entryHigh')
  })

  it('enforces the 1 minute .. 7 day window with exact boundaries', () => {
    expect(validateTerms({ ...ok, expiresAtSec: NOW + MIN_WINDOW_SEC }).expiresAt).toBe(BigInt(NOW + MIN_WINDOW_SEC))
    bad({ expiresAtSec: NOW + MIN_WINDOW_SEC - 1 }, 'expiresAt')
    expect(validateTerms({ ...ok, expiresAtSec: NOW + MAX_WINDOW_SEC }).expiresAt).toBe(BigInt(NOW + MAX_WINDOW_SEC))
    bad({ expiresAtSec: NOW + MAX_WINDOW_SEC + 1 }, 'expiresAt')
    bad({ expiresAtSec: 1.5 }, 'expiresAt')
    bad({ expiresAtSec: '1790003600' }, 'expiresAt')
  })
})
