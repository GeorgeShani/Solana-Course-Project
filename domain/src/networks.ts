/**
 * The Solana networks Relay can run on, in ONE table. The server, the app and the scripts all read
 * this, so a network is never described in two places.
 *
 * - `devnet`: Solana's public test network. Free test SOL, no real value. This is what Relay runs on.
 * - `localnet`: a local test validator on this machine, for automated tests only.
 *
 * Relay does not run on any network where tokens have real value.
 */
export type Network = "devnet" | "localnet";

export interface NetworkInfo {
  id: Network;
  label: string;
  /** Used when SOLANA_RPC_URL is not set. Public endpoints are rate limited. */
  defaultRpcUrl: string;
  /** The cluster's genesis hash, or null where it cannot identify the network. */
  genesisHash: string | null;
  /** Appended to Solana Explorer URLs. */
  explorerQuery: string;
  /** Wallet Standard chain id. */
  walletChain: string;
  /** Where a follow's swap runs: Jupiter (the test fork copies its programs) or the simulated venue. */
  swapVenue: "jupiter" | "simulated_venue";
  /**
   * True when following works end to end on this network. For the simulated venue this stays false
   * until the owner has deployed the venue, funded its pool and run a verified follow (see
   * docs/DEVNET_RELEASE.md); the code path exists before that.
   */
  swapsAvailable: boolean;
  /** One plain sentence shown next to the network name. */
  note: string;
}

export const NETWORKS: Readonly<Record<Network, NetworkInfo>> = {
  devnet: {
    id: "devnet",
    label: "Devnet",
    defaultRpcUrl: "https://api.devnet.solana.com",
    genesisHash: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
    explorerQuery: "?cluster=devnet",
    walletChain: "solana:devnet",
    swapVenue: "simulated_venue",
    swapsAvailable: false,
    note: "Devnet: Solana's test network. Test tokens with no value. Swaps are not available here yet, so plans can be read but not followed.",
  },
  localnet: {
    id: "localnet",
    label: "Local test",
    defaultRpcUrl: "http://127.0.0.1:8899",
    genesisHash: null,
    explorerQuery: "",
    walletChain: "solana:localnet",
    swapVenue: "jupiter",
    swapsAvailable: true,
    note: "Local test network on this machine. Test funds only. Your wallet may warn that it can't preview this network.",
  },
};

/** The network named by `value`, or undefined when it is not one of the two. */
export function parseNetwork(value: string | undefined): Network | undefined {
  return value === "devnet" || value === "localnet" ? value : undefined;
}

/** A public Solana Explorer link, or null on the local test network (no public explorer shows it). */
export function explorerUrl(
  kind: "address" | "tx",
  value: string,
  network: Network,
): string | null {
  if (network === "localnet") return null;
  return `https://explorer.solana.com/${kind}/${encodeURIComponent(value)}${NETWORKS[network].explorerQuery}`;
}
