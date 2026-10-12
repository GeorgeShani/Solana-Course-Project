import { useMemo } from "react";

/**
 * The house: three rows of people watching the stage from their seats. Every person is drawn from
 * a handful of parts (hair, skin, clothes, glasses, a cap, a phone) combined from a fixed seed, so
 * the crowd is varied but the same on every render. They breathe, blink, lean toward a neighbour,
 * and react: they applaud when something is stamped, and stand when the curtains close for the
 * interval. They are decoration, never a count of anything real.
 */
export type Mood = "idle" | "clap" | "cheer";

const SKIN = ["#f3d2b3", "#e2b48c", "#c98f63", "#8f5a3a", "#5b3a29"];
const HAIR = ["#1a1210", "#3b2416", "#7a4a22", "#c9b27a", "#6d6d78"];
const SHIRT = [
  "#7a1f3a",
  "#26335e",
  "#1f5a63",
  "#8a6a1f",
  "#4a2a6e",
  "#2c2c3a",
];

interface Person {
  id: number;
  row: 0 | 1 | 2;
  x: number;
  skin: string;
  hair: string;
  shirt: string;
  hairStyle: number;
  glasses: boolean;
  phone: boolean;
  scale: number;
  delay: number;
  duration: number;
  lean: number;
}

/** A small deterministic generator, so the crowd never differs between server and browser. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROWS: { n: number; size: number }[] = [
  { n: 22, size: 0.78 },
  { n: 17, size: 0.98 },
  { n: 12, size: 1.2 },
];

function crowd(): Person[] {
  const rnd = seeded(20261012);
  const pick = (xs: readonly string[]): string =>
    xs[Math.floor(rnd() * xs.length)] ?? "";
  const out: Person[] = [];
  let id = 0;
  ROWS.forEach((row, r) => {
    for (let i = 0; i < row.n; i++) {
      out.push({
        id: id++,
        row: r === 0 ? 0 : r === 1 ? 1 : 2,
        // Keep heads inside the house; edge jitter used to shove figures off-screen at some widths.
        x:
          5 +
          ((i + 0.5) / row.n) * 90 +
          (rnd() - 0.5) * Math.min(2.5, 36 / row.n),
        skin: pick(SKIN),
        hair: pick(HAIR),
        shirt: pick(SHIRT),
        hairStyle: Math.floor(rnd() * 6),
        glasses: rnd() < 0.22,
        phone: rnd() < 0.16,
        scale: row.size * (0.92 + rnd() * 0.18),
        delay: -rnd() * 8,
        duration: 3.6 + rnd() * 3.4,
        lean: (rnd() - 0.5) * 2,
      });
    }
  });
  return out;
}

/** Hair seen from behind: it covers the whole back of the head. */
function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: // short
      return (
        <path
          d="M18.5 36C18 17 25 12 32 12s14 5 13.5 24c-2 4-6 6-13.5 6s-11.5-2-13.5-6Z"
          fill={color}
        />
      );
    case 1: // long, down to the shoulders
      return (
        <path
          d="M17 40C14 18 24 9 32 9s18 9 15 31v19c-3 2-8 3-15 3s-12-1-15-3Z"
          fill={color}
        />
      );
    case 2: // bun
      return (
        <>
          <circle cx="32" cy="8" r="6.5" fill={color} />
          <path
            d="M18.5 36C18 17 25 12 32 12s14 5 13.5 24c-2 4-6 6-13.5 6s-11.5-2-13.5-6Z"
            fill={color}
          />
        </>
      );
    case 3: // curls
      return <circle cx="32" cy="29" r="19" fill={color} />;
    case 4: // bald: a shine on the scalp
      return (
        <ellipse cx="28" cy="22" rx="5" ry="2.6" fill="#ffffff" opacity="0.3" />
      );
    default: // cap, with its adjuster at the back
      return (
        <>
          <path
            d="M18 32C18 15 26 10 32 10s14 5 14 22c-4 3-9 4-14 4s-10-1-14-4Z"
            fill={color}
          />
          <rect
            x="27"
            y="30"
            width="10"
            height="4"
            rx="1.5"
            fill="#000"
            opacity="0.28"
          />
        </>
      );
  }
}

/** One person, seen from the back of the house: they are looking up at the stage. */
function Figure({ p }: { p: Person }) {
  return (
    <svg
      viewBox="0 0 64 92"
      className="aud__p"
      data-row={p.row}
      data-lean={p.lean > 0.55 ? "r" : p.lean < -0.55 ? "l" : "n"}
      style={{
        left: `${p.x}%`,
        "--s": p.scale.toFixed(3),
        animationDelay: `${p.delay.toFixed(2)}s`,
        animationDuration: `${p.duration.toFixed(2)}s`,
      }}
      aria-hidden="true"
    >
      {/* raised arms, hidden until they applaud */}
      <g className="aud__arms">
        <path
          d="M11 82C4 66 8 40 20 22"
          stroke={p.shirt}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M53 82C60 66 56 40 44 22"
          stroke={p.shirt}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <circle
          className="aud__hand aud__hand--l"
          cx="24"
          cy="15"
          r="5.2"
          fill={p.skin}
        />
        <circle
          className="aud__hand aud__hand--r"
          cx="40"
          cy="15"
          r="5.2"
          fill={p.skin}
        />
      </g>
      {/* shoulders and back */}
      <path d="M4 92C4 67 15 58 32 58s28 9 28 34Z" fill={p.shirt} />
      <path
        d="M32 60v32"
        stroke="#000"
        strokeOpacity="0.16"
        strokeWidth="1.2"
      />
      <path className="aud__rim" d="M6 70C10 62 19 59 32 59s22 3 26 11" />
      <rect x="27" y="46" width="10" height="15" rx="4" fill={p.skin} />
      <rect
        x="27"
        y="46"
        width="10"
        height="15"
        rx="4"
        fill="#000"
        opacity="0.2"
      />
      <g className="aud__head">
        {p.hairStyle === 3 && <Hair style={3} color={p.hair} />}
        <ellipse cx="32" cy="34" rx="13" ry="15" fill={p.skin} />
        <circle cx="19" cy="35" r="2.8" fill={p.skin} />
        <circle cx="45" cy="35" r="2.8" fill={p.skin} />
        {p.hairStyle !== 3 && <Hair style={p.hairStyle} color={p.hair} />}
        {p.glasses && (
          <path
            d="M17.5 33h3M43.5 33h3"
            stroke="#1b1035"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        )}
        <path className="aud__rim" d="M20 24C23 14 41 14 44 24" />
      </g>
      {/* someone lifts a phone toward the stage */}
      {p.phone && (
        <g>
          <path
            d="M52 84C57 70 55 52 51 40"
            stroke={p.shirt}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <rect
            className="aud__phone"
            x="46"
            y="22"
            width="9"
            height="16"
            rx="2"
            fill="#bfe4ff"
            transform="rotate(8 50 30)"
          />
        </g>
      )}
    </svg>
  );
}

export function Audience({ mood }: { mood: Mood }) {
  const people = useMemo(crowd, []);
  return (
    <div className="aud" aria-hidden="true" data-mood={mood}>
      {[0, 1, 2].map((row) => (
        <div key={row} className={`aud__row aud__row--${row}`}>
          {people
            .filter((p) => p.row === row)
            .map((p) => (
              <Figure key={p.id} p={p} />
            ))}
          <i className="aud__seats" />
        </div>
      ))}
    </div>
  );
}
