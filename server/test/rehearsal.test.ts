import { expect, test } from "bun:test";
import { address } from "@solana/kit";
import {
  pendingOutcome,
  parsePendingTransaction,
} from "../src/shared/rehearsal-send";
import { entryStatus } from "@relay/domain";
import {
  makeRehearsalDrafts,
  fundingTopUp,
  venueFundingInstructions,
  rehearsalArgs,
  REHEARSAL_CREATOR,
} from "../src/shared/rehearsal";

test("rehearsal defaults to a public preview and rejects mistyped or duplicated flags", () => {
  expect(rehearsalArgs([]).publish).toBe(false);
  expect(rehearsalArgs([]).creator).toBe(REHEARSAL_CREATOR);
  expect(rehearsalArgs(["--publish", "--keypair", "local-file"]).publish).toBe(
    true,
  );
  expect(() => rehearsalArgs(["--publish", "--publish"])).toThrow();
  expect(() => rehearsalArgs(["--keypair"])).toThrow();
  expect(() => rehearsalArgs(["--publsih"])).toThrow();
});

test("three seven-day test plans match the configured venue cases without trade recommendations", () => {
  const now = 1_800_000_000;
  const drafts = makeRehearsalDrafts(now);
  expect(
    drafts.map(
      (draft) =>
        entryStatus({
          plan: { status: "open", ...draft.terms },
          price: { units: 100_000_000n, observedAtMs: now * 1000 },
          nowMs: now * 1000,
        }).status,
    ),
  ).toEqual(["in_range", "below_range", "above_range"]);
  for (const draft of drafts) {
    expect(draft.terms.expiresAt).toBe(BigInt(now + 7 * 86_400));
    expect(draft.wire.rationale).toContain("Devnet test");
    expect(draft.wire.rationale).toContain("not trading advice");
  }
});

test("funding tops up a target rather than repeating a deposit on retry", () => {
  expect(fundingTopUp(0n, 20_000_000n)).toBe(20_000_000n);
  expect(fundingTopUp(7_000_000n, 20_000_000n)).toBe(13_000_000n);
  expect(fundingTopUp(25_000_000n, 20_000_000n)).toBe(0n);
  expect(() => fundingTopUp(-1n, 20_000_000n)).toThrow();
});

test("uncertain funding blocks a new send until confirmed or provably expired", () => {
  expect(pendingOutcome(null, 99n, 100n)).toBe("pending");
  expect(pendingOutcome(null, 100n, 100n)).toBe("pending");
  expect(pendingOutcome(null, 101n, 100n)).toBe("expired");
  expect(
    pendingOutcome({ confirmationStatus: "processed", err: null }, 101n, 100n),
  ).toBe("pending");
  expect(
    pendingOutcome({ confirmationStatus: "confirmed", err: null }, 99n, 100n),
  ).toBe("confirmed");
  expect(
    pendingOutcome(
      { confirmationStatus: "finalized", err: { InstructionError: [0, 1] } },
      99n,
      100n,
    ),
  ).toBe("failed");
  expect(parsePendingTransaction(undefined)).toBeNull();
  expect(() =>
    parsePendingTransaction({ signature: "fake", lastValidBlockHeight: "100" }),
  ).toThrow();
});

test("pool funding uses idempotent vault creation and transfer plus SyncNative", () => {
  const payer = address("HRJpuCAo3bvBgUUSTbcqNRupR853yaQ1FMcXMkEikp1e");
  const pool = address("11111111111111111111111111111111");
  const vault = address("So11111111111111111111111111111111111111112");
  const instructions = venueFundingInstructions(
    payer,
    pool,
    vault,
    vault,
    20_000_000n,
  );
  expect(instructions.map((ix) => [...(ix.data ?? [])])).toEqual([
    [1],
    [1],
    [2, 0, 0, 0, 0, 45, 49, 1, 0, 0, 0, 0],
    [17],
  ]);
  expect(instructions[2].accounts?.[0].address).toBe(payer);
  expect(instructions[2].accounts?.[1].address).toBe(vault);
  expect(venueFundingInstructions(payer, pool, vault, vault, 0n)).toHaveLength(
    3,
  );
});
