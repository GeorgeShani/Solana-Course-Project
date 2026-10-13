import { afterAll, afterEach, describe, expect, it, spyOn } from "bun:test";
import { createTestApp, type TestApp } from "./helpers";

const GOOGLE_ENV = {
  GOOGLE_CLIENT_ID: "test-client",
  GOOGLE_CLIENT_SECRET: "test-secret-for-cookie-signing-only",
  GOOGLE_REDIRECT_URI: "http://localhost:3001/auth/google/callback",
};
const PROFILE = {
  sub: "fictional-auth-test",
  email: "auth-test@example.invalid",
  name: "Fictional auth test",
  picture: null,
};
let t: TestApp | undefined;
const mocks: Array<{ mockRestore: () => void }> = [];
afterEach(() => mocks.splice(0).forEach((mock) => mock.mockRestore()));
afterAll(async () => t?.db.close());

async function fresh(env: Record<string, string> = GOOGLE_ENV) {
  await t?.db.close();
  t = await createTestApp(null, { env });
  return t;
}

function cookieFrom(res: Response, name: string): string {
  const cookie = res.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie`);
  return cookie.split(";")[0] ?? "";
}
async function begin(app: TestApp) {
  const res = await app.get("/auth/google");
  const location = res.headers.get("location");
  if (!location) throw new Error("Missing Google redirect");
  const state = new URL(location).searchParams.get("state");
  if (!state) throw new Error("Missing OAuth state");
  return { res, state, cookie: cookieFrom(res, "relay_google_state") };
}
function googleSuccess() {
  const calls: RequestInit[] = [];
  const mock = mockFetch(async (input, init) => {
    calls.push(init ?? {});
    if (String(input) === "https://oauth2.googleapis.com/token")
      return Response.json({
        access_token: "test-token",
        id_token: "unused-test-token",
      });
    return Response.json(PROFILE);
  });
  return { mock, calls };
}
function mockFetch(
  run: (
    input: Parameters<typeof fetch>[0],
    init?: RequestInit,
  ) => Promise<Response>,
) {
  const mock = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(run, { preconnect: fetch.preconnect }),
  );
  mocks.push(mock);
  return mock;
}

describe("Google browser-bound sign-in", () => {
  it("refuses incomplete provider configuration before redirecting", async () => {
    const app = await fresh({ ...GOOGLE_ENV, GOOGLE_CLIENT_SECRET: "" });
    expect((await app.get("/auth/google")).status).toBe(503);
  });

  it("sets a short-lived HttpOnly state cookie and a fresh random state on each attempt", async () => {
    const app = await fresh();
    const a = await begin(app);
    const b = await begin(app);
    expect(a.state).toMatch(/^[a-f0-9]{64}$/);
    expect(a.state).not.toBe(b.state);
    const cookie = a.res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=300");
    expect(a.res.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects missing, mismatched and tampered state before any Google request or session", async () => {
    const app = await fresh();
    const calls = googleSuccess();
    const attempt = await begin(app);
    for (const [query, cookie] of [
      ["code=test-code", ""],
      [`code=test-code&state=${attempt.state}`, ""],
      ["code=test-code&state=wrong", attempt.cookie],
      [`code=test-code&state=${attempt.state}`, `${attempt.cookie}tampered`],
    ]) {
      const res = await app.get(`/auth/google/callback?${query}`, {
        cookie: cookie ?? "",
      });
      expect(res.headers.get("location")).toBe(
        `${app.env.appOrigin}/account?auth_error=failed`,
      );
      expect(res.headers.get("set-cookie")).toContain("relay_google_state=;");
    }
    expect(calls.mock).not.toHaveBeenCalled();
    expect(
      await app.db`select session_token from google_sessions`,
    ).toHaveLength(0);
  });

  it("rejects an expired browser attempt even when the cookie is supplied", async () => {
    const app = await fresh();
    const now = Date.now();
    const clock = spyOn(Date, "now").mockReturnValue(now);
    mocks.push(clock);
    const attempt = await begin(app);
    clock.mockReturnValue(now + 301_000);
    const calls = googleSuccess();
    const res = await app.get(
      `/auth/google/callback?code=test-code&state=${attempt.state}`,
      { cookie: attempt.cookie },
    );
    expect(res.headers.get("location")).toContain("auth_error=failed");
    expect(calls.mock).not.toHaveBeenCalled();
  });

  it("consumes cancelled and failed attempts without creating a session", async () => {
    const app = await fresh();
    const attempt = await begin(app);
    const cancelled = await app.get(
      `/auth/google/callback?error=access_denied&state=${attempt.state}`,
      { cookie: attempt.cookie },
    );
    expect(cancelled.headers.get("location")).toContain("auth_error=cancelled");
    expect(cancelled.headers.get("set-cookie")).toContain(
      "relay_google_state=;",
    );
    mockFetch(async () =>
      Response.json({ error: "invalid_grant" }, { status: 400 }),
    );
    const failed = await app.get(
      `/auth/google/callback?code=test-code&state=${attempt.state}`,
      { cookie: attempt.cookie },
    );
    expect(failed.headers.get("location")).toContain("auth_error=failed");
    expect(failed.headers.get("set-cookie")).toContain("relay_google_state=;");
    expect(
      await app.db`select session_token from google_sessions`,
    ).toHaveLength(0);
  });

  it("round-trips valid state into a session, persists it and invalidates it on logout", async () => {
    const app = await fresh();
    const calls = googleSuccess();
    const attempt = await begin(app);
    const callback = await app.get(
      `/auth/google/callback?code=test-code&state=${attempt.state}`,
      { cookie: attempt.cookie },
    );
    expect(callback.headers.get("location")).toBe(
      `${app.env.appOrigin}/account`,
    );
    expect(callback.headers.get("set-cookie")).toContain(
      "relay_google_state=;",
    );
    const session = cookieFrom(callback, "relay_session");
    const me = await app.get("/auth/me", { cookie: session });
    expect(await me.json()).toEqual({ user: PROFILE });
    expect(me.headers.get("cache-control")).toContain("no-store");
    expect(
      calls.calls.every((call) => call.signal instanceof AbortSignal),
    ).toBe(true);
    expect(
      (await app.post("/auth/logout", {}, { cookie: session })).status,
    ).toBe(200);
    expect(
      await (await app.get("/auth/me", { cookie: session })).json(),
    ).toEqual({ user: null });
  });
});
