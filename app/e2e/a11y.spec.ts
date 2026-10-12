import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { returning } from "./helpers";

test.describe("accessibility", () => {
  test.beforeEach(async ({ page }) => returning(page));

  for (const path of [
    "/",
    "/ideas/hayes-ai-credit-deflation",
    "/ideas/brandt-btc-bottom-oct-4",
    "/profiles/arthur-hayes",
    "/updates",
    "/watchlist",
    "/plans",
    "/account",
    "/how-it-works",
  ])
    test(`no serious or critical violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      const bad = results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map(
          (v) =>
            `${v.id}: ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(" "))
              .join(" | ")}`,
        );
      expect(bad).toEqual([]);
    });

  test("the welcome has no serious violations either", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Explore ideas" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => v.id),
    ).toEqual([]);
    await ctx.close();
  });
});

test.describe("keyboard", () => {
  test("the welcome works by keyboard alone", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/");
    const explore = page.getByRole("button", { name: "Explore ideas" });
    await expect(explore).toBeEnabled(); // enabled once the page has hydrated
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab"); // past the skip link
    await expect(explore).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Discover", level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await ctx.close();
  });

  test("Watch is reachable and operable with the keyboard", async ({
    page,
  }) => {
    await returning(page);
    await page.goto("/ideas/hayes-ai-credit-deflation");
    const watch = page.getByRole("button", { name: "Watch this idea" });
    await watch.focus();
    await expect(watch).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Stop watching this idea" }),
    ).toBeVisible();
  });

  test("the skip link is the first stop and works", async ({ page }) => {
    await returning(page);
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no curtain transition for a returning visitor", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("relay:welcome:v2", "seen"),
    );
    await page.goto("/");
    expect(
      await page.evaluate(() => document.documentElement.dataset.curtain),
    ).toBe("off");
    await expect(
      page.getByRole("heading", { name: "Discover", level: 1 }),
    ).toBeVisible();
  });

  test("the welcome is still shown, and Explore enters without waiting for an animation", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Explore ideas" }).click();
    await expect(
      page.getByRole("heading", { name: "Discover", level: 1 }),
    ).toBeVisible({ timeout: 5_000 });
  });
});
