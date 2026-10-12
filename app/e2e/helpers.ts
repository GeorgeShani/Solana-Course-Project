import type { Page } from "@playwright/test";

/** A returning visitor: the welcome was seen and this session already had its curtain. */
export async function returning(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("relay:welcome:v2", "seen");
    sessionStorage.setItem("relay:curtain-seen", "1");
  });
}

export const WATCH_KEY = "relay:discovery-watch:v1";

/** Reads the saved watch list straight from the browser. */
export async function savedWatch(
  page: Page,
): Promise<{ id: string; type: string; after: string }[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" &&
      parsed !== null &&
      "items" in parsed &&
      Array.isArray(parsed.items)
      ? parsed.items
      : [];
  }, WATCH_KEY);
}
