/**
 * Deterministic mask-like glyph for a creator, used instead of uploaded portraits. The same seed
 * gives the same sigil on the server and the client. Ported from the curtain-sol theatre; two of its
 * inks are Solana green and purple.
 */
function fnv1a(input: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

const INKS = ["#F6D98B", "#14F195", "#FF9466", "#B98CFF", "#F4EEFF"];

function design(seed: string) {
  let state = fnv1a(seed);
  const next = () => {
    state = Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) >>> 0;
    state = (state ^ (state >>> 12)) >>> 0;
    return state;
  };
  const ink = INKS[next() % INKS.length];
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++)
      if (next() % 100 < 52) {
        cells.push({ x, y });
        if (x < 2) cells.push({ x: 4 - x, y });
      }
  return { ink, cells, clip: `sigil-${fnv1a(seed).toString(36)}` };
}

export function Sigil({
  seed,
  size = 40,
}: {
  seed: string;
  size?: number | string;
}) {
  const { ink, cells, clip } = design(seed);
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="#2A1A4F"
        stroke={ink}
        strokeWidth="2"
      />
      <g clipPath={`url(#${clip})`} fill={ink}>
        {cells.map(({ x, y }) => (
          <rect
            key={`${x}-${y}`}
            x={15 + x * 14}
            y={15 + y * 14}
            width="13"
            height="13"
            rx="3"
          />
        ))}
      </g>
    </svg>
  );
}
