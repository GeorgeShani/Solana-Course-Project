import { formatUnits } from "@relay/domain";

function groupThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Integer quote units -> "$1,234.50". Exact (string math from formatUnits, no floats); keeps at
 * least two decimals and never rounds away precision the plan committed to.
 */
export function formatUsd(units: bigint, quoteDecimals: number): string {
  const plain = formatUnits(units, quoteDecimals);
  const negative = plain.startsWith("-");
  const [whole, fraction = ""] = (negative ? plain.slice(1) : plain).split(".");
  return `${negative ? "−" : ""}$${groupThousands(whole)}.${fraction.padEnd(2, "0")}`;
}

/** Same as formatUsd for an already-decimal string from the API ("180.5" -> "$180.50"). */
export function formatUsdText(decimal: string): string {
  const [whole, fraction = ""] = decimal.split(".");
  return `$${groupThousands(whole)}.${fraction.padEnd(2, "0")}`;
}

/** 0-59 s -> "12s", then "4 min", "2 h 5 min", "3 d 4 h". Never negative. */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return mm ? `${h} h ${mm} min` : `${h} h`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh ? `${d} d ${hh} h` : `${d} d`;
}

/** Age label for a past moment: "just now", "12s ago", "4 min ago". */
export function formatAge(ms: number): string {
  if (ms < 1000) return "just now";
  return `${formatDuration(ms)} ago`;
}

/**
 * Unix seconds -> "15:00" in the viewer's zone, or "Oct 12, 15:00" when not today relative to
 * `nowSec`. The time is the chain's own clock value (on a fork it can differ from wall time).
 */
export function formatClock(unixSec: number, nowSec?: number): string {
  const d = new Date(unixSec * 1000);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (nowSec === undefined) return time;
  const n = new Date(nowSec * 1000);
  const sameDay =
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate();
  if (sameDay) return time;
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day}, ${time}`;
}

/** "7xKX…9fQa" */
export function shortAddress(address: string): string {
  return address.length <= 10 ? address : `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** "3f9a…c1d2" for a hex hash. */
export function shortHash(hex: string): string {
  return hex.length <= 10 ? hex : `${hex.slice(0, 4)}…${hex.slice(-4)}`;
}
