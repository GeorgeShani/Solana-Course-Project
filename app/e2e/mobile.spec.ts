import { expect, test } from "@playwright/test";
import { returning } from "./helpers";

test.describe("phone layout", () => {
  test("the welcome fits with both actions in view", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone only");
    await page.goto("/");
    const explore = page.getByRole("button", { name: "Explore ideas" });
    const how = page.getByRole("link", { name: "See how Relay works" });
    await expect(explore).toBeVisible();
    await expect(how).toBeVisible();
    const vp = page.viewportSize();
    for (const el of [explore, how]) {
      const box = await el.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(vp?.height ?? 0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(vp?.width ?? 0);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    // No app navigation behind the curtains.
    await expect(page.getByRole("navigation", { name: "Main" }).first()).toBeHidden();
  });

  for (const path of ["/", "/ideas/hayes-ai-credit-deflation", "/profiles/peter-brandt", "/updates", "/watchlist", "/plans"]) {
    test(`${path} has no sideways scroll`, async ({ page }) => {
      await returning(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => {
        const widest = [...document.querySelectorAll<HTMLElement>("#main *")].reduce(
          (m, e) => Math.max(m, e.getBoundingClientRect().right),
          0,
        );
        return widest - window.innerWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("touch targets on Discover are at least 44px", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone only");
    await returning(page);
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Watch / }).first()).toBeVisible();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#main a, #main button")]
        .filter((e) => e.offsetParent !== null)
        .map((e) => ({ t: (e.textContent ?? "").trim().slice(0, 30), h: e.getBoundingClientRect().height }))
        // inline text links inside paragraphs are exempt
        .filter((x) => x.h > 0 && x.h < 40 && !x.t.includes(" ")),
    );
    expect(small).toEqual([]);
  });

  test("the bottom bar offers Discover, Updates, Watchlist, Plans, Account", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone only");
    await returning(page);
    await page.goto("/");
    const bar = page.locator("nav.tabbar");
    for (const n of ["Discover", "Updates", "Watchlist", "Plans", "Account"])
      await expect(bar.getByRole("link", { name: n })).toBeVisible();
  });
});
