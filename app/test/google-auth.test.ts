import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { signOut } from "../src/features/account/google-auth";

const mocks: Array<{ mockRestore: () => void }> = [];
afterEach(() => mocks.splice(0).forEach((mock) => mock.mockRestore()));

describe("Google sign-out", () => {
  it("reports HTTP failure instead of pretending the session ended", async () => {
    mocks.push(
      spyOn(globalThis, "fetch").mockImplementation(
        async () => new Response(null, { status: 503 }),
      ),
    );
    await expect(signOut()).rejects.toThrow("Sign-out failed");
  });
  it("reports a network failure so the account can retain the signed-in state", async () => {
    mocks.push(
      spyOn(globalThis, "fetch").mockImplementation(async () => {
        throw new Error("offline");
      }),
    );
    await expect(signOut()).rejects.toThrow("Sign-out failed");
  });
  it("accepts a completed server logout", async () => {
    mocks.push(
      spyOn(globalThis, "fetch").mockImplementation(async () =>
        Response.json({ ok: true }),
      ),
    );
    await signOut();
  });
});
