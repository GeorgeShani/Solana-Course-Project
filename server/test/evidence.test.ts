import { afterAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyCuration } from "../src/discovery/apply";
import { parseCuration } from "../src/discovery/curation";
import {
  LIMITS,
  ReviewError,
  hashToken,
  newId,
  newSessionToken,
} from "../src/discovery/evidence";
import { createTestApp, type TestApp } from "./helpers";

const IDEA = "demo-sol-140-area";
const SIGNATURE = "5".repeat(88);
const GOOD_QUESTION = "Is there a primary source for the 150 level mentioned?";
const GOOD_EXPLANATION =
  "This is the exchange page that shows the price at that time.";

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

/** A demo-mode server with the fictional demo file loaded (the real file, not a copy). */
async function demoApp(): Promise<TestApp> {
  if (t) await t.db.close();
  t = await createTestApp(null, { env: { DEMO_MODE: "true" } });
  const raw: unknown = JSON.parse(
    readFileSync(join(import.meta.dir, "..", "curation", "demo.json"), "utf8"),
  );
  await applyCuration(t.db, parseCuration(raw));
  return t;
}

const cookieOf = (res: Response): string | null =>
  /relay_visitor=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")?.[1] ??
  null;
const as = (token: string) => ({ cookie: `relay_visitor=${token}` });

async function ask(
  app: TestApp,
  question: string = GOOD_QUESTION,
  headers: Record<string, string> = {},
  extra: Record<string, unknown> = {},
) {
  return app.post(
    "/discovery/evidence-requests",
    { ideaId: IDEA, question, ...extra },
    headers,
  );
}

/** Opens a request as a fresh visitor and approves it. */
async function openRequest(app: TestApp, question: string = GOOD_QUESTION) {
  const res = await ask(app, question);
  const token = cookieOf(res) ?? "";
  const id = String(obj((await json(res)).request).id);
  await app.review.approveRequest(id, "Reviewer One");
  return { id, token };
}

async function submit(
  app: TestApp,
  requestId: string,
  token: string,
  body: Record<string, unknown> = {},
  extraHeaders: Record<string, string> = {},
) {
  return app.post(
    `/discovery/evidence-requests/${requestId}/submissions`,
    {
      kind: "url",
      ref: "https://example.com/evidence/1",
      explanation: GOOD_EXPLANATION,
      ...body,
    },
    { ...as(token), ...extraHeaders },
  );
}

async function idea(app: TestApp) {
  return json(await app.get(`/discovery/ideas/${IDEA}`));
}

// ===================================================================== the anonymous session

