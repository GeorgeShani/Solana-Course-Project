import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Two stylesheets that each start a rule with the same class name are two components fighting over
 * one name. It happened with `.evidence`: the plans feed's one-line note (capped at 40ch, small and
 * grey, hidden below 680px of height) also styled the idea page's evidence-request panel, which became a
 * 336px strip floating mid-page and vanished entirely on a short window. Shared building blocks
 * (buttons, chips) live in base.css and are exempt.
 */
const STYLES = join(import.meta.dir, "..", "src", "styles");
const sheet = (name: string) => readFileSync(join(STYLES, name), "utf8");

/** Classes that START a selector, at the start of a rule or after a comma. Descendants do not count. */
export function rootClasses(css: string): Set<string> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = new Set<string>();
  for (const m of text.matchAll(
    /(?:^|[}{,;])\s*\.([a-zA-Z][\w-]*)(?=[\s,{:.[>+~])/g,
  ))
    if (m[1] !== undefined) out.add(m[1]);
  return out;
}

describe("rootClasses", () => {
  test("finds the class that starts a selector, not the ones inside it", () => {
    const css = `
      /* .commented { } */
      .evidence, .note:hover { color: red }
      .page > .source { margin: 0 }
      .steps__orb .avatar { width: 1px }
      @media (min-width: 900px) { .act__rationale { x: y } }
    `;
    expect([...rootClasses(css)].sort()).toEqual([
      "act__rationale",
      "evidence",
      "note",
      "page",
      "steps__orb",
    ]);
  });
});

describe("one name, one component", () => {
  const feed = rootClasses(sheet("feed.css"));
  const base = rootClasses(sheet("base.css"));
  for (const other of [
    "discovery.css",
    "discover.css",
    "ticket.css",
    "interval.css",
    "showtime.css",
    "audience.css",
  ])
    test(`feed.css and ${other} share no class outside base.css`, () => {
      const shared = [...rootClasses(sheet(other))].filter(
        (c) => feed.has(c) && !base.has(c),
      );
      expect(shared).toEqual([]);
    });
});

describe("the idea page lays its blocks out in one column", () => {
  test("the original-source card is centred like its siblings", () => {
    // `.source { margin: 0 }` loads after `.page > *` and has the same specificity, so without this
    // rule the card sat on the left edge of a wide window while everything else was centred.
    expect(sheet("discovery.css")).toMatch(
      /\.page > \.source\s*\{[^}]*margin-inline:\s*auto/,
    );
  });
});
