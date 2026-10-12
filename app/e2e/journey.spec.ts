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
    const recorded = page.locator('article[data-kind="idea"]');
    await expect(recorded).toHaveCount(4);
    const detected = page.locator('article[data-kind="detected"]');
    expect(await detected.count()).toBeGreaterThan(0);
    await expect(detected.first()).toContainText("Unreviewed");
    await expect(
      detected.first().getByRole("link", { name: /Open the original/ }),
    ).toHaveAttribute("href", /^https:\/\//);
    // Anything already recorded by hand is not repeated as "detected".
    const links = await detected
      .getByRole("link", { name: /Open the original/ })
      .evaluateAll((a) => a.map((x) => x.getAttribute("href")));
    expect(links).not.toContain("https://www.youtube.com/watch?v=aEd5onhPxUs");
  });

  test("J and K move one screen at a time, and the profile chips filter the stream", async ({
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
      .getByRole("link", { name: "Arthur Hayes" })
      .click();
    await expect(page).toHaveURL(/trader=arthur-hayes/);
    await expect(
      page.locator('article[data-kind="detected"]').first(),
    ).toContainText("Arthur Hayes");
    await expect(
      page.locator('article[data-kind="idea"]'),
    ).toHaveCount(1);
  });
});
