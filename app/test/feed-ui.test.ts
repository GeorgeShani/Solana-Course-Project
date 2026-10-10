import type { EntryStatus } from "@relay/domain";
import { describe, expect, test } from "bun:test";
import {
  ApiContractError,
  fetchPlanVersions,
  parseFeedPage,
  type FeedPage,
  type PlanCardView,
} from "../src/lib/api";
import {
  initialOrder,
  reconcileOrder,
  showNewest,
  visibleCards,
} from "../src/lib/feed-order";
import { fictionalPreviewFeed } from "../src/lib/fixtures";
import {
  formatAge,
  formatDuration,
  formatUsd,
  formatUsdText,
  shortAddress,
} from "../src/lib/format";
import { stageName } from "../src/lib/labels";
import { chainNowMs, liveEntry } from "../src/lib/live-status";
import { rangeGeometry } from "../src/lib/range";
import {
  STATUS_HEADLINE,
  reviewUnavailableReason,
  statusHeadline,
  statusHint,
} from "../src/lib/status";
import { parseWatchList } from "../src/lib/watchlist";

const NOW = 1_800_000_000_000;
const ALL_STATUSES: EntryStatus[] = [
  "in_range",
  "above_range",
  "below_range",
  "expired",
  "closed",
  "price_stale",
  "price_unavailable",
];

function card(overrides: Partial<PlanCardView> = {}): PlanCardView {
  const base = fictionalPreviewFeed(NOW).items[0];
  const { fictionalPreview: _drop, ...plain } = base;
  return { ...plain, ...overrides };
}

function page(ids: string[], nextCursor: string | null = null): FeedPage {
  return {
    items: ids.map((planPda) => card({ planPda })),
    nextCursor,
    nowMs: NOW,
  };
}

describe("status vocabulary", () => {
  test("headlines are the exact plan words", () => {
    expect(STATUS_HEADLINE).toEqual({
      in_range: "In plan range",
      above_range: "Original entry passed",
      below_range: "Below plan range",
      expired: "Plan expired",
      closed: "Closed by creator",
      price_stale: "Price may be outdated",
      price_unavailable: "Price unavailable",
    });
    expect(
      Object.values(STATUS_HEADLINE).join(" ").toLowerCase(),
    ).not.toContain("eligible");
  });

  test("closing soon is appended only to in-range", () => {
    const input = {
      closingSoon: true,
      msUntilExpiry: 7 * 60_000,
      expiresAt: 0,
      priceAgeMs: null,
    };
    expect(statusHeadline({ ...input, status: "in_range" })).toBe(
      "In plan range · closes in 7 min",
    );
    expect(statusHeadline({ ...input, status: "above_range" })).toBe(
      "Original entry passed",
    );
  });

  test("stale hint names the price age", () => {
    const hint = statusHint({
      status: "price_stale",
      closingSoon: false,
      msUntilExpiry: 0,
      expiresAt: 0,
      priceAgeMs: 125_000,
    });
    expect(hint).toBe(
      "Last price 2 min ago. Status will update when data returns.",
    );
  });

  test("a missing review always comes with a reason", () => {
    for (const s of ALL_STATUSES)
      expect(reviewUnavailableReason(s).length).toBeGreaterThan(0);
    expect(reviewUnavailableReason("above_range")).toBe(
      "Original entry passed — no Relay entry available",
    );
  });
});

describe("format", () => {
  test("usd is exact, grouped and keeps two decimals", () => {
    expect(formatUsd(1_234_500_000n, 6)).toBe("$1,234.50");
    expect(formatUsd(411_500n, 6)).toBe("$0.4115");
    expect(formatUsd(100_000_000n, 6)).toBe("$100.00");
    expect(formatUsdText("180.5")).toBe("$180.50");
    expect(formatUsdText("12345")).toBe("$12,345.00");
  });

  test("durations and ages", () => {
    expect(formatDuration(-5)).toBe("0s");
    expect(formatDuration(59_999)).toBe("59s");
    expect(formatDuration(7 * 60_000)).toBe("7 min");
    expect(formatDuration(125 * 60_000)).toBe("2 h 5 min");
    expect(formatDuration(28 * 3_600_000)).toBe("1 d 4 h");
    expect(formatAge(400)).toBe("just now");
    expect(formatAge(12_000)).toBe("12s ago");
  });

  test("short address", () => {
    expect(shortAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")).toBe(
      "7xKX…gAsU",
    );
    expect(shortAddress("short")).toBe("short");
  });
});

