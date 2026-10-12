import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCuration } from "../src/modules/discovery/curation";
import {
  STALE_AFTER_DAYS,
  curationReport,
  formatReport,
} from "../src/modules/discovery/report";

const curation = parseCuration(
  JSON.parse(
    readFileSync(
      join(import.meta.dir, "..", "curation", "curated.json"),
      "utf8",
    ),
  ),
);

describe("curation report", () => {
  it("summarises the three profiles and flags the uncertain Brandt link", () => {
    const r = curationReport(curation, new Date("2026-10-12T12:00:00Z"));
    expect(r.traders.map((t) => t.id).sort()).toEqual([
      "arthur-hayes",
      "benjamin-cowen",
      "peter-brandt",
    ]);
    const brandt = r.traders.find((t) => t.id === "peter-brandt");
    expect(brandt?.laterItems).toEqual({ uncertain: 1 });
    expect(brandt?.warnings.join(" ")).toContain("uncertain link");
    expect(r.traders.find((t) => t.id === "arthur-hayes")?.laterItems).toEqual({
      creator_confirmed: 1,
    });
    expect(r.traders.every((t) => t.wallets === 0)).toBe(true);
    expect(r.warnings).toBe(1);
  });

  it("flags captures older than the freshness window", () => {
    const later = new Date(
      Date.parse("2026-10-11T16:30:00Z") + (STALE_AFTER_DAYS + 5) * 86_400_000,
    );
    const r = curationReport(curation, later);
    expect(r.traders[0]?.warnings.join(" ")).toContain("open it again");
    expect(formatReport(r)).toContain("warning(s)");
  });
});
