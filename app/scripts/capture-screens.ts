/**
 * Capture a PNG of every user-facing screen for product audit.
 *
 *   bun run --cwd app scripts/capture-screens.ts
 *
 * Requires app on :5173 and API on :3001 with curated data loaded. Writes to
 * docs/screenshots/audit-<today>/ (or AUDIT_DIR), so an earlier audit is never overwritten.
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const API = process.env.E2E_API_URL ?? "http://localhost:3001";
const OUT = join(
  import.meta.dir,
  "..",
  "..",
  "docs",
  "screenshots",
  process.env.AUDIT_DIR ?? `audit-${new Date().toISOString().slice(0, 10)}`,
);

type Shot = { id: string; note: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** The `items` array of a list endpoint. */
async function listItems(path: string): Promise<Record<string, unknown>[]> {
  const body: unknown = await (await fetch(`${API}${path}`)).json();
  const items = isRecord(body) ? body.items : undefined;
  if (!Array.isArray(items)) throw new Error(`${path}: no items array`);
  return items.filter(isRecord);
}

function text(r: Record<string, unknown>, key: string): string {
  const v = r[key];
  if (typeof v !== "string") throw new Error(`item without text "${key}"`);
  return v;
}

async function asReturning(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("relay:welcome:v2", "seen");
    sessionStorage.setItem("relay:curtain-seen", "1");
    sessionStorage.setItem("relay:showtime", "1");
  });
}

async function shot(page: Page, id: string, note: string, shots: Shot[]) {
  const path = join(OUT, `${id}.png`);
  await page.waitForTimeout(400);
  await page.screenshot({ path, fullPage: true });
  shots.push({ id, note });
  console.log(`✓ ${id}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const ideas = (await listItems("/discovery/ideas")).map((r) => ({
    id: text(r, "id"),
    title: text(r, "title"),
    traderName: isRecord(r.trader) ? text(r.trader, "displayName") : "",
  }));
  const traders = (await listItems("/discovery/traders")).map((r) => ({
    id: text(r, "id"),
    displayName: text(r, "displayName"),
  }));
  const plans = (await listItems("/plans/feed?limit=5")).map((r) => ({
    planPda: text(r, "planPda"),
  }));

  const browser = await chromium.launch();
  const shots: Shot[] = [];

  // Fresh welcome
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await shot(
      page,
      "01-welcome",
      "Closed-curtain welcome (first visit)",
      shots,
    );
    await ctx.close();
  }

  // Returning visitor tour
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await ctx.newPage();
    await asReturning(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector(".stream-wrap, .scr", { timeout: 20_000 });
    await shot(page, "02-discover", "Discover stream (first ticket)", shots);

    // Pull cord → Interval
    const cord = page.locator(".cord");
    if (await cord.count()) {
      await cord.click();
      await page.waitForTimeout(1400);
      await shot(
        page,
        "03-interval",
        "Interval / Showtime (curtains closed)",
        shots,
      );
      const back = page.getByRole("button", { name: /Back to the show/i });
      if (await back.count()) await back.click();
      await page.waitForTimeout(600);
    }

    // Scroll a couple of tickets
    await page.keyboard.press("j");
    await page.waitForTimeout(700);
    await shot(page, "04-discover-ticket-2", "Discover second ticket", shots);

    for (const t of traders) {
      await page.goto(`${BASE}/profiles/${t.id}`, { waitUntil: "networkidle" });
      await shot(
        page,
        `05-profile-${t.id}`,
        `Profile: ${t.displayName}`,
        shots,
      );
    }

    for (const idea of ideas) {
      await page.goto(`${BASE}/ideas/${idea.id}`, {
        waitUntil: "networkidle",
      });
      await shot(page, `06-idea-${idea.id}`, `Idea: ${idea.title}`, shots);
    }

    await page.goto(`${BASE}/updates`, { waitUntil: "networkidle" });
    await shot(page, "07-updates-empty", "Updates (nothing watched)", shots);

    // Seed a watch so Updates / Watchlist have content. The label matches what Watch on a ticket
    // stores ("title · trader"), and the cursor sits at 0 so the real later entry shows as new.
    const hayes = ideas.find((i) => i.id === "hayes-ai-credit-deflation");
    if (!hayes)
      throw new Error("curated idea hayes-ai-credit-deflation is missing");
    await page.evaluate(
      ({ id, label }) => {
        const item = {
          type: "idea",
          id,
          label,
          after: "0",
          savedAt: Date.now(),
        };
        localStorage.setItem(
          "relay:discovery-watch:v1",
          JSON.stringify({ v: 1, items: [item] }),
        );
      },
      { id: hayes.id, label: `${hayes.title} · ${hayes.traderName}` },
    );
    await page.goto(`${BASE}/updates`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await shot(
      page,
      "08-updates-watching",
      "Updates (watching one idea)",
      shots,
    );

    for (const tab of ["ideas", "profiles", "plans", "receipts"] as const) {
      await page.goto(`${BASE}/watchlist?tab=${tab}`, {
        waitUntil: "networkidle",
      });
      await shot(page, `09-watchlist-${tab}`, `Watchlist · ${tab}`, shots);
    }

    await page.goto(`${BASE}/plans`, { waitUntil: "networkidle" });
    await shot(page, "10-plans-feed", "Plans feed", shots);

    await page.goto(`${BASE}/plans/creators`, { waitUntil: "networkidle" });
    await shot(page, "11-plans-creators", "Plan creators index", shots);

    for (const p of plans.slice(0, 2)) {
      await page.goto(`${BASE}/plans/${p.planPda}`, {
        waitUntil: "networkidle",
      });
      await shot(
        page,
        `12-plan-${p.planPda.slice(0, 8)}`,
        "Plan detail",
        shots,
      );
    }

    await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
    await shot(page, "13-account", "Account", shots);

    await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
    await shot(page, "14-about", "About / How Relay works", shots);

    await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
    await shot(page, "15-demo", "Fictional demo walkthrough", shots);

    await page.goto(`${BASE}/dev/plan-states`, { waitUntil: "networkidle" });
    await shot(
      page,
      "16-dev-plan-states",
      "Dev-only plan state fixtures",
      shots,
    );

    await ctx.close();
  }

  // Phone Discover
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await asReturning(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector(".stream-wrap, .scr", { timeout: 20_000 });
    await shot(page, "17-discover-phone", "Discover on phone (390×844)", shots);
    await page.goto(`${BASE}/plans`, { waitUntil: "networkidle" });
    await shot(page, "18-plans-phone", "Plans on phone (390×844)", shots);
    await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
    await shot(page, "19-account-phone", "Account on phone (390×844)", shots);
    await ctx.close();
  }

  await browser.close();

  writeFileSync(
    join(OUT, "index.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        base: BASE,
        count: shots.length,
        shots,
      },
      null,
      2,
    ),
  );
  console.log(`\n${shots.length} screenshots → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
