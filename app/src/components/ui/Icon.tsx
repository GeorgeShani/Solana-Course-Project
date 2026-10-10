import type { ReactNode } from "react";

/** One stroke family for every glyph: 24 grid, 1.75 stroke, round caps and joins. */
export type IconName =
  | "feed"
  | "search"
  | "plans"
  | "account"
  | "star"
  | "star-filled"
  | "details"
  | "in-range"
  | "above"
  | "below"
  | "expired"
  | "closed"
  | "unknown"
  | "clock"
  | "updated"
  | "refresh"
  | "alert"
  | "chain"
  | "arrow-up"
  | "script"
  | "replay"
  | "close"
  | "traders"
  | "post"
  | "fictional"
  | "back"
  | "external"
  | "wallet"
  | "copy"
  | "arrow-down"
  | "next"
  | "shield";

const PATHS: Record<IconName, ReactNode> = {
  feed: (
    <>
      <rect x="5" y="3.5" width="14" height="10" rx="2" />
      <path d="M7 17.5h10M9 20.5h6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  plans: (
    <>
      <path d="M4 7.5a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v9a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2z" />
      <path d="M9 10h6M9 14h4" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 19.5c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5" />
    </>
  ),
  star: (
    <path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" />
  ),
  "star-filled": (
    <path
      d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"
      fill="currentColor"
    />
  ),
  details: <path d="m7 10 5 5 5-5" />,
  "in-range": (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path
        d="m8 12.3 2.7 2.7L16.2 9.5"
        stroke="var(--icon-knockout, #1b1035)"
        strokeWidth="2.25"
      />
    </>
  ),
  above: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 15 15 9M10 9h5v5" />
    </>
  ),
  below: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 10v5h-5" />
    </>
  ),
  expired: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2M5.5 5.5l13 13" />
    </>
  ),
  closed: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  unknown: (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  updated: (
    <>
      <path d="M19 12a7 7 0 1 1-2.1-5" />
      <path d="M19 4.5V8h-3.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4v4h-4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  chain: (
    <>
      <path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
    </>
  ),
  "arrow-up": <path d="M12 19V5M6 11l6-6 6 6" />,
  script: (
    <>
      <path d="M15 12h-5M15 8h-5" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </>
  ),
  replay: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  traders: (
    <>
      <circle cx="9" cy="9" r="3.25" />
      <path d="M3.5 19c.9-2.8 2.9-4.25 5.5-4.25s4.6 1.45 5.5 4.25" />
      <path d="M15 6.2a3.25 3.25 0 0 1 0 5.6M17 14.9c1.6.6 2.8 2 3.5 4.1" />
    </>
  ),
  post: (
    <>
      <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </>
  ),
  fictional: (
    <>
      <path d="M4.5 5.5c4.8 1.6 10.2 1.6 15 0v6a7.5 7.5 0 0 1-15 0z" />
      <path d="M8 10.5h2M14 10.5h2M9 14.5c1.8 1.4 4.2 1.4 6 0" />
    </>
  ),
  back: <path d="M15 5 8 12l7 7" />,
  external: (
    <>
      <path d="M14 4.5h5.5V10M19.5 4.5 11 13" />
      <path d="M17.5 14v4a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5h4" />
    </>
  ),
  wallet: (
    <>
      <path d="M18.5 8.5V6.5A1.5 1.5 0 0 0 17 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12.5a1.5 1.5 0 0 0 1.5-1.5v-7.5a1.5 1.5 0 0 0-1.5-1.5H6" />
      <path d="M16 14h.01" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  "arrow-down": <path d="M12 5v14M6 13l6 6 6-6" />,
  next: <path d="m9 5 7 7-7 7" />,
  shield: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
