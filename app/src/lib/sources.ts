import type { Cluster } from "./config";

/**
 * A public explorer page for an account, or null when none exists: the local Surfpool fork is only
 * on this machine, so no public explorer can show it and Relay doesn't pretend one does.
 */
export function explorerAccountUrl(
  address: string,
  cluster: Cluster,
): string | null {
  if (cluster === "localnet") return null;
  const base = `https://explorer.solana.com/address/${encodeURIComponent(address)}`;
  return cluster === "devnet" ? `${base}?cluster=devnet` : base;
}

/** "12 Oct 2026, 14:05" in the reader's time zone, from unix seconds. */
export function formatTimestamp(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
