// Points the repo at a new program ID, for a new deployment.
//
//   solana-keygen new -o relay-devnet-keypair.json    # on the owner's machine; never commit it
//   solana address -k relay-devnet-keypair.json       # prints the ID to pass below
//   bun run scripts/set-program-id.ts <that address> [--venue <the simulated venue's address>]
//
// It rewrites `declare_id!` and Anchor.toml. With `--venue` it also points Relay at the owner's own
// deployment of the simulated swap venue (devnet): `VENUE_PROGRAM_ID` in the program's constants.rs
// and the TypeScript copy in domain/src/solana/venue.ts. Deploy the venue with its own keypair
// (`cargo build-sbf --manifest-path programs/simulated_venue/Cargo.toml`), never the Relay one. The IDL (and with it @relay/domain's program address)
// is regenerated from `declare_id!` by `bun run program:build` and `bun run sync-idl`. The shared
// hash vectors use a placeholder program ID on purpose, so they do not change.
//
// This only edits text. It never reads, writes or asks for a keypair.

import { decodeAddress } from "../domain/src/bytes";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const usage =
  "usage: bun run scripts/set-program-id.ts <program address> [--venue <venue address>]";
const args = process.argv.slice(2);
const id = args[0];
const venueFlag = args.indexOf("--venue");
const venueId = venueFlag === -1 ? undefined : args[venueFlag + 1];
if (!id || id.startsWith("--") || (venueFlag !== -1 && !venueId)) {
  console.error(usage);
  process.exit(1);
}
for (const candidate of [id, venueId]) {
  if (candidate === undefined) continue;
  try {
    decodeAddress(candidate); // throws unless it is base58 for exactly 32 bytes
  } catch {
    console.error(`"${candidate}" is not a valid Solana address`);
    process.exit(1);
  }
}
if (venueId !== undefined && venueId === id) {
  console.error(
    "The venue needs its own program address, different from Relay's",
  );
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

if (venueId !== undefined) {
  const constantsPath = join(
    root,
    "program",
    "programs",
    "relay",
    "src",
    "constants.rs",
  );
  const venuePath = join(root, "domain", "src", "solana", "venue.ts");
  const rustConst =
    /(pub const VENUE_PROGRAM_ID: Pubkey = pubkey!\(")[1-9A-HJ-NP-Za-km-z]{32,44}("\);)/;
  const tsConst =
    /(export const SIMULATED_VENUE_PROGRAM_ADDRESS: Address = address\(\s*")[1-9A-HJ-NP-Za-km-z]{32,44}("\s*,?\s*\);)/;
  const constants = readFileSync(constantsPath, "utf8");
  const venue = readFileSync(venuePath, "utf8");
  if (!rustConst.test(constants) || !tsConst.test(venue)) {
    console.error("VENUE_PROGRAM_ID was not found in constants.rs or venue.ts");
    process.exit(1);
  }
  writeFileSync(constantsPath, constants.replace(rustConst, `$1${venueId}$2`));
  writeFileSync(venuePath, venue.replace(tsConst, `$1${venueId}$2`));
  console.log(`venue program ID set to ${venueId}`);
}

console.log(`program ID set to ${id}`);
console.log("next: bun run program:build && bun run sync-idl, then the tests");
