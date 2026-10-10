import { afterAll, describe, expect, it } from "bun:test";
import { applyCuration, CurationConflictError } from "../src/discovery/apply";
import { CurationError, parseCuration } from "../src/discovery/curation";
import { eventHash, type EventHashInput } from "../src/discovery/hash";
import { createTestApp, type TestApp } from "./helpers";

// ------------------------------------------------------------------------------------ helpers

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const NOW = new Date("2026-10-10T12:00:00Z");
const WALLET = "4Cg6T5WsMeGoWiL7eM2AayBrsuCQCLRHbf77T4d2nozx";
const PLAN = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const SIGNATURE = "5".repeat(88);

/** A complete, valid file for a REAL (non-demo) trader. Tests change one thing at a time. */
function fixture(): Json {
  return {
    traders: [
      {
        id: "ada-test",
        displayName: "Ada Test (test fixture)",
        markets: ["crypto"],
        attributionBasis: "Test fixture for the loader.",
        participation: "public_source_only",
        coverageLimits: "Test fixture. Nothing is real.",
        curator: "tests",
        ownerConfirmed: { by: "test owner", at: "2026-10-01" },
        links: [
          {
            kind: "x",
            value: "https://x.com/ada_test",
            identityBasis: "creator_confirmed",
            basisNote: null,
          },
          {
            kind: "wallet",
            value: WALLET,
            identityBasis: "creator_confirmed",
            basisNote: null,
          },
        ],
        sources: [
          {
            id: "ada-post-1",
            provider: "x",
            providerId: "100",
            url: "https://x.com/ada_test/status/100",
            recordType: "post",
            publishedAt: "2026-10-01T09:00:00Z",
            retrievedAt: "2026-10-01T10:00:00Z",
            displayedContent: "Watching SOL near 140.",
            availability: [
              {
                state: "available",
                observedAt: "2026-10-01T10:00:00Z",
                note: null,
              },
            ],
          },
          {
            id: "ada-post-2",
            provider: "x",
            providerId: "101",
            url: "https://x.com/ada_test/status/101",
            recordType: "post",
            publishedAt: "2026-10-02T09:00:00Z",
            retrievedAt: "2026-10-02T10:00:00Z",
            displayedContent: "Update: stepping aside.",
            availability: [
              {
                state: "available",
                observedAt: "2026-10-02T10:00:00Z",
                note: null,
              },
            ],
          },
        ],
        ideas: [
          {
            id: "sol-watch",
            sourceId: "ada-post-1",
            title: "Watching SOL near 140",
            assets: ["SOL"],
            market: "crypto",
            statedConditions: "Watching 140.",
            events: [
              {
                id: "sol-update",
                type: "update_published",
                occurredAt: "2026-10-02T09:00:00Z",
                sourceId: "ada-post-2",
                relationshipBasis: "creator_confirmed",
                summary: "The author stepped aside.",
              },
            ],
          },
        ],
      },
    ],
  };
}

type Path = (string | number)[];

function at(root: Json, path: Path): Json {
  let node: Json = root;
  for (const key of path) {
    if (Array.isArray(node) && typeof key === "number") {
      const next: Json | undefined = node[key];
      if (next === undefined)
        throw new Error(`no ${String(key)} at ${path.join(".")}`);
      node = next;
    } else if (
      node !== null &&
      typeof node === "object" &&
      !Array.isArray(node) &&
      typeof key === "string"
    ) {
      const next: Json | undefined = node[key];
      if (next === undefined) throw new Error(`no ${key} at ${path.join(".")}`);
      node = next;
    } else
      throw new Error(`cannot step into ${String(key)} at ${path.join(".")}`);
  }
  return node;
}

/** A copy of the fixture with one value replaced (or, with `undefined`, removed). */
function changed(
  path: Path,
  value: Json | undefined,
  base: Json = fixture(),
): Json {
  const key = path.at(-1);
  if (key === undefined) throw new Error("empty path");
  const parent = at(base, path.slice(0, -1));
  if (Array.isArray(parent) && typeof key === "number") {
    if (value === undefined) parent.splice(key, 1);
    else parent[key] = value;
  } else if (
    parent !== null &&
    typeof parent === "object" &&
    !Array.isArray(parent) &&
    typeof key === "string"
  ) {
    if (value === undefined) delete parent[key];
    else parent[key] = value;
  } else throw new Error("bad path");
  return base;
}

const T0 = ["traders", 0] as const;
const trader = (...rest: Path): Path => [...T0, ...rest];

function problemsOf(raw: Json): string {
  try {
    parseCuration(raw, NOW);
  } catch (e) {
    if (e instanceof CurationError) return e.problems.join("\n");
    throw e;
  }
  return "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function obj(v: unknown): Record<string, unknown> {
  if (!isRecord(v)) throw new Error("expected an object");
  return v;
}
function list(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) throw new Error("expected a list");
  return v.map(obj);
}
async function json(res: Response): Promise<Record<string, unknown>> {
  return obj(await res.json());
}

