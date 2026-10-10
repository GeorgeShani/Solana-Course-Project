import { describe, expect, it } from "bun:test";
import { NETWORKS, explorerUrl, parseNetwork } from "../src/networks";

describe("networks", () => {
  it("parses only the two known names", () => {
    expect(parseNetwork("devnet")).toBe("devnet");
    expect(parseNetwork("localnet")).toBe("localnet");
    expect(parseNetwork("testnet")).toBeUndefined();
    expect(parseNetwork("")).toBeUndefined();
    expect(parseNetwork(undefined)).toBeUndefined();
  });

  it("refuses any network name that is not a test network", () => {
    for (const name of ["mainnet", "mainnet-beta", "Mainnet", "main"]) {
      expect(parseNetwork(name)).toBeUndefined();
    }
  });

  it("keeps each entry's id equal to its key and its wallet chain distinct", () => {
    const chains = new Set<string>();
    for (const [key, info] of Object.entries(NETWORKS)) {
      expect(String(info.id)).toBe(key);
      chains.add(info.walletChain);
    }
    expect(chains.size).toBe(2);
  });

  it("builds explorer links for devnet and none for the local network", () => {
    expect(explorerUrl("address", "A1", "devnet")).toBe(
      "https://explorer.solana.com/address/A1?cluster=devnet",
    );
    expect(explorerUrl("tx", "sig", "devnet")).toBe(
      "https://explorer.solana.com/tx/sig?cluster=devnet",
    );
    expect(explorerUrl("tx", "sig", "localnet")).toBeNull();
  });

  it("encodes the value in an explorer link", () => {
    expect(explorerUrl("address", "a/b?c", "devnet")).toBe(
      "https://explorer.solana.com/address/a%2Fb%3Fc?cluster=devnet",
    );
  });
});
