import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Public-source discovery and Relay-native execution never share authority. These checks read the
 * source: nothing that shows public posts may import the trade panel, the follow flow, the wallet
 * or the plan fixtures, so a public post cannot reach an execution control; and nothing in the
 * native plan screens may import the discovery layer's data.
 */
const SRC = join(import.meta.dir, "..", "src");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : /\.(ts|tsx)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}

function importsOf(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/from\s+["']([^"']+)["']/g)].flatMap((m) =>
    m[1] === undefined ? [] : [m[1]],
  );
}

const rel = (f: string) => relative(SRC, f).split("\\").join("/");

const DISCOVERY_FILES = [
  ...files(join(SRC, "features", "discovery")),
  ...["index", "updates", "ideas.$ideaId", "profiles.$traderId"].map((r) =>
    join(SRC, "routes", `${r}.tsx`),
  ),
];

const EXECUTION = [
  "features/plans",
  "components/wallet",
  "lib/wallet",
  "lib/solana",
];

describe("discovery never reaches execution", () => {
  for (const file of DISCOVERY_FILES)
    test(`${rel(file)} imports no trade, follow, wallet or fixture module`, () => {
      const bad = importsOf(file).filter((i) =>
        EXECUTION.some((e) => i.includes(e)),
      );
      expect(bad).toEqual([]);
    });
});

describe("native plans never read the discovery layer", () => {
  const PLAN_FILES = [
    ...files(join(SRC, "features", "plans")),
    join(SRC, "routes", "plans.index.tsx"),
    join(SRC, "routes", "plans.$planPda.tsx"),
  ];
  for (const file of PLAN_FILES)
    test(`${rel(file)} imports no discovery module`, () => {
      const bad = importsOf(file).filter((i) =>
        /features\/discovery|discovery\//.test(i),
      );
      expect(bad).toEqual([]);
    });
});

describe("Google sign-in gates following only", () => {
  // PRODUCT.md owner exception: following a plan needs a Google sign-in and a wallet; discovery,
  // watching and reading plans need no account. Any new reader could hide another action behind it.
  test("only Account and the follow entry points read the Google sign-in state", () => {
    const users = files(SRC)
      .filter((f) => !rel(f).endsWith("features/account/google-auth.ts"))
      .filter((f) => importsOf(f).some((i) => i.endsWith("/google-auth")))
      .map(rel)
      .sort();
    expect(users).toEqual([
      "components/theatre/Marquee.tsx",
      "features/account/UnlockStrip.tsx",
      "features/plans/execution/TradePanel.tsx",
      "features/plans/feed/ActionRow.tsx",
      "routes/account.tsx",
    ]);
  });

  test("watching and reading a plan never wait on sign-in", () => {
    const row = readFileSync(
      join(SRC, "features", "plans", "feed", "ActionRow.tsx"),
      "utf8",
    );
    expect(row).toContain("onClick={onToggleWatch}");
    expect(row).toContain("onClick={onOpenScript}");
  });
});

describe("fictional fixtures stay out of the product", () => {
  test("only the development-only route imports the fixtures", () => {
    const users = files(SRC).filter(
      (f) =>
        importsOf(f).some((i) => i.endsWith("/fixtures")) ||
        /import\(["'][^"']*\/fixtures["']\)/.test(readFileSync(f, "utf8")),
    );
    expect(users.map(rel)).toEqual(["routes/dev.plan-states.tsx"]);
  });

  test("the dev route answers 404 outside development", () => {
    const text = readFileSync(
      join(SRC, "routes", "dev.plan-states.tsx"),
      "utf8",
    );
    expect(text).toContain("if (!import.meta.env.DEV) throw notFound();");
  });

  test("no product navigation or link points at the preview or welcome query", () => {
    const offenders = files(SRC)
      .filter((f) => !rel(f).startsWith("routes/index.tsx"))
      .filter((f) => !rel(f).startsWith("routeTree.gen"))
      .filter((f) =>
        /preview=fictional|welcome=true/.test(readFileSync(f, "utf8")),
      )
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
