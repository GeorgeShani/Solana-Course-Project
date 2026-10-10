import { pricePosition, type RangePosition } from "@relay/domain";

export interface RangeGeometry {
  /** Band start and end as a percent of the track (0-100). */
  bandStart: number;
  bandEnd: number;
  /** Marker position as a percent of the track, or null when there is no price. */
  marker: number | null;
  /** Where the price sits relative to the plan's bounds (exact bigint comparison). */
  position: RangePosition | null;
  /** True when the marker is pinned to the track edge because the price is far outside. */
  clamped: boolean;
}

/** The band always occupies the middle of the track so both bounds stay readable. */
const BAND_START = 25;
const BAND_END = 75;
/** Marker positions are clamped here so an arrow fits beyond them. */
const EDGE_MIN = 3;
const EDGE_MAX = 97;
/** Basis points per percent of track, kept in bigint until the very end. */
const SCALE = 10_000n;

/**
 * Lays out the range bar: plan band [low, high] in the middle half of the track and the current
 * price placed on the same linear scale. Positioning is display only; the in/out decision uses
 * the domain's exact bigint `pricePosition`, so the marker can never disagree with the status.
 */
export function rangeGeometry(low: bigint, high: bigint, price: bigint | null): RangeGeometry {
  const base = { bandStart: BAND_START, bandEnd: BAND_END };
  if (price === null) return { ...base, marker: null, position: null, clamped: false };
  const position = pricePosition(price, low, high);

  // A single-price plan (low == high) still needs a visible band and a scale.
  const span = high > low ? high - low : high > 0n ? high / 200n || 1n : 1n;
  const bandWidth = BigInt(BAND_END - BAND_START);
  // percent * SCALE, as bigint: BAND_START + (price - low) / span * bandWidth
  const offset = ((price - low) * bandWidth * SCALE) / span;
  const raw = Number(BigInt(BAND_START) * SCALE + offset) / Number(SCALE);

  let marker = raw;
  if (position === "in_range") marker = Math.min(BAND_END, Math.max(BAND_START, raw));
  // Out of range must visibly sit outside the band even when only one unit away.
  if (position === "above_range") marker = Math.max(raw, BAND_END + 2);
  if (position === "below_range") marker = Math.min(raw, BAND_START - 2);
  const clamped = marker > EDGE_MAX || marker < EDGE_MIN;
  marker = Math.min(EDGE_MAX, Math.max(EDGE_MIN, marker));
  return { ...base, marker, position, clamped };
}
