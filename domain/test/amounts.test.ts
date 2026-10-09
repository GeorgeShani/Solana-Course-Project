import { describe, expect, it } from 'bun:test'
import { formatUnits, parseUnits } from '../src/index'

describe('decimal amounts', () => {
  it('parses exactly into base units', () => {
    expect(parseUnits('155.25', 6)).toBe(155_250_000n)
    expect(parseUnits('0.000001', 6)).toBe(1n)
    expect(parseUnits('0.1', 9)).toBe(100_000_000n)
    expect(parseUnits(' 7 ', 0)).toBe(7n)
    expect(parseUnits('123456789012345678901234567890', 0)).toBe(123456789012345678901234567890n)
  })

  it('rejects ambiguous or lossy input', () => {
    for (const bad of ['', '-1', '1e3', '1.', '.5', '0x10', '1,5', 'NaN', ' 1 2', '+1', '１']) {
      expect(() => parseUnits(bad, 6), bad).toThrow()
    }
    expect(() => parseUnits('1.0000001', 6)).toThrow(/decimal places/)
    expect(() => parseUnits('1', -1)).toThrow()
    expect(() => parseUnits('1', 31)).toThrow()
    expect(() => parseUnits('1', 1.5)).toThrow()
  })

  it('round-trips through formatting', () => {
    for (const v of ['0', '1', '155.25', '0.000001', '99999999.999999']) {
      expect(formatUnits(parseUnits(v, 6), 6)).toBe(v)
    }
    expect(formatUnits(-1n, 6)).toBe('-0.000001')
    expect(formatUnits(5n, 0)).toBe('5')
  })
})
