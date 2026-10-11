import { describe, expect, test } from "bun:test";
import {
  PARTICIPATION_LABEL,
  eventKind,
  sourceHost,
} from "../src/lib/discovery";

describe("eventKind", () => {
  test("an update the author links is an update to the idea", () => {
    const k = eventKind({
      type: "update_published",
      relationship: { basis: "creator_confirmed" },
    });
    expect(k.label).toBe("Update to this idea");
  });

  test("an unlinked later item is only later analysis on the same topic", () => {
    for (const basis of ["uncertain", "editorially_associated"] as const) {
      const k = eventKind({
        type: "update_published",
        relationship: { basis },
      });
      expect(k.label).toBe("Later analysis on the same topic");
      expect(k.meaning).toContain("does not mean the author changed");
    }
  });

  test("the first entry is the original source", () => {
    expect(
      eventKind({
        type: "source_added",
        relationship: { basis: "original" },
      }).label,
    ).toBe("Original source");
  });
});

describe("labels", () => {
  test("a public-source profile says it is not claimed", () => {
    expect(PARTICIPATION_LABEL.public_source_only).toBe(
      "Public-source profile · Not claimed by the author",
    );
  });

  test("sourceHost names the site and refuses unsafe links", () => {
    expect(sourceHost("https://www.peterlbrandt.com/x/")).toBe(
      "peterlbrandt.com",
    );
    expect(sourceHost("javascript:alert(1)")).toBeNull();
  });
});
