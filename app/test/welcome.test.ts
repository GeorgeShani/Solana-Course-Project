import { describe, expect, test } from "bun:test";
import {
  CURTAIN_SESSION_KEY,
  LEGACY_ENTERED_KEY,
  WELCOME_BOOT_SCRIPT,
  WELCOME_KEY,
  WELCOME_SEEN,
} from "../src/features/onboarding/welcome-state";

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
  test("a load of / gets the full welcome, even when this browser has already seen it", () => {
    expect(boot()).toMatchObject({ welcome: "on", curtain: "off" });
    expect(boot({ local: { [WELCOME_KEY]: WELCOME_SEEN } })).toMatchObject({
      welcome: "on",
      curtain: "off",
    });
    expect(
      boot({
        local: { [WELCOME_KEY]: WELCOME_SEEN, [LEGACY_ENTERED_KEY]: "1" },
        session: { [CURTAIN_SESSION_KEY]: "1" },
      }),
    ).toMatchObject({ welcome: "on", curtain: "off" });
  });

  test("reduced motion still gets the welcome", () => {
    expect(boot({ reducedMotion: true })).toMatchObject({
      welcome: "on",
      curtain: "off",
    });
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

  test("the old ?welcome link still opens the welcome", () => {
    expect(boot({ search: "?welcome=true" }).welcome).toBe("on");
    expect(boot({ path: "/updates", search: "?welcome=true" }).welcome).toBe(
      "off",
    );
  });

  test("blocked storage still shows the welcome", () => {
    expect(boot({ storageThrows: true }).welcome).toBe("on");
  });
});
