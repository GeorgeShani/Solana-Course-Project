import { describe, expect, it } from "bun:test";
import { assertLocalFork } from "../src/solana";

describe("assertLocalFork", () => {
  it("allows only an RPC on this machine", () => {
    expect(() => assertLocalFork("http://127.0.0.1:8899", "t")).not.toThrow();
    expect(() => assertLocalFork("http://localhost:8899", "t")).not.toThrow();
    expect(() => assertLocalFork("http://[::1]:8899", "t")).not.toThrow();
  });

  it("refuses mainnet, providers and look-alike hosts", () => {
    for (const url of [
      "https://api.mainnet-beta.solana.com",
      "https://mainnet.helius-rpc.com/?api-key=k",
      "http://127.0.0.1.evil.example:8899",
      "http://localhost.evil.example",
      "not a url",
    ]) {
      expect(() => assertLocalFork(url, "t")).toThrow(/local Surfpool fork/);
    }
  });
});