let t: TestApp | undefined;
afterAll(async () => {
  await t?.db.close();
});
async function fresh(env: Record<string, string> = {}): Promise<TestApp> {
  if (t) await t.db.close();
  t = await createTestApp(null, { env });
  return t;
}
async function load(app: TestApp, raw: Json, now: Date = NOW) {
  return applyCuration(app.db, parseCuration(raw, now), now);
}

// ============================================================================ the file's rules

describe("curation file validation", () => {
  it("accepts a complete file and normalises its links", () => {
    const c = parseCuration(fixture(), NOW);
    expect(c.demo).toBe(false);
    expect(c.traders).toHaveLength(1);
    expect(c.traders[0]?.links[0]?.value).toBe("https://x.com/ada_test");
    expect(c.traders[0]?.ideas[0]?.events).toHaveLength(1);
    // An unspecified availability history starts with the capture itself.
    const bare = changed(trader("sources", 0, "availability"), undefined);
    expect(
      parseCuration(bare, NOW).traders[0]?.sources[0]?.availability[0]?.state,
    ).toBe("available");
  });

  it("lists every problem at once", () => {
    const raw = changed(
      trader("displayName"),
      "",
      changed(trader("markets"), [], fixture()),
    );
    const text = problemsOf(raw);
    expect(text).toContain("displayName must not be empty");
    expect(text).toContain("markets needs at least 1");
  });

  it("insists the owner confirmed a real trader, and refuses that field in a demo file", () => {
    expect(problemsOf(changed(trader("ownerConfirmed"), undefined))).toContain(
      "ownerConfirmed is required",
    );
    expect(
      problemsOf(changed(trader("ownerConfirmed", "at"), "10/01/2026")),
    ).toContain("ownerConfirmed.at");
    expect(
      problemsOf(changed(trader("ownerConfirmed", "at"), "2026-12-01")),
    ).toContain("in the future");
    const demo = changed(["demo"], true);
    expect(problemsOf(demo)).toContain("must not be set in a demo file");
    const ok = changed(
      trader("ownerConfirmed"),
      undefined,
      changed(["demo"], true),
    );
    expect(parseCuration(ok, NOW).demo).toBe(true);
  });

  it("only takes public https links: no http, no address, no local name, no credentials, no port", () => {
    const bad = [
      "http://x.com/ada",
      "https://127.0.0.1/ada",
      "https://[::1]/ada",
      "https://localhost/ada",
      "https://intranet/ada",
      "https://box.internal/ada",
      "https://user:pw@x.com/ada",
      "https://x.com:8443/ada",
      "javascript:alert(1)",
      "not a link",
    ];
    for (const value of bad) {
      expect(problemsOf(changed(trader("links", 0, "value"), value))).toContain(
        "links[0].value",
      );
    }
    // Same rule for evidence links and source links.
    expect(
      problemsOf(changed(trader("sources", 0, "url"), "https://10.0.0.5/post")),
    ).toContain("sources[0].url");
  });

  it("checks a link is on the platform it claims to be", () => {
    expect(
      problemsOf(
        changed(trader("links", 0, "value"), "https://example.com/ada"),
      ),
    ).toContain("must be on x.com or twitter.com");
    expect(
      problemsOf(changed(trader("sources", 0, "url"), "https://example.com/p")),
    ).toContain("must be on x.com or twitter.com");
    expect(
      parseCuration(
        changed(trader("links", 0, "value"), "https://twitter.com/ada"),
        NOW,
      ).traders[0]?.links[0]?.value,
    ).toBe("https://twitter.com/ada");
  });

  it("treats a wallet as a claim with its own basis, never as identity", () => {
    expect(
      problemsOf(changed(trader("links", 1, "value"), "not-a-wallet")),
    ).toContain("Solana wallet address");
    const weak = changed(trader("links", 1, "identityBasis"), "uncertain");
    expect(problemsOf(weak)).toContain(
      "basisNote is required unless the basis is creator_confirmed",
    );
    const noted = changed(
      trader("links", 1, "basisNote"),
      "Shared once in a reply.",
      weak,
    );
    expect(problemsOf(noted)).toBe("");
  });

  it("refuses future dates, bad formats and a capture older than its source", () => {
    expect(
      problemsOf(
        changed(trader("sources", 0, "retrievedAt"), "2026-12-01T00:00:00Z"),
      ),
    ).toContain("in the future");
    expect(
      problemsOf(
        changed(trader("sources", 0, "retrievedAt"), "2026-10-01 10:00"),
      ),
    ).toContain("ISO time with a zone");
    expect(
      problemsOf(
        changed(trader("sources", 0, "retrievedAt"), "2026-10-01T10:00:00"),
      ),
    ).toContain("ISO time with a zone");
    expect(
      problemsOf(
        changed(trader("sources", 0, "publishedAt"), "2026-10-05T09:00:00Z"),
      ),
    ).toContain("cannot be captured before it exists");
    // Unknown publication time is fine, and stays unknown.
    const unknown = parseCuration(
      changed(trader("sources", 0, "publishedAt"), null),
      NOW,
    );
    expect(unknown.traders[0]?.sources[0]?.publishedAt).toBeNull();
  });

  it("keeps text plain: trimmed, normalised, one line, bounded", () => {
    const title = (value: string) =>
      changed(trader("ideas", 0, "title"), value);
    expect(problemsOf(title(" padded "))).toContain(
      "spaces at the start or end",
    );
    expect(problemsOf(title("two\nlines"))).toContain("control characters");
    expect(problemsOf(title("null\u0000byte"))).toContain("control characters");
    expect(problemsOf(title("line separator"))).toContain("control characters");
    expect(problemsOf(title("é"))).toContain("NFC");
    expect(problemsOf(title("lone \ud800 surrogate"))).toContain("well-formed");
    expect(problemsOf(title("x".repeat(141)))).toContain("longer than 140");
    expect(
      problemsOf(
        changed(trader("sources", 0, "displayedContent"), "y".repeat(501)),
      ),
    ).toContain("longer than 500");
    // Markup is just text here; it is never interpreted by the server or the app.
    expect(problemsOf(title("<script>alert(1)</script>"))).toBe("");
  });

  it("requires explicit tickers for assets", () => {
    for (const bad of ["sol", "Solana token", "", "A".repeat(25)]) {
      expect(
        problemsOf(changed(trader("ideas", 0, "assets"), [bad])),
      ).toContain("assets[0]");
    }
    expect(problemsOf(changed(trader("ideas", 0, "assets"), []))).toContain(
      "needs at least 1",
    );
  });

  it("says why two things are related, unless the creator confirmed it", () => {
    const event = (k: string, v: Json) =>
      changed(trader("ideas", 0, "events", 0, k), v);
    expect(
      problemsOf(event("relationshipBasis", "editorially_associated")),
    ).toContain("basisNote is required");
    expect(problemsOf(event("relationshipBasis", "original"))).toContain(
      "relationshipBasis must be one of",
    );
    const ok = changed(
      trader("ideas", 0, "events", 0, "basisNote"),
      "The curator linked them.",
      event("relationshipBasis", "uncertain"),
    );
    expect(problemsOf(ok)).toBe("");
  });

  it("needs a source or evidence where the event type rests on one", () => {
    const base = (type: string, extra: Record<string, Json> = {}) =>
      changed(trader("ideas", 0, "events", 0), {
        id: "event-one",
        type,
        occurredAt: null,
        relationshipBasis: "creator_confirmed",
        summary: "x",
        ...extra,
      });
    expect(problemsOf(base("update_published"))).toContain(
      "sourceId is required",
    );
    expect(problemsOf(base("evidence_added"))).toContain(
      "evidence is required",
    );
    expect(problemsOf(base("discrepancy_flagged"))).toContain(
      "evidence is required",
    );
    expect(problemsOf(base("source_unavailable"))).toContain(
      "sourceId is required",
    );
    expect(
      problemsOf(
        base("evidence_added", {
          evidence: { kind: "url", ref: "http://x.com/x" },
        }),
      ),
    ).toContain("evidence.ref");
    expect(
      problemsOf(
        base("onchain_activity", {
          evidence: { kind: "url", ref: "https://x.com/x" },
        }),
      ),
    ).toContain("must be transaction");
    expect(
      problemsOf(
        base("onchain_activity", {
          evidence: { kind: "transaction", ref: "short" },
        }),
      ),
    ).toContain("transaction signature");
    expect(
      problemsOf(
        base("onchain_activity", {
          evidence: { kind: "transaction", ref: SIGNATURE },
        }),
      ),
    ).toBe("");
  });

  it("attaches a Relay plan only to a trader with a creator-confirmed wallet", () => {
    const plan = (raw: Json) =>
      changed(
        trader("ideas", 0, "events", 0),
        {
          id: "plan-event",
          type: "relay_plan_published",
          occurredAt: null,
          evidence: { kind: "relay_plan", ref: PLAN },
          relationshipBasis: "creator_confirmed",
          summary: "A plan was published through Relay.",
        },
        raw,
      );
    expect(problemsOf(plan(fixture()))).toBe("");
    // Wallet link downgraded: the plan cannot be attached.
    const weak = changed(
      trader("links", 1, "basisNote"),
      "unsure",
      changed(trader("links", 1, "identityBasis"), "uncertain"),
    );
    expect(problemsOf(plan(weak))).toContain(
      "no wallet link with basis creator_confirmed",
    );
    // No wallet link at all.
    expect(problemsOf(plan(changed(trader("links", 1), undefined)))).toContain(
      "no wallet link",
    );
    // A plan address must be an address.
    expect(
      problemsOf(
        changed(
          trader("ideas", 0, "events", 0, "evidence", "ref"),
          "nope",
          plan(fixture()),
        ),
      ),
    ).toContain("Relay plan address");
  });

  it("checks references between parts of the file", () => {
    expect(
      problemsOf(changed(trader("ideas", 0, "sourceId"), "ghost-source")),
    ).toContain("not one of this trader's sources");
    expect(
      problemsOf(
        changed(trader("ideas", 0, "events", 0, "sourceId"), "ada-post-1"),
      ),
    ).toContain("needs its own source");
    expect(
      problemsOf(
        changed(trader("ideas", 0, "events", 0, "sourceId"), "ghost-source"),
      ),
    ).toContain("ghost-source");
    // An event may not claim a source is unavailable while its history says it is available.
    const gone = changed(trader("ideas", 0, "events", 0), {
      id: "gone",
      type: "source_unavailable",
      occurredAt: null,
      sourceId: "ada-post-2",
      relationshipBasis: "creator_confirmed",
      summary: "It went away.",
    });
    expect(problemsOf(gone)).toContain(
      'availability history ends in "available"',
    );
  });

  it("refuses repeated ids and oversized files", () => {
    const twice = fixture();
    const traders = at(twice, ["traders"]);
    if (!Array.isArray(traders)) throw new Error("fixture");
    traders.push(structuredClone(traders[0] ?? null));
    expect(problemsOf(twice)).toContain('trader "ada-test" appears twice');
    const many = fixture();
    const list21 = at(many, ["traders"]);
    if (!Array.isArray(list21)) throw new Error("fixture");
    while (list21.length < 21) list21.push(structuredClone(list21[0] ?? null));
    expect(problemsOf(many)).toContain("may have at most 20");
    expect(
      problemsOf(changed(trader("ideas", 0, "id"), "i".repeat(57))),
    ).toContain("longer than 56");
    expect(() => parseCuration("not an object", NOW)).toThrow(CurationError);
  });
});

