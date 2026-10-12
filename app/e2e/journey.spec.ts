import { expect, test } from "@playwright/test";
import { WATCH_KEY, returning, savedWatch } from "./helpers";

const HAYES = "/ideas/hayes-ai-credit-deflation";
const BRANDT = "/ideas/brandt-btc-bottom-oct-4";

test.describe("welcome", () => {
  test("a new visitor sees the welcome once, then Discover", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Explore ideas" }),
    ).toBeVisible();
    await expect(page.locator(".welcome__line")).toBeVisible();
    await page.getByRole("button", { name: "Explore ideas" }).click();
    await expect(
      page.getByRole("heading", { name: "Discover", level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    expect(
      await page.evaluate(() => localStorage.getItem("relay:welcome:v2")),
    ).toBe("seen");

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Discover", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Explore ideas" }),
    ).toBeHidden();
  });

  test("deep links open directly, never behind the welcome", async ({
    page,
  }) => {
    await page.goto(HAYES);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /AI-driven credit deflation/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Explore ideas" }),
    ).toBeHidden();
  });

  test("the old ?welcome=true link opens it, then the URL is clean", async ({
    page,
  }) => {
    await returning(page);
    await page.goto("/?welcome=true");
    await expect(
      page.getByRole("button", { name: "Explore ideas" }),
    ).toBeVisible();
    await expect.poll(() => new URL(page.url()).search).toBe("");
  });
});

