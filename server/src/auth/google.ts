/**
 * Google OAuth 2.0 routes.
 *
 * GET  /auth/google           – redirects the browser to Google's consent screen.
 * GET  /auth/google/callback  – receives the code, exchanges it for tokens,
 *                               upserts the user, sets an HttpOnly session cookie,
 *                               then redirects to the app.
 * GET  /auth/me               – returns the session profile (or 401).
 * POST /auth/logout            – clears the session cookie.
 *
 * The session token is a 32-byte hex string stored in `google_sessions`.
 * No secret is ever sent to the browser.
 */

import type { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Db } from "../db";
import type { Env } from "../env";
import type { AppEnv } from "../middleware";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

const SESSION_COOKIE = "relay_session";
const SESSION_DAYS = 30;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function stringField(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== "string" || v.trim() === "")
    throw new Error(`Missing string field: ${key}`);
  return v;
}

function optStringField(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  const v = obj[key];
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function randomHex(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

async function exchangeCode(
  code: string,
  env: Env,
): Promise<{ accessToken: string; idToken: string }> {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri)
    throw new Error("Google OAuth is not configured");

  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleRedirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json: unknown = await res.json();
  if (!res.ok || !isRecord(json))
    throw new Error(`Token exchange failed: ${res.status}`);
  return {
    accessToken: stringField(json, "access_token"),
    idToken: stringField(json, "id_token"),
  };
}

async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json: unknown = await res.json();
  if (!res.ok || !isRecord(json))
    throw new Error(`Userinfo failed: ${res.status}`);
  return {
    sub: stringField(json, "sub"),
    email: stringField(json, "email"),
    name: stringField(json, "name"),
    picture: optStringField(json, "picture"),
  };
}

async function upsertSession(
  db: Db,
  profile: GoogleProfile,
): Promise<string> {
  const token = randomHex(32);

  // Prune expired sessions lazily.
  await db`delete from google_sessions where expires_at < now()`;

  await db`
    insert into google_sessions
      (session_token, google_sub, email, name, picture_url)
    values
      (${token}, ${profile.sub}, ${profile.email}, ${profile.name}, ${profile.picture ?? null})
  `;
  return token;
}

interface SessionRow {
  google_sub: string;
  email: string;
  name: string;
  picture_url: string | null;
}

async function lookupSession(
  db: Db,
  token: string,
): Promise<SessionRow | null> {
  const rows = await db<SessionRow[]>`
    select google_sub, email, name, picture_url
    from google_sessions
    where session_token = ${token}
      and expires_at > now()
  `;
  return rows[0] ?? null;
}

async function deleteSession(db: Db, token: string): Promise<void> {
  await db`delete from google_sessions where session_token = ${token}`;
}

export function mountGoogleAuth(
  app: Hono<AppEnv>,
  env: Env,
  db: Db,
): void {
  // ── Redirect to Google ────────────────────────────────────────────────────
  app.get("/auth/google", (c) => {
    if (!env.googleClientId || !env.googleRedirectUri) {
      return c.json(
        { error: { code: "oauth_not_configured", message: "Google OAuth is not configured" } },
        503,
      );
    }
    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: env.googleRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
    });
    return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // ── Handle callback ───────────────────────────────────────────────────────
  app.get("/auth/google/callback", async (c) => {
    const code = c.req.query("code");
    const error = c.req.query("error");

    if (error || !code) {
      // User denied or something went wrong – redirect to /account with error signal.
      return c.redirect(`${env.appOrigin}/account?auth_error=cancelled`);
    }

    try {
      const { accessToken } = await exchangeCode(code, env);
      const profile = await fetchProfile(accessToken);
      const token = await upsertSession(db, profile);

      setCookie(c, SESSION_COOKIE, token, {
        httpOnly: true,
        secure: env.production,
        sameSite: "Lax",
        path: "/",
        maxAge: SESSION_DAYS * 24 * 60 * 60,
      });

      return c.redirect(`${env.appOrigin}/account`);
    } catch {
      return c.redirect(`${env.appOrigin}/account?auth_error=failed`);
    }
  });

  // ── Current user ─────────────────────────────────────────────────────────
  app.get("/auth/me", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) return c.json({ user: null }, 200);

    const row = await lookupSession(db, token);
    if (!row) return c.json({ user: null }, 200);

    return c.json({
      user: {
        sub: row.google_sub,
        email: row.email,
        name: row.name,
        picture: row.picture_url,
      },
    });
  });

  // ── Sign out ──────────────────────────────────────────────────────────────
  app.post("/auth/logout", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await deleteSession(db, token);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });
}
