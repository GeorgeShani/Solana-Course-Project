import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCuration } from "../src/modules/discovery/curation";

/**
 * The real editorial dataset (`server/curation/curated.json`), checked as a whole. These are the
 * promises the product makes about the three public-source profiles; a change to the file that
 * breaks one fails here before it can be loaded.
 */
const raw: unknown = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "curation", "curated.json"), "utf8"),
);
const curation = parseCuration(raw);

describe("curated.json", () => {
  it("is a live file with exactly the three authorized public-source profiles", () => {
    expect(curation.demo).toBe(false);
    expect(curation.traders.map((t) => t.id).sort()).toEqual([
      "arthur-hayes",
      "benjamin-cowen",
      "peter-brandt",
    ]);
  });

  it("never claims a profile for its author, links a wallet, or attaches a Relay plan", () => {
    for (const t of curation.traders) {
      expect(t.participation).toBe("public_source_only");
      expect(t.ownerConfirmed).not.toBeNull();
      expect(t.links.some((l) => l.kind === "wallet")).toBe(false);
      for (const idea of t.ideas)
        for (const e of idea.events) {
          expect(e.type).not.toBe("relay_plan_published");
          expect(e.type).not.toBe("onchain_activity");
        }
    }
  });

  it("gives every source an exact https link, a source time, a capture time and a paraphrase", () => {
    for (const t of curation.traders)
      for (const s of t.sources) {
        expect(new URL(s.url).protocol).toBe("https:");
        expect(s.publishedAt).not.toBeNull();
        expect(s.retrievedAt.getTime()).toBeGreaterThanOrEqual(
          s.publishedAt?.getTime() ?? Infinity,
        );
        expect(s.availability.length).toBeGreaterThan(0);
        expect(s.displayedContent).not.toBeNull();
        expect(s.displayedContent?.length).toBeLessThanOrEqual(500);
        // Relay's own words say so; a record is never presented as the author's own words.
        // (Recorded entries are append-only, so one older entry says "Relay has not checked".)
        expect(s.displayedContent).toMatch(
          /Paraphrased by Relay|Summarised by Relay|Relay has not checked/,
        );
      }
  });

  it("ties later items to the original exactly as far as the evidence goes", () => {
    const basisOf = (ideaId: string) =>
      curation.traders
        .flatMap((t) => t.ideas)
        .find((i) => i.id === ideaId)
        ?.events.filter((e) => e.type === "update_published")
        .map((e) => e.relationshipBasis);
    // Hayes links his earlier essay himself, in the later one.
    expect(basisOf("hayes-ai-credit-deflation")).toEqual(["creator_confirmed"]);
    // Brandt: a publisher's later episode whose link to the forecast is not established.
    expect(basisOf("brandt-btc-bottom-oct-4")).toEqual(["uncertain"]);
    // Cowen and Brandt's TOTAL2 idea have no later item.
    expect(basisOf("cowen-btc-83k-line")).toEqual([]);
    expect(basisOf("brandt-total2-cup-handle")).toEqual([]);
  });

  it("explains every relationship that is not the author's own", () => {
    for (const t of curation.traders)
      for (const idea of t.ideas)
        for (const e of idea.events)
          if (e.relationshipBasis !== "creator_confirmed")
            expect(e.basisNote).not.toBeNull();
  });
});
