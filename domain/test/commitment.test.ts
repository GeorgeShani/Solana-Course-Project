import { createHash } from 'node:crypto'
import { describe, expect, it } from 'bun:test'
import {
  contentHash,
  contentPreimage,
  ContentError,
  decodeAddress,
  fromHex,
  termsHash,
  termsPreimage,
  toHex,
  validateContent,
  ZERO_HASH,
  type PlanContent,
  type TermsInput,
} from '../src/index'
import vectors from '../test-vectors/plan-hash.json'

const content = (over: Partial<PlanContent> = {}): PlanContent => ({
  rationale: 'Retest of 180 support after the breakout.',
  exitThesis: 'Take profit near 200, not a stop-loss order.',
  exitTarget: 200_000_000n,
  invalidation: 178_000_000n,
  ...over,
})

const PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const base = async (over: Partial<TermsInput> = {}): Promise<TermsInput> => ({
  programId: PROGRAM,
  plan: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  version: 1,
  creator: '4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx',
  baseMint: 'So11111111111111111111111111111111111111112',
  quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  baseDecimals: 9,
  quoteDecimals: 6,
  entryLow: 180_000_000n,
  entryHigh: 185_000_000n,
  expiresAt: 1_790_000_000n,
  contentHash: await contentHash(content()),
  prevTermsHash: ZERO_HASH,
  ...over,
})

describe('content hash', () => {
  it('is deterministic and 32 bytes', async () => {
    const a = await contentHash(content())
    const b = await contentHash(content())
    expect(a.length).toBe(32)
    expect(toHex(a)).toBe(toHex(b))
  })

  it('changes when any field changes', async () => {
    const h = async (c: PlanContent) => toHex(await contentHash(c))
    const ref = await h(content())
    expect(await h(content({ rationale: 'Retest of 181 support after the breakout.' }))).not.toBe(ref)
    expect(await h(content({ exitThesis: 'Take profit near 201, not a stop-loss order.' }))).not.toBe(ref)
    expect(await h(content({ exitTarget: 200_000_001n }))).not.toBe(ref)
    expect(await h(content({ invalidation: 177_999_999n }))).not.toBe(ref)
    expect(await h(content({ exitTarget: null }))).not.toBe(ref)
  })

  it('cannot be fooled by moving text between fields (length prefixes)', async () => {
    const a = content({ rationale: 'aaaaaaaaaa', exitThesis: 'bbbbbbbbbbbb' })
    const b = content({ rationale: 'aaaaaaaaaab', exitThesis: 'bbbbbbbbbbb' })
    expect(toHex(await contentHash(a))).not.toBe(toHex(await contentHash(b)))
  })

  it('distinguishes "no exit target" from "exit target of zero-like value" via the presence flag', () => {
    const none = contentPreimage(content({ exitTarget: null }))
    const some = contentPreimage(content({ exitTarget: 1n }))
    expect(toHex(none)).not.toBe(toHex(some))
  })

  it('rejects, never silently fixes, non-canonical text', () => {
    const bad = (rationale: string) => () => validateContent(content({ rationale }))
    expect(bad(' leading space here')).toThrow(ContentError)
    expect(bad('trailing space here ')).toThrow(ContentError)
    expect(bad('Café order flow here')).toThrow(/NFC/) // decomposed é
    expect(bad('lone surrogate \ud800 here')).toThrow(ContentError)
    expect(bad('contains nul \u0000 byte')).toThrow(ContentError)
    expect(bad('short')).toThrow(/at least/)
    expect(bad('é'.repeat(501))).toThrow(/bytes/) // 1002 bytes
    expect(() => validateContent(content({ exitThesis: 'x' }))).toThrow(ContentError)
    expect(() => validateContent(content({ exitTarget: 0n }))).toThrow(ContentError)
    expect(() => validateContent(content({ invalidation: (1n << 64n) }))).toThrow(ContentError)
    // composed form passes
    expect(() => validateContent(content({ rationale: 'Café order flow looks strong.' }))).not.toThrow()
  })

  it('matches an independent preimage built with Node Buffer and crypto', async () => {
    const c = content({ rationale: 'Café — 日本 flow', exitThesis: 'Exit near 200 or review.', exitTarget: 7n, invalidation: null })
    const r = Buffer.from(c.rationale, 'utf8')
    const e = Buffer.from(c.exitThesis, 'utf8')
    const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
    const u64 = (n: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b }
    const expected = Buffer.concat([
      Buffer.from('relay:plan-content:v1', 'ascii'),
      u32(r.length), r, u32(e.length), e,
      Buffer.from([1]), u64(7n), Buffer.from([0]), u64(0n),
    ])
    expect(toHex(contentPreimage(c))).toBe(expected.toString('hex'))
    expect(toHex(await contentHash(c))).toBe(createHash('sha256').update(expected).digest('hex'))
  })
})

