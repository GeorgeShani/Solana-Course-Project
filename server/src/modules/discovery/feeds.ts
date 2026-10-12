import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "../../shared/db";
import type { Logger } from "../../shared/logger";

/**
 * Automatic detection of new items in an author's OWN public feed (RSS or Atom).
 *
 * What this does: asks a fixed list of feed addresses (curation/feeds.json, written by a person,
 * never taken from a visitor) for their newest entries, and keeps each entry's title, exact link
 * and date. What it does not do: read or store article text, follow any other link, scrape a page,
 * decide that an item is an idea or an update, or relate it to anything. The app shows these as
 * "detected automatically, not reviewed by Relay".
 */

export interface FeedConfig {
  traderId: string;
  label: string;
  url: string;
}

export interface FeedEntry {
  title: string;
  url: string;
  publishedAt: Date | null;
}

const MAX_BYTES = 2_000_000;
const MAX_ENTRIES = 20;
const TIMEOUT_MS = 10_000;
const ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;

// ------------------------------------------------------------------------------------ parsing

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (m, h: string) =>
      codePoint(parseInt(h, 16), m),
    )
    .replace(/&#(\d+);/g, (m, d: string) => codePoint(parseInt(d, 10), m))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

function codePoint(n: number, fallback: string): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return fallback;
  }
}

