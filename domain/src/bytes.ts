/** Small dependency-free byte helpers shared by the hashing code. */

const enc = new TextEncoder();
export const utf8 = (s: string): Uint8Array => enc.encode(s);

export function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function u8(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xff)
    throw new RangeError("u8 out of range");
  return Uint8Array.of(n);
}

function fixedLE(value: bigint, bytes: number, signed: boolean): Uint8Array {
  const bits = BigInt(bytes * 8);
  const min = signed ? -(1n << (bits - 1n)) : 0n;
  const max = signed ? (1n << (bits - 1n)) - 1n : (1n << bits) - 1n;
  if (value < min || value > max)
    throw new RangeError(`${signed ? "i" : "u"}${bytes * 8} out of range`);
  let v = BigInt.asUintN(bytes * 8, value);
  const out = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

export const u16le = (n: number): Uint8Array => fixedLE(BigInt(n), 2, false);
export const u32le = (n: number): Uint8Array => fixedLE(BigInt(n), 4, false);
export const u64le = (n: bigint): Uint8Array => fixedLE(n, 8, false);
export const i64le = (n: bigint): Uint8Array => fixedLE(n, 8, true);

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw new RangeError("Invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Decodes a base58 Solana address to exactly 32 bytes. Throws otherwise. */
export function decodeAddress(address: string): Uint8Array {
  let n = 0n;
  for (const ch of address) {
    const d = B58.indexOf(ch);
    if (d < 0) throw new RangeError("Invalid base58 address");
    n = n * 58n + BigInt(d);
  }
  let leadingZeros = 0;
  for (const ch of address) {
    if (ch !== "1") break;
    leadingZeros++;
  }
  const body: number[] = [];
  while (n > 0n) {
    body.push(Number(n & 0xffn));
    n >>= 8n;
  }
  const bytes = new Uint8Array(leadingZeros + body.length);
  body.reverse().forEach((b, i) => {
    bytes[leadingZeros + i] = b;
  });
  if (bytes.length !== 32)
    throw new RangeError("Address must decode to 32 bytes");
  return bytes;
}

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return new Uint8Array(digest);
}
