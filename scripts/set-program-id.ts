// Points the repo at a new program ID, for a new deployment.
//
//   solana-keygen new -o relay-devnet-keypair.json    # on the owner's machine; never commit it
//   solana address -k relay-devnet-keypair.json       # prints the ID to pass below
//   bun run scripts/set-program-id.ts <that address>
//
// It rewrites `declare_id!` and Anchor.toml. The IDL (and with it @relay/domain's program address)
// is regenerated from `declare_id!` by `bun run program:build` and `bun run sync-idl`. The shared
// hash vectors use a placeholder program ID on purpose, so they do not change.
//
// This only edits text. It never reads, writes or asks for a keypair.

import { decodeAddress } from "../domain/src/bytes";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const id = process.argv[2];
if (!id) {
  console.error("usage: bun run scripts/set-program-id.ts <program address>");
  process.exit(1);
}
try {
  decodeAddress(id); // throws unless it is base58 for exactly 32 bytes
} catch {
  console.error(`"${id}" is not a valid Solana address`);
  process.exit(1);
}

const root = join(import.meta.dir, "..");
const libPath = join(root, "program", "programs", "relay", "src", "lib.rs");
const anchorPath = join(root, "program", "Anchor.toml");

const lib = readFileSync(libPath, "utf8");
const declare = /declare_id!\("[1-9A-HJ-NP-Za-km-z]{32,44}"\);/;
if (!declare.test(lib)) {
  console.error("declare_id! not found in lib.rs");
  process.exit(1);
}
writeFileSync(libPath, lib.replace(declare, `declare_id!("${id}");`));

let anchor = readFileSync(anchorPath, "utf8");
const eol = anchor.includes("\r\n") ? "\r\n" : "\n";
anchor = anchor.replace(
  /^relay = "[1-9A-HJ-NP-Za-km-z]{32,44}"$/gm,
  `relay = "${id}"`,
);
if (!/^\[programs\.devnet\]/m.test(anchor)) {
  anchor = anchor.replace(
    /^\[programs\.localnet\]\r?\nrelay = "[^"]+"\r?\n/m,
    (block) => `${block}${eol}[programs.devnet]${eol}relay = "${id}"${eol}`,
  );
}
writeFileSync(anchorPath, anchor);

console.log(`program ID set to ${id}`);
console.log("next: bun run program:build && bun run sync-idl, then the tests");