// =============================================================================== tamper evidence

describe("event hashes", () => {
  const base: EventHashInput = {
    ideaId: "idea-1",
    id: "event-1",
    type: "update_published",
    occurredAt: new Date("2026-10-02T09:00:00Z"),
    sourceRecordId: "source-1",
    evidenceKind: null,
    evidenceRef: null,
    relationshipBasis: "creator_confirmed",
    basisNote: null,
    revision: 1,
    reviewState: "not_required",
    summary: "Something happened.",
    prevHash: null,
  };
  const hex = async (e: EventHashInput) =>
    Buffer.from(await eventHash(e)).toString("hex");

  it("is deterministic and changes with every field", async () => {
    const reference = await hex(base);
    expect(await hex({ ...base })).toBe(reference);
    const variants: Partial<EventHashInput>[] = [
      { ideaId: "idea-2" },
      { id: "event-2" },
      { type: "correction" },
      { occurredAt: new Date("2026-10-02T09:00:01Z") },
      { occurredAt: null },
      { sourceRecordId: "source-2" },
      { sourceRecordId: null },
      { relationshipBasis: "uncertain" },
      { basisNote: "because" },
      { revision: 2 },
      { reviewState: "reviewed" },
      { summary: "Something else happened." },
      { prevHash: new Uint8Array(32).fill(1) },
    ];
    const seen = new Set([reference]);
    for (const v of variants) {
      const h = await hex({ ...base, ...v });
      expect(seen.has(h)).toBe(false);
      seen.add(h);
    }
  });

  it("cannot confuse where one field ends and the next begins", async () => {
    const a = await hex({ ...base, id: "ab", type: "c" });
    const b = await hex({ ...base, id: "a", type: "bc" });
    expect(a).not.toBe(b);
    // An unknown time is not the same as a time.
    expect(await hex({ ...base, occurredAt: null })).not.toBe(
      await hex({ ...base, occurredAt: new Date(0) }),
    );
  });
});

