import { describe, expect, test } from "bun:test";
import {
  PARTICIPATION_LABEL,
  eventKind,
  evidenceSummary,
  latestCapture,
  latestUpdateLabel,
  sourceHost,
} from "../src/features/discovery/model";

describe("eventKind", () => {
  test("an update the author links is an update to the idea", () => {
    const k = eventKind({
      type: "update_published",
      relationship: { basis: "creator_confirmed" },
    });
    expect(k.label).toBe("Update to this idea");
  });

  test("an unlinked later item is only later analysis on the same topic", () => {
    const k = eventKind({
      type: "update_published",
      relationship: { basis: "editorially_associated" },
    });
    expect(k.label).toBe("Later analysis on the same topic");
    expect(k.meaning).toContain("does not mean the author changed");
  });

  test("an uncertain link is never called an update or analysis of the idea", () => {
    const k = eventKind({
      type: "update_published",
      relationship: { basis: "uncertain" },
    });
    expect(k.label).toBe("Later item · link not established");
    expect(k.meaning).toContain("cannot confirm");
    expect(k.meaning).toContain("does not mean the author changed");
  });

  test("a card names the newest later item the same way as the timeline", () => {
    expect(latestUpdateLabel({ latestUpdate: null })).toBeNull();
    expect(
      latestUpdateLabel({
        latestUpdate: { basis: "creator_confirmed", occurredAt: null },
      }),
    ).toBe("Update to this idea");
    expect(
      latestUpdateLabel({
        latestUpdate: { basis: "uncertain", occurredAt: null },
      }),
    ).toBe("Later item · link not established");
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

describe("evidenceSummary", () => {
  const original = {
    publishedAt: "2026-07-20T13:30:00.000Z",
    availability: {
      state: "available" as const,
      observedAt: "2026-10-11T16:30:00.000Z",
      note: null,
    },
    contentRemoved: false,
  };
  const idea = (
    basis: "creator_confirmed" | "editorially_associated" | "uncertain" | null,
    statedConditions: string | null = null,
  ) => ({
    statedConditions,
    original,
    events: basis
      ? [{ type: "update_published", relationship: { basis } }]
      : [],
  });

  test("an author-linked update is established; nothing about trades ever is", () => {
    const s = evidenceSummary(idea("creator_confirmed"));
    expect(s.established.join(" ")).toContain("author links a later item");
    expect(s.unknown.join(" ")).toContain("Whether anyone traded");
    expect(s.unknown.join(" ")).toContain("shows no result");
  });

  test("an uncertain link is listed as unknown, not established", () => {
    const s = evidenceSummary(idea("uncertain"));
    expect(s.established.join(" ")).not.toContain("later item");
    expect(s.unknown.join(" ")).toContain("could not confirm the link");
  });

  test("a same-topic item is context only", () => {
    const s = evidenceSummary(idea("editorially_associated"));
    expect(s.unknown.join(" ")).toContain("shown as context only");
  });

  test("no later item and no stated conditions are both said out loud", () => {
    const s = evidenceSummary(idea(null));
    expect(s.unknown.join(" ")).toContain("no later item is recorded");
    expect(s.unknown.join(" ")).toContain("the original states none");
    expect(
      evidenceSummary(idea(null, "Buy 140")).unknown.join(" "),
    ).not.toContain("the original states none");
  });

  test("a missing publication time and a removed source are not hidden", () => {
    const s = evidenceSummary({
      ...idea(null),
      original: {
        publishedAt: null,
        availability: { ...original.availability, state: "removed" },
        contentRemoved: true,
      },
    });
    expect(s.established.join(" ")).toContain("gives no publication time");
    expect(s.unknown.join(" ")).toContain("removed by its author");
  });
});

describe("latestCapture", () => {
  test("is the newest capture time, or null", () => {
    expect(latestCapture([])).toBeNull();
    expect(
      latestCapture([
        { original: { retrievedAt: "2026-10-01T10:00:00.000Z" } },
        { original: { retrievedAt: "2026-10-11T16:30:00.000Z" } },
        { original: { retrievedAt: "2026-10-05T10:00:00.000Z" } },
      ]),
    ).toBe("2026-10-11T16:30:00.000Z");
  });
});
