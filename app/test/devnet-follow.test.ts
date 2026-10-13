import { expect, test } from "bun:test";
import { DEVNET_USDC, USDC } from "@relay/domain";
import { pairById } from "../src/features/plans/execution/follow";
import { parseFollowAvailability } from "../src/features/plans/api";

test("trade clients select token mints for the requested network", () => {
  expect(pairById("sol-usdc", "devnet")?.quote.mint).toBe(DEVNET_USDC.mint);
  expect(pairById("sol-usdc", "localnet")?.quote.mint).toBe(USDC.mint);
  expect(pairById("jup-usdc", "devnet")).toBeUndefined();
});
test("availability comes from a checked server response", () => {
  const value = {
    network: "devnet",
    available: false,
    venue: "simulated_venue",
    label: "Simulated swap venue (devnet)",
    message: "Pool missing",
    poolAddress: null,
    priceUnits: null,
  };
  expect(parseFollowAvailability(value).available).toBe(false);
  expect(() =>
    parseFollowAvailability({ ...value, network: "mainnet" }),
  ).toThrow();
  expect(() =>
    parseFollowAvailability({ ...value, available: "true" }),
  ).toThrow();
  expect(() =>
    parseFollowAvailability({ ...value, available: true }),
  ).toThrow();
});
