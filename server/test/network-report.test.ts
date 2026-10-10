import { describe, expect, it } from "bun:test";
import { NETWORKS, SUPPORTED_PAIRS } from "@relay/domain";
import {
  RELAY_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "@relay/domain/solana";
import { loadEnv } from "../src/env";
import type { FetchLike } from "../src/network-check";
import { reportOk, runNetworkReport } from "../src/network-report";

const SECRET_URL = "https://devnet.provider.example/?api-key=SUPERSECRETKEY";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

interface World {
  genesis?: string;
  programExecutable?: boolean | "missing";
  /** mint -> account, or absent when the mint does not exist. */
  mints?: Map<string, { owner: string; decimals: number }>;
  jupiterStatus?: number;
  rpcDown?: boolean;
  rpcStatus?: number;
  calls?: string[];
}

/** A fake RPC and Jupiter in one `fetch`, answering only what the report asks. */
function world(w: World): FetchLike {
  return async (url, init) => {
    w.calls?.push(url);
    if (url.includes("/price/v3"))
      return new Response("{}", { status: w.jupiterStatus ?? 200 });
    if (w.rpcDown) throw new Error(`connect ECONNREFUSED ${url}`);
    if (w.rpcStatus) return new Response("x", { status: w.rpcStatus });
    const body: unknown = JSON.parse(String(init?.body));
    if (!isRecord(body)) throw new Error("bad request");
    const params = Array.isArray(body.params) ? body.params : [];
    const reply = (result: unknown) =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }));
    switch (body.method) {
      case "getSlot":
        return reply(12345);
      case "getGenesisHash":
        return reply(w.genesis ?? NETWORKS.devnet.genesisHash);
      case "getAccountInfo": {
        const target = params[0];
        if (target === RELAY_PROGRAM_ADDRESS) {
          if (w.programExecutable === "missing") return reply({ value: null });
          return reply({
            value: {
              owner: "BPFLoaderUpgradeab1e11111111111111111111111",
              executable: w.programExecutable ?? true,
              data: ["", "base64"],
            },
          });
        }
        const mint =
          typeof target === "string" ? w.mints?.get(target) : undefined;
        if (!mint) return reply({ value: null });
        return reply({
          value: {
            owner: mint.owner,
            executable: false,
            data: { parsed: { info: { decimals: mint.decimals } } },
          },
        });
      }
      default:
        throw new Error(`unexpected method ${String(body.method)}`);
    }
  };
}

/** Every mint the supported pairs use, as a healthy network would hold them. */
function allMints(): Map<string, { owner: string; decimals: number }> {
  const m = new Map<string, { owner: string; decimals: number }>();
  for (const pair of SUPPORTED_PAIRS) {
    m.set(pair.base.mint, {
      owner: TOKEN_PROGRAM_ADDRESS,
      decimals: pair.base.decimals,
    });
    m.set(pair.quote.mint, {
      owner: TOKEN_PROGRAM_ADDRESS,
      decimals: pair.quote.decimals,
    });
  }
  return m;
}

const env = (extra: Record<string, string> = {}) =>
  loadEnv({ NETWORK: "devnet", SOLANA_RPC_URL: SECRET_URL, ...extra });

const status = (results: Awaited<ReturnType<typeof runNetworkReport>>) =>
  Object.fromEntries(results.map((r) => [r.name, r.status]));

