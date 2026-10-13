import { expect, test } from "@playwright/test";
import { returning } from "./helpers";

test("failed logout retains identity and lets the owner retry", async ({
  page,
}) => {
  await returning(page);
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          sub: "fictional-auth-browser-test",
          email: "auth-test@example.invalid",
          name: "Fictional auth browser test",
          picture: null,
        },
      },
    }),
  );
  let fail = true;
  await page.route("**/api/auth/logout", (route) =>
    route.fulfill({
      status: fail ? 503 : 200,
      json: fail
        ? { error: { message: "Test service failure" } }
        : { ok: true },
    }),
  );
  await page.goto("/account");
  await expect(
    page.getByText("Fictional auth browser test", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Sign-out failed. Please try again.",
  );
  await expect(
    page.getByText("Fictional auth browser test", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeEnabled();
  fail = false;
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#google-sign-in-btn")).toBeVisible();
  await expect(
    page.getByText("Fictional auth browser test", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
