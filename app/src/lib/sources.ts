import { explorerUrl } from "@relay/domain";
import type { Cluster } from "./config";

/** A public explorer page for an account, or null on the local fork (no public explorer shows it). */
export function explorerAccountUrl(
  address: string,
  cluster: Cluster,
): string | null {
  return explorerUrl("address", address, cluster);
}

/** A public explorer page for a transaction, or null on the local fork. */
export function explorerTxUrl(
  signature: string,
  cluster: Cluster,
): string | null {
  return explorerUrl("tx", signature, cluster);
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
