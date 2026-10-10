import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "hono/bun";
import type { Logger } from "./logger";

/** Per-request values set by `requestLog`. */
export interface AppEnv {
  Variables: { reqId: string };
}

/** A request problem that maps to a JSON error response. Never carries secrets. */
export class ApiError extends Error {
  readonly status: 400 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 502 | 503;
  readonly code: string;
  constructor(status: ApiError["status"], code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Fixed-window limiter. Returns true when the request is allowed. Process-local (single instance). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now: number = Date.now()): boolean => {
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    const h = hits.get(key);
    if (!h || h.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (h.count >= limit) return false;
    h.count++;
    return true;
  };
}

/**
 * Client IP for rate limiting. Behind Caddy the proxy APPENDS the real peer address to
 * X-Forwarded-For, so the RIGHT-most entry is the trustworthy one; the left-most is client-controlled.
 */
export function clientKey(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) {
    const last = xff.split(",").at(-1)?.trim();
    if (last) return last;
  }
  try {
    return getConnInfo(c).remote.address ?? "local";
  } catch {
    return "local"; // in-process requests (tests) have no socket
  }
}

export function rateLimit(
  limiter: ReturnType<typeof createRateLimiter>,
  extraKey?: (c: Context) => string | undefined,
): MiddlewareHandler {
  return async (c, next) => {
    const ip = clientKey(c);
    const extra = extraKey?.(c);
    if (
      !limiter(`ip:${ip}`) ||
      (extra !== undefined && !limiter(`k:${extra}`))
    ) {
      throw new ApiError(
        429,
        "rate_limited",
        "Too many requests. Try again in a moment.",
      );
    }
    await next();
  };
}

/**
 * CSRF defence for every state-changing request. hono/csrf only inspects form-type bodies, so JSON
 * requests would slip through; this guard requires BOTH:
 *   - Origin equals the configured app origin (or a same-origin Sec-Fetch-Site when Origin is absent), and
 *   - Content-Type: application/json (which a cross-site page cannot send without a CORS preflight).
 */
export function originGuard(appOrigin: string): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS")
      return next();
    const origin = c.req.header("origin");
    const site = c.req.header("sec-fetch-site");
    const originOk =
      origin === appOrigin || (origin === undefined && site === "same-origin");
    if (!originOk)
      throw new ApiError(403, "bad_origin", "Request origin is not allowed");
    const type = c.req.header("content-type") ?? "";
    if (!type.toLowerCase().startsWith("application/json")) {
      throw new ApiError(
        415,
        "unsupported_media_type",
        "Send application/json",
      );
    }
    await next();
  };
}

/** A caller-supplied request id is kept only if it cannot forge or split a log line. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Gives every request an id (returned in `X-Request-Id`, so a user report can be matched to a log
 * line) and writes one structured line per request when it finishes. The line holds the method,
 * the path WITHOUT its query string, the status and the duration. It never holds headers, cookies,
 * bodies or the client address.
 */
export function requestLog(logger: Logger): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const supplied = c.req.header("x-request-id");
    const reqId =
      supplied !== undefined && SAFE_REQUEST_ID.test(supplied)
        ? supplied
        : crypto.randomUUID();
    c.set("reqId", reqId);
    c.header("X-Request-Id", reqId);
    const started = performance.now();
    await next();
    // Each request path is a fixed route or carries a plan address; both are public chain data.
    logger.info("request", {
      reqId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Math.round(performance.now() - started),
    });
  };
}
