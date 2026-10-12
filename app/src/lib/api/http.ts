/**
 * The browser's HTTP and JSON-checking layer for Relay's own API. Responses are `unknown` until a
 * parser has checked every field; nothing is cast. Shared by the discovery and plan features.
 */

export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

export class ApiContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiContractError";
  }
}

type Rec = Record<string, unknown>;

export function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function rec(v: unknown, path: string): Rec {
  if (!isRec(v)) throw new ApiContractError(`${path} must be an object`);
  return v;
}

export function str(v: unknown, path: string): string {
  if (typeof v !== "string")
    throw new ApiContractError(`${path} must be a string`);
  return v;
}

export function strOrNull(v: unknown, path: string): string | null {
  return v === null || v === undefined ? null : str(v, path);
}

export function num(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isFinite(v))
    throw new ApiContractError(`${path} must be a finite number`);
  return v;
}

export function bool(v: unknown, path: string): boolean {
  if (typeof v !== "boolean")
    throw new ApiContractError(`${path} must be a boolean`);
  return v;
}

export function digits(v: unknown, path: string): string {
  const s = str(v, path);
  if (!/^\d+$/.test(s))
    throw new ApiContractError(`${path} must be an unsigned integer string`);
  return s;
}

/** A request the server understood and refused (4xx), with its error code. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function postJson(url: string, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiUnavailableError("Relay's service did not respond");
  }
  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    if (res.ok)
      throw new ApiUnavailableError(
        "Relay's service sent an unreadable response",
      );
  }
  if (res.ok) return parsed;
  const err = isRec(parsed) && isRec(parsed.error) ? parsed.error : null;
  const message =
    err && typeof err.message === "string"
      ? err.message
      : `Request failed (${res.status})`;
  if (res.status >= 500) throw new ApiUnavailableError(message);
  throw new ApiRequestError(
    res.status,
    err && typeof err.code === "string" ? err.code : "request_failed",
    message,
  );
}

export async function getJson(
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { accept: "application/json" },
    });
  } catch {
    throw new ApiUnavailableError("Relay's service did not respond");
  }
  if (res.status >= 500 || res.status === 404) {
    throw new ApiUnavailableError(`Relay's service answered ${res.status}`);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiUnavailableError(
      "Relay's service sent an unreadable response",
    );
  }
  if (!res.ok) {
    const message =
      isRec(body) && isRec(body.error) && typeof body.error.message === "string"
        ? body.error.message
        : `Request failed (${res.status})`;
    throw new ApiContractError(message);
  }
  return body;
}
