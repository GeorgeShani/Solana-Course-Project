import { rangeGeometry } from "../../lib/range";

/**
 * The plan band with a current-price marker. Both bounds stay visible; a price far outside the
 * band pins to the edge with an arrow. Without a price the track is dashed and has no marker.
 */
export function RangeBar({
  low,
  high,
  price,
  lowLabel,
  highLabel,
}: {
  low: bigint;
  high: bigint;
  price: bigint | null;
  lowLabel: string;
  highLabel: string;
}) {
  const g = rangeGeometry(low, high, price);
  return (
    <div
      className="range"
      data-has-price={g.marker !== null}
      aria-hidden="true"
    >
      <div className="range__track">
        <div
          className="range__band"
          style={{
            left: `${g.bandStart}%`,
            width: `${g.bandEnd - g.bandStart}%`,
          }}
        />
        {g.marker !== null && (
          <div
            className="range__marker"
            data-position={g.position}
            data-clamped={g.clamped}
            style={{ left: `${g.marker}%` }}
          />
        )}
      </div>
      <div className="range__labels">
        <span style={{ left: `${g.bandStart}%` }}>{lowLabel}</span>
        <span style={{ left: `${g.bandEnd}%` }}>{highLabel}</span>
      </div>
    </div>
  );
}