test.describe("discover → idea → source → watch", () => {
  test.beforeEach(async ({ page }) => returning(page));

  test("three public profiles as faces, no wallet prompt, and the disclosure on each profile", async ({
    page,
  }) => {
    await page.goto("/");
    const people = page.getByRole("navigation", { name: "Show ideas by" });
    for (const name of ["Arthur Hayes", "Benjamin Cowen", "Peter Brandt"])
      await expect(people.getByRole("link", { name })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connect wallet" }),
    ).toBeHidden();
    for (const id of ["arthur-hayes", "benjamin-cowen", "peter-brandt"]) {
      await page.goto(`/profiles/${id}`);
      await expect(
        page.getByText("Public-source profile · Not claimed by the author"),
      ).toBeVisible();
    }
  });

  test("Hayes: the author's own link makes it an update, with exact sources", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-index]").nth(1).waitFor();
    await page
      .locator('article[aria-label^="AI-driven credit deflation"]')
      .getByRole("link", { name: "See the timeline" })
      .click();
    await expect(page).toHaveURL(new RegExp(HAYES));
    await expect(page.getByText("Update to this idea").first()).toBeVisible();
    await expect(page.getByText("Linked by the author").first()).toBeVisible();

    const links = page.locator(
      'a[target="_blank"][href*="cryptohayes.substack.com"]',
    );
    await expect(links.first()).toHaveAttribute(
      "href",
      "https://cryptohayes.substack.com/p/this-is-fine",
    );
    expect(await links.count()).toBeGreaterThanOrEqual(2);
    for (const l of await links.all()) {
      await expect(l).toHaveAttribute("rel", /noopener/);
      await expect(l).toHaveAttribute("rel", /noreferrer/);
    }
    await expect(
      page.getByRole("heading", {
        name: "What Relay can and cannot establish",
      }),
    ).toBeVisible();
    await expect(page.getByText(/Whether anyone traded/)).toBeVisible();
  });

  test("Brandt: an unconfirmed later item is never called an update", async ({
    page,
  }) => {
    await page.goto(BRANDT);
    await expect(
      page.getByText("Later item · link not established").first(),
    ).toBeVisible();
    await expect(page.getByText("Update to this idea")).toHaveCount(0);
    await expect(page.getByText("Link uncertain").first()).toBeVisible();
  });

  test("watching needs no wallet, survives a reload, and Updates is caught up", async ({
    page,
  }) => {
    await page.goto(HAYES);
    const watch = page.getByRole("button", { name: "Watch this idea" });
    await watch.click();
    await expect(
      page.getByRole("button", { name: "Stop watching this idea" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect((await savedWatch(page)).map((w) => w.id)).toEqual([
      "hayes-ai-credit-deflation",
    ]);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Stop watching this idea" }),
    ).toBeVisible();

    await page.goto("/updates");
    await expect(page.getByText("You're caught up")).toBeVisible();
    await expect(page.getByText("Stored in this browser only")).toBeVisible();

    await page.goto("/watchlist");
    await expect(page.getByRole("tab", { name: /Ideas/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText(/AI-driven credit deflation/)).toBeVisible();
  });

  test("a change opens the exact timeline entry and then counts as seen", async ({
    page,
  }) => {
    await page.goto(HAYES);
    await page.getByRole("button", { name: "Watch this idea" }).click();
    // Sequence numbers differ per database: read them from the API.
    const idea = await (
      await page.request.get("/api/discovery/ideas/hayes-ai-credit-deflation")
    ).json();
    const originSeq: string = idea.events[0].seq;
    const latestSeq: string = idea.latestSeq;
    // Pretend the reader last looked at the original only: the update is new.
    await page.evaluate(
      ([key, after]) => {
        const v = JSON.parse(localStorage.getItem(key) ?? "{}");
        v.items[0].after = after;
        localStorage.setItem(key, JSON.stringify(v));
      },
      [WATCH_KEY, originSeq],
    );

    await page.goto("/updates");
    await expect(
      page.getByText(/Since your last visit: 1 new entry/),
    ).toBeVisible();
    // Showing the list must not mark anything read.
    expect((await savedWatch(page))[0]?.after).toBe(originSeq);

    await page
      .getByRole("link", { name: "Open this entry in the timeline" })
      .click();
    await expect(page).toHaveURL(/#event-hayes-no-trade-zone-update$/);
    await expect(
      page.locator("#event-hayes-no-trade-zone-update"),
    ).toBeFocused();
    await expect
      .poll(async () => (await savedWatch(page))[0]?.after)
      .toBe(latestSeq);

    await page.goto("/updates");
    await expect(page.getByText("You're caught up")).toBeVisible();
  });

  test("plans are separate and optional, and need no wallet to read", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Plans" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/plans$/);
    // The header wallet control is desktop-only; on a phone the wallet lives on Account.
    if (!isMobile) await expect(page.getByText("Connect wallet")).toBeVisible();
  });
});

test.describe("the Discover stream", () => {
  test.beforeEach(async ({ page }) => returning(page));

  test("one idea per screen: recorded ideas first, then items detected automatically and marked unreviewed", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.locator('[role="feed"] [data-index]').nth(5),
    ).toBeAttached();
    const recorded = page.locator('.card[data-kind="idea"]');
    await expect(recorded).toHaveCount(4);
    const detected = page.locator('.card[data-kind="detected"]');
    expect(await detected.count()).toBeGreaterThan(0);
    await expect(detected.first()).toContainText("not reviewed");
    await expect(
      detected.first().getByRole("link", { name: /Open source/ }),
    ).toHaveAttribute("href", /^https:\/\//);
    // Anything already recorded by hand is not repeated as "detected".
    const links = await detected
      .getByRole("link", { name: /Open source/ })
      .evaluateAll((a) => a.map((x) => x.getAttribute("href")));
    expect(links).not.toContain("https://www.youtube.com/watch?v=aEd5onhPxUs");
  });

  test("the previous and next buttons move one idea at a time and show where you are", async ({
    page,
  }) => {
    await page.goto("/");
    const count = page.locator(".pager__count");
    await expect(count).toHaveText(/^1 of \d+$/);
    await expect(
      page.getByRole("button", { name: "Previous idea" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Next idea" }).click();
    await expect(count).toHaveText(/^2 of \d+$/);
    await expect(page.locator('[data-index="1"]')).toHaveAttribute(
      "data-active",
      "true",
    );
    await page.getByRole("button", { name: "Previous idea" }).click();
    await expect(count).toHaveText(/^1 of \d+$/);
  });

  test("a card names the author, source, date and what is recorded since, with Open story first", async ({
    page,
  }) => {
    await page.goto("/");
    const card = page.locator('.scr[data-active="true"] .card');
    await expect(card.getByRole("heading", { level: 2 })).toBeVisible();
    for (const label of ["Source", "Published", "Coverage", "Updates"])
      await expect(card.getByText(label, { exact: true })).toBeVisible();
    await expect(card.getByRole("link", { name: "Open story" })).toBeVisible();
    await expect(
      card.getByRole("link", { name: /Open source/ }),
    ).toHaveAttribute("href", /^https:\/\//);
    await card.getByRole("link", { name: "Open story" }).click();
    await expect(page).toHaveURL(/\/ideas\//);
  });

  test("J and K move one screen at a time, and the author pills filter the stream", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-index="0"]')).toHaveAttribute(
      "data-active",
      "true",
    );
    await page.keyboard.press("j");
    await expect(page.locator('[data-index="1"]')).toBeFocused();
    await page.keyboard.press("j");
    await expect(page.locator('[data-index="2"]')).toBeFocused();
    await page.keyboard.press("k");
    await expect(page.locator('[data-index="1"]')).toBeFocused();
    await page
      .getByRole("navigation", { name: "Show ideas by" })
      .getByRole("link", { name: /Arthur Hayes/ })
      .click();
    await expect(page).toHaveURL(/trader=arthur-hayes/);
    await expect(
      page.locator('.card[data-kind="detected"]').first(),
    ).toContainText("Arthur Hayes");
    await expect(page.locator('.card[data-kind="idea"]')).toHaveCount(1);
    // Exactly one pill is marked as the current choice, and the stream starts again from its first card.
    await expect(
      page.locator('.authors__pill[aria-current="page"]'),
    ).toHaveCount(1);
    await expect(page.locator(".pager__count")).toHaveText(/^1 of \d+$/);
  });
});

test.describe("the game layer", () => {
  test.beforeEach(async ({ page }) => returning(page));

  test("How it works closes the curtains on the whole journey, and Back to the show opens them", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-index="0"]')).toHaveAttribute(
      "data-active",
      "true",
    );
    await page.getByRole("button", { name: "How it works" }).click();
    const show = page.getByRole("dialog", { name: "How Relay works" });
    await expect(show).toBeVisible();
    for (const step of ["Pick", "Source", "Watch", "Update"])
      await expect(show.getByText(step, { exact: true })).toBeVisible();
    await show.getByRole("button", { name: /Back to the show/ }).click();
    await expect(show).toBeHidden();
  });

  test("the first Watch shows what happens next, with the real Hayes example", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-index="0"]')).toHaveAttribute(
      "data-active",
      "true",
    );
    await page
      .locator('[data-index="0"]')
      .getByRole("button", { name: /^Watch / })
      .click();
    const story = page.getByRole("dialog", { name: /real example/ });
    await expect(story).toBeVisible();
    await expect(story.getByText("Original")).toBeVisible();
    await expect(story.getByText("Author-linked")).toBeVisible();
    await story.getByRole("button", { name: "Got it" }).click();
    await expect(story).toBeHidden();
  });

  test("every card fits between the toolbar and the audience, centred, with nothing scrolling sideways", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-index="3"]')).toBeAttached();
    for (const i of [0, 1, 2, 3]) {
      await page.getByRole("button", { name: "Next idea" }).isEnabled();
      const m = await page.evaluate((i) => {
        const el = document.querySelector(`[data-index="${i}"]`);
        if (!(el instanceof HTMLElement)) return null;
        el.scrollIntoView({ block: "start" });
        const card = el.querySelector(".card")?.getBoundingClientRect();
        const house = document.querySelector(".aud")?.getBoundingClientRect();
        const bar = document
          .querySelector(".stream__toolbar")
          ?.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        if (!card || !house || !bar) return null;
        return {
          overX: document.documentElement.scrollWidth - innerWidth,
          mid: (card.left + card.right) / 2 - (box.left + box.right) / 2,
          clearOfBar: card.top - bar.bottom,
          clearOfHouse: house.top - card.bottom,
        };
      }, i);
      expect(m, `card ${i}`).not.toBeNull();
      expect(m?.overX ?? 99).toBeLessThanOrEqual(0);
      expect(Math.abs(m?.mid ?? 99)).toBeLessThanOrEqual(2);
      expect(m?.clearOfBar ?? -99).toBeGreaterThanOrEqual(0);
      expect(m?.clearOfHouse ?? -99).toBeGreaterThanOrEqual(0);
    }
  });

  test("the audience is below the stage line and applauds when something is watched", async ({
    page,
  }) => {
    await page.goto("/");
    const aud = page.locator(".aud");
    await expect(aud).toBeAttached();
    expect(await aud.locator(".aud__p").count()).toBeGreaterThan(8);
    await expect(aud).toHaveAttribute("data-clap", "false");
    await page
      .locator('[data-index="0"]')
      .getByRole("button", { name: /^Watch / })
      .click();
    await expect(aud).toHaveAttribute("data-clap", "true");
    await expect(aud).toHaveAttribute("aria-hidden", "true");
  });

  test("the two sides: watcher and feed member", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "Watcher" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Feed member" }),
    ).toBeVisible();
    await expect(page.getByText("No wallet")).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "What each badge means" })
        .getByText("Recorded", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Unreviewed", { exact: true })).toBeVisible();
    await expect(page.getByText("Fictional", { exact: true })).toBeVisible();
    await page.goto("/how-it-works");
    await expect(page).toHaveURL(/\/about$/);
  });

  test("Account shows what is unlocked: Discover and Watch lit, Follow a plan locked until sign-in and wallet", async ({
    page,
  }) => {
    await page.goto("/account");
    const strip = page.getByRole("region", { name: "What you can do now" });
    await expect(strip.locator('[data-on="true"]')).toHaveCount(2);
    await expect(strip.locator('[data-on="false"]')).toHaveCount(1);
    await expect(strip.getByText("Google sign-in: needed")).toBeAttached();
    await expect(strip.getByText("Wallet: needed")).toBeAttached();
  });

  test("signed in, the card shows the person and a one-tap sign out", async ({
    page,
  }) => {
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({
        json: {
          user: {
            sub: "1",
            email: "me@example.com",
            name: "Test Person",
            picture: null,
          },
        },
      }),
    );
    await page.goto("/account");
    await expect(page.getByText("Test Person")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    const strip = page.getByRole("region", { name: "What you can do now" });
    await expect(strip.getByText("Sign in: done")).toBeAttached();
  });
});