describe("runNetworkReport", () => {
  it("passes on a healthy devnet", async () => {
    const results = await runNetworkReport(
      env({ CREATOR_ALLOWLIST: "11111111111111111111111111111111" }),
      world({ mints: allMints() }),
    );
    const s = status(results);
    expect(s["RPC reachable"]).toBe("pass");
    expect(s["RPC network"]).toBe("pass");
    expect(s["Relay program"]).toBe("pass");
    expect(s["token SOL"]).toBe("pass");
    expect(s["token USDC"]).toBe("pass");
    expect(s["feed policy"]).toBe("pass");
    // Devnet has no swap venue yet: a warning, not a failure.
    expect(s["swap venue"]).toBe("warn");
    expect(reportOk(results)).toBe(true);
  });

  it("fails when the RPC is on another network", async () => {
    const results = await runNetworkReport(
      env(),
      world({ genesis: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" }),
    );
    expect(status(results)["RPC network"]).toBe("fail");
    expect(reportOk(results)).toBe(false);
  });

  it("stops after an unreachable RPC and says so", async () => {
    const results = await runNetworkReport(env(), world({ rpcDown: true }));
    expect(results.map((r) => [r.name, r.status])).toEqual([
      ["network setting", "pass"],
      ["RPC reachable", "fail"],
    ]);
  });

  it("warns, rather than fails, when the program is not deployed yet", async () => {
    const results = await runNetworkReport(
      env(),
      world({ programExecutable: "missing", mints: allMints() }),
    );
    const program = results.find((r) => r.name === "Relay program");
    expect(program?.status).toBe("warn");
    expect(program?.detail).toContain("owner deploys");
    expect(reportOk(results)).toBe(true);
  });

  it("fails on an account that is not a program, a non-classic token, or wrong decimals", async () => {
    const mints = allMints();
    const usdc = SUPPORTED_PAIRS[0]?.quote;
    if (!usdc) throw new Error("no pair");
    mints.set(usdc.mint, {
      owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      decimals: 6,
    });
    const wrongOwner = await runNetworkReport(
      env(),
      world({ mints, programExecutable: false }),
    );
    expect(status(wrongOwner)["Relay program"]).toBe("fail");
    expect(status(wrongOwner)["token USDC"]).toBe("fail");

    mints.set(usdc.mint, { owner: TOKEN_PROGRAM_ADDRESS, decimals: 9 });
    const wrongDecimals = await runNetworkReport(env(), world({ mints }));
    expect(status(wrongDecimals)["token USDC"]).toBe("fail");
  });

  it("warns about a missing token (the mainnet USDC mint does not exist on devnet)", async () => {
    const results = await runNetworkReport(env(), world({ mints: new Map() }));
    expect(status(results)["token USDC"]).toBe("warn");
    expect(reportOk(results)).toBe(true);
  });

  it("warns about a rate-limited price source and points at the key setting", async () => {
    const results = await runNetworkReport(
      env(),
      world({ mints: allMints(), jupiterStatus: 429 }),
    );
    const price = results.find((r) => r.name === "reference price (Jupiter)");
    expect(price?.status).toBe("warn");
    expect(price?.detail).toContain("JUPITER_API_KEY");
  });

  it("warns when no creator allowlist is set", async () => {
    const results = await runNetworkReport(env(), world({ mints: allMints() }));
    expect(status(results)["feed policy"]).toBe("warn");
  });

  it("never prints the RPC URL or its key, even on failure", async () => {
    for (const w of [
      world({ rpcDown: true }),
      world({ rpcStatus: 500 }),
      world({ mints: allMints() }),
    ]) {
      const text = JSON.stringify(await runNetworkReport(env(), w));
      expect(text).not.toContain("SUPERSECRETKEY");
      expect(text).not.toContain("provider.example");
    }
  });

  it("only reads: it calls nothing that sends or signs", async () => {
    const calls: string[] = [];
    const methods: string[] = [];
    const inner = world({ mints: allMints(), calls });
    await runNetworkReport(env(), async (url, init) => {
      if (init?.body !== undefined) {
        const b: unknown = JSON.parse(String(init.body));
        if (isRecord(b) && typeof b.method === "string") methods.push(b.method);
      }
      return inner(url, init);
    });
    expect(new Set(methods)).toEqual(
      new Set(["getSlot", "getGenesisHash", "getAccountInfo"]),
    );
  });

  it("says a local network is for tests", async () => {
    const results = await runNetworkReport(
      loadEnv({ NETWORK: "localnet" }),
      world({ mints: allMints() }),
    );
    expect(status(results)["network setting"]).toBe("warn");
    expect(status(results)["RPC network"]).toBe("warn");
    expect(status(results)["swap venue"]).toBe("pass");
  });
});
