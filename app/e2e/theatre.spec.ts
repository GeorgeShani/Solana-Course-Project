import { expect, test, type Page } from "@playwright/test";
import { returning } from "./helpers";

test.beforeEach(async ({ page }) => returning(page));

async function lastIdea(page: Page) {
  await expect(page.locator(".scr .card").first()).toBeVisible();
  const count = await page.locator(".scr[data-index]").count();
  for (let index = 1; index < count; index++) {
    await page.getByRole("button", { name: "Next idea", exact: true }).click();
    await expect(page.locator(".scr[data-active=true]")).toHaveAttribute(
      "data-index",
      String(index),
    );
  }
  await expect
    .poll(() =>
      page
        .locator(".stream")
        .evaluate((el) =>
          Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight),
        ),
    )
    .toBeLessThan(2);
}

async function fitsAboveAudience(page: Page, selector: string) {
  const element = await page.locator(selector).boundingBox();
  const house = await page.locator(".aud").boundingBox();
  expect(element).not.toBeNull();
  expect(house).not.toBeNull();
  if (!element || !house) throw new Error("Missing stage content or audience");
  expect(element.y + element.height).toBeLessThanOrEqual(house.y + 1);
}

test("Discover finishes over the last card and replays twice without a blank screen", async ({
  page,
}) => {
  await page.goto("/");
  for (let repeat = 0; repeat < 2; repeat++) {
    await lastIdea(page);
    const position = await page
      .locator(".stream")
      .evaluate((el) => el.scrollTop);
    await page
      .getByRole("button", { name: "Finish: close the curtains" })
      .click();
    await expect(page.locator(".showtime")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(await page.locator(".stream").evaluate((el) => el.scrollTop)).toBe(
      position,
    );
    await expect(page.locator(".scr--end")).toHaveCount(0);
    await expect(page.locator(".aud")).toHaveAttribute("data-mood", "cheer");
    await expect(
      page.getByRole("button", { name: "Back to the show" }),
    ).toBeFocused();
    await page.keyboard.press("j");
    expect(await page.locator(".stream").evaluate((el) => el.scrollTop)).toBe(
      position,
    );
    await page.keyboard.press("Escape");
    await expect(page.locator(".showtime")).toHaveAttribute(
      "data-open",
      "false",
    );
    await expect(page.locator(".scr[data-active=true]")).toHaveAttribute(
      "data-index",
      "0",
    );
    await expect
      .poll(() => page.locator(".stream").evaluate((el) => el.scrollTop))
      .toBe(0);
    await expect(page.locator(".aud")).toHaveAttribute("data-mood", "idle");
  }
});

test("Discover can finish with the wheel and Interval returns to the current card", async ({
  page,
}) => {
  await page.goto("/");
  await lastIdea(page);
  await page.locator(".card").last().hover();
  await page.mouse.wheel(0, 240);
  await expect(page.locator(".showtime")).toHaveAttribute("data-open", "true");
  await page.getByRole("button", { name: "Back to the show" }).click();
  await expect(page.locator(".scr[data-active=true]")).toHaveAttribute(
    "data-index",
    "0",
  );
  await page.getByRole("button", { name: "Next idea", exact: true }).click();
  await expect(page.locator(".scr[data-active=true]")).toHaveAttribute(
    "data-index",
    "1",
  );
  await page.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.goBack();
  await expect(page.locator(".scr[data-active=true]")).toHaveAttribute(
    "data-index",
    "1",
  );
});

test("Plans uses the same audience and curtains, applauds Watch, and replays", async ({
  page,
}) => {
  await page.goto("/plans");
  await expect(page.locator(".act").first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-house", "on");
  await expect(page.locator(".aud")).toHaveAttribute("data-mood", "idle");
  await page
    .locator(".act")
    .first()
    .getByRole("button", { name: /^Watch / })
    .click();
  await expect(
    page
      .locator(".act")
      .first()
      .getByRole("button", { name: /^Stop watching / }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".aud")).toHaveAttribute("data-mood", "clap");
  await expect(page.locator(".aud")).toHaveAttribute("data-mood", "idle");
  const count = await page.locator(".act").count();
  for (let index = 1; index < count; index++)
    await page.getByRole("button", { name: "Next plan", exact: true }).click();
  for (let repeat = 0; repeat < 2; repeat++) {
    const position = await page.locator(".feed").evaluate((el) => el.scrollTop);
    await page
      .getByRole("button", { name: "Finish: close the curtains" })
      .click();
    await expect(page.locator(".showtime")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(await page.locator(".feed").evaluate((el) => el.scrollTop)).toBe(
      position,
    );
    await expect(page.locator(".showtime__drape")).toHaveCount(2);
    await expect(page.locator(".finale__drape")).toHaveCount(0);
    await expect(page.locator(".aud")).toHaveAttribute("data-mood", "cheer");
    await expect(
      page.getByRole("button", { name: "Explore again" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Explore again" }).click();
    await expect(page.locator(".showtime")).toHaveAttribute(
      "data-open",
      "false",
    );
    await expect
      .poll(() => page.locator(".feed").evaluate((el) => el.scrollTop))
      .toBe(0);
    for (let index = 1; index < count; index++)
      await page
        .getByRole("button", { name: "Next plan", exact: true })
        .click();
  }
  await page
    .getByRole("link", { name: "Updates", exact: true })
    .first()
    .click();
  await expect(page.locator("html")).not.toHaveAttribute("data-house", "on");
  await expect(page.locator(".aud")).toHaveCount(0);
});

for (const viewport of [
  { width: 390, height: 664 },
  { width: 375, height: 600 },
  { width: 768, height: 800 },
]) {
  test(`mobile controls remain reachable at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".scr .card").first()).toBeVisible();
    await page.getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(
      page.getByRole("link", { name: "Start watching" }),
    ).toBeVisible();
    await page.goto("/plans");
    await expect(page.locator(".act").first()).toBeVisible();
    const act = page.locator(".act").first();
    const before = await act.evaluate((el) => el.scrollTop);
    const overflow = await act.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    if (overflow) {
      const status = await act.locator(".status").boundingBox();
      if (!status) throw new Error("Missing plan status");
      await page.mouse.move(
        status.x + status.width / 2,
        status.y + status.height / 2,
      );
      await page.mouse.wheel(0, 240);
      await expect(page.locator(".showtime")).toHaveAttribute(
        "data-open",
        "false",
      );
      await expect
        .poll(() => act.evaluate((el) => el.scrollTop))
        .toBeGreaterThan(before);
    }
    await act.getByRole("button", { name: /^Watch / }).scrollIntoViewIfNeeded();
    await fitsAboveAudience(page, ".act:first-child .actions__row");
    const width = await page.evaluate(() => ({
      actual: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(width.actual).toBe(width.viewport);
    await page
      .getByRole("button", { name: "Finish: close the curtains" })
      .click();
    await expect(
      page.getByRole("button", { name: "Explore again" }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Explore again" })
      .scrollIntoViewIfNeeded();
    await fitsAboveAudience(page, ".finale__actions");
    await page.getByRole("button", { name: "Explore again" }).click();
    await expect.poll(() => act.evaluate((el) => el.scrollTop)).toBe(0);
  });
}

test("desktop plan is centered above the audience and hydrates without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1916, height: 923 });
  await page.goto("/plans");
  await expect(page.locator(".act").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Finish: close the curtains" }),
  ).toBeVisible();
  const feed = await page.locator(".feed").boundingBox();
  const programme = await page.locator(".act__programme").first().boundingBox();
  if (!feed || !programme) throw new Error("Missing plan layout");
  expect(
    Math.abs(programme.y + programme.height / 2 - (feed.y + feed.height / 2)),
  ).toBeLessThan(4);
  await fitsAboveAudience(page, ".act:first-child .actions");
  expect(errors).toEqual([]);
});

test.describe("touch endings", () => {
  test.use({ hasTouch: true });
  test("a swipe at the last idea closes the curtains without moving the card", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto("/");
    await lastIdea(page);
    const position = await page
      .locator(".stream")
      .evaluate((el) => el.scrollTop);
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 360 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 270 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".showtime")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(
      Math.abs(
        (await page.locator(".stream").evaluate((el) => el.scrollTop)) -
          position,
      ),
    ).toBeLessThanOrEqual(2);
    await page.getByRole("button", { name: "Back to the show" }).click();
  });
});

test("reduced motion closes instantly and keeps both endings usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await lastIdea(page);
  await page.keyboard.press("j");
  await expect(
    page.getByRole("button", { name: "Back to the show" }),
  ).toBeFocused();
  const transition = await page
    .locator(".showtime__drape")
    .first()
    .evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).transitionDuration),
    );
  expect(transition).toBeLessThan(0.01);
  const reveal = await page.locator(".showtime__stage").evaluate((el) => ({
    delay: getComputedStyle(el).transitionDelay,
    opacity: getComputedStyle(el).opacity,
  }));
  expect(reveal).toEqual({ delay: "0s", opacity: "1" });
  await page.keyboard.press("Escape");
  await page.goto("/plans");
  await expect(page.locator(".act").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Finish: close the curtains" })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore again" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".showtime")).toHaveAttribute("data-open", "false");
});
