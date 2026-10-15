import type { Page } from "@playwright/test";

/** Skip the opening welcome so a test can use the app. A real visit still shows it. */
export async function returning(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const root = document.documentElement;
    let opened = false;
    window.addEventListener("relay:welcome", () => {
      opened = true;
    });
    const hide = () => {
      if (opened) return;
      if (root.dataset.welcome === "on") root.dataset.welcome = "off";
    };
    hide();
    new MutationObserver(hide).observe(root, {
      attributes: true,
      attributeFilter: ["data-welcome"],
    });
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