/** Plain text of a tag's content: CDATA unwrapped, entities decoded, markup and control characters dropped. */
function plain(raw: string): string {
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return [...decode(unwrapped.replace(/<[^>]*>/g, " "))]
    .map((c) => {
      const code = c.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? " " : c;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

function firstTag(block: string, name: string): string | null {
  const m = new RegExp(
    `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`,
    "i",
  ).exec(block);
  return m?.[1] === undefined ? null : plain(m[1]);
}

/** A public https link with a real host name: no credentials, no port, no address, no local name. */
export function safeItemUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(decode(raw.trim()));
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const ok =
    u.protocol === "https:" &&
    u.username === "" &&
    u.password === "" &&
    u.port === "" &&
    host.includes(".") &&
    !host.endsWith(".local") &&
    !host.endsWith(".internal") &&
    !/^[\d.]+$/.test(host) &&
    !host.includes(":");
  if (!ok) return null;
  u.hash = "";
  const href = u.href;
  return href.length <= 500 ? href : null;
}

function parseDate(raw: string | null): Date | null {
  if (raw === null) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/** Entries of an RSS 2.0 or Atom document, newest first, at most MAX_ENTRIES. Unreadable entries are skipped. */
export function parseFeed(xml: string, now: Date): FeedEntry[] {
  const blocks = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
  ].map((m) => m[1] ?? "");

  const entries: FeedEntry[] = [];
  for (const block of blocks) {
    const title = firstTag(block, "title");
    let link = firstTag(block, "link");
    if (!link) {
      // Atom: <link rel="alternate" href="..."/>
      const alt =
        /<link\b[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i.exec(
          block,
        );
      const any = /<link\b[^>]*\bhref=["']([^"']+)["']/i.exec(block);
      link = alt?.[1] ?? any?.[1] ?? null;
    }
    const url = link === null ? null : safeItemUrl(link);
    if (!title || title.length > 300 || url === null) continue;
    const published =
      parseDate(firstTag(block, "pubDate")) ??
      parseDate(firstTag(block, "published")) ??
      parseDate(firstTag(block, "updated")) ??
      parseDate(firstTag(block, "dc:date"));
    // A date in the future is the feed's mistake: keep the item, forget the date.
    const publishedAt =
      published !== null && published.getTime() <= now.getTime() + 5 * 60_000
        ? published
        : null;
    entries.push({ title, url, publishedAt });
  }
  entries.sort(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
  return entries.slice(0, MAX_ENTRIES);
}

// ----------------------------------------------------------------------------------- config

export function loadFeedConfig(
  path = join(import.meta.dir, "..", "..", "..", "curation", "feeds.json"),
): FeedConfig[] {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  const list =
    typeof raw === "object" && raw !== null && "feeds" in raw
      ? raw.feeds
      : null;
  if (!Array.isArray(list)) throw new Error("feeds.json needs a feeds list");
  const out: FeedConfig[] = [];
  const seen = new Set<string>();
  for (const f of list) {
    const traderId: unknown = Reflect.get(f, "traderId");
    const label: unknown = Reflect.get(f, "label");
    const url: unknown = Reflect.get(f, "url");
    if (
      typeof traderId !== "string" ||
      !ID.test(traderId) ||
      typeof label !== "string" ||
      label.length < 1 ||
      label.length > 120 ||
      typeof url !== "string" ||
      safeItemUrl(url) === null ||
      seen.has(url)
    )
      throw new Error(`feeds.json has an invalid feed: ${JSON.stringify(f)}`);
    seen.add(url);
    out.push({ traderId, label, url });
  }
  return out;
}

// ------------------------------------------------------------------------------------ polling

export type FeedFetch = (
  url: string,
  init: { signal: AbortSignal; headers: Record<string, string> },
) => Promise<Response>;

export interface PollReport {
  url: string;
  ok: boolean;
  seen: number;
  added: number;
  error: string | null;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("the feed is larger than Relay reads");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * One pass over every configured feed. A feed that fails is recorded as failed (and keeps its old
 * items); it never stops the others and never writes anything it did not parse.
 */
export async function pollFeeds(
  db: Db,
  feeds: readonly FeedConfig[],
  deps: { fetch: FeedFetch; now: () => Date; logger?: Logger } = {
    fetch: (url, init) => fetch(url, init),
    now: () => new Date(),
  },
): Promise<PollReport[]> {
  const reports: PollReport[] = [];
  for (const feed of feeds) {
    const checkedAt = deps.now();
    const exists =
      await db`select 1 from traders where id = ${feed.traderId} and is_demo = false`;
    if (exists.length === 0) {
      reports.push({
        url: feed.url,
        ok: false,
        seen: 0,
        added: 0,
        error: "no such profile loaded",
      });
      continue;
    }
    await db`
      insert into feed_sources (feed_url, trader_id, label)
      values (${feed.url}, ${feed.traderId}, ${feed.label})
      on conflict (feed_url) do update set label = excluded.label, trader_id = excluded.trader_id`;
    try {
      const res = await deps.fetch(feed.url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          accept:
            "application/rss+xml, application/atom+xml, application/xml, text/xml",
          "user-agent":
            "RelayFeedReader/1.0 (public feeds only; titles and links)",
        },
      });
      if (!res.ok) throw new Error(`the feed answered ${res.status}`);
      const entries = parseFeed(await readCapped(res), checkedAt);
      if (entries.length === 0)
        throw new Error("no readable entries in the feed");
      let added = 0;
      for (const e of entries) {
        const inserted = await db`
          insert into feed_items (trader_id, feed_url, title, url, published_at)
          values (${feed.traderId}, ${feed.url}, ${e.title}, ${e.url}, ${e.publishedAt})
          on conflict (url) do nothing
          returning id`;
        if (inserted.length > 0) added++;
      }
      await db`
        update feed_sources set last_checked_at = ${checkedAt}, last_ok_at = ${checkedAt}, last_error = null
        where feed_url = ${feed.url}`;
      reports.push({
        url: feed.url,
        ok: true,
        seen: entries.length,
        added,
        error: null,
      });
    } catch (e) {
      const message = (
        e instanceof Error ? e.message : "the feed could not be read"
      )
        .replace(/https?:\/\/\S+/g, "")
        .slice(0, 200);
      await db`
        update feed_sources set last_checked_at = ${checkedAt}, last_error = ${message}
        where feed_url = ${feed.url}`;
      deps.logger?.warn("feed_poll_failed", {
        traderId: feed.traderId,
        error: message,
      });
      reports.push({
        url: feed.url,
        ok: false,
        seen: 0,
        added: 0,
        error: message,
      });
    }
  }
  return reports;
}
