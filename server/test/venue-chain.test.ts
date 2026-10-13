import { afterEach, beforeEach, expect, it } from "bun:test";
import { findPair } from "@relay/domain";
import {
  encodeVenuePool,
  getVenuePoolAddress,
  SIMULATED_VENUE_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "@relay/domain/solana";
import { address, getAddressEncoder } from "@solana/kit";
import { createChain } from "../src/modules/plans/chain";
import { loadEnv } from "../src/shared/env";

const admin = address("HRJpuCAo3bvBgUUSTbcqNRupR853yaQ1FMcXMkEikp1e");
const pair = findPair("sol-usdc", "devnet") ?? missing();
function missing(): never {
  throw new Error("Missing pair");
}
interface Account {
  owner: string;
  executable: boolean;
  data: [string, string];
  lamports: number;
  rentEpoch: number;
}
let accounts: (Account | null)[];
let rpc: ReturnType<typeof Bun.serve>;
const encoded = (data: Uint8Array) => Buffer.from(data).toString("base64");
const account = (owner: string, data: Uint8Array): Account => ({
  owner,
  executable: false,
  data: [encoded(data), "base64"],
  lamports: 1_000_000,
  rentEpoch: 0,
});
beforeEach(async () => {
  const { address: pool, bump } = await getVenuePoolAddress(
    admin,
    address(pair.base.mint),
    address(pair.quote.mint),
  );
  const vault = (mint: string, amount: bigint) => {
    const bytes = new Uint8Array(165);
    bytes.set(getAddressEncoder().encode(address(mint)), 0);
    bytes.set(getAddressEncoder().encode(pool), 32);
    new DataView(bytes.buffer).setBigUint64(64, amount, true);
    bytes[108] = 1;
    return account(TOKEN_PROGRAM_ADDRESS, bytes);
  };
  accounts = [
    {
      ...account(
        "BPFLoaderUpgradeab1e11111111111111111111111",
        new Uint8Array(),
      ),
      executable: true,
    },
    account(
      SIMULATED_VENUE_PROGRAM_ADDRESS,
      encodeVenuePool({
        admin,
        bump,
        baseMint: address(pair.base.mint),
        quoteMint: address(pair.quote.mint),
        baseDecimals: 9,
        price: 100_000_000n,
      }),
    ),
    vault(pair.base.mint, 1_000_000_000n),
    vault(pair.quote.mint, 0n),
  ];
  rpc = Bun.serve({
    port: 0,
    fetch: async (request) => {
      const body = await request.json();
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: { context: { slot: 1 }, value: accounts },
      });
    },
  });
});
afterEach(() => {
  rpc?.stop(true);
});
const read = () =>
  createChain(`http://127.0.0.1:${rpc.port}`, "devnet").getVenuePool(
    admin,
    pair,
  );
it("reads actual pool balances, including an empty receiving vault", async () => {
  const pool = await read();
  expect(pool?.baseAvailable).toBe(1_000_000_000n);
  expect(pool?.data.quoteMint).toBe(address(pair.quote.mint));
});
it("returns unavailable for missing pool or either vault", async () => {
  for (const index of [1, 2, 3]) {
    const saved = accounts[index];
    accounts[index] = null;
    expect(await read()).toBeNull();
    accounts[index] = saved ?? null;
  }
});
it("rejects a foreign pool owner and a non-executable program", async () => {
  if (accounts[1]) accounts[1].owner = TOKEN_PROGRAM_ADDRESS;
  await expect(read()).rejects.toThrow();
  if (accounts[1]) accounts[1].owner = SIMULATED_VENUE_PROGRAM_ADDRESS;
  if (accounts[0]) accounts[0].executable = false;
  await expect(read()).rejects.toThrow();
});
it("rejects forged pool terms and an invalid bump", async () => {
  const item = accounts[1];
  if (!item) throw new Error("missing account");
  const original = item.data[0];
  for (const offset of [1, 2, 4, 36, 68, 100]) {
    const bytes = Buffer.from(original, "base64");
    if (offset === 100) bytes.fill(0, 100);
    else bytes[offset] = (bytes[offset] ?? 0) ^ 1;
    item.data = [encoded(Uint8Array.from(bytes)), "base64"];
    await expect(read()).rejects.toThrow();
  }
});
it("rejects frozen, foreign, wrong-mint or wrong-owner vaults", async () => {
  const item = accounts[2];
  if (!item) throw new Error("missing vault");
  const original = item.data[0];
  for (const offset of [0, 32, 108]) {
    const bytes = Buffer.from(original, "base64");
    bytes[offset] = (bytes[offset] ?? 0) ^ 1;
    item.data = [encoded(Uint8Array.from(bytes)), "base64"];
    await expect(read()).rejects.toThrow();
  }
  item.data = [original, "base64"];
  item.owner = SIMULATED_VENUE_PROGRAM_ADDRESS;
  await expect(read()).rejects.toThrow();
});
it("requires exactly one configured public venue admin", () => {
  expect(loadEnv({ SIMULATED_VENUE_ADMIN: admin }).simulatedVenueAdmin).toBe(
    admin,
  );
  for (const value of ["not-an-address", `${admin}, ${admin}`])
    expect(() => loadEnv({ SIMULATED_VENUE_ADMIN: value })).toThrow(
      "SIMULATED_VENUE_ADMIN",
    );
});
