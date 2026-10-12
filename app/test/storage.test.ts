import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  canSaveInBrowser,
  createBrowserStore,
} from "../src/lib/storage/browser-store";
import {
  DISCOVERY_WATCH_KEY,
  MAX_WATCHED,
  isWatched,
  markSeen,
  parseDiscoveryWatch,
  removeWatch,
  toggleWatch,
} from "../src/features/discovery/watch";

/** A localStorage stand-in that can be told to refuse reads or writes, like a private window. */
class FakeStorage {
  data = new Map<string, string>();
  failWrites = false;
  failReads = false;
  getItem(k: string): string | null {
    if (this.failReads) throw new Error("blocked");
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    if (this.failWrites) throw new Error("quota");
    this.data.set(k, v);
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
}

let fake = new FakeStorage();
const setWindow = (value: unknown) => Reflect.set(globalThis, "window", value);
const removeWindow = () => Reflect.deleteProperty(globalThis, "window");

beforeEach(() => {
  fake = new FakeStorage();
  setWindow({
    localStorage: fake,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
});
afterEach(() => {
  removeWindow();
});

const watching = () => parseDiscoveryWatch(fake.getItem(DISCOVERY_WATCH_KEY));

describe("browser store", () => {
  const store = () =>
    createBrowserStore<string[]>({
      key: "relay:test-store",
      empty: [],
      parse: (raw) => (raw ? raw.split(",") : []),
      serialize: (v) => v.join(","),
    });

  test("round-trips a value and survives a reload", () => {
    const a = store();
    expect(a.read()).toEqual([]);
    expect(a.write(["x", "y"])).toBe(true);
    expect(a.read()).toEqual(["x", "y"]);
    // A new store over the same storage is a page reload.
    expect(store().read()).toEqual(["x", "y"]);
  });

  test("blocked storage reads as empty and says the write failed", () => {
    const s = store();
    fake.failReads = true;
    expect(s.read()).toEqual([]);
    fake.failReads = false;
    fake.failWrites = true;
    expect(s.write(["x"])).toBe(false);
    expect(s.read()).toEqual([]);
  });

  test("no storage at all (server render, a sandboxed frame) is empty and unwritable", () => {
    removeWindow();
    const s = store();
    expect(s.read()).toEqual([]);
    expect(s.write(["x"])).toBe(false);
    expect(canSaveInBrowser()).toBe(false);
  });

  test("canSaveInBrowser probes a real write and leaves nothing behind", () => {
    expect(canSaveInBrowser()).toBe(true);
    expect(fake.data.size).toBe(0);
    fake.failWrites = true;
    expect(canSaveInBrowser()).toBe(false);
  });
});

describe("watching ideas and profiles", () => {
  test("watching survives a reload and needs no account", () => {
    expect(
      toggleWatch("idea", "hayes-ai-credit-deflation", "Hayes", "7"),
    ).toEqual({ ok: true, watching: true });
    expect(watching()).toEqual([
      expect.objectContaining({
        type: "idea",
        id: "hayes-ai-credit-deflation",
        after: "7",
      }),
    ]);
    expect(isWatched(watching(), "idea", "hayes-ai-credit-deflation")).toBe(
      true,
    );
  });

  test("watching twice stops watching", () => {
    toggleWatch("trader", "arthur-hayes", "Arthur Hayes", "3");
    expect(toggleWatch("trader", "arthur-hayes", "Arthur Hayes", "3")).toEqual({
      ok: true,
      watching: false,
    });
    expect(watching()).toEqual([]);
  });

  test("a new watch starts at what the reader is looking at; unknown starts at zero", () => {
    toggleWatch("idea", "idea-one-test", "One", null);
    expect(watching()[0]?.after).toBe("0");
  });

  test("the cursor moves forward only, and only for something watched", () => {
    toggleWatch("idea", "idea-one-test", "One", "5");
    expect(markSeen("idea", "idea-one-test", "9")).toBe(true);
    expect(watching()[0]?.after).toBe("9");
    expect(markSeen("idea", "idea-one-test", "4")).toBe(false);
    expect(markSeen("idea", "idea-one-test", "9")).toBe(false);
    expect(markSeen("idea", "never-watched", "99")).toBe(false);
    expect(markSeen("idea", "idea-one-test", "not a number")).toBe(false);
    expect(watching()[0]?.after).toBe("9");
  });

  test("cursors beyond 2^53 stay exact", () => {
    toggleWatch("idea", "idea-one-test", "One", "9007199254740993");
    expect(markSeen("idea", "idea-one-test", "9007199254740995")).toBe(true);
    expect(watching()[0]?.after).toBe("9007199254740995");
  });

  test("reports blocked storage instead of pretending it saved", () => {
    fake.failWrites = true;
    expect(toggleWatch("idea", "idea-one-test", "One", "1")).toEqual({
      ok: false,
      reason: "storage_unavailable",
    });
  });

  test("stops at the limit the server accepts", () => {
    for (let i = 0; i < MAX_WATCHED; i++)
      toggleWatch("idea", `idea-${String(i).padStart(3, "0")}`, "x", "0");
    expect(toggleWatch("idea", "idea-over-the-limit", "x", "0")).toEqual({
      ok: false,
      reason: "limit_reached",
    });
    expect(watching()).toHaveLength(MAX_WATCHED);
  });

  test("removing forgets only what was asked", () => {
    toggleWatch("idea", "idea-one-test", "One", "1");
    toggleWatch("trader", "trader-one-test", "T", "1");
    expect(removeWatch("idea", "idea-one-test")).toBe(true);
    expect(watching().map((w) => w.id)).toEqual(["trader-one-test"]);
  });

  test("damaged storage never hides the rest or crashes", () => {
    fake.setItem(
      DISCOVERY_WATCH_KEY,
      JSON.stringify({
        v: 1,
        items: [
          { type: "idea", id: "good-idea-id", label: "Good", after: "oops" },
          { type: "nope", id: "bad-type-id" },
          { type: "idea", id: "BAD ID" },
          42,
        ],
      }),
    );
    expect(watching()).toEqual([
      expect.objectContaining({ id: "good-idea-id", after: "0" }),
    ]);
    fake.setItem(DISCOVERY_WATCH_KEY, "{not json");
    expect(watching()).toEqual([]);
    fake.setItem(DISCOVERY_WATCH_KEY, JSON.stringify({ v: 2, items: [] }));
    expect(watching()).toEqual([]);
  });
});
