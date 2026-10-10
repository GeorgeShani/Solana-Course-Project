import { describe, expect, test } from "bun:test";
import type { PlanCardView } from "../src/lib/api";
import { fictionalPreviewFeed } from "../src/lib/fixtures";
import { RECORD_KIND } from "../src/lib/record-kind";
import { explorerAccountUrl } from "../src/lib/sources";
import { parseTraderWatchList } from "../src/lib/trader-watch";
import { groupTraders, traderName } from "../src/lib/traders";
import { snapshotOf } from "../src/lib/watchlist";

const NOW = 1_800_000_000_000;

function withCreator(
  card: PlanCardView,
  creator: PlanCardView["creator"],
  publishedAt: number,
  planPda: string,
): PlanCardView {
  return {
    ...card,
    planPda,
    creator,
    version: { ...card.version, publishedAt },
  };
}

describe("trader index", () => {
  const base = fictionalPreviewFeed(NOW).items[0];
  const wallet = { handle: null, displayName: null, isDemo: false };
  const items = [
    withCreator(base, { address: "A1", ...wallet }, 100, "p1"),
    withCreator(
      base,
      {
        address: "D1",
        handle: "noor_demo",
        displayName: "Noor (demo)",
        isDemo: true,
      },
      300,
      "p2",
    ),
    withCreator(base, { address: "A1", ...wallet }, 200, "p3"),
    withCreator(
      base,
      { address: "N1", handle: "ren", displayName: "Ren", isDemo: false },
      50,
      "p4",
    ),
  ];

  test("groups plans by the wallet that signed them, newest plan first", () => {
    const traders = groupTraders(items);
    const a1 = traders.find((t) => t.address === "A1");
    expect(a1?.plans.map((p) => p.planPda)).toEqual(["p3", "p1"]);
    expect(a1?.latestPublishedAt).toBe(200);
  });

  test("lists real profiles, then demo creators, then bare wallets", () => {
    expect(groupTraders(items).map((t) => t.address)).toEqual([
      "N1",
      "D1",
      "A1",
    ]);
  });

  test("a bare wallet is named by its address, never given a made-up name", () => {
    expect(
      traderName({
        address: "Cm9tDS7r5V6sMpGuB2sEvUa1MKRzy6ox4QYEUBPPfvap",
        handle: null,
        displayName: null,
      }),
    ).toBe("Cm9t…fvap");
  });
});

describe("watched traders", () => {
  test("keeps valid entries and drops broken or duplicate ones", () => {
    const raw = JSON.stringify([
      { address: "A1", label: "Wallet", savedAt: 5, seenPublishedAt: 100 },
      { address: "A1", label: "dup", savedAt: 6, seenPublishedAt: 1 },
      { address: "", label: "empty" },
      "nonsense",
      { address: "B2", label: 7, savedAt: "x", seenPublishedAt: 1.5 },
    ]);
    expect(parseTraderWatchList(raw)).toEqual([
      { address: "A1", label: "Wallet", savedAt: 5, seenPublishedAt: 100 },
      { address: "B2", label: "B2", savedAt: 0, seenPublishedAt: null },
    ]);
  });

  test("unreadable storage is an empty list, not an error", () => {
    expect(parseTraderWatchList("{not json")).toEqual([]);
    expect(parseTraderWatchList(null)).toEqual([]);
  });
});

describe("sources", () => {
  test("the local fork has no public explorer link", () => {
    expect(explorerAccountUrl("A1", "localnet")).toBeNull();
  });

  test("devnet and mainnet link to Solana Explorer", () => {
    expect(explorerAccountUrl("A1", "devnet")).toBe(
      "https://explorer.solana.com/address/A1?cluster=devnet",
    );
    expect(explorerAccountUrl("A1", "mainnet")).toBe(
      "https://explorer.solana.com/address/A1",
    );
  });

  test("a public post is never described as proof of a trade", () => {
    expect(RECORD_KIND.public_post.meaning).toContain(
      "not proof that a trade happened",
    );
    expect(RECORD_KIND.fictional.label).toBe("Fictional demo");
  });
});

describe("watch snapshot", () => {
  test("records the plan's terms and price as seen", () => {
    const card = fictionalPreviewFeed(NOW).items[0];
    const snap = snapshotOf(card, "in_range");
    expect(snap).toEqual({
      status: "in_range",
      version: card.version.version,
      priceUnits: card.entry.price?.units ?? null,
      quoteDecimals: card.pair.quoteDecimals,
      entryLow: card.version.entryLow,
      entryHigh: card.version.entryHigh,
      expiresAt: card.version.expiresAt,
    });
  });
});
