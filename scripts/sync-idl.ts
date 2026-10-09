// Copies the IDL and TypeScript types that `anchor build` generates into the frontend and the
// server, so both talk to the same interface the program exposes.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const from = join(root, "program", "target");
const targets = [
  join(root, "app", "src", "idl"),
  join(root, "server", "src", "idl"),
];

/** [path under program/target, file name in the destination]. */
const files: ReadonlyArray<readonly [string, string]> = [
  ["idl/relay.json", "relay.json"],
  ["types/relay.ts", "relay.ts"],
];

for (const [src] of files) {
  if (!existsSync(join(from, src))) {
    console.error(
      `missing ${join(from, src)}. Run \`bun run program:build\` first.`,
    );
    process.exit(1);
  }
}

for (const to of targets) {
  mkdirSync(to, { recursive: true });
  for (const [src, dest] of files) {
    copyFileSync(join(from, src), join(to, dest));
    console.log(`copied ${src} -> ${to.slice(root.length + 1)}/${dest}`);
  }
}
