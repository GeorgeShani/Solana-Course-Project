/**
 * Structured logs: one JSON object per line on stdout, so Docker's log driver and any collector can
 * read them without a parser.
 *
 * Rules (plan section T and V): never log a secret, a message signature or a session token, never a
 * request body, and never a URL that may carry a provider key. Two guards enforce that:
 *   - fields whose NAME looks sensitive are replaced by "[redacted]";
 *   - `safeMessage` turns any error into text with URLs removed (fetch and RPC errors often embed
 *     the URL, and the RPC URL holds the provider key).
 */
export type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

const SENSITIVE_KEY =
  /token|secret|password|authorization|cookie|api[-_]?key|signature|seed|private|mnemonic/i;

/** Error text that is safe to write to a log: URLs and long opaque strings are removed. */
export function safeMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "unknown error";
  return raw
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[url]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[opaque]")
    .slice(0, 300);
}

function clean(value: unknown, depth = 0): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) return safeMessage(value);
  if (Array.isArray(value))
    return depth > 3 ? "[deep]" : value.map((v) => clean(v, depth + 1));
  if (typeof value === "object" && value !== null) {
    if (depth > 3) return "[deep]";
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : clean(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Renders one log line. Exported so tests can check exactly what would be written. */
export function formatLine(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
  now: Date = new Date(),
): string {
  const body: Record<string, unknown> = {
    ts: now.toISOString(),
    level,
    event,
  };
  for (const [k, v] of Object.entries(fields)) {
    if (k === "ts" || k === "level" || k === "event") continue;
    body[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : clean(v);
  }
  return JSON.stringify(body);
}

export function createLogger(
  write: (line: string) => void = (line) => console.log(line),
): Logger {
  const at = (level: LogLevel) => (event: string, fields?: LogFields) =>
    write(formatLine(level, event, fields));
  return { info: at("info"), warn: at("warn"), error: at("error") };
}

/** Discards everything. The default for services built without a logger (tests, scripts). */
export const silentLogger: Logger = {
  info() {},
  warn() {},
  error() {},
};

/** A shortened address for logs: enough to correlate, not to identify a wallet at a glance. */
export function shortAddress(value: string): string {
  return value.length > 10 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value;
}
