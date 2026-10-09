// Runs an `anchor` command inside `program/`. On Windows it goes through WSL,
// because Anchor and the Solana toolchain only run there; on Linux/macOS it
// runs anchor directly.
//
// On Windows the Rust build output goes to a WSL-native directory
// ($HOME/.cache/relay-target). Compiling on /mnt/c (the Windows filesystem seen from WSL) is
// pathologically slow: build scripts can sit in disk wait for many minutes. After the command
// finishes, deploy/, idl/ and types/ are copied back to program/target/ so that the Windows
// side (scripts/sync-idl.ts) and the git-ignored target/ folder keep working as before.
//
// Usage: bun run scripts/anchor.ts <anchor args...>   e.g. build | test | deploy | keys sync

import { join } from "node:path";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: bun run scripts/anchor.ts <anchor args...>");
  process.exit(1);
}

const programDir = join(import.meta.dir, "..", "program");

const script = [
  // Solana's bin dir is not on PATH in non-login WSL shells.
  'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"',
  'export CARGO_TARGET_DIR="$HOME/.cache/relay-target"',
  // Keep the program keypair stable: seed the WSL target dir from the one already in program/target.
  'mkdir -p "$CARGO_TARGET_DIR/deploy"',
  'cp -n target/deploy/*-keypair.json "$CARGO_TARGET_DIR/deploy/" 2>/dev/null',
  `anchor ${args.join(" ")}`,
  "rc=$?",
  // Mirror artifacts back to program/target (also after a failed run, so keys are never lost).
  'for d in deploy idl types; do if [ -d "$CARGO_TARGET_DIR/$d" ]; then mkdir -p "target/$d" && cp -r "$CARGO_TARGET_DIR/$d/." "target/$d/"; fi; done',
  "exit $rc",
].join("; ");

const cmd =
  process.platform === "win32"
    ? ["wsl", "--cd", programDir, "-e", "bash", "-ic", script]
    : ["anchor", ...args];

const proc = Bun.spawn(cmd, {
  cwd: programDir,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await proc.exited);
