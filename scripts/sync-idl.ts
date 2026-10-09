// Copies the IDL that `anchor build` generates into @relay/domain, which holds the one
// TypeScript client for the program (account codecs, instruction builders, PDAs). The app,
// the server and the scripts all use it, so they cannot drift from the deployed interface.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(import.meta.dir, "..");
const from = join(root, "program", "target", "idl", "relay.json");
const to = join(root, "domain", "src", "solana", "relay.idl.json");

if (!existsSync(from)) {
  console.error(`missing ${from}. Run \`bun run program:build\` first.`);
  process.exit(1);
}

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log(
  `copied ${from.slice(root.length + 1)} -> ${to.slice(root.length + 1)}`,
);
