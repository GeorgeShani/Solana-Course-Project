import { useId } from "react";

/**
 * Token marks for the pairs Relay supports, drawn on a 24 grid. Each one keeps the token's own
 * recognisable form and colour; anything else gets a lettered disc rather than a borrowed logo.
 */
export function TokenIcon({
  symbol,
  size = 24,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const common = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    "aria-hidden": true,
    focusable: false,
    className: className ? `token ${className}` : "token",
  } as const;

  if (symbol === "SOL") {
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={`${uid}s`} x1="5" y1="18" x2="19" y2="6">
            <stop offset="0" stopColor="#9945ff" />
            <stop offset="1" stopColor="#14f195" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="12" fill="#14101f" />
        <g fill={`url(#${uid}s)`}>
          <path d="M8.2 7h9.8l-2.2 2.1H6z" />
          <path d="M6 10.95h9.8l2.2 2.1H8.2z" />
          <path d="M8.2 14.9h9.8l-2.2 2.1H6z" />
        </g>
      </svg>
    );
  }
  if (symbol === "USDC") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="12" fill="#2775ca" />
        <path
          d="M9.3 18.2a6.6 6.6 0 0 1 0-12.4M14.7 5.8a6.6 6.6 0 0 1 0 12.4"
          fill="none"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M14.1 10.1c0-1-.9-1.6-2.1-1.6s-2.1.6-2.1 1.5c0 2.2 4.4 1.2 4.4 3.6 0 1-1 1.7-2.3 1.7s-2.3-.7-2.3-1.7M12 7.4v1.1M12 15.3v1.2"
          fill="none"
          stroke="#fff"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (symbol === "JUP") {
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={`${uid}j`} x1="4" y1="20" x2="20" y2="4">
            <stop offset="0" stopColor="#00bef0" />
            <stop offset="1" stopColor="#c7f284" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="12" fill="#141726" />
        <g
          fill="none"
          stroke={`url(#${uid}j)`}
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M5.2 15.6c2.6-.2 5.4-1.5 7.6-3.7s3.5-5 3.7-7.6" />
          <path d="M6.6 18.2c3-.6 5.9-2.1 8.2-4.4s3.8-5.2 4.4-8.2" />
          <path d="M9.6 19.6c2.1-.8 4.1-2 5.8-3.7s2.9-3.7 3.7-5.8" />
          <path d="M4.4 12.4c1.7-.4 3.4-1.3 4.8-2.7S11.5 6.6 11.9 4.9" />
        </g>
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="12" fill="#2f1e57" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#f6f1ff"
      >
        {symbol.slice(0, 1)}
      </text>
    </svg>
  );
}

/** A pair as two overlapping marks: base in front, quote behind. */
export function PairIcon({
  base,
  quote,
  size = 28,
}: {
  base: string;
  quote: string;
  size?: number;
}) {
  return (
    <span
      className="pair-icon"
      style={{ width: size * 1.55, height: size }}
      aria-hidden="true"
    >
      <TokenIcon symbol={quote} size={size} className="pair-icon__quote" />
      <TokenIcon symbol={base} size={size} className="pair-icon__base" />
    </span>
  );
}
