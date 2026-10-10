import { describe, expect, test } from "bun:test";
import { ApiContractError, parseExecution } from "../src/lib/api";
import { CUE_ART } from "../src/components/cue/cue-art";
import type { CueArtNode } from "../src/components/cue/art-node";
import { DEMO_LABEL, DEMO_PLAN, DEMO_STEPS, demoState } from "../src/lib/demo";
import { fictionalPreviewFeed } from "../src/lib/fixtures";
import {
  estimateOpen,
  isAddress,
  plausibleBlockTime,
  watchChanges,
} from "../src/lib/my-plans";
import {
  parseSnapshot,
  parseWatchList,
  type WatchSnapshot,
} from "../src/lib/watchlist";

const NOW = 1_800_000_000_000;

function walk(n: CueArtNode, visit: (n: CueArtNode) => void) {
  visit(n);
  for (const c of n.c ?? []) walk(c, visit);
}

describe("Cue artwork", () => {
  test("every pose from the Figma sheet is present", () => {
    expect(Object.keys(CUE_ART).sort()).toEqual(
      [
        "bow",
        "discover",
        "mascot",
        "missed",
        "saved",
        "unavailable",
        "welcome",
      ].sort(),
    );
  });

  test("character-sheet backdrops are stripped and every clip reference resolves", () => {
    for (const [pose, root] of Object.entries(CUE_ART)) {
      const ids = new Set<string>();
      const refs: string[] = [];
      walk(root, (n) => {
        expect(n.a.fill === "#939393" || n.a.fill === "#F3F1ED").toBe(false);
        if (n.a.id) ids.add(n.a.id);
        const m = n.a.clipPath?.match(/^url\(#(.+)\)$/);
        if (m) refs.push(m[1]);
      });
      for (const r of refs) expect(ids.has(r), `${pose}: #${r}`).toBe(true);
    }
  });

  test("open-eyed poses have pupils that can follow the pointer; the bow has closed eyes", () => {
    const pupils = (root: CueArtNode) => {
      let n = 0;
      walk(root, (x) => {
        if (x.a.className === "cue-pupil") n++;
      });
      return n;
    };
    expect(pupils(CUE_ART.welcome)).toBeGreaterThan(0);
    expect(pupils(CUE_ART.mascot)).toBeGreaterThan(0);
    expect(pupils(CUE_ART.bow)).toBe(0);
  });
});

describe("fictional demo", () => {
  const start = NOW;

  test("Mika's plan starts in range at $143 and passes its entry at $148", () => {
    expect(DEMO_PLAN.creator).toBe("Mika");
    expect(DEMO_PLAN.creatorNote).toBe("fictional demo profile");
    expect(DEMO_LABEL).toBe(
      "Fictional demo · simulated prices · no real trades",
    );
    const first = demoState(0, start);
    expect(first.price.display).toBe("143");
    expect(first.entry.status).toBe("in_range");
    const next = demoState(1, start);
    expect(next.price.display).toBe("148");
    expect(next.entry.status).toBe("above_range");
  });

  test("time only moves through explicit steps and ends past the window", () => {
    expect(DEMO_STEPS[0].minutes).toBe(0);
    const last = demoState(DEMO_STEPS.length - 1, start);
    expect(last.entry.status).toBe("expired");
    expect(demoState(99, start).step).toBe(DEMO_STEPS.length - 1);
    expect(demoState(-3, start).step).toBe(0);
  });

  test("the demo never reaches the API or the real watch list", async () => {
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = Object.assign(
      async () => {
        calls++;
        throw new Error("network used");
      },
      { preconnect: () => {} },
    );
    try {
      for (let i = 0; i < DEMO_STEPS.length; i++) demoState(i, start);
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(calls).toBe(0);
    const route = await Bun.file(
      new URL("../src/routes/demo.tsx", import.meta.url),
    ).text();
    const lib = await Bun.file(
      new URL("../src/lib/demo.ts", import.meta.url),
    ).text();
    for (const src of [route, lib]) {
      expect(src).not.toMatch(/lib\/(api|watchlist)"/);
      expect(src).not.toMatch(/localStorage|sessionStorage|fetch\(/);
    }
  });
});

describe("watch snapshots", () => {
  const snapshot = {
    status: "in_range",
    version: 1,
    priceUnits: "143000000",
    quoteDecimals: 6,
    entryLow: "140",
    entryHigh: "145",
    expiresAt: 1_800_000_600,
  };

  test("a valid snapshot round-trips and a bad one is dropped without losing the plan", () => {
    const raw = JSON.stringify([
      { planPda: "a", label: "A", savedAt: 1, snapshot },
      {
        planPda: "b",
        label: "B",
        savedAt: 2,
        snapshot: { ...snapshot, status: "eligible" },
      },
    ]);
    const list = parseWatchList(raw);
    expect(list[0].snapshot).toEqual({ ...snapshot, status: "in_range" });
    expect(list[1].planPda).toBe("b");
    expect(list[1].snapshot).toBeUndefined();
  });

  test("rejects malformed numbers", () => {
    expect(parseSnapshot({ ...snapshot, priceUnits: "1.5" })).toBeUndefined();
    expect(parseSnapshot({ ...snapshot, entryLow: "abc" })).toBeUndefined();
    expect(parseSnapshot({ ...snapshot, quoteDecimals: 40 })).toBeUndefined();
    expect(
      parseSnapshot({ ...snapshot, priceUnits: null })?.priceUnits,
    ).toBeNull();
  });

  test("changes since watching: status, version and price in plain words", () => {
    const card = fictionalPreviewFeed(NOW).items[0];
    const snap: WatchSnapshot = {
      status: "in_range",
      version: card.version.version,
      priceUnits: card.entry.price?.units ?? null,
      quoteDecimals: card.pair.quoteDecimals,
      entryLow: card.version.entryLow,
      entryHigh: card.version.entryHigh,
      expiresAt: card.version.expiresAt,
    };
    expect(watchChanges(snap, card, "in_range")).toEqual([]);
    const moved = watchChanges(
      { ...snap, version: snap.version + 1, priceUnits: "1" },
      card,
      "above_range",
    );
    expect(moved.map((c) => c.what)).toEqual(["status", "version", "price"]);
    expect(moved[0]).toEqual({
      what: "status",
      then: "In plan range",
      now: "Original entry passed",
    });
  });
});

describe("follow results", () => {
  test("estimated open result uses integer math", () => {
    // 271.957003 JUP bought for 100 USDC; worth 0.37 USDC each now.
    const e = estimateOpen(271_957_003n, 100_000_000n, 370_000n, 6);
    expect(e.value).toBe(100_624_091n);
    expect(e.change).toBe(624_091n);
  });

  test("implausible block times are hidden", () => {
    expect(plausibleBlockTime(1_791_571)).toBeNull();
    expect(plausibleBlockTime(null)).toBeNull();
    expect(plausibleBlockTime(1_791_570_936)).toBe(1_791_570_936);
  });

  test("wallet address check", () => {
    expect(isAddress("966bBKSwFk87ZTfpgWmwm62NZFSj1WhHU8irXEVT9iAQ")).toBe(
      true,
    );
    expect(isAddress("0xabc")).toBe(false);
    expect(isAddress("O0Il".repeat(10))).toBe(false);
  });

  test("execution parsing keeps failed attempts failed and rejects unknown statuses", () => {
    const failed = parseExecution({
      signature: "sig",
      status: "failed",
      follower: "f",
      planPda: "p",
      version: 1,
      receiptPda: null,
      quoteSpent: null,
      baseReceived: null,
      effectivePrice: null,
      errorCode: 6006,
      errorName: "PlanExpired",
      errorMessage: "This plan's entry window has closed.",
      slot: "454918676",
      blockTime: 1791571,
    });
    expect(failed.status).toBe("failed");
    expect(failed.receiptPda).toBeNull();
    expect(() => parseExecution({ ...failed, status: "profit" })).toThrow(
      ApiContractError,
    );
    expect(() => parseExecution({ ...failed, quoteSpent: "-5" })).toThrow(
      ApiContractError,
    );
  });
});
