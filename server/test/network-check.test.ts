import { describe, expect, it } from "bun:test";
import { NETWORKS } from "@relay/domain";
import { assertRpcMatchesNetwork, type FetchLike } from "../src/network-check";

function rpcReturning(result: unknown): FetchLike {
  return async () =>
    new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      headers: { "content-type": "application/json" },
    });
}

const down: FetchLike = async () => {
  throw new Error("connect ECONNREFUSED");
};

describe("assertRpcMatchesNetwork", () => {
  it("accepts a devnet RPC", async () => {
    expect(
      await assertRpcMatchesNetwork(
        "http://rpc",
        "devnet",
        rpcReturning(NETWORKS.devnet.genesisHash),
      ),
    ).toBe("verified");
  });

  it("refuses an RPC on any other network, with a message that says what to do", async () => {
    await expect(
      assertRpcMatchesNetwork("http://rpc", "devnet", rpcReturning("abc")),
    ).rejects.toThrow(/not a devnet RPC.*api\.devnet\.solana\.com/);
  });

  it("does not block startup when the RPC is unreachable or answers oddly", async () => {
    expect(await assertRpcMatchesNetwork("http://rpc", "devnet", down)).toBe(
      "unchecked",
    );
    expect(
      await assertRpcMatchesNetwork("http://rpc", "devnet", rpcReturning(7)),
    ).toBe("unchecked");
  });

  it("does not check a local test network", async () => {
    expect(
      await assertRpcMatchesNetwork(
        "http://127.0.0.1:8899",
        "localnet",
        rpcReturning("anything"),
      ),
    ).toBe("unchecked");
  });
});