describe("range bar", () => {
  test("in range sits inside the band", () => {
    const g = rangeGeometry(100n, 200n, 150n);
    expect(g.position).toBe("in_range");
    expect(g.marker).toBe(50);
    expect(g.clamped).toBe(false);
  });

  test("one unit outside is visibly outside the band", () => {
    const above = rangeGeometry(100n, 200n, 201n);
    expect(above.position).toBe("above_range");
    expect(above.marker).toBeGreaterThan(above.bandEnd);
    const below = rangeGeometry(100n, 200n, 99n);
    expect(below.position).toBe("below_range");
    expect(below.marker).toBeLessThan(below.bandStart);
  });

  test("far outside is clamped to the track edge", () => {
    const g = rangeGeometry(100n, 200n, 100_000n);
    expect(g.marker).toBe(97);
    expect(g.clamped).toBe(true);
  });

  test("no price has no marker and no position", () => {
    const g = rangeGeometry(100n, 200n, null);
    expect(g.marker).toBeNull();
    expect(g.position).toBeNull();
  });

  test("single-price plan still lays out", () => {
    const g = rangeGeometry(100_000_000n, 100_000_000n, 100_000_000n);
    expect(g.position).toBe("in_range");
    expect(Number.isFinite(g.marker)).toBe(true);
  });
});

describe("watch list parsing", () => {
  test("bad storage never throws", () => {
    expect(parseWatchList(null)).toEqual([]);
    expect(parseWatchList("not json")).toEqual([]);
    expect(parseWatchList('{"planPda":"x"}')).toEqual([]);
  });

  test("drops invalid entries and duplicates, fills defaults", () => {
    const raw = JSON.stringify([
      { planPda: "a", label: "SOL / USDC · A", savedAt: 5 },
      { planPda: "a", label: "dup", savedAt: 6 },
      { planPda: "", label: "empty" },
      null,
      { planPda: "b" },
    ]);
    expect(parseWatchList(raw)).toEqual([
      { planPda: "a", label: "SOL / USDC · A", savedAt: 5 },
      { planPda: "b", label: "b", savedAt: 0 },
    ]);
  });
});

