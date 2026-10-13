/**
 * Client-side Google auth state.
 *
 * Reads /api/auth/me once on first subscription, then caches in module state.
 * The result is shared across all consumers via useSyncExternalStore.
 *
 * sign-in: navigates to /api/auth/google (server redirects to Google).
 * sign-out: POST /api/auth/logout, then clears local state.
 */

import { useSyncExternalStore } from "react";
import { API_URL } from "../../lib/config";

export interface GoogleUser {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

type AuthState =
  | { status: "loading" }
  | { status: "signed_in"; user: GoogleUser }
  | { status: "signed_out" };

let state: AuthState = { status: "loading" };
const listeners = new Set<() => void>();
let fetched = false;
let requestVersion = 0;

function emit() {
  for (const l of listeners) l();
}

function setState(next: AuthState) {
  state = next;
  emit();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function fetchMe(version: number): Promise<void> {
  const update = (next: AuthState) => {
    if (version === requestVersion) setState(next);
  };
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      update({ status: "signed_out" });
      return;
    }
    const json: unknown = await res.json();
    if (isRecord(json) && isRecord(json.user)) {
      const u = json.user;
      if (
        typeof u.sub === "string" &&
        typeof u.email === "string" &&
        typeof u.name === "string"
      ) {
        update({
          status: "signed_in",
          user: {
            sub: u.sub,
            email: u.email,
            name: u.name,
            picture: typeof u.picture === "string" ? u.picture : null,
          },
        });
        return;
      }
    }
    update({ status: "signed_out" });
  } catch {
    update({ status: "signed_out" });
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!fetched) {
    fetched = true;
    void fetchMe(++requestVersion);
  }
  return () => listeners.delete(cb);
}

function read(): AuthState {
  return state;
}

const SERVER: AuthState = { status: "loading" };

export function useGoogleAuth(): AuthState {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}

/** Opens the Google OAuth flow (browser navigation; page will redirect to Google). */
export function signInWithGoogle(): void {
  window.location.href = `${API_URL}/auth/google`;
}

/** Signs out server-side and clears local state. */
export async function signOut(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error("Sign-out failed");
    const result: unknown = await res.json();
    if (!isRecord(result) || result.ok !== true)
      throw new Error("Sign-out failed");
  } catch {
    throw new Error("Sign-out failed. Please try again.");
  }
  // Ignore a pending profile response from before the completed logout.
  requestVersion++;
  fetched = true;
  setState({ status: "signed_out" });
}

/** Refresh auth state (e.g. after a redirect back from Google). */
export function refreshAuth(): void {
  fetched = true;
  setState({ status: "loading" });
  void fetchMe(++requestVersion);
}