describe('terms hash', () => {
  it('is deterministic and sensitive to every field', async () => {
    const ref = toHex(await termsHash(await base()))
    expect(toHex(await termsHash(await base()))).toBe(ref)
    const variants: Partial<TermsInput>[] = [
      { programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' },
      { plan: '4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx' },
      { version: 2 },
      { creator: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
      { baseMint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
      { quoteMint: 'So11111111111111111111111111111111111111112' },
      { baseDecimals: 6 },
      { quoteDecimals: 9 },
      { entryLow: 180_000_001n },
      { entryHigh: 185_000_001n },
      { expiresAt: 1_790_000_001n },
      { contentHash: await contentHash(content({ rationale: 'A different rationale entirely.' })) },
      { prevTermsHash: new Uint8Array(32).fill(1) },
    ]
    for (const v of variants) {
      expect(toHex(await termsHash(await base(v))), JSON.stringify(Object.keys(v))).not.toBe(ref)
    }
  })

  it('chains versions: v2 depends on the exact v1 hash', async () => {
    const v1 = await termsHash(await base())
    const v2a = await termsHash(await base({ version: 2, prevTermsHash: v1 }))
    const tampered = new Uint8Array(v1)
    tampered[0] = (tampered[0] ?? 0) ^ 1
    const v2b = await termsHash(await base({ version: 2, prevTermsHash: tampered }))
    expect(toHex(v2a)).not.toBe(toHex(v2b))
  })

  it('has a fixed-width layout', async () => {
    const pre = termsPreimage(await base())
    // tag(21) + program(32) + plan(32) + version(2) + creator(32) + base(32) + quote(32) + 2 decimals + 3*8 + 2*32
    expect(pre.length).toBe(21 + 32 + 32 + 2 + 32 + 32 + 32 + 2 + 24 + 64)
  })

  it('rejects malformed inputs', async () => {
    await expect(termsHash(await base({ version: 0 }))).rejects.toThrow()
    await expect(termsHash(await base({ entryLow: 0n }))).rejects.toThrow()
    await expect(termsHash(await base({ entryLow: 5n, entryHigh: 4n }))).rejects.toThrow()
    await expect(termsHash(await base({ contentHash: new Uint8Array(31) }))).rejects.toThrow()
    await expect(termsHash(await base({ creator: 'not-an-address' }))).rejects.toThrow()
    await expect(termsHash(await base({ baseDecimals: 256 }))).rejects.toThrow()
    await expect(termsHash(await base({ version: 65536 }))).rejects.toThrow()
  })

  it('supports negative-free i64 times but rejects out-of-range ones', async () => {
    await expect(termsHash(await base({ expiresAt: 1n << 63n }))).rejects.toThrow()
  })

  it('decodes addresses to 32 bytes', () => {
    expect(decodeAddress('11111111111111111111111111111111')).toEqual(new Uint8Array(32))
    expect(toHex(decodeAddress('So11111111111111111111111111111111111111112')).length).toBe(64)
    expect(() => decodeAddress('1111')).toThrow()
    expect(() => decodeAddress('0OIl')).toThrow() // characters outside base58
  })
})

describe('shared test vectors (the Anchor program must reproduce these exactly)', () => {
  for (const c of vectors.cases) {
    it(c.name, async () => {
      const k: PlanContent = {
        rationale: c.content.rationale,
        exitThesis: c.content.exitThesis,
        exitTarget: c.content.exitTarget === null ? null : BigInt(c.content.exitTarget),
        invalidation: c.content.invalidation === null ? null : BigInt(c.content.invalidation),
      }
      const cHash = await contentHash(k)
      expect(toHex(contentPreimage(k))).toBe(c.expected.contentPreimageHex)
      expect(toHex(cHash)).toBe(c.expected.contentHashHex)
      const input: TermsInput = {
        programId: c.terms.programId,
        plan: c.terms.plan,
        version: c.terms.version,
        creator: c.terms.creator,
        baseMint: c.terms.baseMint,
        quoteMint: c.terms.quoteMint,
        baseDecimals: c.terms.baseDecimals,
        quoteDecimals: c.terms.quoteDecimals,
        entryLow: BigInt(c.terms.entryLow),
        entryHigh: BigInt(c.terms.entryHigh),
        expiresAt: BigInt(c.terms.expiresAt),
        contentHash: cHash,
        prevTermsHash: fromHex(c.terms.prevTermsHashHex),
      }
      expect(toHex(termsPreimage(input))).toBe(c.expected.termsPreimageHex)
      expect(toHex(await termsHash(input))).toBe(c.expected.termsHashHex)
      // independent re-hash of the stored preimage
      expect(createHash('sha256').update(Buffer.from(c.expected.termsPreimageHex, 'hex')).digest('hex')).toBe(c.expected.termsHashHex)
    })
  }

  it('v2 chains on the v1 vector', () => {
    expect(vectors.cases[1]?.terms.prevTermsHashHex).toBe(vectors.cases[0]?.expected.termsHashHex)
  })
})
