import { expect, test } from "@playwright/test";
import { returning } from "./helpers";

test.describe("states and redirects", () => {
  test.beforeEach(async ({ page }) => returning(page));

  test("when the service is unreachable the app says so and shows no invented data", async ({
    page,
  }) => {
    await page.route("**/api/discovery/**", (r) => r.abort());
    await page.goto("/");
    await expect(
      page.getByText("Can't reach Relay's service").first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: "Try again" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Arthur Hayes")).toHaveCount(0);
  });

  test("an unknown idea is a clear not-found, not a blank page", async ({
    page,
  }) => {
    await page.goto("/ideas/does-not-exist-anywhere");
    await expect(page.getByText("Relay has no such idea")).toBeVisible();
  });

  test("an empty watchlist explains itself and points back to Discover", async ({
    page,
  }) => {
    await page.goto("/watchlist");
    await expect(
      page.getByText(/Watch an idea to see what changes/),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Discover ideas" }),
    ).toBeVisible();
  });

  test("blocked storage says watching will not be kept", async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException("blocked", "QuotaExceededError");
      };
    });
    await page.goto("/updates");
    await expect(page.getByText(/blocking storage/)).toBeVisible();
  });

  test("old links still land somewhere sensible", async ({ page }) => {
    await page.goto("/traders");
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/ideas");
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/records/abc123");
    await expect(page).toHaveURL(/\/plans\/abc123$/);
    await page.goto("/watchlist?tab=changes");
    await expect(page).toHaveURL(/\/updates$/);
  });

  test("the fictional demo is labelled and never touches the real watchlist", async ({
    page,
  }) => {
    await page.goto("/demo");
    await expect(page.getByText(/Fictional demo/i).first()).toBeVisible();
    const keys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.includes("watch")),
    );
    expect(keys).toEqual([]);
  });

  test("the fixtures gallery exists only in development", async ({ page }) => {
    const res = await page.goto("/dev/plan-states");
    // Dev server: the labelled fixtures; a production build answers 404.
    if (res?.status() === 404) return;
    await expect(page.getByText(/Fictional preview/i).first()).toBeVisible();
  });
});