describe("visitor sessions", () => {
  it("starts an anonymous session on the first request: a random token in an HttpOnly cookie, stored only as a hash", async () => {
    const app = await demoApp();
    const res = await ask(app);
    expect(res.status).toBe(201);
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toContain("relay_visitor=");
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Path=\//);
    expect(header).toMatch(/Max-Age=2592000/);
    const token = cookieOf(res) ?? "";
    expect(token.length).toBeGreaterThanOrEqual(40);

    const sessions = await app.db`select token_hash from visitor_sessions`;
    expect(sessions).toHaveLength(1);
    const stored = Buffer.from(sessions[0].token_hash).toString("hex");
    expect(stored).toBe(Buffer.from(await hashToken(token)).toString("hex"));
    // The token itself is nowhere in the database.
    for (const table of [
      "visitor_sessions",
      "evidence_requests",
      "evidence_submissions",
    ]) {
      const dump = JSON.stringify(
        await app.db.unsafe(`select * from ${table}`),
      );
      expect(dump).not.toContain(token);
    }
  });

  it("reuses the session for later requests and keeps each visitor's requests private", async () => {
    const app = await demoApp();
    const first = await ask(app);
    const token = cookieOf(first) ?? "";
    const again = await ask(
      app,
      "What was the source of the 130 level?",
      as(token),
    );
    expect(again.status).toBe(201);
    expect(cookieOf(again)).toBeNull(); // no new session
    expect(
      (await app.db`select count(*)::int as n from visitor_sessions`)[0].n,
    ).toBe(1);

    const mine = list(
      (await json(await app.get("/discovery/me/requests", as(token)))).items,
    );
    expect(mine.map((r) => r.status)).toEqual([
      "pending_review",
      "pending_review",
    ]);

    // Another browser, and a browser with no cookie, see nothing of it.
    const other =
      cookieOf(await ask(app, "A different question about the post?")) ?? "";
    const theirs = list(
      (await json(await app.get("/discovery/me/requests", as(other)))).items,
    );
    expect(theirs).toHaveLength(1);
    expect(
      list((await json(await app.get("/discovery/me/requests"))).items),
    ).toHaveLength(0);
    expect(
      list(
        (
          await json(
            await app.get("/discovery/me/requests", as("x".repeat(43))),
          )
        ).items,
      ),
    ).toHaveLength(0);
  });

  it("starts a new session when the old one expired or the cookie is garbage", async () => {
    const app = await demoApp();
    const token = cookieOf(await ask(app)) ?? "";
    await app.db`update visitor_sessions set expires_at = now() - interval '1 minute'`;
    const res = await ask(
      app,
      "A question asked after the session expired?",
      as(token),
    );
    expect(res.status).toBe(201);
    expect(cookieOf(res)).not.toBeNull();
    expect(cookieOf(res)).not.toBe(token);
    const junk = await ask(
      app,
      "A question asked with a junk cookie value?",
      as("not a valid token!!"),
    );
    expect(junk.status).toBe(201);
    expect(cookieOf(junk)).not.toBeNull();
  });

  it("makes ids and tokens that cannot be guessed", () => {
    expect(newId("er")).toMatch(/^er_[a-z0-9]{16}$/);
    expect(newId("es")).toMatch(/^es_[a-z0-9]{16}$/);
    expect(newId("er")).not.toBe(newId("er"));
    expect(newSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

// ================================================================================== requests

describe("asking for evidence", () => {
  it("keeps a new request private: not in the timeline, not on the idea page", async () => {
    const app = await demoApp();
    const before = await idea(app);
    const res = await ask(app);
    const request = obj((await json(res)).request);
    expect(request).toMatchObject({
      ideaId: IDEA,
      status: "pending_review",
      question: GOOD_QUESTION,
    });
    const after = await idea(app);
    expect(list(after.events)).toHaveLength(list(before.events).length);
    expect(list(after.evidenceRequests)).toEqual([]);
    expect(JSON.stringify(after)).not.toContain(GOOD_QUESTION);
  });

  it("returns the same request for the same question, however it is spaced or capitalised", async () => {
    const app = await demoApp();
    const first = await ask(app);
    const token = cookieOf(first) ?? "";
    const id = obj((await json(first)).request).id;
    const again = await ask(
      app,
      "is there a  PRIMARY source for the 150 level mentioned?",
      as(token),
    );
    expect(again.status).toBe(200);
    const body = await json(again);
    expect(body.created).toBe(false);
    expect(obj(body.request).id).toBe(id);
    expect(
      (await app.db`select count(*)::int as n from evidence_requests`)[0].n,
    ).toBe(1);
    // A different visitor asking the same thing is their own request.
    expect((await ask(app)).status).toBe(201);
  });

  it("refuses badly formed questions", async () => {
    const app = await demoApp();
    const bad: [string, unknown][] = [
      ["too short", "why?"],
      ["too long", "q".repeat(281)],
      ["a link", "Check https://example.com/proof for me please"],
      ["a bare www link", "see www.example.com for details on this"],
      ["control characters", "A question\nwith a new line in it"],
      ["markup is fine as text but not empty", "     "],
      ["not text", 12345],
    ];
    for (const [, question] of bad) {
      const res = await app.post("/discovery/evidence-requests", {
        ideaId: IDEA,
        question,
      });
      expect(res.status).toBe(400);
    }
    expect(
      (await app.db`select count(*)::int as n from evidence_requests`)[0].n,
    ).toBe(0);
    // No session is started for a request that is refused before it is stored... only valid asks make rows.
    expect(
      (await ask(app, "<script>alert(1)</script> is this safe to show?"))
        .status,
    ).toBe(201);
  });

  it("checks the idea and the event it is about", async () => {
    const app = await demoApp();
    expect(
      (
        await app.post("/discovery/evidence-requests", {
          ideaId: "NOT AN ID",
          question: GOOD_QUESTION,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await app.post("/discovery/evidence-requests", {
          ideaId: "no-such-idea",
          question: GOOD_QUESTION,
        })
      ).status,
    ).toBe(404);
    expect(
      (await ask(app, GOOD_QUESTION, {}, { eventId: "no-such-event" })).status,
    ).toBe(404);
    expect(
      (
        await ask(
          app,
          GOOD_QUESTION,
          {},
          { eventId: "demo-equity-view-origin" },
        )
      ).status,
    ).toBe(404); // another idea's event
    expect(
      (await ask(app, GOOD_QUESTION, {}, { eventId: "BAD ID" })).status,
    ).toBe(400);
    const ok = await ask(
      app,
      GOOD_QUESTION,
      {},
      { eventId: "demo-sol-update-1" },
    );
    expect(ok.status).toBe(201);
    expect(obj((await json(ok)).request).eventId).toBe("demo-sol-update-1");
  });

  it("ignores a status or reviewer the visitor tries to send", async () => {
    const app = await demoApp();
    const res = await ask(
      app,
      GOOD_QUESTION,
      {},
      {
        status: "open",
        reviewedBy: "me",
        reviewed_by: "me",
        published_event_id: "x",
      },
    );
    expect(obj((await json(res)).request).status).toBe("pending_review");
    const row = (
      await app.db`select status, reviewed_by from evidence_requests`
    )[0];
    expect(row.status).toBe("pending_review");
    expect(row.reviewed_by).toBeNull();
  });

  it("caps what one browser can ask in a day, and what can wait for review on one idea", async () => {
    const app = await demoApp();
    const first = await ask(app, "Question number one about the post?");
    const token = cookieOf(first) ?? "";
    for (let n = 2; n <= LIMITS.requestsPerDay; n++) {
      expect(
        (
          await ask(
            app,
            `Question number ${"abcdefghij"[n]} about the post?`,
            as(token),
          )
        ).status,
      ).toBe(201);
    }
    const over = await ask(
      app,
      "One question too many for a single day?",
      as(token),
    );
    expect(over.status).toBe(429);
    expect(obj((await json(over)).error).code).toBe("too_many_requests");
    // Someone else is not affected.
    expect(
      (await ask(app, "A question from another browser entirely?")).status,
    ).toBe(201);

    // Many visitors piling onto one idea fill its review queue.
    const queue = await demoApp();
    const sessions: Buffer[] = [];
    for (let n = 0; n < LIMITS.pendingPerIdea; n++) {
      const hash = Buffer.from(
        await hashToken(`seed-token-${n}-${"x".repeat(30)}`),
      );
      sessions.push(hash);
      await queue.db`insert into visitor_sessions (token_hash, expires_at) values (${hash}, now() + interval '1 day')`;
      await queue.db`insert into evidence_requests (id, idea_id, question, question_key, session_hash)
                     values (${newId("er")}, ${IDEA}, ${`Seeded question number ${n} here`}, ${Buffer.from(new Uint8Array(32).fill(n))}, ${hash})`;
    }
    const full = await ask(queue, "A question that arrives to a full queue?");
    expect(full.status).toBe(429);
    expect(obj((await json(full)).error).code).toBe("review_queue_full");
  });

  it("only reads and writes through the app's origin, as JSON", async () => {
    const app = await demoApp();
    const body = JSON.stringify({ ideaId: IDEA, question: GOOD_QUESTION });
    expect(
      (
        await app.app.request("/discovery/evidence-requests", {
          method: "POST",
          body,
          headers: { "content-type": "application/json" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.app.request("/discovery/evidence-requests", {
          method: "POST",
          body,
          headers: {
            "content-type": "application/json",
            origin: "https://evil.example",
          },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.app.request("/discovery/evidence-requests", {
          method: "POST",
          body,
          headers: { "content-type": "text/plain", origin: app.env.appOrigin },
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await app.app.request("/discovery/evidence-requests", {
          method: "POST",
          body: "not json",
          headers: {
            "content-type": "application/json",
            origin: app.env.appOrigin,
          },
        })
      ).status,
    ).toBe(400);
    expect(
      (await app.db`select count(*)::int as n from visitor_sessions`)[0].n,
    ).toBe(0);
  });

  it("does not take requests for an idea on the other side of the demo/live line", async () => {
    // A live server (no DEMO_MODE) sharing the database cannot see the demo idea at all.
    const app = await demoApp();
    const { createEvidenceService } = await import("../src/discovery/evidence");
    const { loadEnv } = await import("../src/env");
    const live = createEvidenceService({
      env: loadEnv({ NETWORK: "localnet" }),
      db: app.db,
    });
    const visitor = await live.visitorFor(undefined, true);
    if (!visitor) throw new Error("no visitor");
    await expect(
      live.createRequest(visitor, { ideaId: IDEA, question: GOOD_QUESTION }),
    ).rejects.toThrow(/No such idea/);
  });
});

// ============================================================================= the review

describe("review", () => {
  it("publishes an approved request as an 'Evidence requested' event, and the timeline stays verifiable", async () => {
    const app = await demoApp();
    const { id } = await openRequest(app);
    const detail = await idea(app);
    const event = list(detail.events).find((e) => e.id === `req-${id}`) ?? {};
    expect(event).toMatchObject({
      type: "evidence_requested",
      reviewState: "reviewed",
      summary: GOOD_QUESTION,
    });
    expect(obj(event.relationship)).toMatchObject({
      basis: "editorially_associated",
    });
    expect(String(obj(event.relationship).note)).toContain("Reviewer One");
    expect(obj(detail.chain).verified).toBe(true);
    expect(list(detail.evidenceRequests)).toEqual([
      expect.objectContaining({
        id,
        question: GOOD_QUESTION,
        status: "open",
        responseEventIds: [],
        publishedEventId: `req-${id}`,
      }),
    ]);
    // The requester sees it open, too.
  });

  it("is not a 'change' for watchers on its own, but a reader can still catch up past it", async () => {
    const app = await demoApp();
    const before = obj(
      list(
        (await json(await app.get(`/discovery/changes?watch=idea:${IDEA}:0`)))
          .items,
      )[0],
    );
    await openRequest(app);
    const after = obj(
      list(
        (await json(await app.get(`/discovery/changes?watch=idea:${IDEA}:0`)))
          .items,
      )[0],
    );
    expect(after.count).toBe(before.count);
    expect(Number(after.latestSeq)).toBeGreaterThan(Number(before.latestSeq));
  });

  it("rejecting a request keeps it private and tells only the requester why", async () => {
    const app = await demoApp();
    const res = await ask(app);
    const token = cookieOf(res) ?? "";
    const id = String(obj((await json(res)).request).id);
    await app.review.rejectRequest(
      id,
      "Reviewer One",
      "Not a question about the source.",
    );
    const mine = list(
      (await json(await app.get("/discovery/me/requests", as(token)))).items,
    );
    expect(mine[0]).toMatchObject({
      status: "rejected",
      reviewNote: "Not a question about the source.",
    });
    expect(list((await idea(app)).evidenceRequests)).toEqual([]);
    expect((await submit(app, id, token)).status).toBe(409);
  });

  it("accepts a submission as the reviewer's own words; the submitter's explanation is never published", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    const sent = await submit(app, id, token, {
      explanation: "SECRET_SUBMITTER_WORDS about the exchange page",
    });
    expect(sent.status).toBe(201);
    const submissionId = String(obj((await json(sent)).submission).id);
    const { eventId } = await app.review.acceptSubmission(
      submissionId,
      "Reviewer One",
      {
        summary: "An exchange page shows the price at that time.",
        basis: "editorially_associated",
        basisNote:
          "The reviewer matched the date and the asset; the author did not confirm it.",
      },
    );
    expect(eventId).toBe(`res-${submissionId}`);

    const detail = await idea(app);
    const event = list(detail.events).find((e) => e.id === eventId) ?? {};
    expect(event).toMatchObject({
      type: "response_added",
      reviewState: "reviewed",
      summary: "An exchange page shows the price at that time.",
      evidence: { kind: "url", ref: "https://example.com/evidence/1" },
    });
    expect(obj(event.relationship).basis).toBe("editorially_associated");
    expect(list(detail.evidenceRequests)[0]).toMatchObject({
      status: "answered",
      responseEventIds: [eventId],
    });
    expect(obj(detail.chain).verified).toBe(true);
    // Nothing public holds the submitter's words, and neither does their own view.
    const everything = JSON.stringify([
      detail,
      await json(await app.get("/discovery/changes?watch=idea:" + IDEA + ":0")),
      await json(await app.get("/discovery/me/requests", as(token))),
    ]);
    expect(everything).not.toContain("SECRET_SUBMITTER_WORDS");
    // A reviewed response IS a change for watchers.
    const changes = obj(
      list(
        (await json(await app.get(`/discovery/changes?watch=idea:${IDEA}:0`)))
          .items,
      )[0],
    );
    expect(
      list(obj(list(changes.groups)[0]).events).map((e) => e.id),
    ).toContain(eventId);
  });

  it("accepts a transaction reference the same way", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    const sent = await submit(app, id, token, {
      kind: "transaction",
      ref: SIGNATURE,
    });
    const submissionId = String(obj((await json(sent)).submission).id);
    await app.review.acceptSubmission(submissionId, "Reviewer One", {
      summary: "A transaction was linked as supporting evidence.",
      basis: "uncertain",
      basisNote:
        "Whether this transaction relates to the idea is not established.",
    });
    const event =
      list((await idea(app)).events).find(
        (e) => e.id === `res-${submissionId}`,
      ) ?? {};
    expect(event.evidence).toEqual({ kind: "transaction", ref: SIGNATURE });
  });

  it("rejecting a submission leaves the timeline alone", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    const sent = await submit(app, id, token);
    const submissionId = String(obj((await json(sent)).submission).id);
    const events = list((await idea(app)).events).length;
    await app.review.rejectSubmission(
      submissionId,
      "Reviewer One",
      "The page does not show the price.",
    );
    expect(list((await idea(app)).events)).toHaveLength(events);
    const mine = list(
      (await json(await app.get("/discovery/me/requests", as(token)))).items,
    );
    expect(obj(list(mine[0]?.submissions)[0])).toMatchObject({
      status: "rejected",
      reviewNote: "The page does not show the price.",
    });
    expect(list((await idea(app)).evidenceRequests)[0]).toMatchObject({
      status: "open",
    });
  });

  it("closes a request as unresolved with the reviewer's reason, without a verdict on the claim", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    await app.review.closeRequest(
      id,
      "Reviewer One",
      "No supporting reference was found after two weeks.",
    );
    const request = list((await idea(app)).evidenceRequests)[0];
    expect(request).toMatchObject({
      status: "closed_unresolved",
      note: "No supporting reference was found after two weeks.",
      responseEventIds: [],
    });
    expect((await submit(app, id, token)).status).toBe(409);
  });

  it("refuses moves the workflow does not allow, and bad reviewer input", async () => {
    const app = await demoApp();
    const res = await ask(app);
    const token = cookieOf(res) ?? "";
    const id = String(obj((await json(res)).request).id);
    const r = app.review;
    await expect(r.closeRequest(id, "R", "not open yet")).rejects.toThrow(
      /not open/,
    );
    await r.approveRequest(id, "Reviewer One");
    await expect(r.approveRequest(id, "Reviewer One")).rejects.toThrow(
      /not pending_review/,
    );
    await expect(
      r.rejectRequest(id, "Reviewer One", "too late"),
    ).rejects.toThrow(/not pending_review/);
    await expect(r.approveRequest("er_doesnotexist0000", "R")).rejects.toThrow(
      /No request/,
    );
    await expect(r.approveRequest("not-an-id", "R")).rejects.toThrow(
      /not a request id/,
    );
    await expect(r.approveRequest(id, "")).rejects.toThrow(ReviewError);
    await expect(r.rejectRequest(id, "R", "x".repeat(301))).rejects.toThrow(
      ReviewError,
    );

    const sent = await submit(app, id, token);
    const sid = String(obj((await json(sent)).submission).id);
    const accept = (input: Parameters<typeof r.acceptSubmission>[2]) =>
      r.acceptSubmission(sid, "R", input);
    await expect(
      accept({ summary: "A summary.", basis: "uncertain", basisNote: null }),
    ).rejects.toThrow(/note is required/);
    await expect(
      accept({ summary: "", basis: "creator_confirmed", basisNote: null }),
    ).rejects.toThrow(ReviewError);
    await expect(
      accept({
        summary: "S".repeat(281),
        basis: "creator_confirmed",
        basisNote: null,
      }),
    ).rejects.toThrow(ReviewError);
    await expect(
      accept({
        summary: "Two\nlines",
        basis: "creator_confirmed",
        basisNote: null,
      }),
    ).rejects.toThrow(ReviewError);
    await expect(
      r.acceptSubmission("es_doesnotexist0000", "R", {
        summary: "S.",
        basis: "creator_confirmed",
        basisNote: null,
      }),
    ).rejects.toThrow(/No submission/);
    await accept({
      summary: "A summary.",
      basis: "creator_confirmed",
      basisNote: null,
    });
    await expect(
      accept({
        summary: "Again.",
        basis: "creator_confirmed",
        basisNote: null,
      }),
    ).rejects.toThrow(/not pending/);
    await expect(r.rejectSubmission(sid, "R", "late")).rejects.toThrow(
      /not pending/,
    );
    // After an answer the request is "answered" and still takes further references.
    expect(
      (await submit(app, id, token, { ref: "https://example.com/evidence/2" }))
        .status,
    ).toBe(201);
  });

  it("lets only one of two simultaneous reviewers win, with one event", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    const sent = await submit(app, id, token);
    const sid = String(obj((await json(sent)).submission).id);
    const results = await Promise.allSettled([
      app.review.acceptSubmission(sid, "R1", {
        summary: "First reviewer.",
        basis: "creator_confirmed",
        basisNote: null,
      }),
      app.review.acceptSubmission(sid, "R2", {
        summary: "Second reviewer.",
        basis: "creator_confirmed",
        basisNote: null,
      }),
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((x) => x.status === "rejected")).toHaveLength(1);
    expect(
      (
        await app.db`select count(*)::int as n from timeline_events where id = ${`res-${sid}`}`
      )[0].n,
    ).toBe(1);
    expect(obj((await idea(app)).chain).verified).toBe(true);
  });

  it("is the only way to review: no HTTP route approves, accepts or edits anything", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    const sent = await submit(app, id, token);
    const sid = String(obj((await json(sent)).submission).id);
    const attempts: [string, string][] = [
      ["POST", `/discovery/evidence-requests/${id}/approve`],
      ["POST", `/discovery/evidence-requests/${id}/review`],
      ["POST", `/discovery/evidence-requests/${id}/close`],
      ["POST", `/discovery/evidence-submissions/${sid}/accept`],
      ["POST", `/discovery/evidence-requests/${id}/submissions/${sid}/accept`],
      ["PUT", `/discovery/evidence-requests/${id}`],
      ["PATCH", `/discovery/evidence-requests/${id}`],
      ["DELETE", `/discovery/evidence-requests/${id}`],
      ["POST", `/discovery/review`],
      ["GET", `/discovery/review`],
    ];
    for (const [method, path] of attempts) {
      const res = await app.app.request(path, {
        method,
        headers: {
          origin: app.env.appOrigin,
          "content-type": "application/json",
          cookie: as(token).cookie,
        },
        body:
          method === "GET"
            ? undefined
            : JSON.stringify({
                status: "accepted",
                summary: "x",
                basis: "creator_confirmed",
              }),
      });
      expect(res.status).toBe(404);
    }
    const row = (
      await app.db`select status from evidence_submissions where id = ${sid}`
    )[0];
    expect(row.status).toBe("pending");
  });
});

// ============================================================================== submissions

describe("supporting references", () => {
  it("only take submissions on a request a reviewer has opened", async () => {
    const app = await demoApp();
    const res = await ask(app);
    const token = cookieOf(res) ?? "";
    const id = String(obj((await json(res)).request).id);
    const early = await submit(app, id, token);
    expect(early.status).toBe(409);
    expect(obj((await json(early)).error).code).toBe("request_not_open");
    expect((await submit(app, "er_doesnotexist0000", token)).status).toBe(404);
    expect((await submit(app, "not-a-request", token)).status).toBe(400);
  });

  it("validate the link or signature and never fetch anything", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    const realFetch = globalThis.fetch;
    let fetched = 0;
    globalThis.fetch = Object.assign(
      async () => {
        fetched++;
        throw new Error("the server must not fetch submitted links");
      },
      { preconnect: realFetch.preconnect },
    );
    try {
      const refused: Record<string, unknown>[] = [
        { ref: "http://example.com/plain-http" },
        { ref: "https://127.0.0.1/admin" },
        { ref: "https://localhost:3001/health" },
        { ref: "https://169.254.169.254/latest/meta-data" },
        { ref: "https://[::1]/" },
        { ref: "https://user:pw@example.com/x" },
        { ref: "https://intranet/secret" },
        { ref: "https://printer.local/status" },
        { ref: "file:///etc/passwd" },
        { ref: "javascript:alert(1)" },
        { ref: "not a link" },
        { ref: 5 },
        { kind: "transaction", ref: "https://example.com" },
        { kind: "transaction", ref: "short" },
        { kind: "other", ref: "https://example.com/x" },
        { explanation: "short" },
        { explanation: "x".repeat(501) },
        { explanation: "a\nb and enough words to pass the length check" },
      ];
      // Each from its own client address, so the per-address rate limit (tested elsewhere) stays out of the way.
      for (const [n, bad] of refused.entries()) {
        const res = await submit(app, id, token, bad, {
          "x-forwarded-for": `10.9.0.${n + 1}`,
        });
        expect(res.status).toBe(400);
      }
      expect((await submit(app, id, token)).status).toBe(201);
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(fetched).toBe(0);
    expect(
      (await app.db`select count(*)::int as n from evidence_submissions`)[0].n,
    ).toBe(1);
  });

  it("keep markup as plain text and answer with JSON only", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(
      app,
      "Is <b>this</b> from the primary source mentioned?",
    );
    const res = await submit(app, id, token, {
      explanation: "<img src=x onerror=alert(1)> proof is on the exchange page",
    });
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const detail = JSON.stringify(await idea(app));
    expect(detail).toContain(
      "Is <b>this</b> from the primary source mentioned?",
    ); // text, as written
    expect(detail).not.toContain("onerror");
  });

  it("return the same submission for the same link, cap what one browser sends, and cap the queue", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    const first = await submit(app, id, token, {
      ref: "https://example.com/e/1",
    });
    const dup = await submit(app, id, token, {
      ref: "https://example.com/e/1",
    });
    expect(dup.status).toBe(200);
    expect(obj((await json(dup)).submission).id).toBe(
      obj((await json(first)).submission).id,
    );
    for (let n = 2; n <= LIMITS.submissionsPerRequest; n++) {
      expect(
        (await submit(app, id, token, { ref: `https://example.com/e/${n}` }))
          .status,
      ).toBe(201);
    }
    const over = await submit(app, id, token, {
      ref: "https://example.com/e/one-too-many",
    });
    expect(over.status).toBe(429);
    expect(obj((await json(over)).error).code).toBe("too_many_submissions");
    // A different browser can still add one.
    const other =
      cookieOf(await ask(app, "A question from some other browser?")) ?? "";
    expect(
      (await submit(app, id, other, { ref: "https://example.com/e/other" }))
        .status,
    ).toBe(201);
  });

  it("show the submitter the state of their own references and nobody else's", async () => {
    const app = await demoApp();
    const { id, token } = await openRequest(app);
    await submit(app, id, token);
    const stranger =
      cookieOf(await ask(app, "Another browser asks something else?")) ?? "";
    const strangerView = list(
      (await json(await app.get("/discovery/me/requests", as(stranger)))).items,
    );
    expect(JSON.stringify(strangerView)).not.toContain(
      "example.com/evidence/1",
    );
    const mine = list(
      (await json(await app.get("/discovery/me/requests", as(token)))).items,
    );
    expect(obj(list(mine[0]?.submissions)[0])).toMatchObject({
      status: "pending",
      ref: "https://example.com/evidence/1",
    });
    expect(JSON.stringify(mine)).not.toContain(GOOD_EXPLANATION);
  });
});

describe("abuse limits on the routes", () => {
  it("rate limits writes per client address, on top of the per-browser caps", async () => {
    const app = await demoApp();
    let limited = 0;
    for (let n = 0; n < 14; n++) {
      // Garbage bodies are cheap to send, so they count: the limit is on requests, not on rows.
      const res = await app.post("/discovery/evidence-requests", {
        ideaId: IDEA,
        question: "?",
      });
      if (res.status === 429) limited++;
    }
    expect(limited).toBeGreaterThanOrEqual(3);
    expect((await app.get("/discovery/me/requests")).status).toBe(200); // reads are not blocked by it
  });
});
