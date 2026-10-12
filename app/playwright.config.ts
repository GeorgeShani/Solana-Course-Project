import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the golden journey. They run against a running stack: the API on :3001 with the
 * curated records loaded, and the app on E2E_BASE_URL (default http://localhost:5173).
 *
 *   bun run dev:server   # in one terminal
 *   bun run dev:app      # in another
 *   bun run --cwd app e2e
 *
 * Every test starts with an empty browser profile, so watching and the welcome start from zero.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: 3,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "phone",
      use: { ...devices["Pixel 7"] },
      testMatch: /.*(mobile|journey)\.spec\.ts/,
    },
  ],
});
