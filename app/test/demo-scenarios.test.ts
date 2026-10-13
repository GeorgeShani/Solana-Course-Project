import { expect, test } from "bun:test";
import { DEMO_SCENARIOS, demoState } from "../src/lib/demo";

test("entry scenarios show matching conditions, missed entry and an expired window", () => {
  const start = 1_800_000_000_000;
  const statuses = DEMO_SCENARIOS.map((scenario) =>
    scenario.steps.map(
      (_, step) => demoState(step, start, scenario).entry.status,
    ),
  );
  expect(statuses).toEqual([
    ["in_range", "above_range", "expired"],
    ["below_range", "in_range", "above_range", "expired"],
    ["above_range", "in_range", "expired"],
  ]);
  for (const scenario of DEMO_SCENARIOS) {
    expect(demoState(99, start, scenario).entry.status).toBe("expired");
    expect(demoState(-1, start, scenario).step).toBe(0);
  }
});
