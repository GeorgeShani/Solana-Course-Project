/** Narrowing helpers for data that arrives as `unknown` (request bodies, JSON, RPC results). */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
