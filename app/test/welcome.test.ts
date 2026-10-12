import { describe, expect, test } from "bun:test";
import {
  CURTAIN_SESSION_KEY,
  LEGACY_ENTERED_KEY,
  WELCOME_BOOT_SCRIPT,
  WELCOME_KEY,
  WELCOME_SEEN,
} from "../src/lib/welcome";

interface Visit {
  path?: string;
  search?: string;
  local?: Record<string, string>;
  session?: Record<string, string>;
  reducedMotion?: boolean;
  storageThrows?: boolean;
}

/** Runs the real head script against a fake page and returns what it decided. */
function boot(v: Visit = {}) {
  const dataset: Record<string, string> = {};
  const session = { ...v.session };
  const local = { ...v.local };
  const store = (data: Record<string, string>) => ({
    getItem(k: string) {
      if (v.storageThrows) throw new Error("blocked");
      return data[k] ?? null;
    },
    setItem(k: string, val: string) {
      if (v.storageThrows) throw new Error("blocked");
      data[k] = val;
    },
  });
  const run = new Function(
    "document",
    "location",
    "localStorage",
    "sessionStorage",
    "matchMedia",
    "URLSearchParams",
    WELCOME_BOOT_SCRIPT,
  );
  run(
    { documentElement: { dataset } },
    { pathname: v.path ?? "/", search: v.search ?? "" },
    store(local),
    store(session),
    () => ({ matches: v.reducedMotion === true }),
    URLSearchParams,
  );
  return { welcome: dataset.welcome, curtain: dataset.curtain, session };
}

describe("welcome boot script", () => {
  test("a new visitor on / gets the full welcome and no curtain", () => {
    expect(boot()).toMatchObject({ welcome: "on", curtain: "off" });
  });

  test("a returning visitor enters Discover and gets the short curtain once per session", () => {
    const seen = { [WELCOME_KEY]: WELCOME_SEEN };
    const first = boot({ local: seen });
    expect(first).toMatchObject({ welcome: "off", curtain: "on" });
    expect(first.session[CURTAIN_SESSION_KEY]).toBe("1");
    expect(boot({ local: seen, session: first.session })).toMatchObject({
      welcome: "off",
      curtain: "off",
    });
  });

  test("reduced motion drops the curtain but never the welcome", () => {
    expect(
      boot({ local: { [WELCOME_KEY]: WELCOME_SEEN }, reducedMotion: true }),
    ).toMatchObject({ welcome: "off", curtain: "off" });
    expect(boot({ reducedMotion: true })).toMatchObject({ welcome: "on" });
  });

  test("the earlier flag still counts, so existing users are not shown the welcome again", () => {
    expect(boot({ local: { [LEGACY_ENTERED_KEY]: "1" } }).welcome).toBe("off");
  });

  test("an unknown or older preference value shows the welcome", () => {
    expect(boot({ local: { [WELCOME_KEY]: "v1" } }).welcome).toBe("on");
  });

  test("deep links never get the welcome or the curtain", () => {
    for (const path of [
      "/ideas/hayes-ai-credit-deflation",
      "/profiles/arthur-hayes",
      "/updates",
      "/watchlist",
      "/plans/abc",
    ]) {
      expect(boot({ path })).toMatchObject({ welcome: "off", curtain: "off" });
    }
  });

  test("a plan deep link on / and the dev preview skip the welcome for a new visitor", () => {
    expect(boot({ search: "?plan=abc" }).welcome).toBe("off");
    expect(boot({ search: "?preview=fictional" }).welcome).toBe("off");
  });

  test("the old ?welcome link still opens the welcome, even for a returning visitor", () => {
    expect(
      boot({ search: "?welcome=true", local: { [WELCOME_KEY]: WELCOME_SEEN } })
        .welcome,
    ).toBe("on");
    expect(boot({ path: "/updates", search: "?welcome=true" }).welcome).toBe(
      "off",
    );
  });

  test("blocked storage never blocks the page", () => {
    expect(boot({ storageThrows: true }).welcome).toBe("off");
  });
});