// ============================================================================== the loader (DB)

describe("applyCuration", () => {
  it("records the trader, links, sources, availability, idea, its origin event and the update", async () => {
    const app = await fresh();
    const report = await load(app, fixture());
    expect(report.traders).toEqual({ created: 1, updated: 0, unchanged: 0 });
    expect(report.links.added).toBe(2);
    expect(report.sources).toEqual({
      created: 2,
      unchanged: 0,
      availabilityAdded: 2,
    });
    expect(report.ideas.created).toBe(1);
    expect(report.events.appended).toBe(2); // the origin event and the update

    const events =
      await app.db`select id, event_type, relationship_basis, seq from timeline_events order by seq`;
    expect(events.map((e: { id: string }) => e.id)).toEqual([
      "sol-watch-origin",
      "sol-update",
    ]);
    expect(events[0].event_type).toBe("source_added");
    expect(events[0].relationship_basis).toBe("original");
  });

  it("is idempotent: loading the same file again changes nothing", async () => {
    const app = await fresh();
    await load(app, fixture());
    const before = await app.db`select seq from timeline_events order by seq`;
    const again = await load(app, fixture());
    expect(again.events).toEqual({ appended: 0, unchanged: 2 });
    expect(again.traders.unchanged).toBe(1);
    expect(again.sources).toEqual({
      created: 0,
      unchanged: 2,
      availabilityAdded: 0,
    });
    expect(again.ideas).toEqual({ created: 0, unchanged: 1 });
    expect(await app.db`select seq from timeline_events order by seq`).toEqual(
      before,
    );
  });

  it("refuses a file that contradicts a recorded entry and rolls everything back", async () => {
    const app = await fresh();
    await load(app, fixture());
    // The same source id, different words; plus a brand new trader that must NOT be kept.
    const edited = changed(
      trader("sources", 0, "displayedContent"),
      "Watching SOL near 150.",
    );
    const list2 = at(edited, ["traders"]);
    if (!Array.isArray(list2)) throw new Error("fixture");
    const second = structuredClone(at(fixture(), ["traders", 0]));
    list2.push(changed(["id"], "zed-test", second));
    // The new trader needs unique child ids too.
    const raw = JSON.stringify(list2[1])
      .replaceAll("ada-post", "zed-post")
      .replaceAll("sol-watch", "zed-watch")
      .replaceAll("sol-update", "zed-update")
      .replaceAll("ada_test", "zed_test")
      .replace(WALLET, "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
    list2[1] = JSON.parse(raw);
    await expect(load(app, edited)).rejects.toBeInstanceOf(
      CurationConflictError,
    );
    expect((await app.db`select id from traders`).length).toBe(1);
    expect((await app.db`select id from source_records`).length).toBe(2);
  });

  it("refuses to change a recorded event, idea or the source of an idea", async () => {
    const app = await fresh();
    await load(app, fixture());
    await expect(
      load(
        app,
        changed(trader("ideas", 0, "events", 0, "summary"), "Rewritten."),
      ),
    ).rejects.toThrow(/already recorded differently/);
    await expect(
      load(app, changed(trader("ideas", 0, "title"), "A different title")),
    ).rejects.toThrow(/already recorded differently/);
    await expect(
      load(
        app,
        changed(trader("sources", 1, "publishedAt"), "2026-10-02T08:00:00Z"),
      ),
    ).rejects.toThrow(/different content/);
    expect(
      (await app.db`select count(*)::int as n from timeline_events`)[0].n,
    ).toBe(2);
  });

  it("appends a late arrival with a later seq, and the timeline still puts it in its place in time", async () => {
    const app = await fresh();
    await load(app, fixture());
    // A source discovered later that happened EARLIER than the update already recorded.
    const later = fixture();
    const sources = at(later, trader("sources"));
    const events = at(later, trader("ideas", 0, "events"));
    if (!Array.isArray(sources) || !Array.isArray(events))
      throw new Error("fixture");
    sources.push({
      id: "ada-post-1b",
      provider: "x",
      providerId: "100b",
      url: "https://x.com/ada_test/status/100b",
      recordType: "post",
      publishedAt: "2026-10-01T15:00:00Z",
      retrievedAt: "2026-10-09T10:00:00Z",
      displayedContent: "An earlier note, found later.",
      availability: [
        { state: "available", observedAt: "2026-10-09T10:00:00Z", note: null },
      ],
    });
    events.unshift({
      id: "sol-earlier-note",
      type: "update_published",
      occurredAt: "2026-10-01T15:00:00Z",
      sourceId: "ada-post-1b",
      relationshipBasis: "creator_confirmed",
      summary: "An earlier note was found later.",
    });
    const report = await load(app, later, new Date("2026-10-09T11:00:00Z"));
    expect(report.events.appended).toBe(1);
    const seqs = await app.db`select id, seq from timeline_events order by seq`;
    expect(seqs.map((r: { id: string }) => r.id)).toEqual([
      "sol-watch-origin",
      "sol-update",
      "sol-earlier-note",
    ]);
    const res = await app.get("/discovery/ideas/sol-watch");
    const ids = list(obj(await res.json()).events).map((e) => e.id);
    expect(ids).toEqual(["sol-watch-origin", "sol-earlier-note", "sol-update"]);
  });

  it("keeps events with identical times in the order they were recorded", async () => {
    const app = await fresh();
    const raw = fixture();
    const events = at(raw, trader("ideas", 0, "events"));
    if (!Array.isArray(events)) throw new Error("fixture");
    for (const id of ["tie-b", "tie-a"]) {
      events.push({
        id,
        type: "correction",
        occurredAt: "2026-10-03T00:00:00Z",
        relationshipBasis: "creator_confirmed",
        summary: `Tied ${id}`,
      });
    }
    await load(app, raw);
    const res = await app.get("/discovery/ideas/sol-watch");
    const ids = list(obj(await res.json()).events).map((e) => e.id);
    expect(ids).toEqual(["sol-watch-origin", "sol-update", "tie-b", "tie-a"]);
  });

  it("serialises concurrent writers so the chain and the order stay intact", async () => {
    const app = await fresh();
    await load(app, fixture());
    const withEvent = (id: string) => {
      const raw = fixture();
      const events = at(raw, trader("ideas", 0, "events"));
      if (!Array.isArray(events)) throw new Error("fixture");
      events.push({
        id,
        type: "correction",
        occurredAt: null,
        relationshipBasis: "creator_confirmed",
        summary: id,
      });
      return raw;
    };
    await Promise.all(
      ["conc-one", "conc-two", "conc-three"].map((id) =>
        load(app, withEvent(id)),
      ),
    );
    const body = obj(
      await (await app.get("/discovery/ideas/sol-watch")).json(),
    );
    expect(obj(body.chain).verified).toBe(true);
    expect(list(body.events)).toHaveLength(5);
    const seqs = (
      await app.db`select seq from timeline_events order by seq`
    ).map((r: { seq: unknown }) => Number(r.seq));
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it("makes sources, availability, ideas and events append-only in the database itself", async () => {
    const app = await fresh();
    await load(app, fixture());
    const attempts = [
      async () => {
        await app.db`update source_records set displayed_content = 'x' where id = 'ada-post-1'`;
      },
      async () => {
        await app.db`delete from source_records where id = 'ada-post-1'`;
      },
      async () => {
        await app.db`update source_availability set state = 'removed'`;
      },
      async () => {
        await app.db`delete from source_availability`;
      },
      async () => {
        await app.db`update ideas set title = 'x'`;
      },
      async () => {
        await app.db`delete from ideas`;
      },
      async () => {
        await app.db`update timeline_events set summary = 'x'`;
      },
      async () => {
        await app.db`delete from timeline_events`;
      },
    ];
    for (const attempt of attempts)
      await expect(attempt()).rejects.toThrow(/append-only/);
  });

  it("lets the database refuse a real trader nobody confirmed, even if the loader were bypassed", async () => {
    const app = await fresh();
    const insert = async (demo: boolean) => {
      await app.db`insert into traders (id, display_name, markets, attribution_basis, participation, coverage_limits, curator, is_demo)
                   values ('raw-insert', 'x', ${"{crypto}"}::text[], 'x', 'public_source_only', 'x', 'x', ${demo})`;
    };
    await expect(insert(false)).rejects.toThrow();
    await insert(true); // a demo trader may omit it
  });

  it("keeps demo and live data apart, and updates links as the file's truth", async () => {
    const app = await fresh();
    await load(app, fixture());
    // A demo file may not take over a live trader id.
    const asDemo = changed(
      trader("ownerConfirmed"),
      undefined,
      changed(["demo"], true),
    );
    await expect(load(app, asDemo)).rejects.toThrow(/exists as live data/);
    // Changing a link's basis updates it; dropping a link removes it.
    const edited = changed(
      trader("links", 1),
      undefined,
      changed(trader("links", 0, "identityBasis"), "uncertain"),
    );
    const note = changed(
      trader("links", 0, "basisNote"),
      "Re-checked: not sure.",
      edited,
    );
    const report = await load(app, note);
    expect(report.links).toEqual({ added: 0, changed: 1, removed: 1 });
    expect(
      (await app.db`select count(*)::int as n from trader_links`)[0].n,
    ).toBe(1);
  });

  it("appends source availability instead of editing it", async () => {
    const app = await fresh();
    await load(app, fixture());
    const gone = changed(trader("sources", 1, "availability"), [
      { state: "available", observedAt: "2026-10-02T10:00:00Z", note: null },
      {
        state: "removed",
        observedAt: "2026-10-05T10:00:00Z",
        note: "Deleted by its author.",
      },
    ]);
    const report = await load(app, gone);
    expect(report.sources.availabilityAdded).toBe(1);
    expect(
      (
        await app.db`select count(*)::int as n from source_availability where source_record_id = 'ada-post-2'`
      )[0].n,
    ).toBe(2);
  });
});

// ================================================================================= the API

describe("GET /discovery", () => {
  it("serves sourced traders with their coverage and the limits of it", async () => {
    const app = await fresh();
    await load(app, fixture());
    const body = await json(await app.get("/discovery/traders"));
    const item = list(body.items)[0] ?? {};
    expect(item).toMatchObject({
      id: "ada-test",
      displayName: "Ada Test (test fixture)",
      participation: "public_source_only",
      provenance: "manual_coverage",
      isDemo: false,
      ideaCount: 1,
      ownerConfirmed: { by: "test owner", at: "2026-10-01" },
    });
    expect(String(item.coverageLimits)).toContain("Nothing is real");
    expect(item.latestSeq).toBe("2");
    expect(body.nextCursor).toBeNull();
  });

  it("shows a trader's links with how each is known, and their ideas", async () => {
    const app = await fresh();
    await load(app, fixture());
    const body = await json(await app.get("/discovery/traders/ada-test"));
    expect(list(body.links)).toEqual([
      {
        kind: "x",
        value: "https://x.com/ada_test",
        identityBasis: "creator_confirmed",
        basisNote: null,
      },
      {
        kind: "wallet",
        value: WALLET,
        identityBasis: "creator_confirmed",
        basisNote: null,
      },
    ]);
    expect(list(body.ideas).map((i) => i.id)).toEqual(["sol-watch"]);
  });

  it("pages traders by id with an opaque cursor, and ignores a garbage cursor", async () => {
    const app = await fresh();
    await load(app, fixture());
    const second = JSON.parse(
      JSON.stringify(at(fixture(), ["traders", 0]))
        .replaceAll("ada-post", "bee-post")
        .replaceAll("sol-watch", "bee-watch")
        .replaceAll("sol-update", "bee-update")
        .replaceAll("ada_test", "bee_test")
        .replaceAll("ada-test", "bee-test")
        .replace(WALLET, PLAN),
    );
    const both = fixture();
    const traders = at(both, ["traders"]);
    if (!Array.isArray(traders)) throw new Error("fixture");
    traders.push(second);
    await load(app, both);
    const first = await json(await app.get("/discovery/traders?limit=1"));
    expect(list(first.items).map((i) => i.id)).toEqual(["ada-test"]);
    expect(typeof first.nextCursor).toBe("string");
    const next = await json(
      await app.get(
        `/discovery/traders?limit=1&cursor=${String(first.nextCursor)}`,
      ),
    );
    expect(list(next.items).map((i) => i.id)).toEqual(["bee-test"]);
    expect(next.nextCursor).toBeNull();
    const junk = await json(
      await app.get("/discovery/traders?cursor=!!not-a-cursor!!"),
    );
    expect(list(junk.items).map((i) => i.id)).toEqual(["ada-test", "bee-test"]);
  });

  it("rejects a malformed id or limit and 404s an unknown one", async () => {
    const app = await fresh();
    expect((await app.get("/discovery/traders/NOT%20AN%20ID")).status).toBe(
      400,
    );
    expect((await app.get("/discovery/ideas/NOT%20AN%20ID")).status).toBe(400);
    expect((await app.get("/discovery/traders/nobody-here")).status).toBe(404);
    expect((await app.get("/discovery/ideas/nothing-here")).status).toBe(404);
    expect((await app.get("/discovery/traders?limit=abc")).status).toBe(400);
    expect(
      (await app.get("/discovery/ideas?trader=NOT%20AN%20ID")).status,
    ).toBe(400);
  });

  it("lists ideas by newest activity, with a stable page-through and a trader filter", async () => {
    const app = await fresh();
    const raw = fixture();
    const ideas = at(raw, trader("ideas"));
    if (!Array.isArray(ideas)) throw new Error("fixture");
    for (const n of ["one", "two", "three"]) {
      ideas.push({
        id: `idea-${n}`,
        sourceId: "ada-post-1",
        title: `Idea ${n}`,
        assets: ["SOL"],
        market: "crypto",
        statedConditions: null,
        events: [],
      });
    }
    await load(app, raw);
    const seen: string[] = [];
    let cursor = "";
    for (let page = 0; page < 6; page++) {
      const body = await json(
        await app.get(`/discovery/ideas?limit=2${cursor}`),
      );
      seen.push(...list(body.items).map((i) => String(i.id)));
      if (body.nextCursor === null) break;
      cursor = `&cursor=${String(body.nextCursor)}`;
    }
    // Newest activity first: the ideas added last come first; the original idea (which also has an
    // update) was recorded before them.
    expect(seen).toEqual(["idea-three", "idea-two", "idea-one", "sol-watch"]);
    expect(new Set(seen).size).toBe(seen.length);
    const filtered = await json(
      await app.get("/discovery/ideas?trader=ada-test&limit=30"),
    );
    expect(list(filtered.items)).toHaveLength(4);
    expect(
      list(
        (await json(await app.get("/discovery/ideas?trader=ghost-trader")))
          .items,
      ),
    ).toHaveLength(0);
  });

  it("shows the original source with both times, and unknown as unknown", async () => {
    const app = await fresh();
    const raw = changed(trader("sources", 0, "publishedAt"), null);
    await load(app, raw);
    const body = await json(await app.get("/discovery/ideas/sol-watch"));
    const original = obj(body.original);
    expect(original.publishedAt).toBeNull();
    expect(original.retrievedAt).toBe("2026-10-01T10:00:00.000Z");
    expect(original.url).toBe("https://x.com/ada_test/status/100");
    expect(original.provenance).toBe("manual_coverage");
    expect(original.displayedContent).toBe("Watching SOL near 140.");
    const first = list(body.events)[0] ?? {};
    expect(first.occurredAt).toBeNull();
    expect(obj(first.relationship).basis).toBe("original");
    expect(body.statedConditions).toBe("Watching 140.");
  });

  it("says entry conditions are unspecified by leaving them null, never inventing a range", async () => {
    const app = await fresh();
    await load(app, changed(trader("ideas", 0, "statedConditions"), null));
    const body = await json(await app.get("/discovery/ideas/sol-watch"));
    expect(body.statedConditions).toBeNull();
    expect(JSON.stringify(body)).not.toContain("entryLow");
  });

  it("keeps a removed source as a tombstone: the fact and the hash, not the words", async () => {
    const app = await fresh();
    await load(app, fixture());
    const gone = changed(trader("sources", 1, "availability"), [
      { state: "available", observedAt: "2026-10-02T10:00:00Z", note: null },
      {
        state: "removed",
        observedAt: "2026-10-05T10:00:00Z",
        note: "Deleted by its author.",
      },
    ]);
    await load(app, gone);
    const body = await json(await app.get("/discovery/ideas/sol-watch"));
    const update = list(body.events).find((e) => e.id === "sol-update") ?? {};
    const source = obj(update.source);
    expect(source.contentRemoved).toBe(true);
    expect(source.displayedContent).toBeNull();
    expect(obj(source.availability)).toMatchObject({
      state: "removed",
      note: "Deleted by its author.",
    });
    expect(String(source.contentHash)).toMatch(/^[0-9a-f]{64}$/);
    // The hash still covers the words that were captured, so a later claim can be checked.
    expect(JSON.stringify(body)).not.toContain("stepping aside");
  });

  it("verifies the hash chain on every read and flags a tampered history", async () => {
    const app = await fresh();
    await load(app, fixture());
    const ok = obj(
      (await json(await app.get("/discovery/ideas/sol-watch"))).chain,
    );
    expect(ok).toEqual({ verified: true, checkedEvents: 2 });

    // Someone with database access edits the middle of the history (the trigger is the guard; the
    // hash is what notices when the guard is bypassed).
    await app.db`alter table timeline_events disable trigger timeline_events_append_only`;
    await app.db`update timeline_events set summary = 'Rewritten history.' where id = 'sol-watch-origin'`;
    await app.db`alter table timeline_events enable trigger timeline_events_append_only`;
    const bad = obj(
      (await json(await app.get("/discovery/ideas/sol-watch"))).chain,
    );
    expect(bad.verified).toBe(false);
  });

  it("serves only demo rows on a demo server and only live rows otherwise", async () => {
    const live = await fresh();
    await load(live, fixture());
    const demoFile = changed(
      trader("ownerConfirmed"),
      undefined,
      changed(["demo"], true),
    );
    const renamed = JSON.parse(
      JSON.stringify(demoFile)
        .replaceAll("ada-post", "demo-post")
        .replaceAll("sol-watch", "demo-watch")
        .replaceAll("sol-update", "demo-update")
        .replaceAll("ada_test", "demo_test")
        .replaceAll("ada-test", "demo-test")
        .replace(WALLET, PLAN),
    );
    await load(live, renamed);
    const liveIds = list(
      (await json(await live.get("/discovery/traders"))).items,
    ).map((i) => i.id);
    expect(liveIds).toEqual(["ada-test"]);
    expect((await live.get("/discovery/traders/demo-test")).status).toBe(404);
    expect((await live.get("/discovery/ideas/demo-watch")).status).toBe(404);

    // The same database, read by a server in demo mode.
    const { loadEnv } = await import("../src/env");
    const { createDiscoveryService } = await import("../src/discovery/service");
    const demoService = createDiscoveryService({
      env: loadEnv({ NETWORK: "localnet", DEMO_MODE: "true" }),
      db: live.db,
    });
    const demoTraders = (await demoService.listTraders({})).items.map(
      (i) => i.id,
    );
    expect(demoTraders).toEqual(["demo-test"]);
    expect((await demoService.listIdeas({})).items.map((i) => i.id)).toEqual([
      "demo-watch",
    ]);
  });

  it("cross-checks an attached Relay plan against the trader's confirmed wallet", async () => {
    const app = await fresh();
    const raw = changed(trader("ideas", 0, "events", 0), {
      id: "plan-event",
      type: "relay_plan_published",
      occurredAt: "2026-10-03T09:00:00Z",
      evidence: { kind: "relay_plan", ref: PLAN },
      relationshipBasis: "creator_confirmed",
      summary: "A plan was published through Relay.",
    });
    await load(app, raw);
    const plan = async () =>
      obj(
        list(
          (await json(await app.get("/discovery/ideas/sol-watch"))).events,
        ).find((e) => e.id === "plan-event")?.plan,
      );

    // The plan is not in our database yet: we cannot say, and we do not guess.
    expect(await plan()).toEqual({
      known: false,
      creatorMatchesLinkedWallet: null,
    });

    const insertPlan = async (creator: string) => {
      await app.db`delete from plans`;
      await app.db`insert into plans (plan_pda, cluster, creator_address, onchain_plan_id, base_mint, quote_mint,
                                      base_decimals, quote_decimals, latest_version, status, created_at_chain)
                   values (${PLAN}, 'localnet', ${creator}, 1, 'b', 'q', 9, 6, 1, 'open', 0)`;
    };
    await insertPlan(WALLET);
    expect(await plan()).toEqual({
      known: true,
      creatorMatchesLinkedWallet: true,
    });
    await insertPlan("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(await plan()).toEqual({
      known: true,
      creatorMatchesLinkedWallet: false,
    });
  });

  it("is read-only: a write needs the app's origin, and there is no write route", async () => {
    const app = await fresh();
    expect((await app.post("/discovery/traders", { id: "nope" })).status).toBe(
      404,
    );
    expect(
      (
        await app.app.request("/discovery/traders", {
          method: "POST",
          body: "{}",
          headers: { "content-type": "application/json" },
        })
      ).status,
    ).toBe(403);
  });
});
