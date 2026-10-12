import { expect, test } from "@playwright/test";
import { returning } from "./helpers";

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 375, height: 664 },
]) {
  test(`entry scenarios remain explicit and reset cleanly at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await returning(page);
    await page.goto("/demo");
    await expect(page.getByRole("note")).toContainText("Fictional demo");
    await page
      .getByRole("button", { name: "Wait for the range", exact: true })
      .click();
    await expect(page.locator("#demo-status")).toContainText(
      "Below plan range",
    );
    await page
      .getByRole("button", {
        name: "Advance demo · into the range",
        exact: true,
      })
      .click();
    await expect(page.locator("#demo-status")).toContainText("In plan range");
    await page
      .getByRole("button", {
        name: "Advance demo · above the range",
        exact: true,
      })
      .click();
    await expect(page.locator("#demo-status")).toContainText(
      "Original entry passed",
    );
    await page
      .getByRole("button", {
        name: "Advance demo · past the window",
        exact: true,
      })
      .click();
    await expect(page.locator("#demo-status")).toContainText("Plan expired");
    await page
      .getByRole("button", { name: "Return to the range", exact: true })
      .click();
    await expect(page.locator("#demo-status")).toContainText(
      "Original entry passed",
    );
    await page
      .getByRole("button", {
        name: "Advance demo · back in range",
        exact: true,
      })
      .click();
    await expect(page.locator("#demo-status")).toContainText("In plan range");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