describe("api contract", () => {
  const wire = () => JSON.parse(JSON.stringify(page(["p1", "p2"], "cursor-1")));

  test("parses a valid page", () => {
    const parsed = parseFeedPage(wire());
    expect(parsed.items.map((c) => c.planPda)).toEqual(["p1", "p2"]);
    expect(parsed.nextCursor).toBe("cursor-1");
    expect(parsed.items[0].fictionalPreview).toBeUndefined();
  });

  test("rejects unknown status and non-integer units", () => {
    const badStatus = wire();
    badStatus.items[0].entry.status = "eligible";
    expect(() => parseFeedPage(badStatus)).toThrow(ApiContractError);
    const badUnits = wire();
    badUnits.items[1].version.entryLowUnits = "1.5";
    expect(() => parseFeedPage(badUnits)).toThrow(
      "feed.items[1].version.entryLowUnits",
    );
  });

  test("keeps the committed reference price, and null when the text has none", () => {
    const withRef = wire();
    withRef.items[0].version.text.refPrice = {
      units: "108938245",
      display: "108.938245",
      source: "jupiter-price-v3",
    };
    const parsed = parseFeedPage(withRef);
    expect(parsed.items[0].version.text?.refPrice).toEqual({
      display: "108.938245",
      source: "jupiter-price-v3",
    });
    expect(parsed.items[1].version.text?.refPrice).toBeNull();
  });

  test("plan versions come back oldest first and are validated", async () => {
    const v = wire().items[0].version;
    const realFetch = globalThis.fetch;
    const reply = (body: unknown) =>
      Object.assign(
        async () => new Response(JSON.stringify(body), { status: 200 }),
        { preconnect: realFetch.preconnect },
      );
    try {
      globalThis.fetch = reply({
        versions: [
          { ...v, version: 1 },
          { ...v, version: 2 },
        ],
      });
      expect(
        (await fetchPlanVersions("/api", "pda")).map((x) => x.version),
      ).toEqual([1, 2]);
      globalThis.fetch = reply({ versions: [{ ...v, termsHash: 7 }] });
      await expect(fetchPlanVersions("/api", "pda")).rejects.toThrow(
        "plan.versions[0].termsHash",
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("labels", () => {
  test("the portrait plate drops a demo creator's suffix; the badge carries it", () => {
    const demo = card({
      creator: {
        address: "a",
        handle: "mika_demo",
        displayName: "Mika Tan (demo)",
        isDemo: true,
      },
    });
    expect(stageName(demo)).toBe("Mika Tan");
    const real = card({
      creator: {
        address: "a",
        handle: null,
        displayName: "Sam (demo)",
        isDemo: false,
      },
    });
    expect(stageName(real)).toBe("Sam (demo)");
  });
});

describe("live status", () => {
  test("chain now advances by wall time since the response", () => {
    expect(chainNowMs(5_000, 1_000, null)).toBe(5_000);
    expect(chainNowMs(5_000, 1_000, 4_000)).toBe(8_000);
    expect(chainNowMs(5_000, 1_000, 500)).toBe(5_000);
  });

  test("an in-range card goes stale, then expires, without new data", () => {
    const c = card();
    expect(liveEntry(c, NOW).status).toBe("in_range");
    expect(liveEntry(c, NOW + 2 * 60_000).status).toBe("price_stale");
    expect(liveEntry(c, NOW + 2 * 3_600_000).status).toBe("expired");
  });
});

describe("feed order", () => {
  test("newcomers wait in pending instead of jumping above the reader", () => {
    const first = initialOrder([page(["a", "b"])]);
    const refreshed = reconcileOrder(first, [page(["n", "a", "b"])]);
    expect(refreshed.order).toEqual(["a", "b"]);
    expect(refreshed.pending).toEqual(["n"]);
    expect(showNewest(refreshed).order).toEqual(["n", "a", "b"]);
    expect(showNewest(refreshed).pending).toEqual([]);
  });

  test("later pages append; cards that drop out stay visible", () => {
    const first = initialOrder([page(["a", "b"], "c1")]);
    const more = reconcileOrder(first, [
      page(["a", "b"], "c1"),
      page(["c", "a"]),
    ]);
    expect(more.order).toEqual(["a", "b", "c"]);
    expect(more.pending).toEqual([]);
    const dropped = reconcileOrder(more, [page(["a"])]);
    expect(visibleCards(dropped).map((c) => c.planPda)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  test("an empty first load adopts the first data that arrives", () => {
    const empty = initialOrder([]);
    expect(reconcileOrder(empty, [page(["a"])]).order).toEqual(["a"]);
  });
});

describe("fictional preview fixtures", () => {
  const feed = fictionalPreviewFeed(NOW);

  test("every card is flagged, unmistakably named, and has no hashes or real addresses", () => {
    for (const c of feed.items) {
      expect(c.fictionalPreview).toBe(true);
      expect(c.creator.displayName ?? "").toStartWith("Understudy");
      expect(c.planPda).toStartWith("fictional-preview-");
      expect(c.creator.address).toStartWith("fictional-creator-");
      expect(c.version.versionPda).toBe("");
      expect(c.version.termsHash).toBe("");
      expect(c.version.contentHash).toBe("");
      expect(c.version.prevTermsHash).toBe("");
    }
  });

  test("covers every status", () => {
    const shown = new Set(feed.items.map((c) => liveEntry(c, NOW).status));
    expect([...shown].sort()).toEqual([...ALL_STATUSES].sort());
  });
});
